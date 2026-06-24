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
  Home,
  Wallet,
  User,
  Mail,
  Phone,
  Building2,
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
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
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
  const paymentStatus = paymentStatusLabels[reservation.paymentStatus as string] || { label: reservation.paymentStatus, color: 'bg-gray-100 text-gray-700' };
  const serviceType = serviceLabels[reservation.serviceType as string] || { label: reservation.serviceType, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* Bouton Retour */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 -ml-2 text-slate-600 hover:text-[#E04A1F]"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>

      {/* Breadcrumbs + Title + Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/service-reservations" className="hover:text-[#E04A1F] cursor-pointer transition-colors font-medium">
              Réservations
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold">{reservation.reservationCode || 'N/A'}</span>
          </nav>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
            style={MANROPE}
          >
            Détail de la réservation
          </h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Status and Service Badges */}
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

      {/* Hero image */}
      {reservation.logement?.images?.[0] && (
        <section className="relative h-48 md:h-64 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(23,28,31,0.06)]">
          <img
            src={reservation.logement.images[0]}
            alt={reservation.logement.nom}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight" style={MANROPE}>
              {reservation.logement.nom}
            </h2>
            <p className="text-white/80 text-sm mt-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {reservation.logement.ville}, {reservation.logement.pays}
            </p>
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Main Content (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Référence de réservation */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">
              Référence de réservation
            </h3>
            <p className="text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
              {reservation.reservationCode}
            </p>
            <p className="text-sm text-[#585e6c] mt-3">
              Créée le {format(new Date(reservation.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </section>

          {/* Détails du séjour */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
              Détails du séjour
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dates */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Arrivée</p>
                  <p className="text-base font-bold text-[#171c1f]">
                    {format(new Date(reservation.dateDebut), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-xs text-[#585e6c] mt-2">
                    Check-in : {reservation.logement?.heureCheckIn || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Nuits */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Durée</p>
                  <p className="text-base font-bold text-[#171c1f]">{numberOfNights} nuit{numberOfNights > 1 ? 's' : ''}</p>
                  {reservation.optionsSupplementaires?.pension && (
                    <>
                      <p className="text-xs text-[#585e6c] mt-1">
                        {reservation.optionsSupplementaires.pension.nbNuits} en semaine
                      </p>
                      {reservation.optionsSupplementaires.pension.nbWeekend > 0 && (
                        <p className="text-xs text-[#585e6c]">
                          + {reservation.optionsSupplementaires.pension.nbWeekend} jour{reservation.optionsSupplementaires.pension.nbWeekend > 1 ? 's' : ''} weekend
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Départ */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Départ</p>
                  <p className="text-base font-bold text-[#171c1f]">
                    {format(new Date(reservation.dateFin), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-xs text-[#585e6c] mt-2">
                    Check-out : {reservation.logement?.heureCheckOut || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Voyageurs */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Voyageurs</p>
                  <p className="text-base font-bold text-[#171c1f]">
                    {reservation.nombrePersonnes} personne{reservation.nombrePersonnes > 1 ? 's' : ''}
                  </p>
                  {reservation.logement?.capacite && (
                    <p className="text-xs text-[#585e6c] mt-1">Capacité : {reservation.logement.capacite}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Caractéristiques du logement */}
            {reservation.logement && (
              <div className="border-t border-slate-100 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Chambres</p>
                  <p className="text-lg font-extrabold text-[#171c1f]">{reservation.logement.nbreChambres}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Salles de bain</p>
                  <p className="text-lg font-extrabold text-[#171c1f]">{reservation.logement.salleDeBain}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Type</p>
                  <p className="text-sm font-bold text-[#171c1f]">{reservation.logement.type}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Annulation</p>
                  <p className="text-sm font-bold text-[#171c1f]">{reservation.logement.typeAnnulation}</p>
                </div>
              </div>
            )}
          </section>

          {/* Détails de facturation */}
          {reservation.optionsSupplementaires && (
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
                Détails de facturation
              </h3>

              <div className="space-y-4">
                {/* Pension */}
                {reservation.optionsSupplementaires.pension && (
                  <div className="pb-4 border-b border-slate-100">
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

                {/* Options */}
                {reservation.optionsSupplementaires.priceOptions?.length > 0 && (
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
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Récapitulatif du prix */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 sticky top-24">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
              Récapitulatif
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-[#585e6c]">Sous-total</p>
                <p className="font-semibold text-[#171c1f]">
                  {FORMAT_FCFA(reservation.optionsSupplementaires?.pension?.total || 0)}
                </p>
              </div>

              {reservation.optionsSupplementaires?.montantOptions ? (
                <div className="flex justify-between">
                  <p className="text-[#585e6c]">Options</p>
                  <p className="font-semibold text-[#171c1f]">
                    {FORMAT_FCFA(reservation.optionsSupplementaires.montantOptions)}
                  </p>
                </div>
              ) : null}

              <div className="flex justify-between pt-4 border-t-2 border-[#E04A1F]">
                <p className="font-extrabold text-[#171c1f]">TOTAL</p>
                <p className="text-2xl font-extrabold text-[#E04A1F]">
                  {FORMAT_FCFA(reservation.totalPrice)}
                </p>
              </div>
            </div>
          </section>

          {/* Informations client */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
              Informations client
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <User className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Nom</p>
                  <p className="text-sm font-semibold text-[#171c1f]">{reservation.clientName}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Email</p>
                  <p className="text-sm font-semibold text-[#171c1f] truncate">{reservation.clientEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="w-5 h-5 text-[#E04A1F] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Téléphone</p>
                  <p className="text-sm font-semibold text-[#171c1f]">{reservation.clientPhone}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Informations partenaire */}
          {reservation.partner && (
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
                Partenaire
              </h3>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#171c1f]">{reservation.partner.nomPartner}</p>
                  <p className="text-xs text-[#585e6c] mt-1">{reservation.partner.adressePartner}</p>
                  <p className="text-xs text-[#585e6c] mt-2">{reservation.partner.emailPartner}</p>
                  <p className="text-xs text-[#585e6c]">{reservation.partner.telephonePartner}</p>
                </div>
              </div>
            </section>
          )}

          {/* Paiement */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
              Paiement
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Statut</p>
                <Badge className={`${paymentStatus.color} border-0 w-full justify-center`}>
                  {paymentStatus.label}
                </Badge>
              </div>

              {reservation.notes && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-[#171c1f]">{reservation.notes}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
