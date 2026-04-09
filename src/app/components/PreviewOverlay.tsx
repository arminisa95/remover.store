"use client";

import React from "react";

interface PreviewOverlayProps {
  children: React.ReactNode;
  className?: string;
}

export default function PreviewOverlay({ children, className = "" }: PreviewOverlayProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {children}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 -rotate-[25deg] scale-150 opacity-[0.13]">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="text-black font-extrabold tracking-widest whitespace-nowrap"
              style={{ fontSize: "clamp(1.2rem, 4vw, 2.5rem)" }}
            >
              PREVIEW &nbsp; PREVIEW &nbsp; PREVIEW &nbsp; PREVIEW
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
