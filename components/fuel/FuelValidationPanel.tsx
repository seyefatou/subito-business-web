'use client';

import React, { useState, ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import { Check, X, Fuel, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  vehicle_type?: string;
  driver_name: string;
  fuel_type: string;
  quantity_liters: number;
  estimated_cost?: number;
  purpose?: string;
  priority?: string;
  status: string;
  approved_by?: string;
}

interface FuelValidationPanelProps {
  requests: FuelRequest[];
}

interface DispenseData {
  station_name: string;
  station_location: string;
  actual_cost: string;
}

type ActionType = 'reject' | 'dispense' | null;

export default function FuelValidationPanel({ requests }: FuelValidationPanelProps) {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<FuelRequest | null>(null);
  const [action, setAction] = useState<ActionType>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [dispenseData, setDispenseData] = useState<DispenseData>({
    station_name: "",
    station_location: "",
    actual_cost: "",
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FuelRequest> & { rejection_reason?: string; station_name?: string; station_location?: string; actual_cost?: number; approved_at?: string; dispensed_at?: string } }) =>
      base44.entities.FuelRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelRequests'] });
      setSelectedRequest(null);
      setAction(null);
      setRejectionReason("");
      setDispenseData({ station_name: "", station_location: "", actual_cost: "" });
      toast.success("Mise a jour effectuee");
    },
    onError: () => {
      toast.error("Erreur lors de la mise a jour");
    }
  });

  const handleApprove = async (request: FuelRequest): Promise<void> => {
    const user = await base44.auth.me();
    await updateRequest.mutateAsync({
      id: request.id,
      data: {
        status: 'approved',
        approved_by: user.email,
        approved_at: new Date().toISOString(),
      }
    });
  };

  const handleReject = async (): Promise<void> => {
    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer la raison du refus");
      return;
    }
    if (!selectedRequest) return;

    const user = await base44.auth.me();
    await updateRequest.mutateAsync({
      id: selectedRequest.id,
      data: {
        status: 'rejected',
        rejection_reason: rejectionReason,
        approved_by: user.email,
        approved_at: new Date().toISOString(),
      }
    });
  };

  const handleDispense = async (): Promise<void> => {
    if (!dispenseData.station_name || !dispenseData.actual_cost) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!selectedRequest) return;

    await updateRequest.mutateAsync({
      id: selectedRequest.id,
      data: {
        status: 'dispensed',
        station_name: dispenseData.station_name,
        station_location: dispenseData.station_location,
        actual_cost: parseFloat(dispenseData.actual_cost),
        dispensed_at: new Date().toISOString(),
      }
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');

  if (pendingRequests.length === 0 && approvedRequests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Aucune demande en attente</p>
        <p className="text-sm text-slate-400 mt-1">Toutes les demandes ont ete traitees</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">
            En attente d&apos;approbation ({pendingRequests.length})
          </h3>
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50">
                      <Fuel className="w-5 h-5 text-subito" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{request.vehicle_registration}</p>
                      <p className="text-sm text-slate-500">{request.vehicle_type}</p>
                    </div>
                  </div>
                  {request.priority === 'urgent' && (
                    <Badge className="bg-red-100 text-red-700 border-0">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Urgent
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Conducteur</p>
                    <p className="text-sm font-medium text-slate-800">{request.driver_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Carburant</p>
                    <p className="text-sm font-medium text-slate-800 capitalize">{request.fuel_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quantite</p>
                    <p className="text-sm font-medium text-slate-800">{request.quantity_liters} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cout estime</p>
                    <p className="text-sm font-medium text-slate-800">
                      {request.estimated_cost?.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>

                {request.purpose && (
                  <div className="mb-4 p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Motif</p>
                    <p className="text-sm text-slate-700">{request.purpose}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(request);
                      setAction('reject');
                    }}
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                    Refuser
                  </Button>
                  <Button
                    onClick={() => handleApprove(request)}
                    disabled={updateRequest.isPending}
                    className="gap-2 gradient-subito text-white border-0"
                  >
                    {updateRequest.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approuver
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Approved - Ready to Dispense */}
      {approvedRequests.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">
            Approuvees - En attente de distribution ({approvedRequests.length})
          </h3>
          <div className="grid gap-4">
            {approvedRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-green-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50">
                      <Fuel className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{request.vehicle_registration}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Check className="w-3 h-3 text-green-600" />
                        Approuvee par {request.approved_by}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Carburant</p>
                    <p className="text-sm font-medium text-slate-800 capitalize">{request.fuel_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quantite</p>
                    <p className="text-sm font-medium text-slate-800">{request.quantity_liters} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Conducteur</p>
                    <p className="text-sm font-medium text-slate-800">{request.driver_name}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setSelectedRequest(request);
                      setAction('dispense');
                    }}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Fuel className="w-4 h-4" />
                    Marquer comme distribuee
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={action === 'reject'} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du refus pour {selectedRequest?.vehicle_registration}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Raison du refus..."
              value={rejectionReason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
              className="h-24"
            />
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setAction(null)}>
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={updateRequest.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmer le refus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispense Dialog */}
      <Dialog open={action === 'dispense'} onOpenChange={() => setAction(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enregistrer la distribution</DialogTitle>
            <DialogDescription>
              Completez les informations de distribution pour {selectedRequest?.vehicle_registration}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Station service *</Label>
              <Input
                placeholder="Total, Shell, Oilibya..."
                value={dispenseData.station_name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDispenseData(prev => ({ ...prev, station_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Localisation</Label>
              <Input
                placeholder="Adresse de la station"
                value={dispenseData.station_location}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDispenseData(prev => ({ ...prev, station_location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cout reel (FCFA) *</Label>
              <Input
                type="number"
                placeholder="30000"
                value={dispenseData.actual_cost}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDispenseData(prev => ({ ...prev, actual_cost: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setAction(null)}>
                Annuler
              </Button>
              <Button
                onClick={handleDispense}
                disabled={updateRequest.isPending}
                className="gradient-subito text-white border-0"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
