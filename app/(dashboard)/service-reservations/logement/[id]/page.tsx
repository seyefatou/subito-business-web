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
  CalendarX,
  Banknote,
  CigaretteOff,
  PawPrint,
  PartyPopper,
  VolumeX,
  UserCheck,
  Navigation,
  Wifi,
  Car,
  Shield,
  UtensilsCrossed,
  Tv,
  Dumbbell,
  Accessibility,
  Eye,
  TreePine,
  WashingMachine,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Logement, AvisResponse } from "@/lib/api";

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
  cuisine: 'Cuisine',
  securite: 'Securite',
  services: 'Services',
  multimedia: 'Multimedia',
  salleDeBain: 'Salle de bain',
  chambreLinge: 'Chambre & Linge',
  exterieurVue: 'Exterieur & Vue',
  accessibilite: 'Accessibilite',
  bienEtreLoisirs: 'Bien-etre & Loisirs',
  parkingTransport: 'Parking & Transport',
};

const lieuLabels: Record<string, string> = {
  plages: 'Plages',
  aeroports: 'Aeroports',
  restaurants: 'Restaurants & Commerces',
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
  const returnTo = searchParams.get('returnTo') || '/service-reservations?type=LOGEMENT';

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [avisPage, setAvisPage] = useState(1);

  const { data: logementResponse, isLoading } = useQuery({
    queryKey: ['logement-public', logementId],
    queryFn: () => api.logements.getPublic(logementId),
    enabled: !!logementId,
  });

  const logement: Logement | undefined = logementResponse?.data;

  const { data: avisResponse } = useQuery({
    queryKey: ['logement-avis', logementId, avisPage],
    queryFn: () => api.avis.logement(logementId, avisPage, 10),
    enabled: !!logementId,
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
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(returnTo)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux logements
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Galerie */}
        {images.length > 0 ? (
          <div className="relative h-72 md:h-96 bg-slate-100">
            <img src={images[currentImageIndex]} alt={logement.nom} className="w-full h-full object-cover" />
            {images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">
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

        {/* Miniatures */}
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

        <div className="p-6 space-y-6">
          {/* Titre + Prix + Partner */}
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
                {logement.type && <Badge className="bg-emerald-100 text-emerald-700 border-0">{logement.type}</Badge>}
                {logement.categorie && <Badge className="bg-slate-100 text-slate-600 border-0">{logement.categorie.replace(/_/g, ' ')}</Badge>}
                {logement.totalAvis != null && logement.totalAvis > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-0 gap-1">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    {logement.averageRating?.toFixed(1)} ({logement.totalAvis} avis)
                  </Badge>
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
                  {logement.prixWeekend != null && (
                    <p className="text-sm text-slate-500">
                      Weekend : {logement.prixWeekend.toLocaleString()} FCFA/nuit
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Partner */}
          {logement.partner && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              {logement.partner.logo && (
                <img src={logement.partner.logo} alt={logement.partner.nomPartner} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
              )}
              <div>
                <p className="text-xs text-slate-500">Propose par</p>
                <p className="font-medium text-slate-800">{logement.partner.nomPartner}</p>
              </div>
            </div>
          )}

          {/* Localisation */}
          {(logement.ville || logement.adresseExacte) && (
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <span>{logement.adresseExacte || logement.ville}</span>
                {logement.quartier && <span>, {logement.quartier}</span>}
                {logement.ville && logement.adresseExacte && <span> - {logement.ville}</span>}
                {logement.pays && <span>, {logement.pays}</span>}
              </div>
            </div>
          )}

          {/* Instructions d'acces */}
          {logement.instructionsAcces && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Instructions d&apos;acces</p>
                <p className="text-sm text-slate-600">{logement.instructionsAcces}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {logement.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{logement.description}</p>
            </div>
          )}

          {/* Caracteristiques */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Caracteristiques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {logement.capacite != null && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Users className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{logement.capacite} personne{logement.capacite > 1 ? 's' : ''} max</span>
                </div>
              )}
              {logement.nbreChambres != null && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Bed className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{logement.nbreChambres} chambre{logement.nbreChambres > 1 ? 's' : ''}</span>
                </div>
              )}
              {logement.salleDeBain != null && (
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

          {/* Tarification */}
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

          {/* Equipements detailles */}
          {logement.equipementsDetail && Object.keys(logement.equipementsDetail).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Equipements et services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(logement.equipementsDetail).map(([key, items]) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {equipementIcons[key] || <Check className="w-4 h-4 text-orange-500" />}
                        <h4 className="text-sm font-semibold text-slate-700">{equipementLabels[key] || key}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item, i) => (
                          <span key={i} className="text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equipements simples (fallback si pas de detail) */}
          {(!logement.equipementsDetail || Object.keys(logement.equipementsDetail).length === 0) && logement.equipements && logement.equipements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Equipements et services</h3>
              <div className="flex flex-wrap gap-2">
                {logement.equipements.map((eq, i) => (
                  <span key={i} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">{eq}</span>
                ))}
              </div>
            </div>
          )}

          {/* Lieux proches */}
          {logement.lieuxProches && Object.keys(logement.lieuxProches).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">A proximite</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(logement.lieuxProches).map(([key, lieux]) => {
                  if (!lieux || lieux.length === 0) return null;
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {lieuIcons[key] || <MapPin className="w-4 h-4 text-orange-500" />}
                        <h4 className="text-sm font-semibold text-slate-700">{lieuLabels[key] || key}</h4>
                      </div>
                      <div className="space-y-1.5">
                        {lieux.map((lieu, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{lieu.nom}{lieu.type ? ` (${lieu.type})` : ''}</span>
                            <Badge className="bg-white border border-slate-200 text-slate-600 text-xs">{lieu.distance}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regles de la maison */}
          {(logement.politiqueFumeur || logement.animauxCompagnie || logement.fetesAutorisees !== undefined || logement.heuresSilencieusesDebut || logement.ageMinimum) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Regles de la maison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {logement.politiqueFumeur && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <CigaretteOff className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-slate-600">{logement.politiqueFumeur === 'NON_FUMEUR' ? 'Non fumeur' : logement.politiqueFumeur.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {logement.animauxCompagnie && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <PawPrint className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-600">Animaux : {logement.animauxCompagnie === 'NON_AUTORISES' ? 'Non autorises' : logement.animauxCompagnie.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {logement.fetesAutorisees !== undefined && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <PartyPopper className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-sm text-slate-600">Fetes : {logement.fetesAutorisees ? 'Autorisees' : 'Non autorisees'}</span>
                  </div>
                )}
                {logement.heuresSilencieusesDebut && logement.heuresSilencieusesFin && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <VolumeX className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm text-slate-600">Heures silencieuses : {logement.heuresSilencieusesDebut} - {logement.heuresSilencieusesFin}</span>
                  </div>
                )}
                {logement.ageMinimum != null && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-slate-600">Age minimum : {logement.ageMinimum} ans</span>
                  </div>
                )}
              </div>
              {logement.autresRegles && (
                <p className="text-sm text-slate-500 mt-2">{logement.autresRegles}</p>
              )}
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

          {/* Avis */}
          {avisData && avisData.total > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Avis ({avisData.total})
                <span className="ml-2 text-yellow-600">
                  <Star className="w-3.5 h-3.5 inline fill-yellow-500 text-yellow-500" /> {avisData.moyennes.globale.toFixed(1)}
                </span>
              </h3>

              {/* Moyennes par critère */}
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

              {/* Liste des avis */}
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

              {/* Pagination */}
              {avisData.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={avisPage <= 1}
                    onClick={() => setAvisPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-600">
                    {avisPage} / {avisData.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={avisPage >= avisData.pages}
                    onClick={() => setAvisPage((p) => p + 1)}
                  >
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

      {/* Barre de reservation fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">{logement.type || 'Logement'}</p>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-slate-800 truncate">{logement.nom}</p>
              {logement.prixParNuit != null && (
                <span className="text-orange-600 font-bold shrink-0">{logement.prixParNuit.toLocaleString()} FCFA/nuit</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
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
