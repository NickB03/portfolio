# User Analytics — Implementation Plan

Status: Proposed
Target branch: `claude/user-analytics-plan-rpYsF`
Author: Claude Code (research + plan)

## 1. Goal & Context

Add lightweight, privacy-respecting user analytics to nickb.net so Nick can answer
questions like:

- How many people visit, from where, on what devices?
- Which pages/use-cases (e.g. BreeziNet) get traffic and engagement?
- Are visitors using the AI chat assistant, and how much?
- Which calls-to-action (contact, project links, resume) actually get clicked?
- Are Core Web Vitals healthy on the live Cloudflare deployment?

### Current state (from codebase research)

- **Stack:** Next.js 16 (App Router) + React 19, deployed to **Cloudflare Workers via OpenNext**, custom domains `nickb.net` / `www.nickb.net`.
- **No analytics today.** Grep for `analytics|gtag|posthog|plausible|umami|vercel/analytics|speed-insights` returns zero matches.
- **Supabase already wired in** (`src/lib/supabase.ts`): public anon client + `createServerClient()` using the service-role key. The chat API already writes/reads Supabase server-side.
- **No CSP header** in `next.config.mjs`; existing security headers are `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- **No cookie/consent banner and no privacy policy page** exist yet.
- **Existing server patterns to reuse:** `src/app/api/chat/route.ts` already does IP-based rate limiting via the Cloudflare `cf-connecting-ip` header and uses the Supabase service-role client — the analytics endpoint should mirror these.
- Feature-flag convention already in use: `ENABLE_AI_CHAT` (server) + `NEXT_PUBLIC_ENABLE_AI_CHAT` (client UI).

## 2. Design Principles

1. **Privacy-first / cookieless.** No cookies, no cross-site identifiers, no PII. This keeps us out of GDPR/ePrivacy consent-banner territory — a banner is a poor fit for a personal portfolio and hurts UX.
2. **Reuse what's already here.** Supabase is already a dependency and is server-trusted; lean on it for custom events instead of adding a paid third-party product-analytics SaaS.
3. **Minimal client weight.** Don't ship a heavy analytics SDK into the bundle. A tiny beacon + a small `track()` helper only.
4. **Feature-flagged + reversible.** Gate everything behind a flag so it can ship dark and be toggled without a redeploy of logic.
5. **No CSP regressions.** Keep the allowlist tight; only first-party (`/api/events`) and the Cloudflare beacon are permitted.

## 3. Recommended Architecture — two complementary layers

### Layer A — Cloudflare Web Analytics (page-level)
Handles the "web stats" basics with effectively zero maintenance:

- Page views, unique visitors, referrers, country, device/browser, and **Core Web Vitals** — all **cookieless** and free, native to our Cloudflare deployment.
- Implemented via the lightweight CF beacon script (`https://static.cloudflareinsights.com/beacon.min.js`) injected with `next/script` (`strategy="afterInteractive"`), or enabled zone-side with automatic injection.
- **Why:** no PII, no consent banner, no bundle cost, and it's the path of least resistance for an already-on-Cloudflare site.

### Layer B — First-party custom events (product-level)
For the questions Cloudflare can't answer (chat usage, CTA clicks, per-use-case engagement), add a tiny first-party event pipeline backed by the existing Supabase project:

```
client track() helper  ──POST──▶  /api/events (Edge/Worker route)
                                        │  validate + anonymize + rate-limit
                                        ▼
                              Supabase table: analytics_events
                                        │
                                        ▼
                         SQL views / Supabase dashboard (read)
```

- Events are small, typed, and explicitly enumerated (no free-form firehose).
- The server route **anonymizes**: it never stores raw IP. It stores a **daily-rotating salted hash** of `cf-connecting-ip + user-agent` purely to approximate unique sessions, matching the privacy posture of Plausible-style analytics.
- Reuses the chat route's rate-limiting approach to prevent abuse of a public POST endpoint.

### Alternatives considered (and why not, for now)
| Option | Verdict |
| --- | --- |
| **Google Analytics 4** | Requires consent banner (cookies), adds CSP complexity, sends data to Google. Rejected on privacy + UX grounds. |
| **Plausible / Umami (self-host)** | Great privacy story but adds infra to run/maintain. Layer A already covers the same need for free. |
| **PostHog Cloud** | Powerful but heavyweight SDK + paid tiers + consent considerations; overkill for a portfolio. |
| **Vercel Analytics / Speed Insights** | Tied to Vercel hosting; we're on Cloudflare. Not applicable. |

The recommended A+B split gives 90% of the value with near-zero cost and no consent banner. Layer B is optional/incremental — Layer A alone is a valid MVP.

## 4. Implementation Plan

### Phase 0 — Decisions to confirm before coding
- Confirm Cloudflare Web Analytics is acceptable (vs. self-hosted Plausible). Default: **yes**.
- Confirm we want Layer B custom events now, or ship Layer A first. Default: **ship both, Layer B behind a flag**.
- Confirm comfort with storing a salted, daily-rotating IP+UA hash (no raw IP, no cookie). Default: **yes**.

### Phase 1 — Cloudflare Web Analytics (Layer A)
1. Create a Web Analytics site in the Cloudflare dashboard for `nickb.net`; obtain the beacon **token**.
2. Add `NEXT_PUBLIC_CF_BEACON_TOKEN` to `.env.example`, `.env.local`, and `wrangler.json > vars`.
3. Create `src/components/analytics/cloudflare-analytics.tsx` — a client component that renders the CF beacon via `next/script` only when the token is present:
   ```tsx
   "use client";
   import Script from "next/script";

   export function CloudflareAnalytics() {
     const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
     if (!token) return null;
     return (
       <Script
         src="https://static.cloudflareinsights.com/beacon.min.js"
         strategy="afterInteractive"
         data-cf-beacon={JSON.stringify({ token })}
       />
     );
   }
   ```
4. Mount `<CloudflareAnalytics />` once in `src/app/layout.tsx` (inside `<body>`, outside the AI-chat conditional so it loads in both branches).
5. Update `next.config.mjs` headers: introduce a **Content-Security-Policy** that allows the beacon, and extend `Permissions-Policy`/CSP for the analytics endpoints. Minimum additions:
   - `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com`
   - `connect-src 'self' https://cloudflareinsights.com https://*.supabase.co`
   - (Start with `Content-Security-Policy-Report-Only` for one deploy to catch breakage from the existing inline theme/font scripts before enforcing.)

### Phase 2 — First-party event pipeline (Layer B)
1. **Database (Supabase migration).** Add an append-only events table + indexes (apply via Supabase migration / MCP `apply_migration`):
   ```sql
   create table if not exists public.analytics_events (
     id          bigint generated always as identity primary key,
     created_at  timestamptz not null default now(),
     event       text not null,                 -- e.g. 'page_view','chat_open','cta_click'
     path        text,                           -- pathname only, no query string
     referrer    text,
     props       jsonb not null default '{}',    -- small, whitelisted extra fields
     country     text,                           -- from cf-ipcountry header
     visitor_hash text,                          -- daily salted hash of ip+ua, NOT raw ip
     ua_device   text,                           -- 'mobile' | 'desktop' | 'tablet'
     ua_browser  text
   );
   create index on public.analytics_events (created_at);
   create index on public.analytics_events (event, created_at);
   -- RLS ON, no anon policies: only the service-role key (server) may write/read.
   alter table public.analytics_events enable row level security;
   ```
   - Enforce a strict allowlist of `event` names server-side; reject anything else.
   - Optionally add a retention policy (e.g. a scheduled delete of rows older than 12 months) to keep the free tier lean.

2. **Server route** `src/app/api/events/route.ts` (POST):
   - Validate body with **Zod** (already a dependency): `{ event, path?, referrer?, props? }` with a hard allowlist of event names and a small `props` size cap.
   - Derive `country` from `cf-ipcountry`, device/browser from the UA string, and `visitor_hash = sha256(daily_salt + cf-connecting-ip + user-agent)` (salt rotates daily; raw IP never persisted).
   - Reuse the chat route's **in-memory IP rate limiter** (e.g. 60 events / 5 min / IP) to deter abuse.
   - Insert via `createServerClient()` (service role). Return `204 No Content`. Fail open/silent — analytics must never break UX.
   - Respect `ENABLE_ANALYTICS` server flag; return `204` no-op when disabled.

3. **Client helper** `src/lib/analytics.ts`:
   ```ts
   export function track(event: string, props?: Record<string, unknown>) {
     if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true") return;
     const body = JSON.stringify({ event, path: location.pathname, referrer: document.referrer, props });
     // sendBeacon survives page unload; fall back to fetch keepalive
     if (navigator.sendBeacon) navigator.sendBeacon("/api/events", body);
     else fetch("/api/events", { method: "POST", body, keepalive: true });
   }
   ```

4. **Automatic page-view tracking.** Add `src/components/analytics/page-view-tracker.tsx` (client) that calls `track("page_view")` on mount and on App Router navigation via `usePathname()` in a `useEffect`. Mount alongside `<CloudflareAnalytics />` in the layout.

5. **Instrument key interactions** (the high-value events):
   - AI chat: `track("chat_open")` and `track("chat_message_sent")` in `src/components/ui/ai-chat/*` (provider/popup).
   - CTA clicks: contact links, project/use-case links, resume — `track("cta_click", { target })` in `src/data/resume.tsx` consumers / `src/components/section/*`.
   - Use-case page views fire naturally via the page-view tracker (path-based).

### Phase 3 — Reporting
- Create read-only SQL views in Supabase for common rollups (daily uniques, top paths, chat funnel, CTA breakdown), e.g.:
  ```sql
  create view analytics_daily as
    select date_trunc('day', created_at) d, event,
           count(*) events, count(distinct visitor_hash) visitors
    from analytics_events group by 1, 2;
  ```
- Phase 3b (optional): a password-gated `/admin/analytics` route or a Supabase dashboard saved query for at-a-glance numbers. For v1, querying Supabase directly is sufficient.

### Phase 4 — Privacy & compliance
- Add a short **`/privacy` page** (`src/app/privacy/page.tsx`) stating: cookieless analytics, no PII, no third-party ad tracking, salted-hash session approximation, retention window. Link it in the footer.
- Because the design is cookieless with no personal data, **no consent banner is required** under typical GDPR/ePrivacy interpretation — but the privacy page documents the practice transparently.

### Phase 5 — Config, flags, rollout
- New env vars (add to `.env.example`, `.env.local`, `wrangler.json > vars`):
  - `NEXT_PUBLIC_CF_BEACON_TOKEN` (Layer A)
  - `ENABLE_ANALYTICS` (server) + `NEXT_PUBLIC_ENABLE_ANALYTICS` (client) — mirrors the existing AI-chat flag pattern.
  - `ANALYTICS_HASH_SALT` (server secret; seeds the daily-rotating salt) — set as a Cloudflare secret, **not** committed.
- Rollout: ship Layer A first (low risk), validate CSP in report-only mode, then enable Layer B flag, then flip CSP to enforce.

## 5. Files Touched (summary)
| File | Change |
| --- | --- |
| `next.config.mjs` | Add CSP (report-only → enforce); allow CF beacon + Supabase connect-src |
| `src/app/layout.tsx` | Mount `<CloudflareAnalytics />` + `<PageViewTracker />` |
| `src/components/analytics/cloudflare-analytics.tsx` | New — CF beacon via `next/script` |
| `src/components/analytics/page-view-tracker.tsx` | New — App Router page-view events |
| `src/lib/analytics.ts` | New — `track()` client helper |
| `src/app/api/events/route.ts` | New — validated, anonymized, rate-limited event sink |
| `src/components/ui/ai-chat/*`, `src/components/section/*` | Add `track()` calls on key interactions |
| `src/app/privacy/page.tsx` | New — privacy disclosure |
| Supabase migration | New `analytics_events` table + indexes + RLS + reporting views |
| `.env.example`, `.env.local`, `wrangler.json` | New env vars / secrets |

## 6. Testing & Verification
- **Unit:** Zod validation + event-name allowlist + hash anonymization (Node test runner, matching existing `test:chat-flags` style).
- **Local:** `npm run dev`, fire events, confirm rows land in Supabase and contain **no raw IP**.
- **CSP:** deploy with `Content-Security-Policy-Report-Only` first; check the browser console / CF logs for violations from existing inline theme/font scripts before enforcing.
- **Build/deploy:** `npm run build`, then `npm run preview` (OpenNext local) to confirm the beacon + `/api/events` work under the Workers runtime.
- **Privacy check:** verify no cookies are set (DevTools → Application → Cookies empty).

## 7. Risks & Mitigations
- **CSP breaks the site** (inline theme/Geist font scripts). → Ship report-only first; add the precise hashes/`'unsafe-inline'` needed, then enforce.
- **Public POST endpoint abuse.** → Rate-limit (reuse chat pattern), strict event allowlist, small payload cap, fail-silent, RLS so only service role writes.
- **Workers runtime constraints** (no Node IP in some contexts). → Use `cf-connecting-ip` / `cf-ipcountry` headers (already used by the chat route).
- **Supabase free-tier growth.** → Retention policy + indexes; events are tiny.
- **Double counting page views** (CF beacon + custom `page_view`). → Treat them as separate layers; rely on CF for canonical pageviews, use custom `page_view` only for funnel joins, or drop custom `page_view` if redundant.

## 8. Suggested Milestones
1. **M1 (MVP):** Layer A live (CF Web Analytics) + CSP report-only + `/privacy` page.
2. **M2:** Supabase table + `/api/events` + `track()` helper + page-view tracker, behind flag.
3. **M3:** Instrument chat + CTA events; CSP enforce.
4. **M4:** Reporting views / lightweight dashboard.
