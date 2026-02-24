'use client';

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ==================== TYPES ====================
interface PriseEnChargeItem {
  id: number;
  type: 'booking' | 'travel-document';
  bookingCode?: string;
  serviceType: string;
  clientName: string;
  clientPhone?: string;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
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
  const [selectedItem, setSelectedItem] = useState<PriseEnChargeItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
        amount: Number(pr['totalPrice'] ?? pr.amount ?? 0),
        status: pr.status,
        paymentStatus: (pr['paymentStatus'] || 'pending_company_approval') as string,
        createdAt: (pr.createdAt || pr['pickupDate'] || '') as string,
      });
    }

    const pendingTravel = extractList(travelPRResponse);
    for (const pr of pendingTravel) {
      items.push({
        id: pr.id,
        type: 'travel-document',
        serviceType: 'travel_document',
        clientName: (pr.clientName || pr['customerName'] || pr['nom'] || '') as string,
        amount: Number(pr['totalPrice'] ?? pr.amount ?? 0),
        status: pr.status,
        paymentStatus: (pr['paymentStatus'] || 'pending_company_approval') as string,
        createdAt: (pr.createdAt || '') as string,
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [bookingPRResponse, travelPRResponse]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl gradient-subito">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prises en charge</h1>
          <p className="text-slate-500 mt-1">
            Demandes en attente de validation — quand un client réserve et demande que l&apos;entreprise paie
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">En attente</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{orders.length}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Montant total</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">
            {orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">À traiter</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{orders.length}</p>
        </div>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Aucune demande en attente
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Les demandes apparaissent ici quand un client réserve et choisit &quot;paiement par l&apos;entreprise&quot;.
            Une fois traitées (approuvées ou refusées), elles disparaissent de cette liste.
            Retrouvez l&apos;historique de toutes vos commandes dans <a href="/tracking" className="text-orange-600 font-medium hover:underline">Suivi des commandes</a>.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Référence</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Montant</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Statut</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-medium text-slate-800">
                        {item.bookingCode || `#${item.id}`}
                      </span>
                      <span className="block text-xs text-slate-400 mt-0.5 capitalize">
                        {item.type === 'travel-document' ? 'Document voyage' : 'Réservation'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {SERVICE_LABELS[item.serviceType] || item.serviceType?.replace(/_/g, ' ') || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-sm text-slate-700">{item.clientName || '—'}</span>
                          {item.clientPhone && (
                            <span className="block text-xs text-slate-400">{item.clientPhone}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-800">
                          {item.amount.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {item.createdAt ? format(new Date(item.createdAt), "d MMM yyyy", { locale: fr }) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <Clock className="w-3 h-3 mr-1" />
                        En attente
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(item)}
                          disabled={isMutating}
                          className="gradient-subito text-white border-0 gap-1 h-8 text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedItem(item); setShowRejectDialog(true); }}
                          disabled={isMutating}
                          className="gap-1 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Refuser
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
