'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Home,
  Wallet,
  User,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Complétée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

const FORMAT_FCFA = (n?: number | null) => (n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—');

export default function ServiceReservationTrackingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = parseInt(params?.id || '', 10);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['service-reservation-detail', id],
    queryFn: () => api.serviceReservations.get(id),
    enabled: !isNaN(id),
  });

  const reservation = response?.data as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">Réservation non trouvée</p>
          <Button onClick={() => router.back()} className="bg-[#E04A1F] text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const numberOfNights = Math.ceil(
    (new Date(reservation.dateFin || '').getTime() - new Date(reservation.dateDebut || '').getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const status = statusLabels[reservation.status as string] || { label: reservation.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6 text-[#171c1f]" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
              Suivi de réservation
            </p>
            <h1 className="text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
              {(reservation.logement as any)?.nom || (reservation.activite as any)?.nom || (reservation.circuit as any)?.nom || 'Réservation'}
            </h1>
          </div>
          <Badge className={`${status.color} border-0 px-4 py-2 text-sm font-bold`}>
            {status.label}
          </Badge>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Réservation Code */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                Référence de réservation
              </h2>
              <p className="text-2xl font-bold text-[#E04A1F]">{reservation.reservationCode || 'N/A'}</p>
              <p className="text-sm text-[#585e6c] mt-2">
                Créée le {format(new Date(reservation.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>

            {/* Détails du séjour */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                Détails du séjour
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dates */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Date d&apos;arrivée</p>
                    <p className="text-base font-bold text-[#171c1f]">
                      {format(new Date(reservation.dateDebut), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-xs text-[#585e6c] mt-2">
                      Check-in : {reservation.logement?.heureCheckIn || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Nombre de nuits précis */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Durée du séjour</p>
                    <p className="text-base font-bold text-[#171c1f]">{numberOfNights} nuit{numberOfNights > 1 ? 's' : ''}</p>
                    {reservation.optionsSupplementaires?.pension && (
                      <>
                        <p className="text-xs text-[#585e6c] mt-1">
                          {reservation.optionsSupplementaires.pension.nbNuits} nuit{reservation.optionsSupplementaires.pension.nbNuits > 1 ? 's' : ''} en semaine
                        </p>
                        {reservation.optionsSupplementaires.pension.nbWeekend > 0 && (
                          <p className="text-xs text-[#585e6c]">
                            + {reservation.optionsSupplementaires.pension.nbWeekend} jour{reservation.optionsSupplementaires.pension.nbWeekend > 1 ? 's' : ''} weekend
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-xs text-[#585e6c] mt-2">
                      Départ : {format(new Date(reservation.dateFin), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-xs text-[#585e6c]">
                      Check-out : {reservation.logement?.heureCheckOut || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Voyageurs */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Voyageurs</p>
                    <p className="text-base font-bold text-[#171c1f]">
                      {reservation.nombrePersonnes} personne{reservation.nombrePersonnes > 1 ? 's' : ''}
                    </p>
                    {reservation.logement?.capacite && (
                      <p className="text-xs text-[#585e6c] mt-1">Capacité max : {reservation.logement.capacite}</p>
                    )}
                  </div>
                </div>

                {/* Logement avec détails */}
                {reservation.logement && (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Home className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Logement</p>
                        <p className="text-base font-bold text-[#171c1f]">{reservation.logement.nom}</p>
                        <p className="text-xs text-[#585e6c] mt-1">{reservation.logement.type || 'N/A'}</p>
                        {reservation.logement.ville && (
                          <p className="text-xs text-[#585e6c]">
                            {reservation.logement.ville}, {reservation.logement.pays}
                          </p>
                        )}
                        <div className="text-xs text-[#585e6c] mt-2">
                          <p>• {reservation.logement.nbreChambres} chambre{reservation.logement.nbreChambres !== 1 ? 's' : ''}</p>
                          <p>• {reservation.logement.salleDeBain} salle{reservation.logement.salleDeBain !== 1 ? 's' : ''} de bain</p>
                        </div>
                      </div>
                    </div>

                    {/* Image du logement */}
                    {reservation.logement.images?.[0] && (
                      <div className="md:col-span-2">
                        <img
                          src={reservation.logement.images[0]}
                          alt={reservation.logement.nom}
                          className="w-full h-48 object-cover rounded-2xl"
                        />
                      </div>
                    )}

                    {/* Conditions d'annulation */}
                    {reservation.logement.typeAnnulation && (
                      <div className="md:col-span-2 bg-blue-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Politique d&apos;annulation</p>
                        <p className="text-sm text-blue-900">{reservation.logement.typeAnnulation}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Activité avec détails */}
                {reservation.activite && (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Activité</p>
                        <p className="text-base font-bold text-[#171c1f]">{reservation.activite.titre}</p>
                        {reservation.activite.ville && (
                          <p className="text-xs text-[#585e6c]">
                            {reservation.activite.ville}
                          </p>
                        )}
                        {reservation.activite.duree && (
                          <p className="text-xs text-[#585e6c] mt-1">Durée : {reservation.activite.duree}</p>
                        )}
                        {reservation.activite.maxParticipants && (
                          <p className="text-xs text-[#585e6c]">Max : {reservation.activite.maxParticipants} pers.</p>
                        )}
                      </div>
                    </div>

                    {/* Image de l&apos;activité */}
                    {reservation.activite.images?.[0] && (
                      <div className="md:col-span-2">
                        <img
                          src={reservation.activite.images[0]}
                          alt={reservation.activite.titre}
                          className="w-full h-48 object-cover rounded-2xl"
                        />
                      </div>
                    )}

                    {/* Description de l&apos;activité */}
                    {(reservation.activite.descriptionComplete || reservation.activite.descriptionCourte) && (
                      <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Description</p>
                        <p className="text-sm text-[#585e6c]">{reservation.activite.descriptionComplete || reservation.activite.descriptionCourte}</p>
                      </div>
                    )}

                    {/* Inclus */}
                    {reservation.activite.inclus && reservation.activite.inclus.length > 0 && (
                      <div className="md:col-span-2 bg-green-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Inclus</p>
                        <ul className="space-y-1">
                          {(Array.isArray(reservation.activite.inclus) ? reservation.activite.inclus : (reservation.activite.inclus as string).split(',')).map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-green-900 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Non inclus */}
                    {reservation.activite.nonInclus && reservation.activite.nonInclus.length > 0 && (
                      <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Non inclus</p>
                        <ul className="space-y-1">
                          {(Array.isArray(reservation.activite.nonInclus) ? reservation.activite.nonInclus : (reservation.activite.nonInclus as string).split(',')).map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Conditions d'annulation */}
                    {reservation.activite.typeAnnulation && (
                      <div className="md:col-span-2 bg-blue-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Politique d&apos;annulation</p>
                        <p className="text-sm text-blue-900">{reservation.activite.typeAnnulation}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Circuit avec détails */}
                {reservation.circuit && (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Circuit</p>
                        <p className="text-base font-bold text-[#171c1f]">{reservation.circuit.titre}</p>
                        {reservation.circuit.ville && (
                          <p className="text-xs text-[#585e6c]">
                            {reservation.circuit.ville}
                          </p>
                        )}
                        {reservation.circuit.duree && (
                          <p className="text-xs text-[#585e6c] mt-1">Durée : {reservation.circuit.duree}</p>
                        )}
                        {reservation.circuit.maxParticipants && (
                          <p className="text-xs text-[#585e6c]">Max : {reservation.circuit.maxParticipants} pers.</p>
                        )}
                      </div>
                    </div>

                    {/* Image du circuit */}
                    {reservation.circuit.images?.[0] && (
                      <div className="md:col-span-2">
                        <img
                          src={reservation.circuit.images[0]}
                          alt={reservation.circuit.titre}
                          className="w-full h-48 object-cover rounded-2xl"
                        />
                      </div>
                    )}

                    {/* Description du circuit */}
                    {(reservation.circuit.descriptionComplete || reservation.circuit.descriptionCourte) && (
                      <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Description</p>
                        <p className="text-sm text-[#585e6c]">{reservation.circuit.descriptionComplete || reservation.circuit.descriptionCourte}</p>
                      </div>
                    )}

                    {/* Inclus */}
                    {reservation.circuit.inclus && reservation.circuit.inclus.length > 0 && (
                      <div className="md:col-span-2 bg-green-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Inclus</p>
                        <ul className="space-y-1">
                          {(Array.isArray(reservation.circuit.inclus) ? reservation.circuit.inclus : (reservation.circuit.inclus as string).split(',')).map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-green-900 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Non inclus */}
                    {reservation.circuit.nonInclus && reservation.circuit.nonInclus.length > 0 && (
                      <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Non inclus</p>
                        <ul className="space-y-1">
                          {(Array.isArray(reservation.circuit.nonInclus) ? reservation.circuit.nonInclus : (reservation.circuit.nonInclus as string).split(',')).map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Conditions d'annulation */}
                    {reservation.circuit.typeAnnulation && (
                      <div className="md:col-span-2 bg-blue-50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Politique d&apos;annulation</p>
                        <p className="text-sm text-blue-900">{reservation.circuit.typeAnnulation}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Options et prix */}
            {reservation.optionsSupplementaires && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                  Détails de facturation
                </h2>

                <div className="space-y-6">
                  {/* Pension */}
                  {reservation.optionsSupplementaires.pension && (
                    <div className="pb-6 border-b-2 border-slate-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-base font-extrabold text-[#171c1f]">
                            {reservation.optionsSupplementaires.pension.formule}
                          </p>
                          <p className="text-xs text-[#585e6c] mt-1 uppercase tracking-widest font-bold">
                            Formule repas
                          </p>
                        </div>
                        <span className="bg-[#ffdbd0] text-[#E04A1F] text-xs font-bold px-3 py-1 rounded-full">
                          Principale
                        </span>
                      </div>

                      <div className="space-y-3 bg-slate-50 rounded-xl p-4 mt-4">
                        <div className="flex justify-between">
                          <p className="text-sm text-[#585e6c]">
                            {reservation.optionsSupplementaires.pension.nbNuits} nuit
                            {reservation.optionsSupplementaires.pension.nbNuits > 1 ? 's' : ''} en semaine
                          </p>
                          <p className="text-sm font-semibold text-[#171c1f]">
                            {FORMAT_FCFA(reservation.optionsSupplementaires.pension.prixParNuit)} / nuit
                          </p>
                        </div>

                        {reservation.optionsSupplementaires.pension.nbWeekend > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-[#585e6c]">
                              {reservation.optionsSupplementaires.pension.nbWeekend} jour
                              {reservation.optionsSupplementaires.pension.nbWeekend > 1 ? 's' : ''} weekend
                            </p>
                            <p className="text-sm font-semibold text-[#171c1f]">
                              {FORMAT_FCFA(reservation.optionsSupplementaires.pension.prixWeekend)} / jour
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between pt-3 border-t border-slate-200">
                          <p className="font-semibold text-[#171c1f]">Sous-total pension</p>
                          <p className="font-bold text-[#E04A1F]">
                            {FORMAT_FCFA(reservation.optionsSupplementaires.pension.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options supplémentaires */}
                  {reservation.optionsSupplementaires.priceOptions &&
                    reservation.optionsSupplementaires.priceOptions.length > 0 && (
                      <div>
                        <p className="text-base font-extrabold text-[#171c1f] mb-4">Options supplémentaires</p>
                        <div className="space-y-3">
                          {reservation.optionsSupplementaires.priceOptions.map((option: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 rounded-xl p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-semibold text-[#171c1f] capitalize">{option.titre}</p>
                                  <p className="text-xs text-[#585e6c] mt-1">Code: {option.code}</p>
                                </div>
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">
                                  {option.pricingMode === 'PER_NUIT' ? 'Par nuit' : 'Quantité'}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <p className="text-[#585e6c]">Prix unitaire</p>
                                  <p className="font-semibold text-[#171c1f]">{FORMAT_FCFA(option.prix)}</p>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <p className="text-[#585e6c]">Quantité</p>
                                  <p className="font-semibold text-[#171c1f]">{option.quantite}</p>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                  <p className="font-semibold text-[#171c1f]">Total</p>
                                  <p className="font-bold text-[#E04A1F]">{FORMAT_FCFA(option.total)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Total */}
                  <div className="pt-4 border-t-2 border-[#E04A1F]">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-extrabold text-[#171c1f]" style={MANROPE}>
                        TOTAL
                      </p>
                      <p className="text-3xl font-extrabold text-[#E04A1F]">
                        {FORMAT_FCFA(reservation.totalPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Client Info */}
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                Informations du client
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest">Nom complet</p>
                    <p className="text-sm font-bold text-[#171c1f]">{reservation.clientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold text-[#171c1f] truncate">{reservation.clientEmail || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest">Téléphone</p>
                    <p className="text-sm font-bold text-[#171c1f]">{reservation.clientPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Partner Info */}
            {reservation.partner && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                  Partenaire
                </h2>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#171c1f]">{reservation.partner.nomPartner}</p>
                    <p className="text-sm text-[#585e6c]">{reservation.partner.adressePartner}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Contact</p>
                  <p className="text-sm text-[#171c1f] break-words">{reservation.partner.emailPartner}</p>
                  <p className="text-sm text-[#171c1f]">{reservation.partner.telephonePartner}</p>
                </div>
              </div>
            )}

            {/* Paiement */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                Paiement
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#585e6c]">Statut</p>
                  <Badge className={statusLabels[reservation.paymentStatus]?.color || 'bg-gray-100'}>
                    {statusLabels[reservation.paymentStatus]?.label || reservation.paymentStatus}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#585e6c]">Montant</p>
                  <p className="font-bold text-[#E04A1F]">{FORMAT_FCFA(reservation.totalPrice)}</p>
                </div>

                {reservation.notes && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Notes</p>
                    <p className="text-sm text-[#171c1f]">{reservation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
