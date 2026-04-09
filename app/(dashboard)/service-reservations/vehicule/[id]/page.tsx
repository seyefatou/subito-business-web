'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Car,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ImageIcon,
  Fuel,
  Settings2,
  Thermometer,
  Navigation,
  UserCheck,
  Banknote,
  ShieldCheck,
  Calendar,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, VehiculeLocation, AvisResponse } from "@/lib/api";

export default function VehiculeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehiculeId = Number(params.id);
  const returnTo = searchParams.get('returnTo') || '/service-reservations?type=FLOTTE';

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [avisPage, setAvisPage] = useState(1);

  const { data: vehiculeResponse, isLoading } = useQuery({
    queryKey: ['vehicule-public', vehiculeId],
    queryFn: () => api.vehiculesLocation.getPublic(vehiculeId),
    enabled: !!vehiculeId,
  });

  const vehicule: VehiculeLocation | undefined = vehiculeResponse?.data;

  const { data: avisResponse } = useQuery({
    queryKey: ['vehicule-avis', vehiculeId, avisPage],
    queryFn: () => api.avis.vehiculeLocation(vehiculeId, avisPage, 10),
    enabled: !!vehiculeId,
  });

  // L'API peut retourner soit { data: AvisResponse } (wrappé) soit AvisResponse directement
  const avisData: AvisResponse | undefined = (avisResponse?.data as AvisResponse)?.moyennes
    ? avisResponse?.data
    : (avisResponse as unknown as AvisResponse)?.moyennes
      ? (avisResponse as unknown as AvisResponse)
      : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!vehicule) {
    return (
      <div className="text-center py-32">
        <Car className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Vehicule introuvable</h2>
        <Button variant="outline" onClick={() => router.push(returnTo)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const images = vehicule.images || [];
  const vehiculeName = `${vehicule.marque || ''} ${vehicule.modele || ''}`.trim();

  const handleReserve = () => {
    router.push(`${returnTo}&vehiculeLocationId=${vehicule.id}`);
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(returnTo)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux vehicules
        </Button>
      </div>

      {/* Section principale */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Galerie d'images */}
        {images.length > 0 ? (
          <div className="relative h-72 md:h-96 bg-slate-100">
            <img
              src={images[currentImageIndex]}
              alt={vehiculeName}
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
                <img src={img} alt={`${vehiculeName} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Infos vehicule */}
        <div className="p-6 space-y-5">
          {/* Titre + Prix */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">{vehiculeName}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {vehicule.type && (
                  <Badge className="bg-purple-100 text-purple-700 border-0">{vehicule.type}</Badge>
                )}
                {vehicule.annee && (
                  <Badge className="bg-slate-100 text-slate-600 border-0">
                    <Calendar className="w-3 h-3 mr-1" />{vehicule.annee}
                  </Badge>
                )}
                {vehicule.statut && (
                  <Badge className={`border-0 ${vehicule.statut === 'disponible' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {vehicule.statut}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              {vehicule.prixParJour != null && (
                <>
                  <p className="text-lg font-bold text-orange-600">
                    {vehicule.prixParJour.toLocaleString()} FCFA
                    <span className="text-sm font-normal text-slate-500"> /jour</span>
                  </p>
                  {vehicule.prixWeekend && (
                    <p className="text-sm text-slate-500">
                      Weekend : {vehicule.prixWeekend.toLocaleString()} FCFA/jour
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Zone d'operations */}
          {vehicule.zoneOperations && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span>Zone : {vehicule.zoneOperations}</span>
            </div>
          )}

          {/* Caracteristiques techniques */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Caracteristiques techniques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vehicule.places && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Users className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{vehicule.places} place{vehicule.places > 1 ? 's' : ''}</span>
                </div>
              )}
              {vehicule.transmission && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Settings2 className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{vehicule.transmission}</span>
                </div>
              )}
              {vehicule.carburant && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Fuel className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{vehicule.carburant}</span>
                </div>
              )}
              {vehicule.type && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Car className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{vehicule.type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Options et services inclus */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Options et services</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${vehicule.climatisation ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                <Thermometer className="w-4 h-4 shrink-0" />
                <span>Climatisation</span>
                {vehicule.climatisation && <Check className="w-4 h-4 ml-auto" />}
              </div>
              <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${vehicule.chauffeur ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Chauffeur</span>
                {vehicule.chauffeur && <Check className="w-4 h-4 ml-auto" />}
              </div>
              <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${vehicule.gps ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                <Navigation className="w-4 h-4 shrink-0" />
                <span>GPS</span>
                {vehicule.gps && <Check className="w-4 h-4 ml-auto" />}
              </div>
            </div>
          </div>

          {/* Tarification detaillee */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tarification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {vehicule.prixParJour != null && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <Banknote className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500">Prix par jour (semaine)</p>
                    <p className="text-lg font-bold text-orange-600">{vehicule.prixParJour.toLocaleString()} FCFA</p>
                  </div>
                </div>
              )}
              {vehicule.prixWeekend != null && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Banknote className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500">Prix par jour (weekend)</p>
                    <p className="text-lg font-bold text-blue-600">{vehicule.prixWeekend.toLocaleString()} FCFA</p>
                  </div>
                </div>
              )}
              {vehicule.caution != null && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500">Caution</p>
                    <p className="text-lg font-bold text-amber-600">{vehicule.caution.toLocaleString()} FCFA</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avis */}
          {avisData && avisData.total > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Avis ({avisData.total})
                <span className="ml-2 text-yellow-600">
                  <Star className="w-3.5 h-3.5 inline fill-yellow-500 text-yellow-500" /> {avisData.moyennes.globale.toFixed(1)}
                </span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Service', value: avisData.moyennes.noteService },
                  { label: 'Prestataire', value: avisData.moyennes.notePrestataire },
                  { label: 'Qualite/Prix', value: avisData.moyennes.noteRapportQualitePrix },
                  { label: 'Ponctualite', value: avisData.moyennes.notePonctualite },
                ].map((m) => (
                  <div key={m.label} className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-slate-700">{m.value.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {avisData.data.map((avis) => (
                  <div key={avis.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {Array.from({ length: Math.round(
                          avis.note || ((avis.noteService || 0) + (avis.notePrestataire || 0) + (avis.noteRapportQualitePrix || 0) + (avis.notePonctualite || 0)) / 4
                        ) }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        ))}
                      </div>
                      {(avis.customer || avis.auteur) && (
                        <span className="text-sm font-medium text-slate-700">
                          {avis.customer ? `${avis.customer.prenom || ''} ${avis.customer.nom || ''}`.trim() : avis.auteur}
                        </span>
                      )}
                      {avis.createdAt && (
                        <span className="text-xs text-slate-400 ml-auto">
                          {new Date(avis.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    {avis.commentaire && <p className="text-sm text-slate-600">{avis.commentaire}</p>}
                    {avis.reponsePartenaire && (
                      <div className="mt-2 pl-3 border-l-2 border-orange-300">
                        <p className="text-xs font-medium text-orange-600 mb-0.5">Reponse du partenaire</p>
                        <p className="text-sm text-slate-600">{avis.reponsePartenaire}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {avisData.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={avisPage <= 1} onClick={() => setAvisPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-600">{avisPage} / {avisData.pages}</span>
                  <Button variant="outline" size="sm" disabled={avisPage >= avisData.pages} onClick={() => setAvisPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {avisData && avisData.total === 0 && (
            <div className="text-center py-4 text-slate-400 text-sm">
              Aucun avis pour le moment
            </div>
          )}
        </div>
      </div>

      {/* Barre de reservation fixe en bas */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 rounded-t-xl p-4 -mx-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-slate-500">{vehicule.type || 'Vehicule'}</p>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-slate-800">{vehiculeName}</p>
              {vehicule.prixParJour != null && (
                <span className="text-orange-600 font-bold">{vehicule.prixParJour.toLocaleString()} FCFA/jour</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(returnTo)}>
              Annuler
            </Button>
            <Button className="gradient-subito text-white border-0" onClick={handleReserve}>
              <Check className="w-4 h-4 mr-2" />
              Reserver ce vehicule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
