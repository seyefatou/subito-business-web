# Refonte Activité & Logement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre les pages détail `service-reservations/activite/[id]` et `service-reservations/logement/[id]` en layout éditorial immersif (hero pleine largeur + 2 colonnes avec ReserveCard sticky + section avis).

**Architecture:** Extraction de 7 composants partagés dans `components/service-reservations/detail/` puis réécriture des deux pages comme assemblages déclaratifs. Variations entre activité et logement via props (badges, stats, sections).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui (Button, Badge), framer-motion, lucide-react, react-query (déjà en place).

**Project conventions (from memory):**
- **No test framework** : pas de jest/vitest. Vérification = `npx tsc --noEmit` + `npm run lint` + vérification manuelle navigateur. Les étapes "test" du template TDD sont remplacées par des étapes de vérification visuelle/compilation.
- **No UI for unsupported backend features** : tous les champs utilisés viennent des types existants (`Circuit`, `Activite`, `Logement`, `AvisResponse`).

**Spec source :** `docs/superpowers/specs/2026-04-29-redesign-activite-logement-design.md`

---

## File Structure

**Created files:**
```
components/service-reservations/detail/
├── SectionTitle.tsx          # Titre de section (accent orange + trait)
├── StatsKeyRow.tsx           # Rangée horizontale chiffres en pull-out (avec counter animé)
├── HeroImmersif.tsx          # Hero pleine largeur + galerie + overlay + badge
├── ReserveCard.tsx           # Card sticky desktop + bottom-bar mobile (responsive interne)
├── AvisSection.tsx           # Section avis pleine largeur (en-tête + grille + pagination)
├── DetailSkeleton.tsx        # Skeleton loader cohérent
└── DetailNotFound.tsx        # Empty state avec cercle dégradé orange
```

**Modified files (réécriture complète) :**
```
app/(dashboard)/service-reservations/activite/[id]/page.tsx
app/(dashboard)/service-reservations/logement/[id]/page.tsx
```

**Verification commands** (à utiliser à chaque tâche) :
- `npx tsc --noEmit` — TypeScript propre
- `npm run lint` — ESLint propre
- Manual : `npm run dev` puis navigation sur les pages cibles

---

## Task 1 : SectionTitle component

**Files:**
- Create: `components/service-reservations/detail/SectionTitle.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from "react";

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionTitle({ children, className = "" }: SectionTitleProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-600">
        {children}
      </h3>
      <div className="mt-2 w-6 h-0.5 bg-orange-500 rounded-full" />
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add components/service-reservations/detail/SectionTitle.tsx
git commit -m "feat(service-reservations): add SectionTitle component for detail pages"
```

---

## Task 2 : StatsKeyRow component

**Files:**
- Create: `components/service-reservations/detail/StatsKeyRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, useInView } from "framer-motion";

export interface StatItem {
  value: string | number;
  label: string;
  animated?: boolean;
}

interface StatsKeyRowProps {
  stats: StatItem[];
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = motionVal.on("change", (latest) => {
      setDisplay(Math.round(latest));
    });
    return () => unsub();
  }, [motionVal]);

  useEffect(() => {
    if (inView) {
      const controls = animate(motionVal, value, { duration: 0.8, ease: "easeOut" });
      return () => controls.stop();
    }
  }, [inView, value, motionVal]);

  return <span ref={ref}>{display}</span>;
}

export default function StatsKeyRow({ stats }: StatsKeyRowProps) {
  if (stats.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-around gap-y-4 py-6 border-y border-slate-200">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`flex-1 min-w-[120px] text-center px-4 ${
            idx > 0 ? "border-l border-slate-200" : ""
          }`}
        >
          <div className="text-3xl font-bold text-slate-900">
            {stat.animated && typeof stat.value === "number" ? (
              <AnimatedNumber value={stat.value} />
            ) : (
              stat.value
            )}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/service-reservations/detail/StatsKeyRow.tsx
git commit -m "feat(service-reservations): add StatsKeyRow with animated counters"
```

---

## Task 3 : HeroImmersif component

**Files:**
- Create: `components/service-reservations/detail/HeroImmersif.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, ImageIcon, MapPin } from "lucide-react";

export interface HeroBadge {
  label: string;
  color: "orange" | "blue" | "emerald" | "amber" | "slate";
}

interface HeroImmersifProps {
  images: string[];
  title: string;
  location?: string;
  price?: number | null;
  priceUnit?: string;
  badge?: HeroBadge;
  onBack: () => void;
}

const badgeColorMap: Record<HeroBadge["color"], string> = {
  orange: "bg-orange-500/90 text-white",
  blue: "bg-blue-600/90 text-white",
  emerald: "bg-emerald-600/90 text-white",
  amber: "bg-amber-500/90 text-white",
  slate: "bg-slate-700/90 text-white",
};

export default function HeroImmersif({
  images,
  title,
  location,
  price,
  priceUnit,
  badge,
  onBack,
}: HeroImmersifProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasImages = images.length > 0;

  const next = () => setCurrentIndex((p) => (p + 1) % images.length);
  const prev = () => setCurrentIndex((p) => (p - 1 + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="relative h-[28rem] md:h-[32rem] rounded-3xl overflow-hidden bg-slate-100">
        {hasImages ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={title}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </AnimatePresence>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-20 h-20 text-slate-300" />
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(255, 120, 66, 0.25) 0%, transparent 60%)",
          }}
        />

        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 text-white flex items-center justify-center transition"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Carrousel controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 text-white flex items-center justify-center transition"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 text-white flex items-center justify-center transition"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots indicateur */}
            <div className="absolute bottom-32 md:bottom-36 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                  aria-label={`Aller à l'image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Contenu superposé en bas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex items-end justify-between gap-4 flex-wrap"
        >
          <div className="flex-1 min-w-0">
            {badge && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md mb-3 ${badgeColorMap[badge.color]}`}
              >
                {badge.label}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {title}
            </h1>
            {location && (
              <div className="flex items-center gap-1.5 text-white/85 mt-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{location}</span>
              </div>
            )}
          </div>
          {price != null && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-white">
                {price.toLocaleString()}{" "}
                <span className="text-base font-normal text-white/80">FCFA</span>
              </p>
              {priceUnit && <p className="text-sm text-white/70">{priceUnit}</p>}
            </div>
          )}
        </motion.div>
      </div>

      {/* Miniatures */}
      {images.length > 1 && (
        <div className="bg-slate-50 rounded-2xl p-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition ${
                i === currentIndex
                  ? "border-orange-500"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={img}
                alt={`${title} ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/service-reservations/detail/HeroImmersif.tsx
git commit -m "feat(service-reservations): add HeroImmersif with gallery and overlay"
```

---

## Task 4 : ReserveCard component

**Files:**
- Create: `components/service-reservations/detail/ReserveCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReserveSummaryItem {
  icon: React.ReactNode;
  label: string;
}

export interface ReserveDateField {
  label: string;
  placeholder: string;
}

interface ReserveCardProps {
  price?: number | null;
  priceUnit?: string;
  rating?: number | null;
  reviewsCount?: number | null;
  summary?: ReserveSummaryItem[];
  dateFields?: [ReserveDateField, ReserveDateField];
  ctaLabel: string;
  onReserve: () => void;
  onCancel: () => void;
}

export default function ReserveCard({
  price,
  priceUnit,
  rating,
  reviewsCount,
  summary = [],
  dateFields,
  ctaLabel,
  onReserve,
  onCancel,
}: ReserveCardProps) {
  const Header = (
    <div>
      {price != null && (
        <p className="text-3xl font-bold text-slate-900">
          {price.toLocaleString()}{" "}
          <span className="text-base font-normal text-slate-500">FCFA</span>
        </p>
      )}
      {priceUnit && <p className="text-sm text-slate-500">{priceUnit}</p>}
      {rating != null && reviewsCount != null && reviewsCount > 0 && (
        <div className="flex items-center gap-1 mt-2 text-sm">
          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
          <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{reviewsCount} avis</span>
        </div>
      )}
    </div>
  );

  const DateFields = dateFields && (
    <div
      onClick={onReserve}
      className="grid grid-cols-2 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-orange-400 transition"
    >
      {dateFields.map((f, i) => (
        <div
          key={i}
          className={`p-3 ${i === 0 ? "border-r border-slate-200" : ""}`}
        >
          <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
            {f.label}
          </p>
          <p className="text-sm text-slate-700 mt-0.5">{f.placeholder}</p>
        </div>
      ))}
    </div>
  );

  const Summary = summary.length > 0 && (
    <div className="space-y-2">
      {summary.map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
          {s.icon}
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );

  const CTAs = (
    <div className="space-y-2">
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onReserve}
          className="gradient-subito text-white border-0 w-full h-12 font-semibold shadow-md hover:shadow-lg transition-shadow"
        >
          <Check className="w-4 h-4 mr-2" />
          {ctaLabel}
        </Button>
      </motion.div>
      <Button onClick={onCancel} variant="outline" className="w-full">
        Annuler
      </Button>
    </div>
  );

  const Footer = (
    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
      <Shield className="w-3 h-3" />
      <span>Annulation flexible · Paiement sécurisé</span>
    </div>
  );

  return (
    <>
      {/* Desktop : sticky card */}
      <aside className="hidden lg:block sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {Header}
        {DateFields}
        {Summary}
        <div className="border-t border-slate-100" />
        {CTAs}
        {Footer}
      </aside>

      {/* Mobile : bottom-bar fixe */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {price != null && (
              <p className="text-lg font-bold text-orange-600">
                {price.toLocaleString()} FCFA
                {priceUnit && (
                  <span className="text-xs font-normal text-slate-500"> {priceUnit}</span>
                )}
              </p>
            )}
            {rating != null && reviewsCount != null && reviewsCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                {rating.toFixed(1)} · {reviewsCount} avis
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={onCancel} variant="outline" size="sm">
              Annuler
            </Button>
            <Button
              onClick={onReserve}
              className="gradient-subito text-white border-0"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/service-reservations/detail/ReserveCard.tsx
git commit -m "feat(service-reservations): add ReserveCard with sticky desktop and bottom-bar mobile"
```

---

## Task 5 : AvisSection component

**Files:**
- Create: `components/service-reservations/detail/AvisSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvisResponse } from "@/lib/api";

interface AvisSectionProps {
  avisData: AvisResponse | undefined;
  page: number;
  onPageChange: (page: number) => void;
}

const CRITERIA: { key: keyof AvisResponse["moyennes"]; label: string }[] = [
  { key: "noteService", label: "Service" },
  { key: "notePrestataire", label: "Prestataire" },
  { key: "noteRapportQualitePrix", label: "Qualité/Prix" },
  { key: "notePonctualite", label: "Ponctualité" },
];

export default function AvisSection({ avisData, page, onPageChange }: AvisSectionProps) {
  if (!avisData) return null;

  if (avisData.total === 0) {
    return (
      <section className="mt-16 bg-slate-50/50 rounded-3xl p-10 text-center">
        <Star className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Aucun avis pour le moment</p>
      </section>
    );
  }

  return (
    <section className="mt-16 bg-slate-50/50 rounded-3xl p-6 md:p-8">
      {/* En-tête en grille 2 colonnes */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-10 pb-8 border-b border-slate-200">
        <div>
          <p className="text-6xl font-bold text-slate-900 leading-none">
            {avisData.moyennes.globale.toFixed(1)}
          </p>
          <div className="flex gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(avisData.moyennes.globale)
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-slate-300"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Basé sur {avisData.total} avis
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {CRITERIA.map(({ key, label }) => {
            const val = avisData.moyennes[key];
            const pct = (val / 5) * 100;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-700">{val.toFixed(1)}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des avis */}
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {avisData.data.map((avis, idx) => {
          const computedNote =
            avis.note ||
            ((avis.noteService || 0) +
              (avis.notePrestataire || 0) +
              (avis.noteRapportQualitePrix || 0) +
              (avis.notePonctualite || 0)) /
              4;
          const authorName = avis.customer
            ? `${avis.customer.prenom || ""} ${avis.customer.nom || ""}`.trim()
            : avis.auteur;
          return (
            <motion.div
              key={avis.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="bg-white rounded-2xl p-5 border border-slate-100 relative"
            >
              <Quote className="w-6 h-6 text-orange-200 absolute top-4 right-4" />
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {Array.from({ length: Math.round(computedNote) }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                {authorName && (
                  <span className="text-sm font-medium text-slate-700">{authorName}</span>
                )}
              </div>
              {avis.createdAt && (
                <p className="text-xs text-slate-400 mb-2">
                  {new Date(avis.createdAt).toLocaleDateString("fr-FR")}
                </p>
              )}
              {avis.commentaire && (
                <p className="text-sm text-slate-700 leading-relaxed">{avis.commentaire}</p>
              )}
              {avis.reponsePartenaire && (
                <div className="mt-3 pl-3 border-l-2 border-orange-300">
                  <p className="text-xs font-semibold text-orange-600 mb-0.5">
                    Réponse du partenaire
                  </p>
                  <p className="text-sm text-slate-600">{avis.reponsePartenaire}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {avisData.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">
            {page} / {avisData.pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= avisData.pages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/service-reservations/detail/AvisSection.tsx
git commit -m "feat(service-reservations): add AvisSection with rating bars and animated grid"
```

---

## Task 6 : DetailSkeleton + DetailNotFound components

**Files:**
- Create: `components/service-reservations/detail/DetailSkeleton.tsx`
- Create: `components/service-reservations/detail/DetailNotFound.tsx`

- [ ] **Step 1: Create DetailSkeleton**

```tsx
import React from "react";

export default function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 pb-24">
      {/* Hero skeleton */}
      <div className="h-[28rem] md:h-[32rem] rounded-3xl bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 animate-pulse" />

      {/* Content grid skeleton */}
      <div className="grid lg:grid-cols-12 gap-8 mt-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Identité */}
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
          </div>

          {/* Stats row */}
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
          </div>

          {/* Section block */}
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right column (ReserveCard) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DetailNotFound**

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetailNotFoundProps {
  icon: React.ReactNode;
  title: string;
  onBack: () => void;
}

export default function DetailNotFound({ icon, title, onBack }: DetailNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-500/30"
      >
        {icon}
      </motion.div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 mb-6">L&apos;élément demandé n&apos;a pas pu être trouvé.</p>
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/service-reservations/detail/DetailSkeleton.tsx components/service-reservations/detail/DetailNotFound.tsx
git commit -m "feat(service-reservations): add DetailSkeleton and DetailNotFound states"
```

---

## Task 7 : Refonte page Logement

**Files:**
- Modify: `app/(dashboard)/service-reservations/logement/[id]/page.tsx` (réécriture complète)

- [ ] **Step 1: Replace the entire file**

```tsx
'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Home,
  Bath,
  Bed,
  Users,
  Clock,
  CalendarX,
  CigaretteOff,
  PawPrint,
  PartyPopper,
  VolumeX,
  UserCheck,
  Navigation,
  Shield,
  UtensilsCrossed,
  Tv,
  Dumbbell,
  Accessibility,
  TreePine,
  WashingMachine,
  Plane,
  Car,
  Check,
  MapPin,
  Star,
  Calendar,
} from "lucide-react";
import { api, Logement, AvisResponse } from "@/lib/api";
import HeroImmersif from "@/components/service-reservations/detail/HeroImmersif";
import ReserveCard from "@/components/service-reservations/detail/ReserveCard";
import StatsKeyRow from "@/components/service-reservations/detail/StatsKeyRow";
import SectionTitle from "@/components/service-reservations/detail/SectionTitle";
import AvisSection from "@/components/service-reservations/detail/AvisSection";
import DetailSkeleton from "@/components/service-reservations/detail/DetailSkeleton";
import DetailNotFound from "@/components/service-reservations/detail/DetailNotFound";

const equipementIcons: Record<string, React.ReactNode> = {
  cuisine: <UtensilsCrossed className="w-4 h-4 text-orange-500" />,
  securite: <Shield className="w-4 h-4 text-red-500" />,
  services: <UserCheck className="w-4 h-4 text-blue-500" />,
  multimedia: <Tv className="w-4 h-4 text-purple-500" />,
  salleDeBain: <WashingMachine className="w-4 h-4 text-cyan-500" />,
  chambreLinge: <Bed className="w-4 h-4 text-indigo-500" />,
  exterieurVue: <TreePine className="w-4 h-4 text-green-500" />,
  accessibilite: <Accessibility className="w-4 h-4 text-teal-500" />,
  bienEtreLoisirs: <Dumbbell className="w-4 h-4 text-pink-500" />,
  parkingTransport: <Car className="w-4 h-4 text-slate-500" />,
};

const equipementLabels: Record<string, string> = {
  cuisine: "Cuisine",
  securite: "Sécurité",
  services: "Services",
  multimedia: "Multimédia",
  salleDeBain: "Salle de bain",
  chambreLinge: "Chambre & Linge",
  exterieurVue: "Extérieur & Vue",
  accessibilite: "Accessibilité",
  bienEtreLoisirs: "Bien-être & Loisirs",
  parkingTransport: "Parking & Transport",
};

const lieuLabels: Record<string, string> = {
  plages: "Plages",
  aeroports: "Aéroports",
  restaurants: "Restaurants & Commerces",
};

const lieuIcons: Record<string, React.ReactNode> = {
  plages: <TreePine className="w-4 h-4 text-blue-500" />,
  aeroports: <Plane className="w-4 h-4 text-slate-500" />,
  restaurants: <UtensilsCrossed className="w-4 h-4 text-orange-500" />,
};

export default function LogementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const logementId = Number(params.id);
  const returnTo = searchParams.get("returnTo") || "/service-reservations?type=LOGEMENT";

  const [avisPage, setAvisPage] = useState(1);

  const { data: logementResponse, isLoading } = useQuery({
    queryKey: ["logement-public", logementId],
    queryFn: () => api.logements.getPublic(logementId),
    enabled: !!logementId,
  });

  const logement: Logement | undefined = logementResponse?.data;

  const { data: avisResponse } = useQuery({
    queryKey: ["logement-avis", logementId, avisPage],
    queryFn: () => api.avis.logement(logementId, avisPage, 10),
    enabled: !!logementId,
  });

  const avisData: AvisResponse | undefined = (avisResponse?.data as AvisResponse)?.moyennes
    ? avisResponse?.data
    : (avisResponse as unknown as AvisResponse)?.moyennes
      ? (avisResponse as unknown as AvisResponse)
      : undefined;

  if (isLoading) return <DetailSkeleton />;

  if (!logement) {
    return (
      <DetailNotFound
        icon={<Home className="w-14 h-14" />}
        title="Logement introuvable"
        onBack={() => router.push(returnTo)}
      />
    );
  }

  const handleReserve = () => router.push(`${returnTo}&logementId=${logement.id}`);
  const handleCancel = () => router.push(returnTo);

  const images = logement.images || [];
  const locationStr = [logement.quartier, logement.ville, logement.pays].filter(Boolean).join(", ");

  // Stats : participants · chambres · salles de bain · check-in/out
  const stats = [
    logement.capacite != null && {
      value: logement.capacite,
      label: "Personnes",
      animated: true,
    },
    logement.nbreChambres != null && {
      value: logement.nbreChambres,
      label: logement.nbreChambres > 1 ? "Chambres" : "Chambre",
      animated: true,
    },
    logement.salleDeBain != null && {
      value: logement.salleDeBain,
      label: logement.salleDeBain > 1 ? "Salles de bain" : "Salle de bain",
      animated: true,
    },
    (logement.heureCheckIn || logement.heureCheckOut) && {
      value: `${logement.heureCheckIn || "?"} → ${logement.heureCheckOut || "?"}`,
      label: "Arrivée / Départ",
    },
  ].filter(Boolean) as { value: string | number; label: string; animated?: boolean }[];

  // Drop cap : appliquer seulement si description > 100 chars
  const showDropCap = (logement.description?.length || 0) > 100;

  // Badge type
  const badgeLabel = logement.type
    ? `${logement.type}${logement.nbreEtoiles ? ` · ${logement.nbreEtoiles}★` : ""}`
    : "Logement";

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24 lg:pb-8">
      <HeroImmersif
        images={images}
        title={logement.nom}
        location={locationStr || undefined}
        price={logement.prixParNuit}
        priceUnit="/ nuit"
        badge={{ label: badgeLabel, color: "amber" }}
        onBack={() => router.push(returnTo)}
      />

      <div className="grid lg:grid-cols-12 gap-8 mt-8">
        {/* Colonne narrative */}
        <div className="lg:col-span-8 space-y-10">
          {/* Identité */}
          {logement.partner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 pb-4 border-b border-slate-100"
            >
              {logement.partner.logo && (
                <img
                  src={logement.partner.logo}
                  alt={logement.partner.nomPartner}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Proposé par</p>
                <p className="font-semibold text-slate-800">{logement.partner.nomPartner}</p>
              </div>
            </motion.div>
          )}

          {/* Stats key */}
          {stats.length > 0 && <StatsKeyRow stats={stats} />}

          {/* Instructions d'accès */}
          {logement.instructionsAcces && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3 bg-blue-50/50 border-l-4 border-blue-500 rounded-r-lg p-4"
            >
              <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Instructions d&apos;accès
                </p>
                <p className="text-sm text-slate-600 mt-0.5">{logement.instructionsAcces}</p>
              </div>
            </motion.div>
          )}

          {/* Description */}
          {logement.description && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle>À propos</SectionTitle>
              <p
                className={`text-base leading-relaxed text-slate-700 whitespace-pre-line ${
                  showDropCap
                    ? "first-letter:text-5xl first-letter:font-bold first-letter:text-orange-500 first-letter:mr-2 first-letter:float-left first-letter:leading-none"
                    : ""
                }`}
              >
                {logement.description}
              </p>
            </motion.section>
          )}

          {/* Équipements */}
          {logement.equipementsDetail &&
            Object.keys(logement.equipementsDetail).length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4 }}
              >
                <SectionTitle>Équipements & Services</SectionTitle>
                <div className="space-y-5">
                  {Object.entries(logement.equipementsDetail).map(([key, items]) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={key}>
                        <div className="flex items-center gap-2 mb-2">
                          {equipementIcons[key] || <Check className="w-4 h-4 text-orange-500" />}
                          <h4 className="text-sm font-semibold text-slate-700">
                            {equipementLabels[key] || key}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((item, i) => (
                            <span
                              key={i}
                              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

          {/* Fallback équipements simples */}
          {(!logement.equipementsDetail ||
            Object.keys(logement.equipementsDetail).length === 0) &&
            logement.equipements &&
            logement.equipements.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4 }}
              >
                <SectionTitle>Équipements</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {logement.equipements.map((eq, i) => (
                    <span
                      key={i}
                      className="text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </motion.section>
            )}

          {/* Lieux proches */}
          {logement.lieuxProches && Object.keys(logement.lieuxProches).length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle>À proximité</SectionTitle>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(logement.lieuxProches).map(([key, lieux]) => {
                  if (!lieux || lieux.length === 0) return null;
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {lieuIcons[key] || <MapPin className="w-4 h-4 text-orange-500" />}
                        <h4 className="text-sm font-semibold text-slate-700">
                          {lieuLabels[key] || key}
                        </h4>
                      </div>
                      <div className="space-y-1.5">
                        {lieux.map((lieu, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 truncate pr-2">
                              {lieu.nom}
                              {lieu.type ? ` (${lieu.type})` : ""}
                            </span>
                            <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded shrink-0">
                              {lieu.distance}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* Règles de la maison */}
          {(logement.politiqueFumeur ||
            logement.animauxCompagnie ||
            logement.fetesAutorisees !== undefined ||
            logement.heuresSilencieusesDebut ||
            logement.ageMinimum) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle>Règles de la maison</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-3">
                {logement.politiqueFumeur && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <CigaretteOff className="w-4 h-4 text-red-500 shrink-0" />
                    <span>
                      {logement.politiqueFumeur === "NON_FUMEUR"
                        ? "Non fumeur"
                        : logement.politiqueFumeur.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                {logement.animauxCompagnie && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <PawPrint className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Animaux :{" "}
                      {logement.animauxCompagnie === "NON_AUTORISES"
                        ? "Non autorisés"
                        : logement.animauxCompagnie.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                {logement.fetesAutorisees !== undefined && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <PartyPopper className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Fêtes : {logement.fetesAutorisees ? "Autorisées" : "Non autorisées"}</span>
                  </div>
                )}
                {logement.heuresSilencieusesDebut && logement.heuresSilencieusesFin && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <VolumeX className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      Heures silencieuses : {logement.heuresSilencieusesDebut} -{" "}
                      {logement.heuresSilencieusesFin}
                    </span>
                  </div>
                )}
                {logement.ageMinimum != null && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Âge minimum : {logement.ageMinimum} ans</span>
                  </div>
                )}
              </div>
              {logement.autresRegles && (
                <p className="text-sm text-slate-500 mt-3 italic">{logement.autresRegles}</p>
              )}
            </motion.section>
          )}

          {/* Politique d'annulation */}
          {logement.typeAnnulation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3 bg-slate-50 rounded-lg p-4"
            >
              <CalendarX className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Politique d&apos;annulation
                </p>
                <p className="text-sm text-slate-600 mt-0.5">{logement.typeAnnulation}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Colonne ReserveCard (desktop) */}
        <div className="lg:col-span-4">
          <ReserveCard
            price={logement.prixParNuit}
            priceUnit="par nuit"
            rating={logement.averageRating}
            reviewsCount={logement.totalAvis}
            summary={[
              logement.capacite != null && {
                icon: <Users className="w-4 h-4 text-orange-500" />,
                label: `${logement.capacite} personne${logement.capacite > 1 ? "s" : ""} max`,
              },
              logement.nbreChambres != null && {
                icon: <Bed className="w-4 h-4 text-orange-500" />,
                label: `${logement.nbreChambres} chambre${logement.nbreChambres > 1 ? "s" : ""}`,
              },
              logement.salleDeBain != null && {
                icon: <Bath className="w-4 h-4 text-orange-500" />,
                label: `${logement.salleDeBain} salle${logement.salleDeBain > 1 ? "s" : ""} de bain`,
              },
            ].filter(Boolean) as { icon: React.ReactNode; label: string }[]}
            dateFields={[
              { label: "Arrivée", placeholder: "Sélectionner" },
              { label: "Départ", placeholder: "Sélectionner" },
            ]}
            ctaLabel="Réserver"
            onReserve={handleReserve}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Section avis pleine largeur */}
      <AvisSection avisData={avisData} page={avisPage} onPageChange={setAvisPage} />
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors on the modified file.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev` (if not already running) and navigate to a logement detail page (e.g., `/service-reservations/logement/1?returnTo=/service-reservations?type=LOGEMENT`).

Verify:
- Hero immersif s'affiche avec image + overlay + badge ambre + titre + prix superposés
- Bouton retour glassmorphism visible en haut-gauche du hero
- Sur desktop ≥ 1024px : layout 2 colonnes, ReserveCard sticky à droite
- Sur mobile < 1024px : stack vertical, bottom-bar fixe en bas
- Stats-key en pull-out avec animation counter à l'entrée
- Lettrine orange visible si description > 100 chars
- Sections introduites par titre orange + trait
- Avis affichent en grille 2 colonnes avec en-tête bicolonne (note + critères)
- CTA Réserver navigue avec `logementId` en query param

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/service-reservations/logement/[id]/page.tsx
git commit -m "feat(logement): refonte page detail en layout editorial immersif"
```

---

## Task 8 : Refonte page Activité

**Files:**
- Modify: `app/(dashboard)/service-reservations/activite/[id]/page.tsx` (réécriture complète)

- [ ] **Step 1: Replace the entire file**

```tsx
'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Compass,
  Route,
  Users,
  Clock,
  CalendarX,
  Banknote,
  Check,
  X,
} from "lucide-react";
import { api, Circuit, Activite, AvisResponse } from "@/lib/api";
import HeroImmersif from "@/components/service-reservations/detail/HeroImmersif";
import ReserveCard from "@/components/service-reservations/detail/ReserveCard";
import StatsKeyRow from "@/components/service-reservations/detail/StatsKeyRow";
import SectionTitle from "@/components/service-reservations/detail/SectionTitle";
import AvisSection from "@/components/service-reservations/detail/AvisSection";
import DetailSkeleton from "@/components/service-reservations/detail/DetailSkeleton";
import DetailNotFound from "@/components/service-reservations/detail/DetailNotFound";

export default function ActiviteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = Number(params.id);
  const itemType = (searchParams.get("type") as "circuit" | "activite") || "activite";
  const returnTo =
    searchParams.get("returnTo") || "/service-reservations?type=ACTIVITE";
  const isCircuit = itemType === "circuit";

  const [avisPage, setAvisPage] = useState(1);

  const { data: circuitResponse, isLoading: circuitLoading } = useQuery({
    queryKey: ["circuit-public", itemId],
    queryFn: () => api.circuits.getPublic(itemId),
    enabled: !!itemId && isCircuit,
  });

  const { data: activiteResponse, isLoading: activiteLoading } = useQuery({
    queryKey: ["activite-public", itemId],
    queryFn: () => api.activites.getPublic(itemId),
    enabled: !!itemId && !isCircuit,
  });

  const isLoading = circuitLoading || activiteLoading;
  const item: Circuit | Activite | undefined = isCircuit
    ? circuitResponse?.data
    : activiteResponse?.data;

  const { data: avisResponse } = useQuery({
    queryKey: ["avis", itemType, itemId, avisPage],
    queryFn: () =>
      isCircuit
        ? api.avis.circuit(itemId, avisPage, 10)
        : api.avis.activite(itemId, avisPage, 10),
    enabled: !!itemId,
  });

  const avisData: AvisResponse | undefined = (avisResponse?.data as AvisResponse)?.moyennes
    ? avisResponse?.data
    : (avisResponse as unknown as AvisResponse)?.moyennes
      ? (avisResponse as unknown as AvisResponse)
      : undefined;

  if (isLoading) return <DetailSkeleton />;

  if (!item) {
    return (
      <DetailNotFound
        icon={<Compass className="w-14 h-14" />}
        title={`${isCircuit ? "Circuit" : "Activité"} introuvable`}
        onBack={() => router.push(returnTo)}
      />
    );
  }

  const handleReserve = () => {
    if (isCircuit) {
      router.push(`${returnTo}&circuitId=${item.id}&selectedItemType=circuit`);
    } else {
      router.push(`${returnTo}&activiteId=${item.id}&selectedItemType=activite`);
    }
  };
  const handleCancel = () => router.push(returnTo);

  const images = Array.isArray(item.images) ? item.images : [];
  const inclus = Array.isArray(item.inclus)
    ? item.inclus
    : typeof item.inclus === "string"
      ? (item.inclus as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const nonInclus = Array.isArray(item.nonInclus)
    ? item.nonInclus
    : typeof item.nonInclus === "string"
      ? (item.nonInclus as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  // Stats : participants max · durée · prix · ville
  const stats = [
    item.maxParticipants != null && {
      value: item.maxParticipants,
      label: "Participants max",
      animated: true,
    },
    item.duree && { value: item.duree, label: "Durée" },
    item.prix != null && {
      value: `${item.prix.toLocaleString()} F`,
      label: "Par personne",
    },
    item.ville && { value: item.ville, label: "Lieu" },
  ].filter(Boolean) as { value: string | number; label: string; animated?: boolean }[];

  // Drop cap pour description complete
  const showDropCap = (item.descriptionComplete?.length || 0) > 100;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24 lg:pb-8">
      <HeroImmersif
        images={images}
        title={item.titre}
        location={item.ville || undefined}
        price={item.prix}
        priceUnit="/ personne"
        badge={{
          label: isCircuit ? "Circuit" : "Activité",
          color: isCircuit ? "blue" : "emerald",
        }}
        onBack={() => router.push(returnTo)}
      />

      <div className="grid lg:grid-cols-12 gap-8 mt-8">
        {/* Colonne narrative */}
        <div className="lg:col-span-8 space-y-10">
          {/* Stats key */}
          {stats.length > 0 && <StatsKeyRow stats={stats} />}

          {/* Description courte */}
          {item.descriptionCourte && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle>En quelques mots</SectionTitle>
              <p className="text-base leading-relaxed text-slate-700">
                {item.descriptionCourte}
              </p>
            </motion.section>
          )}

          {/* Description complète */}
          {item.descriptionComplete && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle>Description détaillée</SectionTitle>
              <p
                className={`text-base leading-relaxed text-slate-700 whitespace-pre-line ${
                  showDropCap
                    ? "first-letter:text-5xl first-letter:font-bold first-letter:text-orange-500 first-letter:mr-2 first-letter:float-left first-letter:leading-none"
                    : ""
                }`}
              >
                {item.descriptionComplete}
              </p>
            </motion.section>
          )}

          {/* Inclus / Non inclus côte-à-côte sans cards colorées */}
          {(inclus.length > 0 || nonInclus.length > 0) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle>Ce qui est compris</SectionTitle>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                {inclus.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Inclus</h4>
                    <ul className="space-y-2">
                      {inclus.map((it, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {nonInclus.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Non inclus</h4>
                    <ul className="space-y-2">
                      {nonInclus.map((it, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-500"
                        >
                          <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* Politique d'annulation */}
          {item.typeAnnulation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3 bg-slate-50 rounded-lg p-4"
            >
              <CalendarX className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Politique d&apos;annulation
                </p>
                <p className="text-sm text-slate-600 mt-0.5">{item.typeAnnulation}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Colonne ReserveCard */}
        <div className="lg:col-span-4">
          <ReserveCard
            price={item.prix}
            priceUnit="par personne"
            rating={null}
            reviewsCount={avisData?.total ?? null}
            summary={[
              item.duree && {
                icon: <Clock className="w-4 h-4 text-orange-500" />,
                label: `Durée : ${item.duree}`,
              },
              item.maxParticipants != null && {
                icon: <Users className="w-4 h-4 text-orange-500" />,
                label: `${item.maxParticipants} participants max`,
              },
              item.prix != null && {
                icon: <Banknote className="w-4 h-4 text-orange-500" />,
                label: `${item.prix.toLocaleString()} FCFA / personne`,
              },
            ].filter(Boolean) as { icon: React.ReactNode; label: string }[]}
            dateFields={[
              { label: "Date", placeholder: "Sélectionner" },
              { label: "Participants", placeholder: "Sélectionner" },
            ]}
            ctaLabel="Réserver"
            onReserve={handleReserve}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Section avis */}
      <AvisSection avisData={avisData} page={avisPage} onPageChange={setAvisPage} />
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev` and navigate to :
- Une activité : `/service-reservations/activite/1?type=activite&returnTo=/service-reservations?type=ACTIVITE`
- Un circuit : `/service-reservations/activite/1?type=circuit&returnTo=/service-reservations?type=ACTIVITE`

Verify :
- Badge bleu pour circuit, émeraude pour activité dans le hero
- Stats adaptées : participants max · durée · prix · lieu
- Sections : description courte → description détaillée → inclus/non-inclus (côte-à-côte avec ✓ vert / ✗ rouge inline) → annulation
- Pas de bloc partner (n'existe pas pour activité/circuit)
- Pas d'instructions d'accès (n'existe pas pour activité/circuit)
- ReserveCard avec champs Date / Participants
- CTA Réserver navigue avec `circuitId` ou `activiteId` + `selectedItemType` selon le type

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/service-reservations/activite/[id]/page.tsx
git commit -m "feat(activite): refonte page detail en layout editorial immersif"
```

---

## Task 9 : Vérification finale globale

**Files:** aucun nouveau fichier — vérification cross-cutting.

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 2: Full lint check**

Run: `npm run lint`
Expected: no new errors introduced by this refonte.

- [ ] **Step 3: Manual cross-check des deux pages**

Run: `npm run dev` (si pas déjà en cours).

Tester pour chaque page (logement + activité + circuit) :

**Golden path :**
1. Naviguer depuis la liste `service-reservations` (cliquer "Voir détail" sur un item)
2. Le hero charge avec image + overlay + titre + prix
3. Cliquer sur les flèches du carrousel — transitions fluides
4. Cliquer sur les miniatures — image principale change
5. Scroller — sections apparaissent en fade-up
6. Sur desktop ≥ 1024px : ReserveCard reste sticky pendant le scroll
7. Cliquer le bouton "Réserver" → retour vers le flow de réservation avec query params corrects
8. Cliquer le bouton "Annuler" / retour glassmorphism → retour à la liste

**Edge cases :**
- ID invalide → empty state distinctif (cercle dégradé orange)
- Logement sans `partner` → bloc partner masqué, pas de erreur
- Activité sans `inclus`/`nonInclus` → section masquée
- Aucune image → fallback `ImageIcon` dans hero
- Aucun avis → message empty dans section avis
- Description très courte (< 100 chars) → pas de lettrine

**Responsive :**
- Resize fenêtre 320px → 768px → 1024px → 1440px
- Vérifier transition stack vertical → 2 colonnes au breakpoint `lg`
- Bottom-bar fixe sur mobile, sticky card sur desktop

- [ ] **Step 4: Cleanup commit (si nécessaire)**

Si des ajustements mineurs sont nécessaires après les vérifications manuelles (typo, espacement, couleur), faire un commit de polish :

```bash
git add -p
git commit -m "polish(service-reservations): adjustments after manual review"
```

Sinon, sauter cette étape.

- [ ] **Step 5: Verify commit history**

Run: `git log --oneline main..HEAD`
Expected: une suite de commits propres correspondant aux 8 tâches précédentes.

---

## Self-review post-rédaction

Vérifications effectuées sur ce plan avant remise à l'engineer :

- [x] **Spec coverage** : chaque section du spec (architecture, hero, narratif, ReserveCard, avis, variations, animations, loading, empty) a au moins une tâche dédiée. Les 7 composants prévus sont créés en tâches 1-6 et assemblés en 7-8.
- [x] **Placeholders** : aucun "TBD"/"TODO". Code complet dans chaque tâche.
- [x] **Type consistency** : `HeroBadge.color` cohérent entre HeroImmersif et les pages (`amber`, `blue`, `emerald` utilisés). `StatItem`, `ReserveSummaryItem`, `ReserveDateField` exportés depuis leurs composants. Types `Logement`, `Circuit`, `Activite`, `AvisResponse` proviennent de `@/lib/api`.
- [x] **No test framework** : aucune étape mentionnant jest/vitest. Vérification = tsc + lint + manuel browser.
- [x] **No unsupported features** : tous les champs lus existent dans les types existants — vérifié contre `lib/api.ts:706-896`.
