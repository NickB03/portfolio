import { Icons } from "@/components/icons";
import { HomeIcon, NotebookIcon, BriefcaseIcon } from "lucide-react";
import { ReactLight } from "@/components/ui/svgs/reactLight";
import { NextjsIconDark } from "@/components/ui/svgs/nextjsIconDark";
import { Typescript } from "@/components/ui/svgs/typescript";
import { Nodejs } from "@/components/ui/svgs/nodejs";
import { Python } from "@/components/ui/svgs/python";
import { Golang } from "@/components/ui/svgs/golang";
import { Postgresql } from "@/components/ui/svgs/postgresql";
import { Docker } from "@/components/ui/svgs/docker";
import { Kubernetes } from "@/components/ui/svgs/kubernetes";
import { Java } from "@/components/ui/svgs/java";
import { Csharp } from "@/components/ui/svgs/csharp";

export const DATA = {
  name: "Nick Bohmer",
  initials: "NB",
  url: "https://vana.bot",
  location: "Dallas, TX",
  locationLink: "https://www.google.com/maps/place/Dallas,+TX",
  description:
    "",
  summary:
    "I am a product leader and hands-on builder who bridges the gap between enterprise strategy and execution with a focus on building industry leading managed SD-WAN & SASE solutions.\n\nOver the past year, I've learned to design, build, and launch full-stack AI applications, taking ideas from prototype to production using modern development workflows and CI/CD pipelines.\n\nBy working closely with multi-agent frameworks like Google's Agent Development Kit, I've gained firsthand insight into the strengths and limitations of modern AI systems. This perspective helps me collaborate more effectively with engineering teams, drive product decisions grounded in real implementation challenges, and push the boundaries of what's possible in AI-driven enterprise products.",
  avatarUrl: "/me.jpg",
  competencies: [],
  skills: [],
  navbar: [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/#projects", icon: NotebookIcon, label: "Projects" },
    { href: "/#use-cases", icon: BriefcaseIcon, label: "Use Cases" },
  ],
  contact: {
    email: "nbohmer@gmail.com",
    tel: "",
    social: {
      GitHub: {
        name: "GitHub",
        url: "https://github.com/NickB03/vana",
        icon: Icons.github,
        navbar: true,
      },
      LinkedIn: {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/nickbohmer",
        icon: Icons.linkedin,
        navbar: true,
      },
      email: {
        name: "Send Email",
        url: "mailto:nbohmer@gmail.com",
        icon: Icons.email,
        navbar: false,
      },
    },
  },

  work: [
    {
      company: "AT&T",
      href: "https://att.com",
      badges: [],
      location: "Dallas, TX",
      title: "Associate Director (Value Added Solutions)",
      logoUrl: "/globe.png",
      start: "August 2025",
      end: "Current",
      description:
        "• Led major product portfolio including Global Solution Center and Network Function Virtualization, partnering with executives to align roadmaps with business strategy.\n• Directed end-to-end development of a modern AI-powered platform (Next.js, React, Python) throughout the full lifecycle, significantly improving seller experience.\n• Spearheaded LLM workflow integrations using LangSmith to drive AI adoption and operational efficiency.\n• Selected for Growth Council to lead AI-focused product evolution initiatives for business networks.",
    },
    {
      company: "AT&T",
      href: "https://att.com",
      badges: [],
      location: "Dallas, TX",
      title: "Lead Product Management & Development (Edge Solutions)",
      logoUrl: "/globe.png",
      start: "August 2022",
      end: "August 2025",
      description:
        "• Took network-integrated SD-WAN solution from concept to market launch, managing significant budget and cross-functional teams to deploy an extensive device fleet.\n• Developed comprehensive GTM strategies and customer-facing collateral to position Edge solutions effectively and ensure consistent messaging.\n• Secured \"Market Leader\" recognition from top industry analysts (Frost & Sullivan, Vertical Systems Group) through strategic engagement and product differentiation.",
    },
    {
      company: "AT&T",
      href: "https://att.com",
      badges: [],
      location: "Dallas, TX",
      title: "Solutions Architect",
      logoUrl: "/globe.png",
      start: "August 2020",
      end: "July 2022",
      description:
        "• Designed tailored network and security solutions (SD-WAN, SASE) for global enterprise clients, driving significant product adoption.\n• Managed executive-level relationships generating substantial annual revenue, serving as a trusted advisor on network transformation.\n• Orchestrated collaboration between engineering, marketing, and sales to ensure solutions aligned with strategic vision.",
    },
    {
      company: "AT&T",
      href: "https://att.com",
      badges: [],
      location: "Dallas, TX",
      title: "Sr. Edge Solutions Specialist (SD-WAN & MNS SME)",
      logoUrl: "/globe.png",
      start: "January 2019",
      end: "July 2020",
      description:
        "• Key driver in launching the Edge Specialist team, increasing service adoption by effectively positioning SD-WAN and security solutions.\n• Led 20+ SD-WAN workshops translating technical concepts for stakeholders, directly generating significant new revenue.\n• Created and delivered specialized technical training for sales teams to enhance expertise in Managed Network Services.",
    },
  ],
  education: [],
  projects: [
    {
      title: "polymorph",
      href: "https://polymorph-nb.vercel.app/",
      dates: "",
      active: true,
      description:
        "AI research platform with generative UI — a multi-step research agent orchestrates searches across Tavily, Brave, and Exa, then renders results as interactive charts, tables, timelines, and citations.",
      technologies: [
        "Next.js",
        "React",
        "AI SDK",
        "Generative UI",
        "Drizzle",
        "Supabase",
      ],
      links: [],
      image: "/polymorph.png",
      video: "",
      imageClassName: "aspect-video w-full object-cover",
    },
    {
      title: "vana.bot",
      href: "https://vana.bot",
      dates: "",
      active: true,
      description:
        "Full-stack AI chat application with interactive artifacts (React components, SVG, Mermaid diagrams) rendering live in-browser.",
      technologies: [
        "React",
        "TypeScript",
        "Vite",
        "OpenRouter",
        "Supabase",
        "PostgreSQL",
        "Deno",
      ],
      links: [],
      image: "/vana-preview.jpg",
      video: "",
      imageClassName: "aspect-video w-full object-cover",
    },
    {
      title: "AnalystAI",
      href: "https://analystai-one.vercel.app",
      dates: "",
      active: true,
      description:
        "AI document research app — upload PDFs, extract & chunk content, and chat with a grounded AI analyst powered by RAG.",
      technologies: [
        "Next.js",
        "React",
        "TypeScript",
        "Vercel AI SDK",
        "OpenRouter",
        "pgvector",
      ],
      links: [],
      image: "/analyst-ai-preview.png",
      video: "",
      imageClassName: "aspect-video w-full object-cover",
    },
    /*
    {
      title: "AnalystAI",
      href: "",
      dates: "",
      active: true,
      description:
        "Document analysis app with PDF extraction, OCR, AI summarization (Gemini API). Containerized with Docker, deployed to Google Cloud Run.",
      technologies: [
        "Docker",
        "Google Cloud Run",
        "Gemini API",
        "OCR",
      ],
      links: [],
      image: "/analystai-preview.jpg",
      video: "",
    },
    {
      title: "ChatPDF-style Q&A tool",
      href: "",
      dates: "",
      active: true,
      description:
        "Document ingestion backend with text extraction, chunking, vector indexing, and retrieval-based Q&A. Google OAuth, FastAPI.",
      technologies: [
        "FastAPI",
        "Vector Indexing",
        "Google OAuth",
        "Retrieval-Augmented Generation",
      ],
      links: [],
      image: "/chatpdf-cli.png",
      video: "",
    },
    */
  ],
  useCases: [
    {
      title: "BreeziNet",
      href: "/use-cases/breezinet",
      dates: "",
      active: true,
      description: "Prototyped and pitched a unified fiber & wireless offering in a two-day workshop, securing executive buy-in for development.",
      technologies: [],
      links: [],
      image: "/breezinet-new.png",
      video: "",
      imageClassName: "h-auto w-full object-cover",
    },
    /*
    {
      title: "MNS Order Automation",
      href: "/use-cases/mns-order-automation",
      dates: "",
      active: true,
      description: "",
      technologies: [],
      links: [],
      image: "/mns-preview.jpg",
      video: "",
    },
    {
      title: "Business Virtual Agent",
      href: "/use-cases/business-virtual-agent",
      dates: "",
      active: true,
      description: "",
      technologies: [],
      links: [],
      image: "/bva-preview.jpg",
      video: "",
    },
    */
  ],
  hackathons: [],
} as const;
