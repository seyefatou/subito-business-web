'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search,
  Download,
  MapPin,
  Clock,
  User,
  Building2,
  Package,
  Car,
  X,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DriverInfo from "@/components/orders/DriverInfo";
import ValidationHistory from "@/components/orders/ValidationHistory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Order {
  id: string;
  created_date: string;
  status: string;
  tracking_number?: string;
  beneficiary_name?: string;
  beneficiary_email?: string;
  departure_address?: string;
  arrival_address?: string;
  service_category?: string;
  service_type?: string;
  department?: string;
  estimated_cost?: number;
  final_cost?: number;
  notes?: string;
  urgency?: string;
  scheduled_date?: string;
  requested_by_employee?: string;
  validated_by?: string;
  validated_at?: string;
  validation_channel?: string;
  rejection_reason?: string;
}

interface User {
  id: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
}

interface StatusConfigItem {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const statusConfig: Record<string, StatusConfigItem> = {
  pending_company_validation: { label: "En attente validation", color: "bg-amber-100 text-amber-700", icon: Clock },
  rejected_by_company: { label: "Refusee", color: "bg-red-100 text-red-700", icon: AlertCircle },
  validated_by_company: { label: "Validee entreprise", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  pending_subito_validation: { label: "Attente Subito", color: "bg-purple-100 text-purple-700", icon: Clock },
  validated_by_subito: { label: "Validee Subito", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  driver_assigned: { label: "Chauffeur assigne", color: "bg-indigo-100 text-indigo-700", icon: User },
  in_progress: { label: "En cours", color: "bg-orange-100 text-orange-700", icon: Clock },
  completed: { label: "Terminee", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Annulee", color: "bg-red-100 text-red-700", icon: AlertCircle },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700", icon: Circle },
  confirmed: { label: "Confirmee", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  transport: Car,
  livraison: Package,
  assistance: AlertCircle,
  carburant: Car,
  flotte: Car,
  administratif: Building2,
};

export default function Tracking() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showValidationDetails, setShowValidationDetails] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  const { data: user } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const pendingOrders = orders.filter(o => o.status === 'pending_company_validation');
  const [showValidations, setShowValidations] = useState(pendingOrders.length > 0);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.beneficiary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.departure_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.arrival_address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || order.service_category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Stats
  const stats = {
    total: orders.length,
    in_progress: orders.filter(o => o.status === 'in_progress' || o.status === 'driver_assigned').length,
    completed: orders.filter(o => o.status === 'completed').length,
    pending: orders.filter(o => o.status === 'pending_company_validation' || o.status === 'pending').length,
  };

  const validateOrder = useMutation({
    mutationFn: async ({ orderId, action, reason }: { orderId: string; action: string; reason?: string }) => {
      const order = orders.find(o => o.id === orderId);
      const updateData: Partial<Order> = {
        status: action === 'approve' ? 'validated_by_company' : 'rejected_by_company',
        validated_by: user?.email,
        validated_at: new Date().toISOString(),
        validation_channel: 'dashboard',
      };

      if (action === 'reject' && reason) {
        updateData.rejection_reason = reason;
      }

      await base44.entities.Order.update(orderId, updateData);

      if (order?.requested_by_employee) {
        await base44.entities.Notification.create({
          type: action === 'approve' ? 'order_accepted' : 'order_rejected',
          title: action === 'approve' ? 'Commande validee' : 'Commande refusee',
          message: action === 'approve'
            ? `Votre demande ${order.service_type} a ete approuvee`
            : `Votre demande ${order.service_type} a ete refusee${reason ? `: ${reason}` : ''}`,
          order_id: orderId,
          recipient_email: order.requested_by_employee,
          action_url: '/tracking',
        });
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(variables.action === 'approve' ? 'Commande validee' : 'Commande refusee');
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedOrder(null);
    },
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

  const handleExport = () => {
    const headers = ['Numero', 'Service', 'Statut', 'Beneficiaire', 'Departement', 'Cout', 'Date'];
    const rows = filteredOrders.map(o => [
      o.tracking_number,
      o.service_type,
      statusConfig[o.status]?.label,
      o.beneficiary_name,
      o.department,
      o.final_cost || o.estimated_cost,
      format(new Date(o.created_date), 'dd/MM/yyyy HH:mm')
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-subito-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suivi des commandes</h1>
          <p className="text-slate-500 mt-1">
            {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {pendingOrders.length > 0 && (
            <Button
              onClick={() => setShowValidations(!showValidations)}
              className={showValidations ? "gradient-subito text-white border-0 gap-2" : "gap-2"}
              variant={showValidations ? "default" : "outline"}
            >
              <Clock className="w-4 h-4" />
              Validations ({pendingOrders.length})
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Validations Section */}
      {showValidations && pendingOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">
              {pendingOrders.length} demande{pendingOrders.length > 1 ? 's' : ''} en attente de validation
            </h2>
          </div>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-4 border border-amber-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800">
                        {order.service_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        En attente
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.beneficiary_name || 'Non specifie'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {(order.estimated_cost || 0).toLocaleString()} FCFA
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowValidationDetails(order)}
                  >
                    Voir details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "bg-slate-100" },
          { label: "En attente", value: stats.pending, color: "bg-amber-100" },
          { label: "En cours", value: stats.in_progress, color: "bg-orange-100" },
          { label: "Terminees", value: stats.completed, color: "bg-green-100" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par numero, beneficiaire, adresse..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending_company_validation">En attente validation</SelectItem>
              <SelectItem value="validated_by_company">Validee entreprise</SelectItem>
              <SelectItem value="driver_assigned">Chauffeur assigne</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Terminee</SelectItem>
              <SelectItem value="rejected_by_company">Refusee</SelectItem>
              <SelectItem value="cancelled">Annulee</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes categories</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="livraison">Livraison</SelectItem>
              <SelectItem value="assistance">Assistance</SelectItem>
              <SelectItem value="carburant">Carburant</SelectItem>
              <SelectItem value="flotte">Flotte</SelectItem>
              <SelectItem value="administratif">Administratif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Commande
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Service
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Beneficiaire
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Statut
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Cout
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Date
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Aucune commande trouvee
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    const CategoryIcon = categoryIcons[order.service_category || ''] || Package;

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-50">
                              <CategoryIcon className="w-4 h-4 text-subito" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">
                                {order.tracking_number || '-'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {order.service_category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-700">
                            {order.service_type?.replace(/_/g, ' ')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {order.beneficiary_name || '-'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {order.department || 'General'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${status.color} border-0`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {(order.final_cost || order.estimated_cost || 0).toLocaleString()} FCFA
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-500">
                            {order.created_date && format(new Date(order.created_date), "d MMM yyyy", { locale: fr })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail sheet */}
      <Sheet open={!!selectedOrder && !showRejectDialog} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg gradient-subito">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  {selectedOrder.tracking_number}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Validation History */}
                <ValidationHistory order={selectedOrder} />

                {/* Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Statut</span>
                  <Badge className={`${statusConfig[selectedOrder.status]?.color} border-0`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </div>

                {/* Driver Info */}
                <DriverInfo order={selectedOrder} />

                {/* Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">Details</h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-green-500 mt-1" />
                      <div>
                        <p className="text-xs text-slate-500">Depart</p>
                        <p className="text-sm text-slate-800">{selectedOrder.departure_address || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-subito mt-1" />
                      <div>
                        <p className="text-xs text-slate-500">Arrivee</p>
                        <p className="text-sm text-slate-800">{selectedOrder.arrival_address || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-1" />
                      <div>
                        <p className="text-xs text-slate-500">Beneficiaire</p>
                        <p className="text-sm text-slate-800">{selectedOrder.beneficiary_name || '-'}</p>
                        <p className="text-xs text-slate-500">{selectedOrder.beneficiary_email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-slate-400 mt-1" />
                      <div>
                        <p className="text-xs text-slate-500">Departement</p>
                        <p className="text-sm text-slate-800">{selectedOrder.department || 'General'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost */}
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cout</span>
                    <span className="text-xl font-bold text-subito">
                      {(selectedOrder.final_cost || selectedOrder.estimated_cost || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Notes</h3>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Validation Details Dialog */}
      <Dialog open={!!showValidationDetails} onOpenChange={() => setShowValidationDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {showValidationDetails && (
            <>
              <DialogHeader>
                <DialogTitle>Valider la demande</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Service Info */}
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Car className="w-5 h-5 text-subito" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {showValidationDetails.service_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {showValidationDetails.service_category}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Beneficiaire</p>
                    <p className="font-medium text-slate-800">{showValidationDetails.beneficiary_name || '-'}</p>
                    <p className="text-xs text-slate-500">{showValidationDetails.beneficiary_email || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Departement</p>
                    <p className="font-medium text-slate-800">{showValidationDetails.department || 'General'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Urgence</p>
                    <Badge className={`w-fit ${
                      showValidationDetails.urgency === 'express' ? 'bg-red-100 text-red-700' :
                      showValidationDetails.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    } border-0`}>
                      {showValidationDetails.urgency || 'standard'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Date prevue</p>
                    <p className="font-medium text-slate-800">
                      {showValidationDetails.scheduled_date
                        ? format(new Date(showValidationDetails.scheduled_date), "d MMM yyyy 'a' HH:mm", { locale: fr })
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Addresses */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Depart</p>
                      <p className="text-sm font-medium text-slate-800">{showValidationDetails.departure_address || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-subito mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Arrivee</p>
                      <p className="text-sm font-medium text-slate-800">{showValidationDetails.arrival_address || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Cost */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cout estime</span>
                    <span className="text-2xl font-bold text-subito">
                      {(showValidationDetails.estimated_cost || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {showValidationDetails.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Notes</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {showValidationDetails.notes}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowValidationDetails(null)}
                  className="w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleReject(showValidationDetails);
                    setShowValidationDetails(null);
                  }}
                  disabled={validateOrder.isPending}
                  className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Refuser
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(showValidationDetails);
                    setShowValidationDetails(null);
                  }}
                  disabled={validateOrder.isPending}
                  className="w-full sm:w-auto gradient-subito text-white border-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Valider la demande
                </Button>
              </DialogFooter>
            </>
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
