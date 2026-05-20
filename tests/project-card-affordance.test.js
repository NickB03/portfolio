const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const projectCardPath = join(process.cwd(), "src/components/project-card.tsx");

function loadProjectCard() {
  const { outputText } = ts.transpileModule(readFileSync(projectCardPath, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const loadedModule = { exports: {} };
  const compile = new Function("require", "loadedModule", "exports", outputText);
  const localRequire = (id) => {
    if (id === "@/components/ui/badge") {
      return {
        Badge({ children, className }) {
          return React.createElement("span", { className }, children);
        },
      };
    }

    if (id === "@/lib/utils") {
      return {
        cn(...values) {
          return values.filter(Boolean).join(" ");
        },
      };
    }

    if (id === "lucide-react") {
      return {
        ArrowUpRight(props) {
          return React.createElement("svg", { ...props, "data-icon": "arrow-up-right" });
        },
      };
    }

    if (id === "next/link") {
      return {
        __esModule: true,
        default({ href, children, ...props }) {
          return React.createElement("a", { href, ...props }, children);
        },
      };
    }

    if (id === "react-markdown") {
      return {
        __esModule: true,
        default({ children }) {
          return React.createElement("p", null, children);
        },
      };
    }

    return require(id);
  };

  compile(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports.ProjectCard;
}

function renderProjectCard(props = {}) {
  const ProjectCard = loadProjectCard();

  return renderToStaticMarkup(
    React.createElement(ProjectCard, {
      title: "polymorph",
      href: "https://polymorph.fyi",
      description: "Open-source AI platform.",
      dates: "2026",
      tags: ["Next.js"],
      image: "/polymorph.png",
      links: [
        {
          icon: React.createElement("span", { "aria-hidden": true }, "GH"),
          type: "GitHub",
          href: "https://github.com/NickB03/polymorph",
        },
      ],
      ...props,
    })
  );
}

test("project card renders the visible CTA as the stretched primary link", () => {
  const html = renderProjectCard();

  assert.match(html, /<a[^>]+href="https:\/\/polymorph\.fyi"[^>]*>View project/);
  assert.match(html, /after:absolute/);
  assert.match(html, /after:inset-0/);
  assert.doesNotMatch(html, /<a[^>]+class="absolute inset-0/);
});

test("project card keeps secondary badge links above the stretched primary link", () => {
  const html = renderProjectCard();

  assert.match(html, /href="https:\/\/github\.com\/NickB03\/polymorph"/);
  assert.match(html, /relative z-20/);
  assert.equal(html.match(/<a\b/g)?.length, 2);
});

test("project card without href does not render a primary link affordance", () => {
  const html = renderProjectCard({ href: "" });

  assert.doesNotMatch(html, /View project/);
  assert.doesNotMatch(html, /aria-label="Open polymorph"/);
  assert.equal(html.match(/<a\b/g)?.length, 1);
});
