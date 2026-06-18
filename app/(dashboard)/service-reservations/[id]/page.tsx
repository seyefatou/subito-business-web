'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
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
  CreditCard,
  Phone,
  Mail,
  Home,
  Building2,
  Bed,
  Bath,
  Wifi,
  Coffee,
  Tv,
  Utensils,
  Car,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { api, BictorysServiceType } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const serviceLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  LOGEMENT: { label: 'Logement', color: 'bg-cyan-100 text-cyan-700', icon: <Home className="w-3.5 h-3.5" /> },
  ACTIVITE: { label: 'Activité', color: 'bg-emerald-100 text-emerald-700', icon: <MapPin className="w-3.5 h-3.5" /> },
  CIRCUIT: { label: 'Circuit', color: 'bg-purple-100 text-purple-700', icon: <MapPin className="w-3.5 h-3.5" /> },
  FLOTTE: { label: 'Location véhicule', color: 'bg-pink-100 text-pink-700', icon: <Car className="w-3.5 h-3.5" /> },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'Rejetée', color: 'bg-red-100 text-red-700' },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Payé', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
};

const acompteStatusLabels: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  VERSE: { label: 'Versé', color: 'bg-green-100 text-green-700' },
  ANNULE: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
};

const FORMAT_FCFA = (n?: number | null) => (n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—');

export default function ServiceReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = parseInt(params?.id || '', 10);
  const [showPayDialog, setShowPayDialog] = React.useState(false);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['service-reservation-detail', id],
    queryFn: () => api.serviceReservations.get(id),
    enabled: !isNaN(id),
  });

  const reservation = response?.data;

  // ✅ Mutation de paiement avec le bon serviceType : 'service_reservation_acompte'
  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await api.bictorys.initiate({
        serviceType: 'service_reservation_acompte' as BictorysServiceType,
        serviceId: id,
      });
      const checkoutUrl = res?.data?.checkoutUrl || (res as { checkoutUrl?: string })?.checkoutUrl;
      if (!checkoutUrl) throw new Error("URL de paiement Bictorys non disponible");
      window.open(checkoutUrl, "_blank");
      return res;
    },
    onSuccess: () => {
      toast.success("Redirection vers la page de paiement");
      setShowPayDialog(false);
      queryClient.invalidateQueries({ queryKey: ["service-reservation-detail"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors du paiement");
    },
  });

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

  const status = statusLabels[reservation.status as string] || { label: reservation.status || 'Inconnu', color: 'bg-gray-100 text-gray-700' };
  const paymentStatus = paymentStatusLabels[reservation.paymentStatus as string] || { label: reservation.paymentStatus || 'Inconnu', color: 'bg-gray-100 text-gray-700' };
  const serviceType = serviceLabels[reservation.serviceType as string] || { label: reservation.serviceType || 'Service', color: 'bg-gray-100 text-gray-700', icon: null };
  const acompteStatus = acompteStatusLabels[reservation.acompteStatut as string] || { label: reservation.acompteStatut || 'Inconnu', color: 'bg-gray-100 text-gray-700' };

  const isPaid = reservation.paymentStatus === 'paid';
  const isAcompteRequis = reservation.acompteRequis;
  const acompteMontant = Number(reservation.acompteMontant || 0);
  const isAcomptePaye = reservation.acompteStatut === 'VERSE';

  const canPayAcompte = !isPaid && isAcompteRequis && !isAcomptePaye && reservation.paidBy !== 'client' && (reservation.status === 'pending' || reservation.status === 'confirmed');
  const canPaySolde = !isPaid && isAcompteRequis && isAcomptePaye && reservation.paidBy !== 'client' && (reservation.status === 'pending' || reservation.status === 'confirmed');
  const canPay = canPayAcompte || canPaySolde;

  const logement = reservation.logement as Record<string, unknown> | undefined;
  const vehicule = reservation.vehiculeLocation as Record<string, unknown> | undefined;
  const activite = reservation.activite as Record<string, unknown> | undefined;
  const circuit = reservation.circuit as Record<string, unknown> | undefined;
  const partner = reservation.partner as Record<string, unknown> | undefined;
  const company = reservation.compagny as Record<string, unknown> | undefined;
  const employee = reservation.employee as Record<string, unknown> | undefined;

  const clientName = reservation.clientName || (employee ? `${employee.prenom} ${employee.nom}` : '—');
  const clientEmail = reservation.clientEmail || employee?.email;
  const clientPhone = reservation.clientPhone || employee?.telephone;
  const adresseLivraison = reservation.adresseLivraison;

  const dateDebut = reservation.dateDebut;
  const dateFin = reservation.dateFin;
  const nbPersonnes = reservation.nombrePersonnes || 1;

  const images = logement?.images as string[] || [];
  const heroImage = images.length > 0 ? images[0] : null;

  const pension = reservation.optionsSupplementaires?.pension;
  const priceOptions = reservation.optionsSupplementaires?.priceOptions || [];

  const reservationCode = reservation.reservationCode || `#${reservation.id}`;

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
            <Link href="/tracking" className="hover:text-[#E04A1F] cursor-pointer transition-colors font-medium">
              Suivi commandes
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold">{reservationCode}</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#171c1f]" style={MANROPE}>
            Détail de la réservation
          </h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-xl">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
          {canPay && (
            <Button variant="gradient" onClick={() => setShowPayDialog(true)} className="gap-2 rounded-xl px-6">
              <CreditCard className="w-4 h-4" />
              {canPayAcompte ? 'Payer l\'acompte' : 'Payer le solde'}
            </Button>
          )}
        </div>
      </div>

      {/* Hero Image */}
      {heroImage && (
        <section className="relative h-48 md:h-64 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(23,28,31,0.06)]">
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">{serviceType.label}</p>
                <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight" style={MANROPE}>
                  {logement?.nom || activite?.titre || circuit?.titre || vehicule?.marque || 'Réservation'}
                </h2>
              </div>
              <Badge className={`${serviceType.color} border-0 gap-1.5 px-3 py-1.5 shadow-md`}>
                {serviceType.icon} {serviceType.label}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${serviceType.color} border-0 gap-1.5 px-3 py-1`}>
          {serviceType.icon} {serviceType.label}
        </Badge>
        <Badge className={`${status.color} border-0 px-3 py-1`}>{status.label}</Badge>
        <Badge className={`${paymentStatus.color} border-0 px-3 py-1`}>{paymentStatus.label}</Badge>
        {isAcompteRequis && acompteMontant > 0 && (
          <Badge className={`${acompteStatus.color} border-0 px-3 py-1`}>
            Acompte : {FORMAT_FCFA(acompteMontant)} ({acompteStatus.label})
          </Badge>
        )}
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne principale */}
        <article className="lg:col-span-8 bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 overflow-hidden divide-y divide-slate-100">

          {/* Informations client */}
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">Informations client</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(clientName || 'C').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#171c1f] truncate">{clientName}</p>
                {reservation.canal ? <p className="text-slate-400 text-xs mt-0.5">Via {reservation.canal}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {clientPhone && (
                <a href={`tel:${clientPhone}`} className="flex items-center gap-2 text-[#171c1f] hover:text-[#E04A1F] font-medium transition-colors">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" /> {clientPhone}
                </a>
              )}
              {clientEmail && (
                <a href={`mailto:${clientEmail}`} className="flex items-center gap-2 text-[#171c1f] hover:text-[#E04A1F] font-medium transition-colors truncate">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{clientEmail}</span>
                </a>
              )}
              {adresseLivraison && (
                <div className="flex items-start gap-2 sm:col-span-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> {adresseLivraison}
                </div>
              )}
            </div>
          </div>

          {/* Détails du service */}
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">
              {reservation.serviceType === 'LOGEMENT' ? 'Détails du logement' :
               reservation.serviceType === 'FLOTTE' ? 'Détails du véhicule' :
               reservation.serviceType === 'ACTIVITE' ? 'Détails de l\'activité' :
               reservation.serviceType === 'CIRCUIT' ? 'Détails du circuit' :
               'Détails de la réservation'}
            </p>

            {/* Logement */}
            {logement && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nom</p>
                  <p className="font-medium text-[#171c1f]">{logement.nom}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</p>
                  <p className="font-medium text-[#171c1f]">{logement.type} • {logement.categorie}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ville</p>
                  <p className="font-medium text-[#171c1f]">{logement.ville}, {logement.pays}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capacité</p>
                  <p className="font-medium text-[#171c1f]">{logement.capacite} personnes • {logement.nbreChambres} chambres • {logement.salleDeBain} sdb</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Check-in / Check-out</p>
                  <p className="font-medium text-[#171c1f]">{logement.heureCheckIn} / {logement.heureCheckOut}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Annulation</p>
                  <p className="font-medium text-[#171c1f]">{logement.typeAnnulation}</p>
                </div>
              </div>
            )}

            {/* Véhicule */}
            {vehicule && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Véhicule</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.marque} {vehicule.modele} ({vehicule.annee})</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Places</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.places}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transmission</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.transmission}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carburant</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.carburant}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Climatisation</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.isClimatisation ? 'Oui' : 'Non'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Prix par jour</p>
                  <p className="font-medium text-[#171c1f]">{FORMAT_FCFA(Number(vehicule.prixParJour))}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Zone opération</p>
                  <p className="font-medium text-[#171c1f]">{vehicule.zoneOperations}</p>
                </div>
              </div>
            )}

            {/* Activité / Circuit */}
            {(activite || circuit) && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Titre</p>
                  <p className="font-medium text-[#171c1f]">{activite?.titre || circuit?.titre}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lieu</p>
                  <p className="font-medium text-[#171c1f]">{activite?.ville || circuit?.ville}</p>
                </div>
                {(activite?.duree || circuit?.duree) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Durée</p>
                    <p className="font-medium text-[#171c1f]">{activite?.duree || circuit?.duree}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</p>
                  <p className="text-sm text-slate-600">{activite?.descriptionComplete || activite?.descriptionCourte || circuit?.descriptionComplete || circuit?.descriptionCourte}</p>
                </div>
              </div>
            )}

            {/* Dates et participants */}
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date de début</p>
                <p className="font-medium text-[#171c1f]">{dateDebut ? format(new Date(dateDebut), 'dd MMM yyyy', { locale: fr }) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date de fin</p>
                <p className="font-medium text-[#171c1f]">{dateFin ? format(new Date(dateFin), 'dd MMM yyyy', { locale: fr }) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Participants</p>
                <p className="font-medium text-[#171c1f]">{nbPersonnes} personne{nbPersonnes > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Options de pension */}
            {pension && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Formule repas</p>
                <div className="bg-[#f0f4f8] p-4 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#171c1f]">{pension.formule}</span>
                    <span className="font-bold text-[#E04A1F]">{FORMAT_FCFA(pension.total)}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {pension.nbNuits} nuit{pension.nbNuits > 1 ? 's' : ''} × {FORMAT_FCFA(pension.prixParNuit)}/nuit
                    {pension.nbWeekend > 0 && ` + ${pension.nbWeekend} weekend(s)`}
                  </div>
                </div>
              </div>
            )}

            {/* Options supplémentaires */}
            {priceOptions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Options supplémentaires</p>
                {priceOptions.map((opt, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-[#171c1f]">{opt.titre}</p>
                      <p className="text-xs text-slate-500">{opt.quantite} × {FORMAT_FCFA(opt.prix)}</p>
                    </div>
                    <span className="font-bold text-[#E04A1F]">{FORMAT_FCFA(opt.total)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {reservation.notes && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
                <div className="bg-[#f0f4f8] p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">{reservation.notes}</div>
              </div>
            )}
          </div>

          {/* Métadonnées */}
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Informations de la commande</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reservation.createdAt && (
                <KeyValueRow label="Créée le">
                  <span className="font-bold text-[#171c1f]">{format(new Date(reservation.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                </KeyValueRow>
              )}
              {reservation.updatedAt && (
                <KeyValueRow label="Mise à jour">
                  <span className="font-bold text-[#171c1f]">{format(new Date(reservation.updatedAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                </KeyValueRow>
              )}
              {reservationCode && (
                <KeyValueRow label="Référence">
                  <span className="font-mono font-bold text-[#E04A1F]">{reservationCode}</span>
                </KeyValueRow>
              )}
              {company?.companyCode && (
                <KeyValueRow label="Code entreprise">
                  <span className="font-mono font-bold text-[#171c1f]">{company.companyCode}</span>
                </KeyValueRow>
              )}
              {reservation.tag && (
                <KeyValueRow label="Tag">
                  <Badge className="bg-purple-100 text-purple-700 border-0">{reservation.tag}</Badge>
                </KeyValueRow>
              )}
              {partner?.nomPartner && (
                <KeyValueRow label="Partenaire">
                  <span className="font-medium">{partner.nomPartner}</span>
                </KeyValueRow>
              )}
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Récapitulatif paiement */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Récapitulatif paiement</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-[#171c1f]">Total</span>
                <span className="text-2xl font-black text-[#E04A1F]">{FORMAT_FCFA(reservation.totalPrice)}</span>
              </div>

              {isAcompteRequis && acompteMontant > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Acompte requis</span>
                    <span className="font-medium text-[#171c1f]">{FORMAT_FCFA(acompteMontant)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Statut acompte</span>
                    <Badge className={`${acompteStatus.color} border-0`}>{acompteStatus.label}</Badge>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Statut paiement</span>
                <Badge className={`${paymentStatus.color} border-0`}>{paymentStatus.label}</Badge>
              </div>

              {reservation.paymentMethod && (
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Mode de paiement</span>
                  <span className="font-medium text-[#171c1f]">{reservation.paymentMethod}</span>
                </div>
              )}

              {canPay && (
                <Button variant="gradient" onClick={() => setShowPayDialog(true)} className="w-full mt-4 gap-2 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                  {canPayAcompte ? 'Payer l\'acompte' : 'Payer le solde'}
                </Button>
              )}
            </div>
          </section>

          {/* Partenaire */}
          {partner && (
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">Partenaire</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nom</span>
                  <span className="font-medium">{partner.nomPartner}</span>
                </div>
                {partner.emailPartner && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium truncate">{partner.emailPartner}</span>
                  </div>
                )}
                {partner.telephonePartner && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléphone</span>
                    <span className="font-medium">{partner.telephonePartner}</span>
                  </div>
                )}
                {partner.typePartenaire && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium">{partner.typePartenaire}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Entreprise */}
          {company && (
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">Entreprise</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nom</span>
                  <span className="font-medium">{company.nomCompagny}</span>
                </div>
                {company.emailCompagny && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium truncate">{company.emailCompagny}</span>
                  </div>
                )}
                {company.telephoneCompagny && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléphone</span>
                    <span className="font-medium">{company.telephoneCompagny}</span>
                  </div>
                )}
                {company.companyCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Code</span>
                    <span className="font-mono font-bold text-[#171c1f]">{company.companyCode}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Dialog de paiement */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
              {canPayAcompte ? 'Payer l\'acompte' : 'Payer le solde'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Vous allez être redirigé vers Bictorys pour finaliser le paiement de{' '}
              <strong>{FORMAT_FCFA(canPayAcompte ? acompteMontant : reservation.totalPrice - acompteMontant)}</strong>.
            </p>
            {isAcompteRequis && acompteMontant > 0 && (
              <p className="text-sm text-slate-600">
                Acompte de <strong>{FORMAT_FCFA(acompteMontant)}</strong> déjà versé : {isAcomptePaye ? '✅ Payé' : '❌ En attente'}
              </p>
            )}
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
              <p className="text-sm text-orange-800">Wave, Orange Money, carte bancaire, etc.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Annuler</Button>
            <Button variant="gradient" onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="gap-2">
              {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Payer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sous-composant
interface KeyValueRowProps {
  label: string;
  children: React.ReactNode;
}
function KeyValueRow({ label, children }: KeyValueRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}