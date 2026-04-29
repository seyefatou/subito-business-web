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
