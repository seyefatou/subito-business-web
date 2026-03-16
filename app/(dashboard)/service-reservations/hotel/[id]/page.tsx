'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Hotel,
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
  CalendarRange,
  DoorOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Logement, ChambreHotel } from "@/lib/api";

export default function HotelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = Number(params.id);
  const returnTo = searchParams.get('returnTo') || '/service-reservations?type=LOGEMENT';

  const [selectedChambreId, setSelectedChambreId] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [chambreImageIndexes, setChambreImageIndexes] = useState<Record<number, number>>({});
  const [capaciteFilter, setCapaciteFilter] = useState<number | null>(null);

  const { data: hotelResponse, isLoading } = useQuery({
    queryKey: ['logement-public', hotelId],
    queryFn: () => api.logements.getPublic(hotelId),
    enabled: !!hotelId,
  });

  const hotel: Logement | undefined = hotelResponse?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="text-center py-32">
        <Hotel className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Hotel introuvable</h2>
        <Button variant="outline" onClick={() => router.push(returnTo)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const images = hotel.images || [];
  const chambres = hotel.chambresHotel || [];
  const filteredChambres = capaciteFilter === null ? chambres : chambres.filter(ch => ch.capacite === capaciteFilter);

  const handleSelectChambre = (chambreId: number) => {
    setSelectedChambreId(chambreId);
  };

  const handleConfirmSelection = () => {
    if (selectedChambreId) {
      router.push(`${returnTo}&logementId=${hotel.id}&chambreId=${selectedChambreId}`);
    }
  };

  const handleSelectHotelOnly = () => {
    router.push(`${returnTo}&logementId=${hotel.id}`);
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const getChambreImageIndex = (chambreId: number) => chambreImageIndexes[chambreId] || 0;
  const setChambreImageIndex = (chambreId: number, index: number) => {
    setChambreImageIndexes(prev => ({ ...prev, [chambreId]: index }));
  };

  const selectedChambre = chambres.find(ch => ch.id === selectedChambreId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(returnTo)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux logements
        </Button>
      </div>

      {/* Section principale de l'hotel */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Galerie d'images */}
        {images.length > 0 ? (
          <div className="relative h-72 md:h-96 bg-slate-100">
            <img
              src={images[currentImageIndex]}
              alt={hotel.nom}
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
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
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
                <img src={img} alt={`${hotel.nom} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Infos hotel */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{hotel.nom}</h1>
                {hotel.nbreEtoiles && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: hotel.nbreEtoiles }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hotel.type && (
                  <Badge className="bg-blue-100 text-blue-700 border-0">{hotel.type}</Badge>
                )}
                {hotel.categorie && (
                  <Badge className="bg-slate-100 text-slate-600 border-0">{hotel.categorie}</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              {chambres.length > 0 ? (
                <>
                  <p className="text-lg font-bold text-orange-600">
                    A partir de {Math.min(...chambres.map(ch => ch.prixParNuit || 0)).toLocaleString()} FCFA
                    <span className="text-sm font-normal text-slate-500"> /nuit</span>
                  </p>
                  {chambres.some(ch => ch.prixWeekend) && (
                    <p className="text-sm text-slate-500">
                      Weekend : a partir de {Math.min(...chambres.filter(ch => ch.prixWeekend).map(ch => ch.prixWeekend!)).toLocaleString()} FCFA/nuit
                    </p>
                  )}
                </>
              ) : hotel.prixParNuit ? (
                <>
                  <p className="text-lg font-bold text-orange-600">
                    {hotel.prixParNuit.toLocaleString()} FCFA
                    <span className="text-sm font-normal text-slate-500"> /nuit</span>
                  </p>
                  {hotel.prixWeekend && (
                    <p className="text-sm text-slate-500">
                      Weekend : {hotel.prixWeekend.toLocaleString()} FCFA/nuit
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Localisation */}
          {(hotel.ville || hotel.adresseExacte) && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{hotel.adresseExacte || hotel.ville}{hotel.pays ? `, ${hotel.pays}` : ''}</span>
            </div>
          )}

          {/* Description */}
          {hotel.description && (
            <p className="text-slate-600 leading-relaxed">{hotel.description}</p>
          )}

          {/* Infos pratiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hotel.capacite && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <Users className="w-4 h-4 text-orange-500" />
                <span>{hotel.capacite} personnes max</span>
              </div>
            )}
            {hotel.nbreChambres && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <Bed className="w-4 h-4 text-orange-500" />
                <span>{hotel.nbreChambres} chambre{hotel.nbreChambres > 1 ? 's' : ''}</span>
              </div>
            )}
            {hotel.salleDeBain && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <Bath className="w-4 h-4 text-orange-500" />
                <span>{hotel.salleDeBain} salle{hotel.salleDeBain > 1 ? 's' : ''} de bain</span>
              </div>
            )}
            {(hotel.heureCheckIn || hotel.heureCheckOut) && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>
                  {hotel.heureCheckIn && `Arrivee: ${hotel.heureCheckIn}`}
                  {hotel.heureCheckIn && hotel.heureCheckOut && ' · '}
                  {hotel.heureCheckOut && `Depart: ${hotel.heureCheckOut}`}
                </span>
              </div>
            )}
            {chambres.length > 0 && chambres.some(ch => ch.nombreUnites) && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-green-50 rounded-lg p-3">
                <DoorOpen className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium">
                  {chambres.reduce((sum, ch) => sum + (ch.nombreUnites || 0), 0)} chambres disponibles au total
                </span>
              </div>
            )}
          </div>

          {/* Equipements hotel */}
          {hotel.equipements && hotel.equipements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Equipements de l&apos;etablissement</h3>
              <div className="flex flex-wrap gap-2">
                {hotel.equipements.map((eq, i) => (
                  <span key={i} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Politique d'annulation */}
          {hotel.typeAnnulation && (
            <div className="text-sm text-slate-500">
              <span className="font-medium">Politique d&apos;annulation :</span> {hotel.typeAnnulation}
            </div>
          )}
        </div>
      </div>

      {/* Section des chambres */}
      {chambres.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-800">
                Chambres disponibles ({chambres.length})
              </h2>
            </div>
          </div>

          {/* Filtre par nombre de personnes */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500 font-medium"><Users className="w-4 h-4 inline mr-1" />Filtrer par capacite :</span>
            <Button
              variant={capaciteFilter === null ? 'default' : 'outline'}
              size="sm"
              className={capaciteFilter === null ? 'gradient-subito text-white border-0' : ''}
              onClick={() => setCapaciteFilter(null)}
            >
              Toutes
            </Button>
            {Array.from(new Set(chambres.map(ch => ch.capacite).filter((c): c is number => c != null))).sort((a, b) => a - b).map((cap) => (
              <Button
                key={cap}
                variant={capaciteFilter === cap ? 'default' : 'outline'}
                size="sm"
                className={capaciteFilter === cap ? 'gradient-subito text-white border-0' : ''}
                onClick={() => setCapaciteFilter(cap)}
              >
                {cap} pers.
                <span className="ml-1 text-xs opacity-75">
                  ({chambres.filter(ch => ch.capacite === cap).length})
                </span>
              </Button>
            ))}
          </div>

          {filteredChambres.length === 0 && capaciteFilter !== null && (
            <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-slate-500 font-medium">Aucune chambre pour {capaciteFilter} personne{capaciteFilter > 1 ? 's' : ''}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCapaciteFilter(null)}>
                Voir toutes les chambres
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filteredChambres.map((chambre: ChambreHotel) => {
              const isSelected = selectedChambreId === chambre.id;
              const chambreImages = chambre.images || [];
              const imgIndex = getChambreImageIndex(chambre.id);

              return (
                <motion.div
                  key={chambre.id}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => handleSelectChambre(chambre.id)}
                  className={`
                    relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all
                    ${isSelected ? 'border-orange-400 bg-orange-50/30 shadow-lg shadow-orange-100' : 'border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Images de la chambre */}
                    <div className="relative w-full md:w-72 h-52 md:h-auto bg-slate-100 shrink-0">
                      {chambreImages.length > 0 ? (
                        <>
                          <img
                            src={chambreImages[imgIndex]}
                            alt={chambre.nom || chambre.typeChambre}
                            className="w-full h-full object-cover"
                          />
                          {chambreImages.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChambreImageIndex(chambre.id, (imgIndex - 1 + chambreImages.length) % chambreImages.length);
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChambreImageIndex(chambre.id, (imgIndex + 1) % chambreImages.length);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                                {imgIndex + 1}/{chambreImages.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center min-h-[12rem]">
                          <ImageIcon className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Infos chambre */}
                    <div className="flex-1 p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-slate-800">
                              {chambre.nom || chambre.typeChambre}
                            </h3>
                            {chambre.typeChambre && chambre.nom && (
                              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">{chambre.typeChambre}</Badge>
                            )}
                          </div>
                          {chambre.description && (
                            <p className="text-sm text-slate-500">{chambre.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Badges infos */}
                      <div className="flex flex-wrap gap-2">
                        {chambre.capacite && (
                          <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                            <Users className="w-3 h-3 mr-1" />{chambre.capacite} pers.
                          </Badge>
                        )}
                        {chambre.salleDeBain && (
                          <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                            <Bath className="w-3 h-3 mr-1" />{chambre.salleDeBain} salle{chambre.salleDeBain > 1 ? 's' : ''} de bain
                          </Badge>
                        )}
                        {chambre.nombreUnites && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                            {chambre.nombreUnites} disponible{chambre.nombreUnites > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {/* Equipements */}
                      {chambre.equipements && chambre.equipements.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {chambre.equipements.map((eq, i) => (
                            <span key={i} className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                              {eq}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Prix */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-lg font-bold text-orange-600">
                          {chambre.prixParNuit?.toLocaleString()} FCFA
                          <span className="text-sm font-normal text-slate-500"> /nuit</span>
                        </span>
                        {chambre.prixWeekend && (
                          <span className="text-sm text-slate-500">
                            ({chambre.prixWeekend.toLocaleString()} FCFA/weekend)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barre de confirmation fixe en bas */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 rounded-t-xl p-4 -mx-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            {selectedChambre ? (
              <div>
                <p className="text-sm text-slate-500">Chambre selectionnee</p>
                <p className="font-semibold text-slate-800">
                  {selectedChambre.nom || selectedChambre.typeChambre} — {selectedChambre.prixParNuit?.toLocaleString()} FCFA/nuit
                </p>
              </div>
            ) : chambres.length > 0 ? (
              <p className="text-sm text-slate-500">Selectionnez une chambre pour continuer</p>
            ) : (
              <p className="text-sm text-slate-500">{hotel.prixParNuit?.toLocaleString()} FCFA/nuit</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(returnTo)}>
              Annuler
            </Button>
            {chambres.length > 0 ? (
              <Button
                className="gradient-subito text-white border-0"
                disabled={!selectedChambreId}
                onClick={handleConfirmSelection}
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmer la chambre
              </Button>
            ) : (
              <Button
                className="gradient-subito text-white border-0"
                onClick={handleSelectHotelOnly}
              >
                <Check className="w-4 h-4 mr-2" />
                Reserver ce logement
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
