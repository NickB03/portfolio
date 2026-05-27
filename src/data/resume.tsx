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
  url: "https://nickb.net",
  location: "Dallas, TX",
  locationLink: "https://www.google.com/maps/place/Dallas,+TX",
  description:
    "Personal portfolio for Nick Bohmer, a product management leader building enterprise networking, security, and AI products.",
  summary:
    "Product leader and hands-on builder focused on enterprise networking, security, and AI-enabled product development. I bridge strategy and execution across product vision, go-to-market planning, pricing and packaging, and cross-functional delivery.\n\nI build AI applications hands-on (Polymorph, AnalystAI, multi-agent platforms) to pressure-test capability, inform product strategy, and accelerate practical experimentation. Working through multi-agent frameworks gives me firsthand insight into the strengths and limits of modern AI systems.\n\nThat perspective helps me collaborate more effectively with engineering teams, drive product decisions grounded in real implementation challenges, and push the boundaries of what's possible in AI-driven enterprise products.",
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
        url: "https://github.com/NickB03/polymorph",
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
      title: "Associate Director, Product Management",
      logoUrl: "/globe.png",
      start: "August 2025",
      end: "Current",
      description:
        "• Lead product strategy and execution for enterprise networking and security offerings, aligning roadmap priorities across product, engineering, sales, and leadership stakeholders.\n• Shape managed security and SASE/SSE portfolio direction, translating customer needs and market signals into clearer packaging, positioning, and launch plans.\n• Led packaging and pricing improvements for managed security offers, improving offer clarity and competitive positioning.\n• Directed development of an AI-enabled workflow platform that improved stakeholder workflows and accelerated decision-making.\n• Drive practical AI adoption through LLM workflow integrations, prototypes, and product enablement.\n• Selected for a company growth initiative focused on applying AI to business networking and security products.",
    },
    {
      company: "AT&T",
      href: "https://att.com",
      badges: [],
      location: "Dallas, TX",
      title: "Lead Product Management & Development",
      logoUrl: "/globe.png",
      start: "August 2022",
      end: "August 2025",
      description:
        "• Took a network-integrated SD-WAN solution from concept to market launch, coordinating roadmap and cross-functional delivery.\n• Developed GTM strategies and customer-facing collateral to position edge networking solutions effectively and ensure consistent messaging.\n• Led analyst-relations and market-positioning work for managed networking and security offers, contributing to sustained external recognition.",
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
        "• Designed tailored network and security solutions (SD-WAN, SASE) for global enterprise clients, driving product adoption.\n• Trusted advisor to executive sponsors across strategic accounts, serving as a sounding board on network transformation.\n• Orchestrated collaboration between engineering, marketing, and sales to ensure solutions aligned with strategic vision.",
    },
    {
      company: "AT&T",
      href: "https://att.com",
      badges: [],
      location: "Dallas, TX",
      title: "Sr. Edge Solutions Specialist",
      logoUrl: "/globe.png",
      start: "January 2019",
      end: "July 2020",
      description:
        "• Key driver in launching the Edge Specialist team, increasing service adoption by effectively positioning SD-WAN and security solutions.\n• Led 20+ SD-WAN workshops translating technical concepts for stakeholders and supporting new revenue opportunities.\n• Created and delivered specialized technical training for sales teams to enhance expertise in Managed Network Services.",
    },
  ],
  education: [],
  projects: [
    {
      title: "polymorph",
      href: "https://polymorph.fyi",
      dates: "",
      active: true,
      description:
        "Open-source AI platform with a multi-agent architecture (Search, Research, Build) plus a live React canvas that compiles single-file artifacts in-browser. Multi-provider model routing via Vercel AI Gateway, instrumented with Arize Phoenix for LLM observability and continuous evaluation.",
      technologies: [
        "Next.js",
        "TypeScript",
        "Multi-Agent",
        "Generative UI",
        "Vercel AI Gateway",
        "Arize Phoenix",
        "Supabase",
      ],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/NickB03/polymorph",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "/polymorph-demo-poster.png",
      video: "/polymorph-demo.mp4",
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
