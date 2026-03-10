"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DATA } from "@/data/resume";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselProgress,
} from "@/components/ui/carousel";
import { ProjectCard } from "@/components/project-card";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";

const projects = DATA.projects;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layout Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OptionSection({
  id,
  number,
  title,
  description,
  pros,
  cons,
  recommended,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-8 flex items-start gap-5">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold border",
            recommended
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-muted-foreground border-border"
          )}
        >
          {number}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {recommended && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-foreground text-background">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl leading-relaxed">
            {description}
          </p>
          <div className="mt-3 flex gap-8 text-xs">
            <div>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Strengths
              </span>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {pros.map((p) => (
                  <li key={p}>+ {p}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                Trade-offs
              </span>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {cons.map((c) => (
                  <li key={c}>&minus; {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-10 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared Card Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MiniProjectCard({
  project,
  className,
}: {
  project: (typeof projects)[number];
  className?: string;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-full border border-border rounded-xl overflow-hidden bg-card text-card-foreground transition-all duration-200",
        project.href && "hover:ring-2 hover:ring-muted",
        className
      )}
    >
      <div className="relative shrink-0">
        {project.image && !imgErr ? (
          <img
            src={project.image}
            alt={project.title}
            className="w-full aspect-video object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full aspect-video bg-muted" />
        )}
      </div>
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm">{project.title}</h3>
          {project.href && (
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {project.description}
        </p>
        {project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {project.technologies.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-medium"
              >
                {tag}
              </Badge>
            ))}
            {project.technologies.length > 4 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                +{project.technologies.length - 4}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Option A: Current Implementation (Embla + Progress Bar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OptionACurrent() {
  return (
    <Carousel
      opts={{ align: "start", loop: true }}
      plugins={[
        Autoplay({
          delay: 3000,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
        }),
      ]}
      className="max-w-[700px] mx-auto w-full"
    >
      <CarouselContent className="-ml-3">
        {projects.map((project) => (
          <CarouselItem
            key={project.title}
            className="pl-3 basis-full sm:basis-1/2"
          >
            <ProjectCard
              href={project.href}
              title={project.title}
              description={project.description}
              dates={project.dates}
              tags={project.technologies}
              image={project.image}
              video={project.video}
              links={project.links}
              imageClassName={project.imageClassName}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselProgress
        count={projects.length}
        autoplayDelay={3000}
        className="mt-4"
      />
    </Carousel>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Option B: Spotlight Carousel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OptionBSpotlight() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative px-12">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex -ml-4">
          {projects.map((project, i) => {
            const isActive = i === selectedIndex;
            return (
              <div
                key={project.title}
                className="pl-4 flex-[0_0_80%] sm:flex-[0_0_55%] min-w-0 transition-all duration-500 ease-out"
                style={{
                  transform: isActive ? "scale(1)" : "scale(0.88)",
                  opacity: isActive ? 1 : 0.35,
                  filter: isActive ? "none" : "blur(1.5px)",
                }}
              >
                <MiniProjectCard project={project} />
              </div>
            );
          })}
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {projects.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === selectedIndex
                ? "w-8 bg-foreground"
                : "w-1.5 bg-foreground/20"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
      {/* Arrow controls */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-0 top-[calc(50%-24px)] -translate-y-1/2 h-10 w-10 rounded-full border border-border bg-card/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        aria-label="Previous"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-0 top-[calc(50%-24px)] -translate-y-1/2 h-10 w-10 rounded-full border border-border bg-card/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        aria-label="Next"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Option C: Infinite Marquee
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OptionCMarquee() {
  const [isPaused, setIsPaused] = useState(false);
  const items = [...projects, ...projects];

  return (
    <>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 8px)); }
        }
      `}</style>
      <div
        className="relative overflow-hidden -mx-6 sm:-mx-10"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-card/90 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-card/90 to-transparent pointer-events-none" />
        <div
          className="flex gap-4"
          style={{
            width: "max-content",
            animation: "marquee-scroll 25s linear infinite",
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {items.map((project, i) => (
            <div
              key={`${project.title}-${i}`}
              className="shrink-0 w-[280px] sm:w-[320px]"
            >
              <MiniProjectCard project={project} />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Hover to pause
      </p>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Option D: Stacked Cards
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OptionDStacked() {
  const [topIndex, setTopIndex] = useState(0);

  const cycleStack = useCallback(() => {
    setTopIndex((prev) => (prev + 1) % projects.length);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[400px] w-full max-w-[340px]">
        {projects.map((project, i) => {
          const stackPos =
            ((i - topIndex + projects.length) % projects.length);
          const isTop = stackPos === 0;

          return (
            <motion.div
              key={project.title}
              className={cn(
                "absolute inset-0",
                isTop && "cursor-grab active:cursor-grabbing"
              )}
              style={{ zIndex: projects.length - stackPos }}
              animate={{
                scale: 1 - stackPos * 0.06,
                y: stackPos * 16,
                rotateZ: stackPos === 0 ? 0 : stackPos * -2.5,
                opacity: stackPos > 2 ? 0 : 1 - stackPos * 0.2,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              drag={isTop ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 80) {
                  cycleStack();
                }
              }}
              onClick={isTop ? cycleStack : undefined}
              whileTap={isTop ? { scale: 0.98 } : undefined}
            >
              <MiniProjectCard
                project={project}
                className={
                  !isTop ? "pointer-events-none select-none" : ""
                }
              />
            </motion.div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Click or drag to cycle
      </p>
      <div className="mt-3 flex gap-1.5">
        {projects.map((_, i) => {
          const stackPos =
            ((i - topIndex + projects.length) % projects.length);
          return (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                stackPos === 0
                  ? "w-6 bg-foreground"
                  : "w-1 bg-foreground/20"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Option E: Full-Width Hero
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OptionEHero() {
  const [current, setCurrent] = useState(0);
  const [imgErr, setImgErr] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % projects.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const project = projects[current];

  return (
    <div className="relative overflow-hidden rounded-xl -mx-6 sm:-mx-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Image */}
          <div className="relative aspect-[16/8] sm:aspect-[16/7] overflow-hidden bg-muted">
            {project.image && !imgErr[current] ? (
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover"
                onError={() =>
                  setImgErr((prev) => ({ ...prev, [current]: true }))
                }
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
          </div>

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {project.title}
              </h3>
            </motion.div>
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-2 text-sm text-white/65 max-w-lg leading-relaxed"
            >
              {project.description}
            </motion.p>
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-4 flex flex-wrap gap-1.5"
            >
              {project.technologies.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10 font-medium"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
            {project.href && (
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <Link
                  href={project.href}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-white hover:text-white/80 transition-colors"
                >
                  View Project <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Counter + dots */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-xs font-medium text-white/50 tabular-nums">
          {String(current + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
        </span>
        <div className="flex gap-1.5">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current ? "w-6 bg-white" : "w-1.5 bg-white/30"
              )}
              aria-label={`View project ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Arrow controls */}
      <button
        onClick={() =>
          setCurrent(
            (prev) => (prev - 1 + projects.length) % projects.length
          )
        }
        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-black/40 transition-colors"
        aria-label="Previous project"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={() =>
          setCurrent((prev) => (prev + 1) % projects.length)
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-black/40 transition-colors"
        aria-label="Next project"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function CarouselDemoPage() {
  const options = [
    { id: "a", label: "Current" },
    { id: "b", label: "Spotlight" },
    { id: "c", label: "Marquee" },
    { id: "d", label: "Stacked" },
    { id: "e", label: "Hero" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Design Review
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Project Carousel Options
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
            Five carousel patterns evaluated for the projects section. Each uses
            the same project data with different layouts and interaction models.
          </p>
        </div>
      </header>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-3 -mx-1">
            {options.map((opt) => (
              <a
                key={opt.id}
                href={`#option-${opt.id}`}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors whitespace-nowrap"
              >
                {opt.id.toUpperCase()}. {opt.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Sections */}
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-28">
        <OptionSection
          id="option-a"
          number="A"
          title="Embla + Progress Bar"
          description="Current implementation. Two-up Embla carousel with autoplay (3s), pause on hover, and a segmented progress indicator."
          pros={[
            "Proven UX pattern",
            "Mobile-friendly swipe",
            "Autoplay feedback via progress bar",
          ]}
          cons={[
            "Generic portfolio look",
            "Cards partially cropped at edges",
            "Progress bar adds visual weight",
          ]}
        >
          <OptionACurrent />
        </OptionSection>

        <OptionSection
          id="option-b"
          number="B"
          title="Spotlight Carousel"
          description="Center card at full scale with adjacent cards scaled down, blurred, and faded. Creates a clear focal point and sense of depth."
          pros={[
            "Strong visual hierarchy",
            "Premium, focused feel",
            "Adjacent cards hint at more content",
          ]}
          cons={[
            "Shows less content at once",
            "Needs 3+ items to look balanced",
            "Side cards may feel wasted",
          ]}
          recommended
        >
          <OptionBSpotlight />
        </OptionSection>

        <OptionSection
          id="option-c"
          number="C"
          title="Infinite Marquee"
          description="Continuous horizontal scroll with no controls. Pauses on hover. Edge gradients fade content naturally. Ambient, always-moving energy."
          pros={[
            "Zero-effort browsing",
            "Adds ambient motion to the page",
            "Works with any item count",
          ]}
          cons={[
            "Users can't navigate directly",
            "Constant motion may feel restless",
            "Less intentional than manual control",
          ]}
        >
          <OptionCMarquee />
        </OptionSection>

        <OptionSection
          id="option-d"
          number="D"
          title="Stacked Cards"
          description="Cards layered with offsets and rotation. Click or drag the top card to cycle. Compact and tactile."
          pros={[
            "Unique, memorable interaction",
            "Compact vertical footprint",
            "Satisfying tactile feel",
          ]}
          cons={[
            "Only one project visible at a time",
            "Requires interaction to discover content",
            "Non-standard pattern",
          ]}
        >
          <OptionDStacked />
        </OptionSection>

        <OptionSection
          id="option-e"
          number="E"
          title="Full-Width Hero"
          description="One project at a time filling the viewport width. Large imagery with gradient overlay, staggered text reveal, and crossfade transitions."
          pros={[
            "Maximum visual impact per project",
            "Editorial, premium quality",
            "Great for strong imagery",
          ]}
          cons={[
            "Requires high-quality images",
            "Only one project visible at a time",
            "Most vertical space used",
          ]}
        >
          <OptionEHero />
        </OptionSection>

        {/* Recommendation */}
        <div className="border-t border-border pt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Recommendation
          </h2>
          <div className="mt-4 rounded-xl border border-border bg-card/50 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background text-xs font-semibold">
                B
              </span>
              <span className="font-semibold text-sm">Spotlight Carousel</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              For a portfolio with 3 projects, the Spotlight pattern provides
              the best balance of visual impact and usability. It creates a
              clear focal point while hinting at additional content &mdash;
              encouraging exploration without requiring it. The depth effect
              aligns with the site&apos;s clean, refined aesthetic.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              <strong className="text-foreground">Runner-up:</strong> Option E
              (Hero) is excellent if project images are consistently
              high-quality. Consider combining B&apos;s layout with A&apos;s
              progress bar for added autoplay feedback.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
