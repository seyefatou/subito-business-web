'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Printer,
  ChevronRight,
  Calendar,
  Users,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const serviceLabels: Record<string, { label: string; color: string }> = {
  LOGEMENT: { label: 'Logement', color: 'bg-cyan-100 text-cyan-700' },
  ACTIVITE: { label: 'Activité', color: 'bg-emerald-100 text-emerald-700' },
  CIRCUIT: { label: 'Circuit', color: 'bg-purple-100 text-purple-700' },
  FLOTTE: { label: 'Location de véhicule', color: 'bg-pink-100 text-pink-700' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmé', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Complétée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Payé', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
};

const FORMAT_FCFA = (n?: number | null) => (n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—');

export default function ServiceReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = parseInt(params?.id || '', 10);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['service-reservation-detail', id],
    queryFn: () => api.serviceReservations.get(id),
    enabled: !isNaN(id),
  });

  const reservation = response?.data;

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

  const status = statusLabels[reservation.status as string] || { label: reservation.status, color: 'bg-gray-100 text-gray-700' };
  const paymentStatus = paymentStatusLabels[reservation.paymentStatus as string] || { label: reservation.paymentStatus, color: 'bg-gray-100 text-gray-700' };
  const serviceType = serviceLabels[reservation.serviceType as string] || { label: reservation.serviceType, color: 'bg-gray-100 text-gray-700' };

  const timelineSteps = [
    { label: 'EN ATTENTE', key: 'pending' },
    { label: 'Confirmé', key: 'confirmed' },
    { label: 'En cours', key: 'in_progress' },
    { label: 'Complétée', key: 'completed' },
  ];

  const getStatusIndex = () => {
    const statusMap: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      in_progress: 2,
      completed: 3,
    };
    return statusMap[reservation.status as string] ?? 0;
  };

  const currentStatusIndex = getStatusIndex();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 -ml-2 text-slate-600 hover:text-[#E04A1F]"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/service-reservations" className="hover:text-[#E04A1F] cursor-pointer transition-colors font-medium">
              Suivi commandes
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold">{reservation.reservationCode}</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#171c1f]" style={MANROPE}>
            Détail de la réservation
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="gap-2 rounded-xl w-fit"
        >
          <Printer className="w-4 h-4" />
          Imprimer
        </Button>
      </div>

      {/* Timeline */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {timelineSteps.map((step, index) => {
            const isActive = index === currentStatusIndex;
            const isPassed = index < currentStatusIndex;
            return (
              <div key={step.key} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    isActive ? 'bg-orange-500' :
                    isPassed ? 'bg-green-500' : 'bg-slate-300'
                  }`}>
                    {isPassed ? '✓' : index + 1}
                  </div>
                  <p className={`text-xs font-bold mt-2 text-center whitespace-nowrap ${
                    isActive ? 'text-slate-700' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </p>
                </div>
                {index < timelineSteps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${isPassed ? 'bg-green-500' : 'bg-slate-300'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${serviceType.color} border-0 px-4 py-2 text-sm font-bold`}>
          {serviceType.label}
        </Badge>
        <Badge className={`${status.color} border-0 px-4 py-2 text-sm font-bold`}>
          {status.label}
        </Badge>
        <Badge className={`${paymentStatus.color} border-0 px-4 py-2 text-sm font-bold`}>
          {paymentStatus.label}
        </Badge>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Service */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
              Détails service
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Date</p>
                <p className="text-base font-bold text-[#171c1f]">
                  {format(new Date(reservation.dateDebut), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-[#585e6c] mt-1">
                  {format(new Date(reservation.dateDebut), 'HH:mm', { locale: fr })}
                </p>
              </div>

              {/* Participants */}
              <div>
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Participants</p>
                <p className="text-base font-bold text-[#171c1f]">
                  {reservation.nombrePersonnes} personne{reservation.nombrePersonnes > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </section>

          {/* Activity/Circuit Details */}
          {(reservation.activite || reservation.circuit) && (
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
                {reservation.activite ? 'Activité' : 'Circuit'}
              </h3>

              <div>
                <p className="text-base font-bold text-[#171c1f]">
                  {reservation.activite?.titre || reservation.circuit?.titre}
                </p>
                {(reservation.activite?.ville || reservation.circuit?.ville) && (
                  <p className="text-xs text-[#585e6c] mt-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {reservation.activite?.ville || reservation.circuit?.ville}
                  </p>
                )}
                {(reservation.activite?.duree || reservation.circuit?.duree) && (
                  <p className="text-xs text-[#585e6c] mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {reservation.activite?.duree || reservation.circuit?.duree}
                  </p>
                )}
              </div>

              {(reservation.activite?.descriptionComplete || reservation.activite?.descriptionCourte || reservation.circuit?.descriptionComplete || reservation.circuit?.descriptionCourte) && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-[#585e6c]">
                    {reservation.activite?.descriptionComplete || reservation.activite?.descriptionCourte || reservation.circuit?.descriptionComplete || reservation.circuit?.descriptionCourte}
                  </p>
                </div>
              )}

              {((reservation.activite?.inclus && reservation.activite.inclus.length > 0) || (reservation.circuit?.inclus && reservation.circuit.inclus.length > 0)) && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Inclus</p>
                  <ul className="space-y-1">
                    {((reservation.activite?.inclus || reservation.circuit?.inclus) || []).map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-[#585e6c] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Détails de facturation */}
          {reservation.optionsSupplementaires && (
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
                Détails de facturation
              </h3>

              <div className="space-y-4">
                {reservation.optionsSupplementaires.pension && (
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-base font-bold text-[#171c1f]">
                          {reservation.optionsSupplementaires.pension.formule}
                        </p>
                        <p className="text-xs text-[#585e6c] mt-1 uppercase tracking-widest font-bold">
                          Formule repas
                        </p>
                      </div>
                      <span className="bg-[#ffdbd0] text-[#E04A1F] text-xs font-bold px-3 py-1 rounded-full">
                        Principal
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <p className="text-[#585e6c]">{reservation.optionsSupplementaires.pension.nbNuits} nuit{reservation.optionsSupplementaires.pension.nbNuits > 1 ? 's' : ''}</p>
                        <p className="font-semibold text-[#171c1f]">{FORMAT_FCFA(reservation.optionsSupplementaires.pension.prixParNuit)}/nuit</p>
                      </div>
                      {reservation.optionsSupplementaires.pension.nbWeekend > 0 && (
                        <div className="flex justify-between text-sm">
                          <p className="text-[#585e6c]">{reservation.optionsSupplementaires.pension.nbWeekend} jour{reservation.optionsSupplementaires.pension.nbWeekend > 1 ? 's' : ''} weekend</p>
                          <p className="font-semibold text-[#171c1f]">{FORMAT_FCFA(reservation.optionsSupplementaires.pension.prixWeekend)}/jour</p>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <p className="font-semibold text-[#171c1f]">Sous-total</p>
                        <p className="font-bold text-[#E04A1F]">{FORMAT_FCFA(reservation.optionsSupplementaires.pension.total)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {reservation.optionsSupplementaires.priceOptions?.length > 0 && (
                  <div>
                    <p className="text-base font-bold text-[#171c1f] mb-4">Options supplémentaires</p>
                    <div className="space-y-3">
                      {reservation.optionsSupplementaires.priceOptions.map((option, idx) => (
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
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          {/* Payment Summary */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 sticky top-24">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
              Récapitulatif paiement
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-[#585e6c]">Total</p>
                <p className="text-2xl font-bold text-[#E04A1F]">
                  {FORMAT_FCFA(reservation.totalPrice)}
                </p>
              </div>

              <div className="pt-4 border-t-2 border-[#E04A1F]">
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Statut paiement</p>
                <Badge className={`${paymentStatus.color} border-0 w-full justify-center`}>
                  {paymentStatus.label}
                </Badge>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
