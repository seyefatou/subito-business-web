'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Compass,
  Route,
  Users,
  Clock,
  CalendarX,
  Banknote,
  Check,
  X,
  Star,
  Quote,
  MapPin,
  Loader2,
  ImageIcon,
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, Circuit, Activite, AvisResponse } from "@/lib/api";

const MANROPE = { fontFamily: "Manrope, system-ui, sans-serif" };

const CRITERIA: { key: keyof AvisResponse["moyennes"]; label: string }[] = [
  { key: "noteService", label: "Service" },
  { key: "notePrestataire", label: "Prestataire" },
  { key: "noteRapportQualitePrix", label: "Qualité/Prix" },
  { key: "notePonctualite", label: "Ponctualité" },
];

function IconTile({ children, accent = "orange" }: { children: React.ReactNode; accent?: "orange" | "blue" | "slate" }) {
  const map = {
    orange: "bg-[#ffdbd0] text-[#E04A1F]",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-[#f0f4f8] text-[#585e6c]",
  };
  return (
    <div className={`w-10 h-10 rounded-xl ${map[accent]} flex items-center justify-center shrink-0`}>
      {children}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
  accent = "orange",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: "orange" | "blue" | "slate";
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100"
    >
      <div className="flex items-center gap-3 mb-5">
        <IconTile accent={accent}>{icon}</IconTile>
        <h3 className="text-lg font-bold text-[#171c1f]" style={MANROPE}>
          {title}
        </h3>
      </div>
      {children}
    </motion.section>
  );
}

export default function ActiviteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = Number(params.id);
  const itemType = (searchParams.get("type") as "circuit" | "activite") || "activite";
  const returnTo = searchParams.get("returnTo") || "/service-reservations?type=ACTIVITE";
  const isCircuit = itemType === "circuit";

  const [avisPage, setAvisPage] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
  const handleCancel = () => router.push(returnTo);

  const images = Array.isArray(item.images) ? item.images : [];
  const nextImage = () => setCurrentImageIndex((p) => (p + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

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

  // Catégorie : Circuit (accent bleu) ou Activité (accent orange)
  const categoryLabel = isCircuit ? "Circuit" : "Activité";
  const categoryAccent: "orange" | "blue" = isCircuit ? "blue" : "orange";

  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6 pb-24 lg:pb-10">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
          <div className="min-w-0 flex-1">
            <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              <button
                onClick={() => router.push(returnTo)}
                className="hover:text-[#E04A1F] transition"
              >
                Réservations
              </button>
              <span>/</span>
              <button
                onClick={() => router.push(returnTo)}
                className="hover:text-[#E04A1F] transition"
              >
                Activités
              </button>
              <span>/</span>
              <span className="text-[#E04A1F] truncate">{categoryLabel}</span>
            </nav>
            <h1
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f] leading-tight"
              style={MANROPE}
            >
              {item.titre}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-[#585e6c] font-medium">
              {item.ville && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E04A1F]" />
                  {item.ville}
                </span>
              )}
              {item.duree && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#E04A1F]" />
                  {item.duree}
                </span>
              )}
            </div>
          </div>
          <span
            className={`font-bold text-xs px-4 py-2 rounded-full uppercase tracking-widest shrink-0 flex items-center gap-2 ${
              isCircuit
                ? "text-blue-700 bg-blue-50"
                : "text-[#E04A1F] bg-[#ffdbd0]"
            }`}
          >
            {isCircuit ? <Route className="w-3.5 h-3.5" /> : <Compass className="w-3.5 h-3.5" />}
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Galerie */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden mb-8">
        {images.length > 0 ? (
          <div className="relative h-72 md:h-[28rem] bg-slate-100">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={item.titre}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-[#171c1f] flex items-center justify-center shadow-lg transition"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-[#171c1f] flex items-center justify-center shadow-lg transition"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-72 bg-slate-50 flex items-center justify-center">
            <ImageIcon className="w-20 h-20 text-slate-300" />
          </div>
        )}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 bg-[#f0f4f8] overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition ${
                  i === currentImageIndex
                    ? "border-[#E04A1F]"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={img}
                  alt={`${item.titre} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layout 8/4 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne narrative */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {item.maxParticipants != null && (
              <div className="flex items-center gap-3">
                <IconTile><Users className="w-5 h-5" /></IconTile>
                <div>
                  <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-wide">
                    Participants
                  </p>
                  <p className="text-base font-bold text-[#171c1f]" style={MANROPE}>
                    {item.maxParticipants} max
                  </p>
                </div>
              </div>
            )}
            {item.duree && (
              <div className="flex items-center gap-3">
                <IconTile><Clock className="w-5 h-5" /></IconTile>
                <div>
                  <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-wide">
                    Durée
                  </p>
                  <p className="text-base font-bold text-[#171c1f]" style={MANROPE}>
                    {item.duree}
                  </p>
                </div>
              </div>
            )}
            {item.prix != null && (
              <div className="flex items-center gap-3">
                <IconTile><Banknote className="w-5 h-5" /></IconTile>
                <div>
                  <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-wide">
                    Par personne
                  </p>
                  <p className="text-base font-bold text-[#171c1f]" style={MANROPE}>
                    {item.prix.toLocaleString()} F
                  </p>
                </div>
              </div>
            )}
            {item.ville && (
              <div className="flex items-center gap-3">
                <IconTile><MapPin className="w-5 h-5" /></IconTile>
                <div>
                  <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-wide">
                    Lieu
                  </p>
                  <p className="text-base font-bold text-[#171c1f]" style={MANROPE}>
                    {item.ville}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Description courte */}
          {item.descriptionCourte && (
            <SectionCard
              icon={<Sparkles className="w-5 h-5" />}
              title="En quelques mots"
              accent={categoryAccent}
            >
              <p className="text-[#585e6c] leading-relaxed">{item.descriptionCourte}</p>
            </SectionCard>
          )}

          {/* Description complète */}
          {item.descriptionComplete && (
            <SectionCard
              icon={isCircuit ? <Route className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
              title={`À propos ${isCircuit ? "du circuit" : "de l'activité"}`}
              accent={categoryAccent}
            >
              <p className="text-[#585e6c] leading-relaxed whitespace-pre-line">
                {item.descriptionComplete}
              </p>
            </SectionCard>
          )}

          {/* Inclus / Non inclus */}
          {(inclus.length > 0 || nonInclus.length > 0) && (
            <SectionCard icon={<Check className="w-5 h-5" />} title="Ce qui est compris">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                {inclus.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#171c1f] mb-3 flex items-center gap-2" style={MANROPE}>
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </span>
                      Inclus
                    </h4>
                    <ul className="space-y-2">
                      {inclus.map((it, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#171c1f]">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {nonInclus.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#171c1f] mb-3 flex items-center gap-2" style={MANROPE}>
                      <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-3 h-3 text-red-600" />
                      </span>
                      Non inclus
                    </h4>
                    <ul className="space-y-2">
                      {nonInclus.map((it, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#585e6c]">
                          <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Politique d'annulation */}
          {item.typeAnnulation && (
            <SectionCard
              icon={<CalendarX className="w-5 h-5" />}
              title="Politique d'annulation"
              accent="slate"
            >
              <p className="text-[#585e6c]">{item.typeAnnulation}</p>
            </SectionCard>
          )}
        </div>

        {/* ReserveCard sticky */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 bg-white rounded-3xl shadow-xl shadow-black/5 border border-slate-100 p-6 space-y-5">
          <div>
            {item.prix != null && (
              <p className="text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
                {item.prix.toLocaleString()}{" "}
                <span className="text-base font-medium text-[#585e6c]">FCFA</span>
              </p>
            )}
            <p className="text-sm text-[#585e6c]">par personne</p>
            {avisData && avisData.total > 0 && (
              <div className="flex items-center gap-1 mt-3 text-sm">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="font-bold text-[#171c1f]">{avisData.moyennes.globale.toFixed(1)}</span>
                <span className="text-[#585e6c]">·</span>
                <span className="text-[#585e6c]">{avisData.total} avis</span>
              </div>
            )}
          </div>

          <div
            onClick={handleReserve}
            className="grid grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-[#E04A1F] transition"
          >
            <div className="p-3 border-r border-slate-200">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#585e6c]">
                Date
              </p>
              <p className="text-sm text-[#171c1f] mt-0.5 font-medium">Sélectionner</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#585e6c]">
                Participants
              </p>
              <p className="text-sm text-[#171c1f] mt-0.5 font-medium">Sélectionner</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {item.duree && (
              <div className="flex items-center gap-2 text-sm text-[#585e6c]">
                <Clock className="w-4 h-4 text-[#E04A1F]" />
                <span>Durée : {item.duree}</span>
              </div>
            )}
            {item.maxParticipants != null && (
              <div className="flex items-center gap-2 text-sm text-[#585e6c]">
                <Users className="w-4 h-4 text-[#E04A1F]" />
                <span>{item.maxParticipants} participants max</span>
              </div>
            )}
            {item.prix != null && (
              <div className="flex items-center gap-2 text-sm text-[#585e6c]">
                <Banknote className="w-4 h-4 text-[#E04A1F]" />
                <span>{item.prix.toLocaleString()} FCFA / personne</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          <Button
            onClick={handleReserve}
            className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all gap-2"
          >
            <Check className="w-4 h-4" />
            Réserver
          </Button>
          <Button
            onClick={handleCancel}
            className="w-full bg-[#f0f4f8] text-[#171c1f] border-0 py-6 rounded-2xl font-bold text-base hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            Annuler
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[#585e6c] pt-2">
            <Shield className="w-3 h-3" />
            <span>Annulation flexible · Paiement sécurisé</span>
          </div>
        </aside>
      </div>

      {/* Section avis */}
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
              <p className="text-lg font-extrabold text-[#171c1f]" style={MANROPE}>
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
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleCancel}
              className="bg-[#f0f4f8] text-[#171c1f] border-0 hover:bg-slate-200"
              size="sm"
            >
              Annuler
            </Button>
            <Button
              onClick={handleReserve}
              className="bg-[#E04A1F] text-white border-0 font-bold shadow-md"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Réserver
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
