import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { getSecureMediaUrl } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string;
  url?: string;
  className?: string;
}

const backgrounds = [
  "linear-gradient(135deg, #ef4444, #991b1b)",
  "linear-gradient(135deg, #f97316, #9a3412)",
  "linear-gradient(135deg, #eab308, #854d0e)",
  "linear-gradient(135deg, #22c55e, #166534)",
  "linear-gradient(135deg, #06b6d4, #155e75)",
  "linear-gradient(135deg, #3b82f6, #1e40af)",
  "linear-gradient(135deg, #a855f7, #6b21a8)",
  "linear-gradient(135deg, #ec4899, #9d174d)"
];

function getHashIndex(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % backgrounds.length;
}

function Initials({ name, className }: { name: string; className?: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const bg = name ? backgrounds[getHashIndex(name)] : "var(--th-surface-top)";
  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center font-bold text-white", className)}
      style={{ background: bg, width: "100%", height: "100%", borderRadius: "inherit" }}
    >
      {initial}
    </div>
  );
}

export function AvatarInitials({ name, url, className }: AvatarInitialsProps) {
  const [imgError, setImgError] = useState(false);

  let finalUrl = getSecureMediaUrl(url);
  if (finalUrl && finalUrl.startsWith('/') && !finalUrl.startsWith('//')) {
    const baseUrl = ((import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');
    finalUrl = `${baseUrl}${finalUrl}`;
  }

  if (finalUrl && !imgError) {
    return (
      <img
        src={finalUrl}
        alt={name || "Avatar"}
        className={cn("object-cover", className)}
        style={{ display: "block", width: "100%", height: "100%", borderRadius: "inherit" }}
        onError={() => setImgError(true)}
      />
    );
  }

  return <Initials name={name} className={className} />;
}
