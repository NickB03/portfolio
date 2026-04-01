"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import BlurFade from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

const cards = [
  {
    label: "Portfolio",
    url: "https://www.nickb.net",
    displayUrl: "nickb.net",
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/nickbohmer",
    displayUrl: "linkedin.com/in/nickbohmer",
  },
];

export default function QRPage() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const constraintsRef = useRef(null);

  const current = cards[index];

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setIndex((prev) => (prev + newDirection + cards.length) % cards.length);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      paginate(1);
    } else if (info.offset.x > threshold) {
      paginate(-1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 120 : -120, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -120 : 120, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-background px-4">
      {/* Flickering grid background */}
      <div className="absolute inset-0">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.3}
          maxOpacity={0.15}
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_70%)]" />
      </div>

      {/* Card */}
      <BlurFade delay={0.1} duration={0.6}>
        <div
          ref={constraintsRef}
          className={cn(
            "relative z-10 flex w-full max-w-sm flex-col items-center gap-6",
            "rounded-3xl border border-border bg-card/80 p-8 shadow-lg backdrop-blur-xl",
            "sm:p-10",
            "select-none touch-none"
          )}
        >
          {/* Header */}
          <BlurFade delay={0.25} duration={0.5}>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Nick Bohmer
              </h1>
              <p className="text-sm text-muted-foreground">
                Product Leader &amp; AI Builder
              </p>
            </div>
          </BlurFade>

          {/* Swipeable QR area */}
          <div className="relative h-[260px] w-[240px] overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={index}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 flex cursor-grab items-center justify-center active:cursor-grabbing"
              >
                <div
                  className={cn(
                    "rounded-2xl border border-border bg-white p-5",
                    "shadow-[0_0_60px_-12px_rgba(0,0,0,0.1)]",
                    "dark:shadow-[0_0_60px_-12px_rgba(255,255,255,0.06)]"
                  )}
                >
                  <QRCodeSVG
                    value={current.url}
                    size={200}
                    level="M"
                    marginSize={0}
                    bgColor="transparent"
                    fgColor="#0a0a0a"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* URL label + indicator dots */}
          <div className="flex flex-col items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.displayUrl}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
              >
                {current.displayUrl}
              </motion.p>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === index
                      ? "w-4 bg-foreground"
                      : "w-1.5 bg-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-16 bg-border" />

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Dallas, TX</span>
            <span className="text-border">|</span>
            <span>nbohmer@gmail.com</span>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
