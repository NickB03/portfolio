/* eslint-disable @next/next/no-img-element */
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Markdown from "react-markdown";

function ProjectImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return <div className={cn("w-full h-48 bg-muted", className)} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("w-full h-48 object-cover", className)}
      onError={() => setImageError(true)}
    />
  );
}

interface Props {
  title: string;
  href?: string;
  description: string;
  dates: string;
  tags: readonly string[];
  link?: string;
  image?: string;
  video?: string;
  links?: readonly {
    icon: React.ReactNode;
    type: string;
    href: string;
  }[];
  className?: string;
  imageClassName?: string;
}

export function ProjectCard({
  title,
  href,
  description,
  dates,
  tags,
  image,
  video,
  links,
  className,
  imageClassName,
}: Props) {
  const isExternal = href?.startsWith("http");

  return (
    <div
      className={cn(
        "relative group flex flex-col h-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-all duration-300",
        href &&
          "cursor-pointer hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5 hover:ring-1 hover:ring-foreground/10 active:scale-[0.99] focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/60",
        className
      )}
    >
      {href && (
        <Link
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none"
          aria-label={`Open ${title}`}
        />
      )}

      <div className={cn("relative shrink-0 overflow-hidden", imageClassName)}>
        {video ? (
          <video
            src={video}
            autoPlay
            loop
            muted
            playsInline
            className={cn(
              "w-full h-48 object-cover transition duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-105",
              imageClassName
            )}
          />
        ) : image ? (
          <ProjectImage
            src={image}
            alt={title}
            className={cn(
              "transition duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-105",
              imageClassName
            )}
          />
        ) : (
          <div className={cn("w-full h-48 bg-muted", imageClassName)} />
        )}
        {links && links.length > 0 && (
          <div className="absolute top-2 right-2 z-30 flex flex-wrap gap-2">
            {links.map((link, idx) => (
              <Link
                href={link.href}
                key={idx}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  className="flex items-center gap-1.5 text-xs bg-black text-white hover:bg-black/90"
                  variant="default"
                >
                  {link.icon}
                  {link.type}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">{title}</h3>
            <time className="text-xs text-muted-foreground">{dates}</time>
          </div>
          {href && (
            <span
              aria-hidden="true"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-200 group-hover:border-foreground/20 group-hover:text-foreground"
            >
              View project
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
        <div className="text-xs flex-1 prose max-w-full text-pretty font-sans leading-relaxed text-muted-foreground dark:prose-invert">
          <Markdown>{description}</Markdown>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {tags.map((tag) => (
              <Badge
                key={tag}
                className="text-[11px] font-medium border border-border h-6 w-fit px-2"
                variant="outline"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
