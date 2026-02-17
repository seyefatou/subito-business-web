'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText,
  Plus,
  Search,
  Car,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface MaintenanceQuote {
  id: string;
  created_date: string;
  status: string;
  vehicle_registration?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  service_type?: string;
  description?: string;
  urgency?: string;
  preferred_dates?: string[];
  quote_amount?: number;
  quote_details?: string;
  service_provider?: string;
  estimated_duration?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  department?: string;
}

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  department?: string;
}

interface StatusConfigItem {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const statusConfig: Record<string, StatusConfigItem> = {
  pending_subito_quote: {
    label: "En attente devis",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  quoted: {
    label: "Devis recu",
    color: "bg-purple-100 text-purple-700",
    icon: FileText,
  },
  validated_by_company: {
    label: "Valide",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  rejected_by_company: {
    label: "Refuse",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  converted_to_booking: {
    label: "Reservation confirmee",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
};

export default function MaintenanceQuotes() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<MaintenanceQuote | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [formData, setFormData] = useState({
    vehicle_registration: "",
    service_type: "",
    description: "",
    urgency: "normal",
    preferred_dates: ["", "", ""],
    attachments: [] as string[],
  });

  const { data: quotes = [], isLoading } = useQuery<MaintenanceQuote[]>({
    queryKey: ["maintenanceQuotes"],
    queryFn: () => base44.entities.MaintenanceQuote.list("-created_date"),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const createQuote = useMutation({
    mutationFn: (data: Partial<MaintenanceQuote>) => base44.entities.MaintenanceQuote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceQuotes"] });
      setShowNewQuote(false);
      setFormData({
        vehicle_registration: "",
        service_type: "",
        description: "",
        urgency: "normal",
        preferred_dates: ["", "", ""],
        attachments: [],
      });
      toast.success("Demande de devis envoyee a Subito");
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  const updateQuote = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceQuote> }) =>
      base44.entities.MaintenanceQuote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceQuotes"] });
      toast.success("Devis mis a jour");
    },
    onError: () => toast.error("Erreur"),
  });

  const handleSubmitQuote = () => {
    const selectedVehicle = vehicles.find(v => v.registration === formData.vehicle_registration);

    const quoteData: Partial<MaintenanceQuote> = {
      ...formData,
      vehicle_brand: selectedVehicle?.brand || "",
      vehicle_model: selectedVehicle?.model || "",
      department: selectedVehicle?.department || "",
      preferred_dates: formData.preferred_dates.filter(d => d !== ""),
      status: "pending_subito_quote",
    };

    createQuote.mutate(quoteData);
  };

  const handleValidate = async () => {
    if (!selectedQuote) return;
    await updateQuote.mutateAsync({
      id: selectedQuote.id,
      data: {
        status: "validated_by_company",
      },
    });
    setShowValidationDialog(false);
    setSelectedQuote(null);
  };

  const handleReject = async () => {
    if (!selectedQuote) return;
    await updateQuote.mutateAsync({
      id: selectedQuote.id,
      data: {
        status: "rejected_by_company",
      },
    });
    setShowRejectionDialog(false);
    setSelectedQuote(null);
    setRejectionReason("");
  };

  const handleConfirmBooking = async (quote: MaintenanceQuote, bookingData: { date: string; time: string }) => {
    // Create MaintenanceRecord
    const maintenanceRecord = await base44.entities.MaintenanceRecord.create({
      vehicle_registration: quote.vehicle_registration,
      type: quote.service_type,
      description: quote.description,
      cost: quote.quote_amount,
      service_provider: quote.service_provider,
      status: "scheduled",
      notes: `Reservation suite au devis #${quote.id.slice(0, 8)}`,
    });

    // Update quote
    await updateQuote.mutateAsync({
      id: quote.id,
      data: {
        status: "converted_to_booking",
        scheduled_date: bookingData.date,
        scheduled_time: bookingData.time,
      },
    });

    setShowValidationDialog(false);
    setSelectedQuote(null);
    toast.success("Reservation confirmee");
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch =
      q.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: quotes.filter(q => q.status === "pending_subito_quote").length,
    quoted: quotes.filter(q => q.status === "quoted").length,
    validated: quotes.filter(q => q.status === "validated_by_company").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Devis d&apos;entretien</h1>
            <p className="text-slate-500">Demandez des devis a Subito pour vos vehicules</p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewQuote(true)}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-700 mb-1">En attente</p>
          <p className="text-2xl font-bold text-blue-800">{stats.pending}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <p className="text-sm text-purple-700 mb-1">Devis recus</p>
          <p className="text-2xl font-bold text-purple-800">{stats.quoted}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">Valides</p>
          <p className="text-2xl font-bold text-green-800">{stats.validated}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending_subito_quote">En attente</SelectItem>
              <SelectItem value="quoted">Devis recu</SelectItem>
              <SelectItem value="validated_by_company">Valide</SelectItem>
              <SelectItem value="rejected_by_company">Refuse</SelectItem>
              <SelectItem value="converted_to_booking">Confirme</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quotes List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredQuotes.map((quote) => {
            const status = statusConfig[quote.status] || statusConfig.pending_subito_quote;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-orange-50">
                      <Car className="w-5 h-5 text-subito" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-800">{quote.vehicle_registration}</p>
                        <Badge className={`${status.color} border-0 text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {quote.vehicle_brand} {quote.vehicle_model}
                      </p>
                      <p className="text-sm text-slate-700 font-medium capitalize mb-1">
                        {quote.service_type}
                      </p>
                      <p className="text-sm text-slate-500">{quote.description}</p>
                    </div>
                  </div>

                  {quote.urgency === "urgent" && (
                    <Badge className="bg-orange-100 text-orange-700 border-0">Urgent</Badge>
                  )}
                  {quote.urgency === "critical" && (
                    <Badge className="bg-red-100 text-red-700 border-0">Critique</Badge>
                  )}
                </div>

                {quote.status === "quoted" && (
                  <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-purple-700 font-medium">Devis Subito</span>
                      <span className="text-xl font-bold text-purple-800">
                        {quote.quote_amount?.toLocaleString()} FCFA
                      </span>
                    </div>
                    {quote.quote_details && (
                      <p className="text-sm text-slate-600 mb-2">{quote.quote_details}</p>
                    )}
                    {quote.service_provider && (
                      <p className="text-xs text-slate-500">
                        Prestataire: {quote.service_provider}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuote(quote)}
                    className="flex-1 gap-2"
                  >
                    <Eye className="w-3 h-3" />
                    Voir details
                  </Button>

                  {quote.status === "quoted" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setShowValidationDialog(true);
                        }}
                        className="flex-1 gradient-subito text-white border-0"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Valider
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setShowRejectionDialog(true);
                        }}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredQuotes.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucune demande de devis</p>
          <p className="text-sm text-slate-400 mt-1">
            Creez votre premiere demande pour obtenir un devis Subito
          </p>
        </div>
      )}

      {/* New Quote Dialog */}
      <Dialog open={showNewQuote} onOpenChange={setShowNewQuote}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vehicule *</Label>
              <Select
                value={formData.vehicle_registration}
                onValueChange={(v) => setFormData({ ...formData, vehicle_registration: v })}
              >
                <SelectTrigger>
                  <Car className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Selectionner un vehicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.registration}>
                      {v.registration} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type de service *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(v) => setFormData({ ...formData, service_type: v })}
              >
                <SelectTrigger>
                  <Wrench className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type de service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vidange">Vidange</SelectItem>
                  <SelectItem value="filtres">Filtres</SelectItem>
                  <SelectItem value="freins">Freins</SelectItem>
                  <SelectItem value="pneus">Pneus</SelectItem>
                  <SelectItem value="batterie">Batterie</SelectItem>
                  <SelectItem value="revision">Revision complete</SelectItem>
                  <SelectItem value="reparation">Reparation</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description detaillee *</Label>
              <Textarea
                placeholder="Decrivez le probleme ou le service souhaite..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Urgence</Label>
              <Select
                value={formData.urgency}
                onValueChange={(v) => setFormData({ ...formData, urgency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dates preferees (optionnel)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Proposez jusqu&apos;a 3 dates qui vous conviennent
              </p>
              {[0, 1, 2].map((index) => (
                <Input
                  key={index}
                  type="date"
                  value={formData.preferred_dates[index]}
                  onChange={(e) => {
                    const newDates = [...formData.preferred_dates];
                    newDates[index] = e.target.value;
                    setFormData({ ...formData, preferred_dates: newDates });
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewQuote(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={
                !formData.vehicle_registration ||
                !formData.service_type ||
                !formData.description ||
                createQuote.isPending
              }
              className="gradient-subito text-white border-0"
            >
              <Send className="w-4 h-4 mr-1" />
              Envoyer a Subito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Details Sheet */}
      <Sheet open={!!selectedQuote && !showValidationDialog && !showRejectionDialog} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedQuote && (
            <>
              <SheetHeader>
                <SheetTitle>Details du devis</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-sm text-slate-500 mb-1">Vehicule</p>
                  <p className="font-bold text-slate-800">{selectedQuote.vehicle_registration}</p>
                  <p className="text-sm text-slate-600">
                    {selectedQuote.vehicle_brand} {selectedQuote.vehicle_model}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Service demande</p>
                  <p className="font-medium text-slate-800 capitalize">{selectedQuote.service_type}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700">{selectedQuote.description}</p>
                </div>

                {selectedQuote.preferred_dates && selectedQuote.preferred_dates.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Dates preferees</p>
                    {selectedQuote.preferred_dates.map((date, i) => (
                      <p key={i} className="text-sm text-slate-600">
                        {format(new Date(date), "dd MMMM yyyy", { locale: fr })}
                      </p>
                    ))}
                  </div>
                )}

                {selectedQuote.status === "quoted" && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-2">Devis Subito</p>
                    <p className="text-2xl font-bold text-purple-800 mb-2">
                      {selectedQuote.quote_amount?.toLocaleString()} FCFA
                    </p>
                    {selectedQuote.quote_details && (
                      <p className="text-sm text-slate-600 mb-2">{selectedQuote.quote_details}</p>
                    )}
                    {selectedQuote.service_provider && (
                      <p className="text-sm text-slate-600">
                        Prestataire: {selectedQuote.service_provider}
                      </p>
                    )}
                    {selectedQuote.estimated_duration && (
                      <p className="text-sm text-slate-600">
                        Duree estimee: {selectedQuote.estimated_duration}h
                      </p>
                    )}
                  </div>
                )}

                {selectedQuote.scheduled_date && (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-sm text-green-700 font-medium mb-1">Rendez-vous confirme</p>
                    <p className="font-bold text-green-800">
                      {format(new Date(selectedQuote.scheduled_date), "dd MMMM yyyy", { locale: fr })}
                      {selectedQuote.scheduled_time && ` a ${selectedQuote.scheduled_time}`}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider le devis et reserver</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-sm text-purple-700 mb-1">Montant</p>
                <p className="text-2xl font-bold text-purple-800">
                  {selectedQuote.quote_amount?.toLocaleString()} FCFA
                </p>
              </div>

              <div className="space-y-2">
                <Label>Date du rendez-vous *</Label>
                <Input
                  type="date"
                  id="booking-date"
                  defaultValue={selectedQuote.preferred_dates?.[0] || ""}
                />
              </div>

              <div className="space-y-2">
                <Label>Heure du rendez-vous *</Label>
                <Input type="time" id="booking-time" defaultValue="09:00" />
              </div>

              <p className="text-sm text-slate-500">
                En validant, vous confirmez la reservation et un MaintenanceRecord sera automatiquement cree.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                const dateInput = document.getElementById("booking-date") as HTMLInputElement;
                const timeInput = document.getElementById("booking-time") as HTMLInputElement;
                if (selectedQuote && dateInput && timeInput) {
                  handleConfirmBooking(selectedQuote, { date: dateInput.value, time: timeInput.value });
                }
              }}
              className="gradient-subito text-white border-0"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirmer la reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Raison du refus</Label>
              <Textarea
                placeholder="Expliquez pourquoi vous refusez ce devis..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Refuser le devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
