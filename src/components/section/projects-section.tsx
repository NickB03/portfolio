"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ProjectCard } from "@/components/project-card";
import { cn } from "@/lib/utils";
import { DATA } from "@/data/resume";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";

type EmblaApi = UseEmblaCarouselType[1];

const projects = DATA.projects;
const slides = [...projects, ...projects];
const POLYMORPH_PROJECT_INDEX = Math.max(
  projects.findIndex((project) => project.title === "polymorph"),
  0
);

const TWEEN_FACTOR = 2.4;

const numberWithinRange = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export default function ProjectsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
    startIndex: POLYMORPH_PROJECT_INDEX,
  });
  const [selectedIndex, setSelectedIndex] = useState(POLYMORPH_PROJECT_INDEX);
  const activeProject = selectedIndex % projects.length;
  const tweenNodes = useRef<HTMLElement[]>([]);

  const setTweenNodes = useCallback((api: EmblaApi) => {
    if (!api) return;
    tweenNodes.current = api.slideNodes().map((slideNode) => {
      return slideNode.querySelector("[data-tween]") as HTMLElement;
    });
  }, []);

  // Official Embla tween pattern: uses engine.slideLooper.loopPoints
  // to correctly compute distance across the loop boundary.
  const tweenSlides = useCallback(
    (api: EmblaApi, eventName?: string) => {
      if (!api) return;

      const engine = api.internalEngine();
      const scrollProgress = api.scrollProgress();
      const slidesInView = api.slidesInView();
      const isScrollEvent = eventName === "scroll";

      api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
        let diffToTarget = scrollSnap - scrollProgress;
        const slidesInSnap = engine.slideRegistry[snapIndex];

        slidesInSnap.forEach((slideIndex) => {
          // During scroll, skip off-screen slides to avoid flash on reposition
          if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

          if (engine.options.loop) {
            engine.slideLooper.loopPoints.forEach((loopItem) => {
              const target = loopItem.target();
              if (slideIndex === loopItem.index && target !== 0) {
                const sign = Math.sign(target);
                if (sign === -1)
                  diffToTarget = scrollSnap - (1 + scrollProgress);
                if (sign === 1)
                  diffToTarget = scrollSnap + (1 - scrollProgress);
              }
            });
          }

          const tweenValue = 1 - Math.abs(diffToTarget * TWEEN_FACTOR);
          const scale = numberWithinRange(
            0.88 + 0.12 * tweenValue,
            0.88,
            1
          );
          const opacity = numberWithinRange(
            0.35 + 0.65 * tweenValue,
            0.35,
            1
          );
          const blur = tweenValue > 0.9 ? 0 : numberWithinRange(
            1.5 * (1 - tweenValue),
            0,
            1.5
          );

          const node = tweenNodes.current[slideIndex];
          if (node) {
            node.style.transform = `scale(${scale})`;
            node.style.opacity = `${opacity}`;
            node.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none";
          }
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onReInit = () => {
      setTweenNodes(emblaApi);
      tweenSlides(emblaApi);
      onSelect();
    };
    const onScroll = () => tweenSlides(emblaApi, "scroll");
    const onSlideFocus = () => tweenSlides(emblaApi);

    setTweenNodes(emblaApi);
    tweenSlides(emblaApi);
    onSelect();

    emblaApi
      .on("reInit", onReInit)
      .on("scroll", onScroll)
      .on("slideFocus", onSlideFocus)
      .on("select", onSelect);

    return () => {
      emblaApi
        .off("reInit", onReInit)
        .off("scroll", onScroll)
        .off("slideFocus", onSlideFocus)
        .off("select", onSelect);
    };
  }, [emblaApi, tweenSlides, setTweenNodes]);

  return (
    <div className="flex min-h-0 flex-col gap-y-8">
      <div className="flex flex-col gap-y-4 items-center justify-center">
        <div className="flex items-center w-full">
          <div className="flex-1 h-px bg-linear-to-r from-transparent from-5% via-border via-95% to-transparent" />
          <div className="border bg-primary z-10 rounded-xl px-4 py-1">
            <span className="text-background text-sm font-medium">
              My Projects
            </span>
          </div>
          <div className="flex-1 h-px bg-linear-to-l from-transparent from-5% via-border via-95% to-transparent" />
        </div>
        <div className="flex flex-col gap-y-3 items-center justify-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Check out my latest work
          </h2>
          <p className="text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed text-balance text-center">
            I&apos;ve worked on a variety of projects, from simple websites to
            complex web applications. Here are a few of my favorites.
          </p>
        </div>
      </div>

      <div className="relative max-w-[900px] mx-auto w-full px-12">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex -ml-4">
            {slides.map((project, i) => (
              <div
                key={`${project.title}-${i}`}
                className="pl-4 flex-[0_0_85%] sm:flex-[0_0_70%] min-w-0"
              >
                <div data-tween>
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const base = selectedIndex - activeProject;
                emblaApi?.scrollTo(base + i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeProject
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
    </div>
  );
}
