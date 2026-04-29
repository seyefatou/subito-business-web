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
