'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Compass,
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

          {/* Inclus / Non inclus côte-à-côte */}
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
