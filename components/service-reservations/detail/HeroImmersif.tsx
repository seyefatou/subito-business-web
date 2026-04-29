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
