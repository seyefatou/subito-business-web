'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  MapPin,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ImageIcon,
  Banknote,
  CalendarX,
  CheckCircle2,
  XCircle,
  Compass,
  Route,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Circuit, Activite, AvisResponse } from "@/lib/api";

export default function ActiviteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = Number(params.id);
  const itemType = searchParams.get('type') as 'circuit' | 'activite' || 'activite';
  const returnTo = searchParams.get('returnTo') || '/service-reservations?type=ACTIVITE';

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [avisPage, setAvisPage] = useState(1);

  const { data: circuitResponse, isLoading: circuitLoading } = useQuery({
    queryKey: ['circuit-public', itemId],
    queryFn: () => api.circuits.getPublic(itemId),
    enabled: !!itemId && itemType === 'circuit',
  });

  const { data: activiteResponse, isLoading: activiteLoading } = useQuery({
    queryKey: ['activite-public', itemId],
    queryFn: () => api.activites.getPublic(itemId),
    enabled: !!itemId && itemType === 'activite',
  });

  const isLoading = circuitLoading || activiteLoading;
  const item: Circuit | Activite | undefined = itemType === 'circuit' ? circuitResponse?.data : activiteResponse?.data;
  const isCircuit = itemType === 'circuit';

  const { data: avisResponse } = useQuery({
    queryKey: ['avis', itemType, itemId, avisPage],
    queryFn: () => isCircuit ? api.avis.circuit(itemId, avisPage, 10) : api.avis.activite(itemId, avisPage, 10),
    enabled: !!itemId,
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

  if (!item) {
    return (
      <div className="text-center py-32">
        <Compass className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          {isCircuit ? 'Circuit' : 'Activite'} introuvable
        </h2>
        <Button variant="outline" onClick={() => router.push(returnTo)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const images = Array.isArray(item.images) ? item.images : [];
  const inclus = Array.isArray(item.inclus) ? item.inclus : typeof item.inclus === 'string' ? (item.inclus as string).split(',').map(s => s.trim()).filter(Boolean) : [];
  const nonInclus = Array.isArray(item.nonInclus) ? item.nonInclus : typeof item.nonInclus === 'string' ? (item.nonInclus as string).split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleReserve = () => {
    if (isCircuit) {
      router.push(`${returnTo}&circuitId=${item.id}&selectedItemType=circuit`);
    } else {
      router.push(`${returnTo}&activiteId=${item.id}&selectedItemType=activite`);
    }
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(returnTo)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux activites
        </Button>
      </div>

      {/* Section principale */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Galerie d'images */}
        {images.length > 0 ? (
          <div className="relative h-72 md:h-96 bg-slate-100">
            <img
              src={images[currentImageIndex]}
              alt={item.titre}
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
            {/* Badge type en overlay */}
            <div className="absolute top-3 left-3">
              <Badge className={`border-0 text-sm ${isCircuit ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {isCircuit ? <><Route className="w-3.5 h-3.5 mr-1" /> Circuit</> : <><Compass className="w-3.5 h-3.5 mr-1" /> Activite</>}
              </Badge>
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
                <img src={img} alt={`${item.titre} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Infos */}
        <div className="p-6 space-y-5">
          {/* Titre + Prix */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">{item.titre}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`border-0 ${isCircuit ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {isCircuit ? 'Circuit' : 'Activite'}
                </Badge>
                {item.statut && (
                  <Badge className={`border-0 ${item.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {item.statut}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              {item.prix != null && (
                <p className="text-lg font-bold text-orange-600">
                  {item.prix.toLocaleString()} FCFA
                  <span className="text-sm font-normal text-slate-500"> /pers.</span>
                </p>
              )}
            </div>
          </div>

          {/* Localisation */}
          {item.ville && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{item.ville}</span>
            </div>
          )}

          {/* Description courte */}
          {item.descriptionCourte && (
            <p className="text-slate-600 leading-relaxed">{item.descriptionCourte}</p>
          )}

          {/* Description complete */}
          {item.descriptionComplete && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Description detaillee</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{item.descriptionComplete}</p>
            </div>
          )}

          {/* Infos pratiques */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Informations pratiques</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {item.duree && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Duree : {item.duree}</span>
                </div>
              )}
              {item.maxParticipants && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Users className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{item.maxParticipants} participants max</span>
                </div>
              )}
              {item.prix != null && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-orange-50 rounded-lg p-3">
                  <Banknote className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-medium text-orange-700">{item.prix.toLocaleString()} FCFA / personne</span>
                </div>
              )}
            </div>
          </div>

          {/* Inclus / Non inclus */}
          {(inclus.length > 0 || nonInclus.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inclus.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Inclus dans le prix
                  </h3>
                  <ul className="space-y-2">
                    {inclus.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nonInclus.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Non inclus
                  </h3>
                  <ul className="space-y-2">
                    {nonInclus.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Politique d'annulation */}
          {item.typeAnnulation && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <CalendarX className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Politique d&apos;annulation</p>
                <p className="text-sm text-slate-600">{item.typeAnnulation}</p>
              </div>
            </div>
          )}

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
            <p className="text-sm text-slate-500">{isCircuit ? 'Circuit' : 'Activite'}</p>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-slate-800">{item.titre}</p>
              {item.prix != null && (
                <span className="text-orange-600 font-bold">{item.prix.toLocaleString()} FCFA/pers.</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(returnTo)}>
              Annuler
            </Button>
            <Button className="gradient-subito text-white border-0" onClick={handleReserve}>
              <Check className="w-4 h-4 mr-2" />
              Reserver
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
