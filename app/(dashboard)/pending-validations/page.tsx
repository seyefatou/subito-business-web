'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
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
  AlertCircle,
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

interface Order {
  id: string;
  created_date: string;
  status: string;
  service_type?: string;
  service_category?: string;
  beneficiary_name?: string;
  beneficiary_email?: string;
  departure_address?: string;
  arrival_address?: string;
  department?: string;
  estimated_cost?: number;
  requested_by_employee?: string;
}

interface User {
  id: string;
  email: string;
}

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  transport: MapPin,
  livraison: Package,
  assistance: AlertCircle,
};

export default function PendingValidations() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['pending-validations'],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list('-created_date', 100);
      return allOrders.filter((o: Order) => o.status === 'pending_company_validation');
    },
  });

  const { data: user } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const validateOrder = useMutation({
    mutationFn: async ({ orderId, action, reason }: { orderId: string; action: string; reason?: string }) => {
      const order = orders.find(o => o.id === orderId);
      const updateData: Record<string, any> = {
        status: action === 'approve' ? 'validated_by_company' : 'rejected_by_company',
        validated_by: user?.email,
        validated_at: new Date().toISOString(),
        validation_channel: 'dashboard',
      };

      if (action === 'reject' && reason) {
        updateData.rejection_reason = reason;
      }

      await base44.entities.Order.update(orderId, updateData);

      // Create notification for employee
      if (order?.requested_by_employee) {
        await base44.entities.Notification.create({
          type: action === 'approve' ? 'order_accepted' : 'order_rejected',
          title: action === 'approve' ? 'Commande validee' : 'Commande refusee',
          message: action === 'approve'
            ? `Votre demande ${order.service_type} a ete approuvee par ${user?.email}`
            : `Votre demande ${order.service_type} a ete refusee${reason ? `: ${reason}` : ''}`,
          order_id: orderId,
          recipient_email: order.requested_by_employee,
          action_url: '/tracking',
        });
      }

      return updateData;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-validations'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (variables.action === 'approve') {
        toast.success('Commande validee avec succes');
      } else {
        toast.success('Commande refusee');
      }

      setSelectedOrder(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: () => {
      toast.error('Une erreur est survenue');
    }
  });

  const handleApprove = (order: Order) => {
    validateOrder.mutate({ orderId: order.id, action: 'approve' });
  };

  const handleReject = (order: Order) => {
    setSelectedOrder(order);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (selectedOrder) {
      validateOrder.mutate({
        orderId: selectedOrder.id,
        action: 'reject',
        reason: rejectionReason
      });
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
            {orders.reduce((sum, o) => sum + (o.estimated_cost || 0), 0).toLocaleString()} FCFA
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
                  key={order.id}
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
                            En attente
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {order.beneficiary_name || order.requested_by_employee || 'Non specifie'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">{order.department || 'General'}</span>
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
                              {(order.estimated_cost || 0).toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>

                        {/* Route details */}
                        {order.departure_address && order.arrival_address && (
                          <div className="p-3 rounded-lg bg-slate-50 text-sm">
                            <div className="flex items-start gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                              <p className="text-slate-700">{order.departure_address}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <p className="text-slate-700">{order.arrival_address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleApprove(order)}
                        disabled={validateOrder.isPending}
                        className="gradient-subito text-white border-0 gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Valider
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(order)}
                        disabled={validateOrder.isPending}
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
              disabled={validateOrder.isPending}
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
