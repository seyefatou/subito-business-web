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
  CreditCard,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'Rejetée', color: 'bg-red-100 text-red-700' },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Impayé', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Payé', color: 'bg-green-100 text-green-700' },
  partial: { label: 'Partiel', color: 'bg-blue-100 text-blue-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
};

const serviceTypeLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  SALLE: { label: 'Salle', icon: Building2 },
  LOGEMENT: { label: 'Logement', icon: Home },
  ACTIVITE: { label: 'Activité', icon: Compass },
  CIRCUIT: { label: 'Circuit', icon: MapPin },
  FLOTTE: { label: 'Location véhicule', icon: Wallet },
};

const FORMAT_FCFA = (n?: number | null) => (n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—');

// Map status -> timeline step
function stepIndexFromStatus(status: string): number {
  const k = (status || '').toLowerCase();
  if (k === 'completed') return 4;
  if (k === 'in_progress') return 3;
  if (k === 'confirmed') return 2;
  if (k === 'pending') return 1;
  return 1;
}

const TIMELINE_STEPS = [
  { step: 1, label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  { step: 2, label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  { step: 3, label: 'En cours', color: 'bg-indigo-100 text-indigo-700' },
  { step: 4, label: 'Terminée', color: 'bg-green-100 text-green-700' },
];

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
    (new Date(reservation.dateFin || '').getTime() - new Date(reservation.dateDebut || '').getTime()) / (1000 * 60 * 60 * 24)
  );

  const status = statusLabels[reservation.status as string] || { label: reservation.status, color: 'bg-gray-100 text-gray-700' };
  const paymentStatus = paymentStatusLabels[reservation.paymentStatus] || { label: reservation.paymentStatus, color: 'bg-slate-100' };
  const serviceType = reservation.serviceType || '';
  const currentStep = stepIndexFromStatus(reservation.status);

  // Get the right name based on service type
  const getServiceName = () => {
    if (reservation.salle) return reservation.salle.nom;
    if (reservation.logement) return reservation.logement.nom;
    if (reservation.activite) return reservation.activite.titre;
    if (reservation.circuit) return reservation.circuit.titre;
    return 'Réservation';
  };

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
              {getServiceName()}
            </h1>
          </div>
          <div className="flex gap-3">
            <Badge className={`${status.color} border-0 px-4 py-2 text-sm font-bold`}>
              {status.label}
            </Badge>
            <Badge className={`${paymentStatus.color} border-0 px-4 py-2 text-sm font-bold`}>
              {paymentStatus.label}
            </Badge>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center">
            {TIMELINE_STEPS.map((timelineStep, idx) => (
              <React.Fragment key={timelineStep.step}>
                {/* Step Circle */}
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      currentStep >= timelineStep.step ? timelineStep.color : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {currentStep > timelineStep.step ? <CheckCircle2 className="w-6 h-6" /> : timelineStep.step}
                  </div>
                  <p className="text-xs font-bold text-slate-600 mt-2 text-center">{timelineStep.label}</p>
                </div>

                {/* Connecting Line */}
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-2 mb-6 rounded-full" style={{
                    background: currentStep > timelineStep.step ? '#E04A1F' : '#e2e8f0',
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content Grid - 2 columns (8/12 + 4/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
          {/* Left Column - Main Details (col-span-5 = ~62%) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Reservation Code Card */}
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
                Détails de la réservation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dates d'arrivée */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Date d&apos;arrivée</p>
                    <p className="text-base font-bold text-[#171c1f]">
                      {format(new Date(reservation.dateDebut), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    {reservation.heureDebut && (
                      <p className="text-xs text-[#585e6c] mt-2">
                        {reservation.heureDebut}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates de départ */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Date de départ</p>
                    <p className="text-base font-bold text-[#171c1f]">
                      {format(new Date(reservation.dateFin), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    {reservation.heureFin && (
                      <p className="text-xs text-[#585e6c] mt-2">
                        {reservation.heureFin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Durée */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Durée</p>
                    <p className="text-base font-bold text-[#171c1f]">
                      {numberOfNights} nuit{numberOfNights > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Voyageurs */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Personnes</p>
                    <p className="text-base font-bold text-[#171c1f]">
                      {reservation.nombrePersonnes}
                    </p>
                  </div>
                </div>

                {/* Service Details */}
                {reservation.salle && (
                  <div className="flex items-start gap-4 md:col-span-2">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Salle</p>
                      <p className="text-base font-bold text-[#171c1f]">{reservation.salle.nom}</p>
                      <p className="text-xs text-[#585e6c] mt-1">Capacité: {reservation.salle.capacite} personnes</p>
                      {reservation.salle.equipements?.length > 0 && (
                        <p className="text-xs text-[#585e6c] mt-1">Équipements: {reservation.salle.equipements.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

                {reservation.logement && (
                  <div className="flex items-start gap-4 md:col-span-2">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Home className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Logement</p>
                      <p className="text-base font-bold text-[#171c1f]">{reservation.logement.nom}</p>
                      <p className="text-xs text-[#585e6c] mt-1">{reservation.logement.type || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {reservation.activite && (
                  <div className="flex items-start gap-4 md:col-span-2">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Activité</p>
                      <p className="text-base font-bold text-[#171c1f]">{reservation.activite.titre}</p>
                      {reservation.activite.duree && (
                        <p className="text-xs text-[#585e6c] mt-1">Durée: {reservation.activite.duree}</p>
                      )}
                    </div>
                  </div>
                )}

                {reservation.circuit && (
                  <div className="flex items-start gap-4 md:col-span-2">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Circuit</p>
                      <p className="text-base font-bold text-[#171c1f]">{reservation.circuit.titre}</p>
                      {reservation.circuit.duree && (
                        <p className="text-xs text-[#585e6c] mt-1">Durée: {reservation.circuit.duree}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Détails de facturation */}
            {reservation.optionsSupplementaires && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                  Détails de facturation
                </h2>

                <div className="space-y-4">
                  {/* Options */}
                  {reservation.optionsSupplementaires.priceOptions?.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-[#171c1f] mb-3">Options supplémentaires</p>
                      <div className="space-y-2">
                        {reservation.optionsSupplementaires.priceOptions.map((option: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-[#585e6c]">{option.titre}</span>
                            <span className="font-semibold text-[#171c1f]">{FORMAT_FCFA(option.total)}</span>
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

          {/* Right Column - Sidebar (col-span-3 = ~38%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Client Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                Informations client
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest">Nom</p>
                    <p className="text-sm font-bold text-[#171c1f]">{reservation.clientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold text-[#171c1f] break-words">{reservation.clientEmail || 'N/A'}</p>
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

            {/* Payment Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
                Paiement
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#585e6c]">Statut</p>
                  <Badge className={`${paymentStatus.color} border-0 px-3 py-1 text-xs font-bold`}>
                    {paymentStatus.label}
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
