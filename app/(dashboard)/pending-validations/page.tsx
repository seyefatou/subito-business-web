'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaymentRequest } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  User,
  Calendar,
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

interface PendingItem {
  id: number;
  type: 'booking' | 'travel-document';
  created_date: string;
  status: string;
  service_type?: string;
  service_category?: string;
  beneficiary_name?: string;
  amount?: number;
}

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  transport: MapPin,
  livraison: Package,
  travel_documents: Calendar,
};

export default function PendingValidations() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch booking payment requests
  const { data: bookingPRResponse, isLoading: loadingBookings } = useQuery({
    queryKey: ['booking-payment-requests'],
    queryFn: () => api.bookings.paymentRequests.list(1, 100),
  });

  // Fetch travel document payment requests
  const { data: travelPRResponse, isLoading: loadingTravel } = useQuery({
    queryKey: ['travel-payment-requests'],
    queryFn: () => api.travelDocuments.paymentRequests.list(1, 100),
  });

  const isLoading = loadingBookings || loadingTravel;

  // Combine both into a single list
  const orders: PendingItem[] = [
    ...(bookingPRResponse?.data?.items || []).map((pr: PaymentRequest) => ({
      id: pr.id,
      type: 'booking' as const,
      created_date: pr.createdAt || '',
      status: pr.status,
      service_type: pr.serviceType,
      service_category: pr.serviceType,
      beneficiary_name: pr.clientName,
      amount: pr.amount,
    })),
    ...(travelPRResponse?.data?.items || []).map((pr: PaymentRequest) => ({
      id: pr.id,
      type: 'travel-document' as const,
      created_date: pr.createdAt || '',
      status: pr.status,
      service_type: 'Documents de voyage',
      service_category: 'travel_documents',
      beneficiary_name: pr.clientName,
      amount: pr.amount,
    })),
  ];

  const approveMutation = useMutation({
    mutationFn: async ({ item }: { item: PendingItem }) => {
      if (item.type === 'booking') {
        return api.bookings.paymentRequests.approve(item.id);
      } else {
        return api.travelDocuments.paymentRequests.approve(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['travel-payment-requests'] });
      toast.success('Demande approuvee avec succes');
      setSelectedItem(null);
    },
    onError: () => {
      toast.error('Une erreur est survenue');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ item }: { item: PendingItem }) => {
      if (item.type === 'booking') {
        return api.bookings.paymentRequests.reject(item.id);
      } else {
        return api.travelDocuments.paymentRequests.reject(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['travel-payment-requests'] });
      toast.success('Demande refusee');
      setSelectedItem(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: () => {
      toast.error('Une erreur est survenue');
    }
  });

  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  const handleApprove = (order: PendingItem) => {
    approveMutation.mutate({ item: order });
  };

  const handleReject = (order: PendingItem) => {
    setSelectedItem(order);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (selectedItem) {
      rejectMutation.mutate({ item: selectedItem });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Demandes en attente</h1>
        <p className="text-slate-500 mt-1">
          {orders.length} demande{orders.length > 1 ? 's' : ''} a valider
        </p>
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
            <Package className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Total du jour</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">
            {orders.reduce((sum, o) => sum + (o.amount || 0), 0).toLocaleString()} FCFA
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">A traiter</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{orders.length}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <AnimatePresence>
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Aucune demande en attente
              </h3>
              <p className="text-slate-500">
                Toutes les demandes ont ete traitees
              </p>
            </motion.div>
          ) : (
            orders.map((order, index) => {
              const ServiceIcon = serviceIcons[order.service_category || ''] || Package;

              return (
                <motion.div
                  key={`${order.type}-${order.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className="p-3 rounded-xl gradient-subito">
                        <ServiceIcon className="w-6 h-6 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-800">
                            {order.service_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <Badge className="bg-amber-100 text-amber-700 border-0">
                            <Clock className="w-3 h-3 mr-1" />
                            {order.status || 'En attente'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {order.beneficiary_name || 'Non specifie'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600 capitalize">
                              {order.type === 'travel-document' ? 'Document voyage' : 'Reservation'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {order.created_date && format(new Date(order.created_date), "d MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600 font-semibold text-subito">
                              {(order.amount || 0).toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleApprove(order)}
                        disabled={isMutating}
                        className="gradient-subito text-white border-0 gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Valider
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(order)}
                        disabled={isMutating}
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Refuser
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

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
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmReject}
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
