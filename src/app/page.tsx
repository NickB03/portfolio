"use client";

/* eslint-disable @next/next/no-img-element */
import BlurFade from "@/components/magicui/blur-fade";
import BlurFadeText from "@/components/magicui/blur-fade-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DATA } from "@/data/resume";
import Link from "next/link";
import Markdown from "react-markdown";
import ContactSection from "@/components/section/contact-section";

import ProjectsSection from "@/components/section/projects-section";
import WorkSection from "@/components/section/work-section";
import UseCasesSection from "@/components/section/use-cases-section";
import { ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";

const BLUR_FADE_DELAY = 0.04;

export default function Page() {
  const [triggerKeys, setTriggerKeys] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleTrigger = (e: any) => {
      const id = e.detail;
      setTriggerKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };
    window.addEventListener("trigger-section-animation", handleTrigger);
    return () => window.removeEventListener("trigger-section-animation", handleTrigger);
  }, []);

  return (
    <main className="min-h-dvh flex flex-col gap-8 relative">
      <section id="hero">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <div className="gap-2 gap-y-6 flex flex-col md:flex-row justify-between">
            <div className="gap-2 flex flex-col order-2 md:order-1">
              <BlurFadeText
                delay={BLUR_FADE_DELAY}
                className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl"
                yOffset={8}
                text={DATA.name}
              />
              <BlurFadeText
                className="text-muted-foreground md:text-lg lg:text-xl"
                delay={BLUR_FADE_DELAY}
                text="Product Management Leader · Network Security & AI"
              />

            </div>
            <BlurFade delay={BLUR_FADE_DELAY} className="order-1 md:order-2">
              <Avatar className="size-24 md:size-32 border rounded-full shadow-lg ring-4 ring-muted">
                <AvatarImage alt={DATA.name} src={DATA.avatarUrl} />
                <AvatarFallback>{DATA.initials}</AvatarFallback>
              </Avatar>
            </BlurFade>
          </div>
        </div>
      </section>
      <section id="about">
        <div className="flex min-h-0 flex-col gap-y-4">
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <h2 className="text-xl font-bold">About</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <div className="prose max-w-full text-pretty font-sans leading-relaxed text-muted-foreground dark:prose-invert">
              <Markdown>
                {DATA.summary}
              </Markdown>
            </div>
          </BlurFade>
        </div>
      </section>
      <section id="projects">
        <BlurFade key={triggerKeys["projects"]} delay={BLUR_FADE_DELAY * 11}>
          <ProjectsSection />
        </BlurFade>
      </section>
      <section id="use-cases">
        <BlurFade key={triggerKeys["use-cases"]} delay={BLUR_FADE_DELAY * 13}>
          <UseCasesSection />
        </BlurFade>
      </section>
      <section id="work">
        <div className="flex min-h-0 flex-col gap-y-6">
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <h2 className="text-xl font-bold">Work Experience</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <WorkSection />
          </BlurFade>
        </div>
      </section>





      <section id="contact">
        <BlurFade delay={BLUR_FADE_DELAY * 16}>
          <ContactSection />
        </BlurFade>
      </section>
    </main>
  );
}
