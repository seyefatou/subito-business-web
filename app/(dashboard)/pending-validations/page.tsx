'use client';

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, PaymentRequest } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Loader2,
  Banknote,
  Inbox,
  Eye,
  Phone,
  Mail,
  Car,
  Plane,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

type TypeFilter = 'all' | 'booking' | 'travel-document';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'booking', label: 'Réservations' },
  { value: 'travel-document', label: 'Documents' },
];

function StatusPillEnAttente() {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3 mr-1" />
      En attente
    </span>
  );
}

function getServiceIcon(serviceType: string, type: 'booking' | 'travel-document') {
  if (type === 'travel-document' || serviceType === 'visa_assistance') return FileText;
  if (serviceType === 'airport_shuttle') return Plane;
  if (serviceType === 'inter_city' || serviceType === 'vtc_hourly') return Car;
  return MapPin;
}

// ==================== TYPES ====================
interface PriseEnChargeItem {
  id: number;
  type: 'booking' | 'travel-document';
  bookingCode?: string;
  serviceType: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  raw: Record<string, unknown>; // données brutes pour les détails
}

const SERVICE_LABELS: Record<string, string> = {
  airport_shuttle: 'Navette Aéroport',
  inter_city: 'Inter-villes',
  vtc_hourly: 'VTC à l\'heure',
  visa_assistance: 'Visa / Assistance',
  travel_document: 'Document de voyage',
};

// ==================== HELPERS ====================
function extractList(response: unknown): PaymentRequest[] {
  if (!response) return [];
  const r = response as Record<string, unknown>;
  const payload = (r.data ?? r) as Record<string, unknown>;
  if (Array.isArray(payload)) return payload as PaymentRequest[];
  const arr = payload?.list ?? payload?.items ?? payload?.data;
  return Array.isArray(arr) ? arr as PaymentRequest[] : [];
}

// ==================== PAGE ====================
export default function PendingValidations() {
  const queryClient = useQueryClient();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PriseEnChargeItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Fetch pending payment requests ONLY (dedicated endpoints)
  const { data: bookingPRResponse, isLoading: loadingBookings } = useQuery({
    queryKey: ['booking-payment-requests'],
    queryFn: () => api.bookings.paymentRequests.list(1, 100),
  });

  const { data: travelPRResponse, isLoading: loadingTravel } = useQuery({
    queryKey: ['travel-payment-requests'],
    queryFn: () => api.travelDocuments.paymentRequests.list(1, 100),
  });

  const isLoading = loadingBookings || loadingTravel;

  // Build list from payment-request endpoints only
  const orders = useMemo<PriseEnChargeItem[]>(() => {
    const items: PriseEnChargeItem[] = [];

    const pendingBookings = extractList(bookingPRResponse);
    for (const pr of pendingBookings) {
      items.push({
        id: pr.id,
        type: 'booking',
        bookingCode: pr['bookingCode'] as string || undefined,
        serviceType: (pr.serviceType || '') as string,
        clientName: (pr.clientName || pr['customerName'] || '') as string,
        clientPhone: (pr['clientPhone'] || pr['customerPhone'] || '') as string,
        clientEmail: (pr['clientEmail'] || pr['customerEmail'] || '') as string,
        amount: Number(pr['totalPrice'] ?? pr.amount ?? 0),
        status: pr.status,
        paymentStatus: (pr['paymentStatus'] || 'pending_company_approval') as string,
        createdAt: (pr.createdAt || pr['pickupDate'] || '') as string,
        raw: pr as unknown as Record<string, unknown>,
      });
    }

    const pendingTravel = extractList(travelPRResponse);
    for (const pr of pendingTravel) {
      items.push({
        id: pr.id,
        type: 'travel-document',
        serviceType: 'travel_document',
        clientName: (pr.clientName || pr['customerName'] || pr['nom'] || '') as string,
        clientEmail: (pr['clientEmail'] || pr['email'] || '') as string,
        amount: Number(pr['totalPrice'] ?? pr.amount ?? 0),
        status: pr.status,
        paymentStatus: (pr['paymentStatus'] || 'pending_company_approval') as string,
        createdAt: (pr.createdAt || '') as string,
        raw: pr as unknown as Record<string, unknown>,
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [bookingPRResponse, travelPRResponse]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (typeFilter !== 'all') {
      list = list.filter((o) => o.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((o) =>
        (o.clientName || '').toLowerCase().includes(q) ||
        (o.bookingCode || '').toLowerCase().includes(q) ||
        o.id.toString().includes(q)
      );
    }
    return list;
  }, [orders, typeFilter, searchQuery]);

  // ==================== MUTATIONS ====================
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['booking-payment-requests'] });
    queryClient.invalidateQueries({ queryKey: ['travel-payment-requests'] });
  };

  const approveMutation = useMutation({
    mutationFn: async (item: PriseEnChargeItem) => {
      if (item.type === 'booking') return api.bookings.paymentRequests.approve(item.id);
      return api.travelDocuments.paymentRequests.approve(item.id);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Demande approuvée avec succès');
    },
  });

  const payMutation = useMutation({
    mutationFn: async (item: PriseEnChargeItem) => {
      if (item.type === 'booking') return api.bookings.paymentRequests.pay(item.id);
      return api.travelDocuments.paymentRequests.pay(item.id);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Paiement effectué');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (item: PriseEnChargeItem) => {
      if (item.type === 'booking') return api.bookings.paymentRequests.reject(item.id);
      return api.travelDocuments.paymentRequests.reject(item.id);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Demande refusée');
      setShowRejectDialog(false);
      setSelectedItem(null);
      setRejectionReason("");
    },
  });

  const isMutating = approveMutation.isPending || rejectMutation.isPending || payMutation.isPending;

  // ==================== RENDER ====================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500">Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6 space-y-6">
      {/* Hero Header */}
      <div className="mb-2">
        <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          <span>Finances</span>
          <span>/</span>
          <span className="text-[#E04A1F]">Prises en charge</span>
        </nav>
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f] leading-tight"
          style={MANROPE}
        >
          Prises en charge
        </h1>
        <p className="text-[#585e6c] font-medium mt-1">
          Demandes en attente de validation — quand un client réserve et demande à l&apos;entreprise de payer
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">En attente</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5" style={MANROPE}>
              {orders.length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f0f4f8] flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-[#585e6c]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Montant total</p>
            <p className="text-xl md:text-2xl font-extrabold text-[#171c1f] mt-0.5 truncate" style={MANROPE}>
              {orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-[#E04A1F]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">À traiter</p>
            <p className="text-2xl font-extrabold text-[#E04A1F] mt-0.5" style={MANROPE}>
              {orders.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#585e6c]" />
          <Input
            placeholder="Rechercher par client ou référence..."
            className="pl-11 h-11 rounded-xl border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition ${
                  active
                    ? 'bg-[#E04A1F] text-white shadow-md'
                    : 'bg-[#f0f4f8] text-[#585e6c] hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compteur */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="flex items-center justify-end">
          <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
            {filteredOrders.length} demande{filteredOrders.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Liste */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
            <Inbox className="w-10 h-10 text-[#E04A1F]" />
          </div>
          <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>
            Aucune demande en attente
          </p>
          <p className="text-sm text-[#585e6c] mt-1 max-w-md text-center px-6">
            Les demandes apparaissent ici quand un client réserve et choisit « paiement par l&apos;entreprise ».
            Retrouvez l&apos;historique de toutes vos commandes dans{' '}
            <Link href="/tracking" className="text-[#E04A1F] font-bold hover:underline">
              Suivi des commandes
            </Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((item, idx) => {
            const ServiceIcon = getServiceIcon(item.serviceType, item.type);
            const typeLabel = item.type === 'travel-document' ? 'Document voyage' : 'Réservation';
            const serviceLabel = SERVICE_LABELS[item.serviceType] || item.serviceType?.replace(/_/g, ' ') || '—';
            return (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#ffdbd0] transition-all p-5 md:p-6">
                  <div className="flex items-start gap-4 md:gap-6 flex-wrap md:flex-nowrap">
                    {/* Icone service */}
                    <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
                      <ServiceIcon className="w-5 h-5 text-[#E04A1F]" />
                    </div>

                    {/* Bloc texte */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                          {item.bookingCode || `#${item.id}`}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          · {typeLabel}
                        </span>
                        <StatusPillEnAttente />
                      </div>
                      <h3
                        className="text-base md:text-lg font-extrabold text-[#171c1f] leading-tight truncate"
                        style={MANROPE}
                      >
                        {serviceLabel}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-[#585e6c] mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {item.clientName || '—'}
                        </span>
                        {item.clientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {item.clientPhone}
                          </span>
                        )}
                        {!item.clientPhone && item.clientEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {item.clientEmail}
                          </span>
                        )}
                        {item.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(item.createdAt), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloc montant */}
                    <div className="text-left md:text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Montant</p>
                      <p className="text-xl md:text-2xl font-extrabold text-[#E04A1F] mt-0.5" style={MANROPE}>
                        {item.amount.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 mt-4 pt-4 flex justify-end gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                      className="gap-1.5 rounded-xl border-slate-200 text-[#585e6c] hover:bg-slate-50 h-9 text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Détails
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(item)}
                      disabled={isMutating}
                      className="gap-1.5 rounded-xl bg-[#E04A1F] hover:bg-[#C8330F] text-white h-9 text-xs font-bold shadow-md shadow-[#E04A1F]/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedItem(item); setShowRejectDialog(true); }}
                      disabled={isMutating}
                      className="gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-9 text-xs font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Details de la demande</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-5 pt-2">
              {/* Info générale */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Reference</p>
                  <p className="font-mono font-semibold text-slate-800">{selectedItem.bookingCode || `#${selectedItem.id}`}</p>
                  <Badge className="bg-amber-100 text-amber-700 border-0 mt-1">
                    <Clock className="w-3 h-3 mr-1" /> En attente
                  </Badge>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Montant</p>
                  <p className="text-2xl font-bold text-orange-600">{selectedItem.amount.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>

              {/* Service */}
              <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase">Service</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{SERVICE_LABELS[selectedItem.serviceType] || selectedItem.serviceType?.replace(/_/g, ' ') || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{selectedItem.createdAt ? format(new Date(selectedItem.createdAt), "d MMMM yyyy 'a' HH:mm", { locale: fr }) : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase">Client</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-800">{selectedItem.clientName || '—'}</span>
                  </div>
                  {selectedItem.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{selectedItem.clientPhone}</span>
                    </div>
                  )}
                  {selectedItem.clientEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{selectedItem.clientEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Détails supplémentaires depuis raw */}
              {(() => {
                const r = selectedItem.raw;
                const details: Array<{ label: string; value: string }> = [];
                if (r['pickupAddress'] || r['pickupLocation']) details.push({ label: 'Lieu de prise en charge', value: String(r['pickupAddress'] || r['pickupLocation'] || '') });
                if (r['dropoffAddress'] || r['dropoffLocation']) details.push({ label: 'Destination', value: String(r['dropoffAddress'] || r['dropoffLocation'] || '') });
                if (r['pickupDate']) details.push({ label: 'Date de prise en charge', value: format(new Date(r['pickupDate'] as string), "d MMMM yyyy 'a' HH:mm", { locale: fr }) });
                if (r['nbPassengers'] || r['nombrePassagers']) details.push({ label: 'Passagers', value: String(r['nbPassengers'] || r['nombrePassagers'] || '') });
                if (r['vehicleType'] || r['typeVehicule']) details.push({ label: 'Type de vehicule', value: String(r['vehicleType'] || r['typeVehicule'] || '') });
                if (r['flightNumber'] || r['numeroVol']) details.push({ label: 'N° de vol', value: String(r['flightNumber'] || r['numeroVol'] || '') });
                if (r['departureCity'] || r['villeDepart']) details.push({ label: 'Ville depart', value: String(r['departureCity'] || r['villeDepart'] || '') });
                if (r['arrivalCity'] || r['villeArrivee']) details.push({ label: 'Ville arrivee', value: String(r['arrivalCity'] || r['villeArrivee'] || '') });
                if (r['documentType'] || r['typeDocument']) details.push({ label: 'Type de document', value: String(r['documentType'] || r['typeDocument'] || '') });
                if (r['notes']) details.push({ label: 'Notes', value: String(r['notes']) });
                if (r['duration'] || r['duree']) details.push({ label: 'Duree', value: String(r['duration'] || r['duree'] || '') });
                return details.length > 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                    <p className="text-xs text-slate-500 font-medium uppercase">Details de la reservation</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {details.map((d, i) => (
                        <div key={i}>
                          <span className="text-slate-500">{d.label} :</span>{' '}
                          <span className="font-medium text-slate-800">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={() => { setShowDetailDialog(false); approveMutation.mutate(selectedItem); }}
                  disabled={isMutating}
                  className="gradient-subito text-white border-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowDetailDialog(false); setShowRejectDialog(true); }}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Refuser
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Raison du refus (optionnel)</Label>
              <Textarea
                placeholder="Expliquez pourquoi vous refusez cette demande..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => { if (selectedItem) rejectMutation.mutate(selectedItem); }}
              disabled={isMutating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
