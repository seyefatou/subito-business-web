'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Home,
  MapPin,
  Star,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bed,
  Bath,
  ImageIcon,
  DoorOpen,
  CalendarX,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Logement } from "@/lib/api";

export default function LogementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const logementId = Number(params.id);
  const returnTo = searchParams.get('returnTo') || '/service-reservations?type=LOGEMENT';

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: logementResponse, isLoading } = useQuery({
    queryKey: ['logement-public', logementId],
    queryFn: () => api.logements.getPublic(logementId),
    enabled: !!logementId,
  });

  const logement: Logement | undefined = logementResponse?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!logement) {
    return (
      <div className="text-center py-32">
        <Home className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Logement introuvable</h2>
        <Button variant="outline" onClick={() => router.push(returnTo)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const images = logement.images || [];

  const handleReserve = () => {
    router.push(`${returnTo}&logementId=${logement.id}`);
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(returnTo)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux logements
        </Button>
      </div>

      {/* Section principale */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Galerie d'images principale */}
        {images.length > 0 ? (
          <div className="relative h-72 md:h-96 bg-slate-100">
            <img
              src={images[currentImageIndex]}
              alt={logement.nom}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        ) : (
          <div className="h-48 bg-slate-100 flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-slate-300" />
          </div>
        )}

        {/* Galerie miniatures */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 bg-slate-50 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${i === currentImageIndex ? 'border-orange-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={img} alt={`${logement.nom} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Infos du logement */}
        <div className="p-6 space-y-5">
          {/* Titre + Prix */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{logement.nom}</h1>
                {logement.nbreEtoiles && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: logement.nbreEtoiles }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {logement.type && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">{logement.type}</Badge>
                )}
                {logement.categorie && (
                  <Badge className="bg-slate-100 text-slate-600 border-0">{logement.categorie}</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              {logement.prixParNuit != null && (
                <>
                  <p className="text-lg font-bold text-orange-600">
                    {logement.prixParNuit.toLocaleString()} FCFA
                    <span className="text-sm font-normal text-slate-500"> /nuit</span>
                  </p>
                  {logement.prixWeekend && (
                    <p className="text-sm text-slate-500">
                      Weekend : {logement.prixWeekend.toLocaleString()} FCFA/nuit
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Localisation */}
          {(logement.ville || logement.adresseExacte) && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{logement.adresseExacte || logement.ville}{logement.pays ? `, ${logement.pays}` : ''}</span>
            </div>
          )}

          {/* Description */}
          {logement.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
              <p className="text-slate-600 leading-relaxed">{logement.description}</p>
            </div>
          )}

          {/* Infos pratiques - grille */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Caracteristiques du logement</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {logement.capacite && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Users className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{logement.capacite} personne{logement.capacite > 1 ? 's' : ''} max</span>
                </div>
              )}
              {logement.nbreChambres && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Bed className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{logement.nbreChambres} chambre{logement.nbreChambres > 1 ? 's' : ''}</span>
                </div>
              )}
              {logement.salleDeBain && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Bath className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{logement.salleDeBain} salle{logement.salleDeBain > 1 ? 's' : ''} de bain</span>
                </div>
              )}
              {(logement.heureCheckIn || logement.heureCheckOut) && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex flex-col text-xs">
                    {logement.heureCheckIn && <span>Arrivee : {logement.heureCheckIn}</span>}
                    {logement.heureCheckOut && <span>Depart : {logement.heureCheckOut}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarification detaillee */}
          {(logement.prixParNuit || logement.prixWeekend) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Tarification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {logement.prixParNuit != null && (
                  <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <Banknote className="w-5 h-5 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Prix par nuit (semaine)</p>
                      <p className="text-lg font-bold text-orange-600">{logement.prixParNuit.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                )}
                {logement.prixWeekend != null && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Banknote className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Prix par nuit (weekend)</p>
                      <p className="text-lg font-bold text-blue-600">{logement.prixWeekend.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Equipements */}
          {logement.equipements && logement.equipements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Equipements et services</h3>
              <div className="flex flex-wrap gap-2">
                {logement.equipements.map((eq, i) => (
                  <span key={i} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Politique d'annulation */}
          {logement.typeAnnulation && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <CalendarX className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Politique d&apos;annulation</p>
                <p className="text-sm text-slate-600">{logement.typeAnnulation}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barre de reservation fixe en bas */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 rounded-t-xl p-4 -mx-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-slate-500">{logement.type || 'Logement'}</p>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-slate-800">{logement.nom}</p>
              {logement.prixParNuit != null && (
                <span className="text-orange-600 font-bold">{logement.prixParNuit.toLocaleString()} FCFA/nuit</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(returnTo)}>
              Annuler
            </Button>
            <Button className="gradient-subito text-white border-0" onClick={handleReserve}>
              <Check className="w-4 h-4 mr-2" />
              Reserver ce logement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
