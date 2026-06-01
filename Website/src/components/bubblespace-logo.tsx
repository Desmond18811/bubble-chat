"use client";

import { cn } from "@/lib/utils";

interface BubblespaceLogoProps {
    className?: string;
}

export function BubblespaceLogo({ className }: BubblespaceLogoProps) {
    return (
        <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("h-8 w-8", className)}
        >
            {/* Top bubble */}
            <circle
                cx="20"
                cy="10"
                r="8"
                className="fill-primary"
            />
            {/* Bottom left bubble */}
            <circle
                cx="12"
                cy="26"
                r="8"
                className="fill-primary/70"
            />
            {/* Bottom right bubble */}
            <circle
                cx="28"
                cy="26"
                r="8"
                className="fill-primary/40"
            />
            {/* Connection lines (overlapping areas create the interconnected effect) */}
            <path
                d="M16 14 L14 20"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M24 14 L26 20"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M17 26 L23 26"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}
