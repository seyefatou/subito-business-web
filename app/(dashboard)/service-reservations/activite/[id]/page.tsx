'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Route,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Check,
  X,
  Star,
  Quote,
  MapPin,
  Loader2,
  ImageIcon,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, Circuit, Activite, AvisResponse } from "@/lib/api";

const MANROPE = { fontFamily: "Manrope, system-ui, sans-serif" };

const CRITERIA: { key: keyof AvisResponse["moyennes"]; label: string }[] = [
  { key: "noteService", label: "Service" },
  { key: "notePrestataire", label: "Prestataire" },
  { key: "noteRapportQualitePrix", label: "Qualité/Prix" },
  { key: "notePonctualite", label: "Ponctualité" },
];

export default function ActiviteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = Number(params.id);
  const itemType = (searchParams.get("type") as "circuit" | "activite") || "activite";
  const returnTo = searchParams.get("returnTo") || "/service-reservations?type=ACTIVITE";
  const isCircuit = itemType === "circuit";

  const [avisPage, setAvisPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [participants, setParticipants] = useState(2);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6">
        <div className="text-center py-32">
          <div className="w-32 h-32 mx-auto rounded-full bg-[#ffdbd0] flex items-center justify-center mb-6">
            {isCircuit ? (
              <Route className="w-14 h-14 text-[#E04A1F]" />
            ) : (
              <Compass className="w-14 h-14 text-[#E04A1F]" />
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-[#171c1f] mb-2" style={MANROPE}>
            {isCircuit ? "Circuit" : "Activité"} introuvable
          </h2>
          <p className="text-[#585e6c] mb-6">L&apos;élément demandé n&apos;a pas pu être trouvé.</p>
          <Button onClick={() => router.push(returnTo)} className="bg-[#E04A1F] text-white border-0 py-6 px-6 rounded-2xl font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>
      </div>
    );
  }

  const handleReserve = () => {
    if (isCircuit) {
      router.push(`${returnTo}&circuitId=${item.id}&selectedItemType=circuit`);
    } else {
      router.push(`${returnTo}&activiteId=${item.id}&selectedItemType=activite`);
    }
  };

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

  const categoryLabel = isCircuit ? "Circuit" : "Activité";
  const subtotal = (item.prix || 0) * participants;

  // Détails-clés synthétiques (dérivés des données existantes)
  const keyDetails: { icon: React.ReactNode; label: string }[] = [];
  if (item.ville) {
    keyDetails.push({
      icon: <MapPin className="w-4 h-4 text-[#E04A1F]" />,
      label: `Point de rencontre : ${item.ville}`,
    });
  }
  if (item.duree) {
    keyDetails.push({
      icon: <Clock className="w-4 h-4 text-[#E04A1F]" />,
      label: `Durée : ${item.duree}`,
    });
  }
  if (item.maxParticipants != null) {
    keyDetails.push({
      icon: <Users className="w-4 h-4 text-[#E04A1F]" />,
      label: `Jusqu'à ${item.maxParticipants} participants`,
    });
  }
  if (item.typeAnnulation) {
    keyDetails.push({
      icon: <ShieldCheck className="w-4 h-4 text-[#E04A1F]" />,
      label: item.typeAnnulation,
    });
  }

  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6 pb-24 lg:pb-10">
      {/* Mini breadcrumb */}
      <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
        <button onClick={() => router.push(returnTo)} className="hover:text-[#E04A1F] transition">
          Réservations
        </button>
        <span>/</span>
        <button onClick={() => router.push(returnTo)} className="hover:text-[#E04A1F] transition">
          Activités
        </button>
        <span>/</span>
        <span className="text-[#E04A1F] truncate">{categoryLabel}</span>
      </nav>

      {/* Title block + meta pills */}
      <div className="mb-8">
        <h1
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#171c1f] leading-[1.05] mb-4"
          style={MANROPE}
        >
          {item.titre}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {avisData && avisData.total > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#171c1f] bg-[#f0f4f8] px-3 py-1.5 rounded-full">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              {avisData.moyennes.globale.toFixed(1)} ({avisData.total} avis)
            </span>
          )}
          {item.duree && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#171c1f] bg-[#f0f4f8] px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-[#585e6c]" />
              {item.duree}
            </span>
          )}
          {item.ville && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#171c1f] bg-[#f0f4f8] px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-[#585e6c]" />
              {item.ville}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-[#E04A1F] bg-[#ffdbd0]">
            {isCircuit ? <Route className="w-3.5 h-3.5" /> : <Compass className="w-3.5 h-3.5" />}
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Layout 8/4 — galerie + narrative à gauche, reserve panel à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne narrative + galerie */}
        <div className="lg:col-span-8 space-y-6">
          {/* Image gallery 1+3 grid */}
          {images.length === 0 ? (
            <div className="h-72 md:h-96 rounded-3xl bg-[#f0f4f8] flex items-center justify-center">
              <ImageIcon className="w-20 h-20 text-slate-300" />
            </div>
          ) : images.length === 1 ? (
            <div className="h-72 md:h-96 rounded-3xl overflow-hidden bg-slate-100">
              <img src={images[0]} alt={item.titre} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-auto md:h-96">
              <div className="md:col-span-2 rounded-3xl overflow-hidden bg-slate-100 h-72 md:h-full">
                <img src={images[0]} alt={item.titre} className="w-full h-full object-cover" />
              </div>
              <div className="hidden md:flex flex-col gap-3">
                {[1, 2, 3].map((idx) => {
                  const src = images[idx];
                  const isLastSlot = idx === 3;
                  const overflow = images.length - 4;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-3xl overflow-hidden bg-[#f0f4f8] relative"
                    >
                      {src && (
                        <img
                          src={src}
                          alt={`${item.titre} ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {isLastSlot && overflow > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-2xl" style={MANROPE}>
                          +{overflow}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About — carte blanche après la galerie (sans framer-motion pour éviter le bug d'animation bloquée) */}
          {(item.descriptionCourte || item.descriptionComplete) && (
            <section className="relative z-10 bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8 mt-6">
              <h3
                className="text-xl font-extrabold text-[#171c1f] mb-3"
                style={MANROPE}
              >
                {isCircuit ? "À propos du circuit" : "À propos de l'activité"}
              </h3>
              {item.descriptionCourte && (
                <p className="text-[#171c1f] leading-relaxed mb-3 text-base font-medium">
                  {item.descriptionCourte}
                </p>
              )}
              {item.descriptionComplete && (
                <p className="text-[#171c1f] leading-relaxed whitespace-pre-line text-base">
                  {item.descriptionComplete}
                </p>
              )}
            </section>
          )}

          {/* What's Included + Key Details */}
          {(inclus.length > 0 || keyDetails.length > 0 || nonInclus.length > 0) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100"
            >
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
                {/* Inclus */}
                {inclus.length > 0 && (
                  <div>
                    <h4
                      className="text-base font-extrabold text-[#171c1f] mb-4 flex items-center gap-2"
                      style={MANROPE}
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                      </span>
                      Ce qui est inclus
                    </h4>
                    <ul className="space-y-2.5">
                      {inclus.map((it, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#171c1f]">
                          <span className="w-4 h-4 rounded-full bg-[#E04A1F]/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 text-[#E04A1F]" strokeWidth={3} />
                          </span>
                          <span className="font-medium">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Détails clés */}
                {keyDetails.length > 0 && (
                  <div>
                    <h4
                      className="text-base font-extrabold text-[#171c1f] mb-4 flex items-center gap-2"
                      style={MANROPE}
                    >
                      <span className="w-6 h-6 rounded-full bg-[#ffdbd0] flex items-center justify-center">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#E04A1F]" />
                      </span>
                      Détails clés
                    </h4>
                    <ul className="space-y-2.5">
                      {keyDetails.map((d, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#171c1f]">
                          <span className="shrink-0 mt-0.5">{d.icon}</span>
                          <span className="font-medium">{d.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Non inclus (sur toute la largeur si présent) */}
                {nonInclus.length > 0 && (
                  <div className="md:col-span-2 pt-6 border-t border-slate-100">
                    <h4
                      className="text-base font-extrabold text-[#171c1f] mb-4 flex items-center gap-2"
                      style={MANROPE}
                    >
                      <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-600" strokeWidth={3} />
                      </span>
                      Non inclus
                    </h4>
                    <ul className="grid sm:grid-cols-2 gap-y-2.5 gap-x-6">
                      {nonInclus.map((it, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#585e6c]">
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

          {/* Section avis sur cette colonne (full width below grid) sera placée plus bas */}
        </div>

        {/* ReserveCard sticky */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 bg-white rounded-3xl shadow-xl shadow-black/5 border border-slate-100 p-6 space-y-5">
          {/* Date picker */}
          <div>
            <p className="text-[10px] font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Sélectionnez une date
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 hover:border-[#E04A1F] transition text-left">
                  <span className="text-sm font-medium text-[#171c1f]">
                    {selectedDate
                      ? format(selectedDate, "dd MMMM yyyy", { locale: fr })
                      : "Choisir une date"}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-[#585e6c]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Participants stepper */}
          <div>
            <p className="text-[10px] font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Participants
            </p>
            <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2">
              <button
                onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                className="w-9 h-9 rounded-lg bg-[#f0f4f8] hover:bg-slate-200 text-[#171c1f] flex items-center justify-center transition"
                aria-label="Diminuer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-extrabold text-[#171c1f]" style={MANROPE}>
                {participants}
              </span>
              <button
                onClick={() =>
                  setParticipants((p) =>
                    item.maxParticipants ? Math.min(item.maxParticipants, p + 1) : p + 1
                  )
                }
                disabled={!!item.maxParticipants && participants >= item.maxParticipants}
                className="w-9 h-9 rounded-lg bg-[#E04A1F] hover:bg-[#C8330F] text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Augmenter"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Starting from + price */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              À partir de
            </p>
            {item.prix != null && (
              <p className="text-3xl font-extrabold text-[#E04A1F] mt-1" style={MANROPE}>
                {item.prix.toLocaleString()}{" "}
                <span className="text-base font-bold text-[#E04A1F]/80">FCFA</span>
                <span className="text-sm font-medium text-[#585e6c]"> / personne</span>
              </p>
            )}
          </div>

          {/* Pricing breakdown */}
          {item.prix != null && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-[#585e6c]">
                <span>
                  Adulte x{participants}
                </span>
                <span className="font-medium text-[#171c1f]">
                  {subtotal.toLocaleString()} FCFA
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-base font-extrabold text-[#171c1f]" style={MANROPE}>
                  Total
                </span>
                <span className="text-2xl font-extrabold text-[#E04A1F]" style={MANROPE}>
                  {subtotal.toLocaleString()} FCFA
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={handleReserve}
            className="w-full bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2"
          >
            Réserver maintenant
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-[10px] text-[#585e6c] text-center font-medium uppercase tracking-wider">
            Annulation flexible · Paiement sécurisé
          </p>
        </aside>
      </div>

      {/* Section avis pleine largeur */}
      {avisData && avisData.total > 0 && (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10 mt-10">
          <div className="grid md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Avis clients
              </p>
              <div className="flex items-end gap-3">
                <p className="text-6xl font-extrabold text-[#171c1f] leading-none" style={MANROPE}>
                  {avisData.moyennes.globale.toFixed(1)}
                </p>
                <span className="text-base text-[#585e6c] mb-1">/ 5</span>
              </div>
              <div className="flex gap-0.5 mt-3">
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
              <p className="text-sm text-[#585e6c] mt-3">
                Basé sur <span className="font-bold text-[#171c1f]">{avisData.total}</span> avis
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {CRITERIA.map(({ key, label }) => {
                const val = avisData.moyennes[key];
                const pct = (val / 5) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-[#585e6c] font-medium">{label}</span>
                      <span className="font-bold text-[#171c1f]">{val.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-[#f0f4f8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E04A1F] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                  className="bg-[#f0f4f8] rounded-2xl p-5 relative"
                >
                  <Quote className="w-6 h-6 text-[#E04A1F]/30 absolute top-4 right-4" />
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {Array.from({ length: Math.round(computedNote) }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    {authorName && (
                      <span className="text-sm font-bold text-[#171c1f]">{authorName}</span>
                    )}
                  </div>
                  {avis.createdAt && (
                    <p className="text-xs text-[#585e6c] mb-2">
                      {new Date(avis.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {avis.commentaire && (
                    <p className="text-sm text-[#171c1f] leading-relaxed">{avis.commentaire}</p>
                  )}
                  {avis.reponsePartenaire && (
                    <div className="mt-3 pl-3 border-l-2 border-[#E04A1F]">
                      <p className="text-xs font-bold text-[#E04A1F] mb-0.5 uppercase tracking-wider">
                        Réponse du partenaire
                      </p>
                      <p className="text-sm text-[#585e6c]">{avis.reponsePartenaire}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {avisData.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="icon"
                disabled={avisPage <= 1}
                onClick={() => setAvisPage((p) => p - 1)}
                className="rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-[#585e6c] font-medium">
                {avisPage} / {avisData.pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={avisPage >= avisData.pages}
                onClick={() => setAvisPage((p) => p + 1)}
                className="rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bottom-bar mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {item.prix != null && (
              <p className="text-lg font-extrabold text-[#E04A1F]" style={MANROPE}>
                {item.prix.toLocaleString()} FCFA
                <span className="text-xs font-medium text-[#585e6c]"> / pers.</span>
              </p>
            )}
            {avisData && avisData.total > 0 && (
              <div className="flex items-center gap-1 text-xs text-[#585e6c]">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                {avisData.moyennes.globale.toFixed(1)} · {avisData.total} avis
              </div>
            )}
          </div>
          <Button
            onClick={handleReserve}
            className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 font-bold shadow-md gap-2"
          >
            Réserver
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
