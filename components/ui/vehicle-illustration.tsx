"use client";

import React from "react";

type Variant = "berline" | "berline_premium" | "suv" | "monospace" | "van";

interface Props {
  variant: Variant;
  className?: string;
}

const PALETTES: Record<Variant, { body: string; trim: string; accent: string }> = {
  berline:         { body: "#1f2937", trim: "#475569", accent: "#E04A1F" },
  berline_premium: { body: "#0f172a", trim: "#334155", accent: "#E04A1F" },
  suv:             { body: "#1e293b", trim: "#475569", accent: "#E04A1F" },
  monospace:       { body: "#1e293b", trim: "#475569", accent: "#E04A1F" },
  van:             { body: "#1e293b", trim: "#334155", accent: "#E04A1F" },
};

export function VehicleIllustration({ variant, className }: Props) {
  const c = PALETTES[variant];

  if (variant === "van" || variant === "monospace") {
    // Silhouette de van/monospace : carrosserie haute, vitrage long
    return (
      <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
        <defs>
          <linearGradient id={`grad-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.body} />
            <stop offset="100%" stopColor={c.trim} />
          </linearGradient>
        </defs>
        {/* Sol */}
        <ellipse cx="100" cy="92" rx="80" ry="4" fill="rgba(15,23,42,0.12)" />
        {/* Carrosserie */}
        <path
          d="M22 78 L22 50 Q22 40 32 38 L60 32 Q70 30 82 30 L160 30 Q172 30 178 38 L184 50 L184 78 Z"
          fill={`url(#grad-${variant})`}
        />
        {/* Bandeau accent */}
        <rect x="22" y="74" width="162" height="2" fill={c.accent} opacity="0.6" />
        {/* Vitrage */}
        <path
          d="M40 50 L40 38 Q40 36 42 36 L100 36 L100 50 Z"
          fill="#cbd5e1"
          opacity="0.85"
        />
        <path
          d="M104 50 L104 36 L160 36 Q166 36 168 40 L168 50 Z"
          fill="#cbd5e1"
          opacity="0.85"
        />
        {/* Montant central */}
        <rect x="100" y="34" width="3" height="18" fill={c.body} />
        {/* Phares */}
        <rect x="178" y="58" width="8" height="6" rx="2" fill="#fbbf24" />
        <rect x="14" y="58" width="8" height="6" rx="2" fill="#f87171" />
        {/* Roues */}
        <circle cx="56" cy="82" r="13" fill="#0f172a" />
        <circle cx="56" cy="82" r="6"  fill="#94a3b8" />
        <circle cx="150" cy="82" r="13" fill="#0f172a" />
        <circle cx="150" cy="82" r="6"  fill="#94a3b8" />
      </svg>
    );
  }

  if (variant === "suv") {
    return (
      <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
        <defs>
          <linearGradient id={`grad-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.body} />
            <stop offset="100%" stopColor={c.trim} />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="92" rx="80" ry="4" fill="rgba(15,23,42,0.12)" />
        {/* Carrosserie SUV : arrière haut, capot court */}
        <path
          d="M20 82 L20 60 Q20 50 30 47 L60 42 Q70 38 84 36 L138 32 Q150 30 162 36 L184 56 L184 82 Z"
          fill={`url(#grad-${variant})`}
        />
        {/* Vitrage */}
        <path
          d="M48 56 L60 44 Q66 40 76 40 L120 40 L130 56 Z"
          fill="#cbd5e1"
          opacity="0.85"
        />
        <path
          d="M134 56 L130 40 L150 40 Q156 40 160 44 L172 56 Z"
          fill="#cbd5e1"
          opacity="0.85"
        />
        {/* Bandeau accent */}
        <rect x="20" y="72" width="164" height="2" fill={c.accent} opacity="0.6" />
        {/* Phares */}
        <rect x="178" y="62" width="8" height="6" rx="2" fill="#fbbf24" />
        <rect x="14" y="62" width="8" height="6" rx="2" fill="#f87171" />
        <circle cx="58" cy="84" r="14" fill="#0f172a" />
        <circle cx="58" cy="84" r="7"  fill="#94a3b8" />
        <circle cx="148" cy="84" r="14" fill="#0f172a" />
        <circle cx="148" cy="84" r="7"  fill="#94a3b8" />
      </svg>
    );
  }

  // Berline & berline premium : silhouette plus basse, capot allongé
  return (
    <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id={`grad-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.body} />
          <stop offset="100%" stopColor={c.trim} />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="92" rx="80" ry="4" fill="rgba(15,23,42,0.12)" />
      <path
        d="M14 82 L14 66 Q14 60 22 58 L52 50 Q66 42 86 40 L120 40 Q138 42 152 52 L182 60 Q190 62 190 70 L190 82 Z"
        fill={`url(#grad-${variant})`}
      />
      {/* Vitrage */}
      <path
        d="M58 58 L70 46 Q78 44 88 44 L116 44 L130 58 Z"
        fill="#cbd5e1"
        opacity="0.9"
      />
      <path
        d="M134 58 L130 44 L142 44 Q150 46 156 50 L168 58 Z"
        fill="#cbd5e1"
        opacity="0.9"
      />
      {/* Bandeau accent */}
      <rect x="14" y="74" width="176" height="2" fill={c.accent} opacity="0.7" />
      {/* Phares */}
      <rect x="180" y="64" width="10" height="6" rx="2" fill="#fbbf24" />
      <rect x="10" y="64" width="8" height="6" rx="2" fill="#f87171" />
      <circle cx="56" cy="84" r="13" fill="#0f172a" />
      <circle cx="56" cy="84" r="6"  fill="#94a3b8" />
      <circle cx="150" cy="84" r="13" fill="#0f172a" />
      <circle cx="150" cy="84" r="6"  fill="#94a3b8" />
      {variant === "berline_premium" && (
        <rect x="92" y="32" width="16" height="6" rx="1" fill={c.accent} />
      )}
    </svg>
  );
}
