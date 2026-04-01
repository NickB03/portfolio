"use client";

import { QRCodeSVG } from "qrcode.react";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import BlurFade from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

export default function QRPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4">
      {/* Flickering grid background */}
      <div className="absolute inset-0">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.3}
          maxOpacity={0.15}
          className="h-full w-full"
        />
        {/* Radial fade so the grid fades out toward edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_70%)]" />
      </div>

      {/* Card */}
      <BlurFade delay={0.1} duration={0.6}>
        <div
          className={cn(
            "relative z-10 flex w-full max-w-sm flex-col items-center gap-6",
            "rounded-3xl border border-border bg-card/80 p-8 shadow-lg backdrop-blur-xl",
            "sm:p-10"
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

          {/* QR Code with styled border */}
          <BlurFade delay={0.4} duration={0.5}>
            <div
              className={cn(
                "rounded-2xl border border-border bg-white p-5",
                "shadow-[0_0_60px_-12px_rgba(0,0,0,0.1)]",
                "dark:shadow-[0_0_60px_-12px_rgba(255,255,255,0.06)]"
              )}
            >
              <QRCodeSVG
                value="https://www.nickb.net"
                size={200}
                level="M"
                marginSize={0}
                bgColor="transparent"
                fgColor="#0a0a0a"
              />
            </div>
          </BlurFade>

          {/* URL label */}
          <BlurFade delay={0.55} duration={0.5}>
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              nickb.net
            </p>
          </BlurFade>

          {/* Divider */}
          <BlurFade delay={0.65} duration={0.5}>
            <div className="h-px w-16 bg-border" />
          </BlurFade>

          {/* Footer links */}
          <BlurFade delay={0.75} duration={0.5}>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Dallas, TX</span>
              <span className="text-border">|</span>
              <span>nbohmer@gmail.com</span>
            </div>
          </BlurFade>
        </div>
      </BlurFade>
    </div>
  );
}
