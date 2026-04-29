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

  const showDropCap = (logement.description?.length || 0) > 100;

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
