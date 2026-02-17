"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Fuel
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VehicleForm from "@/components/fleet/VehicleForm";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  status: string;
  tracking_enabled?: boolean;
  department?: string;
  odometer?: number;
  fuel_type?: string;
  year?: number;
}

interface Department {
  id: string;
  name: string;
}

interface VehicleAlert {
  id: string;
  vehicle_registration: string;
  is_resolved: boolean;
  title: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const statusConfig: Record<string, StatusConfig> = {
  active: { label: "Actif", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  maintenance: { label: "En maintenance", color: "bg-orange-100 text-orange-700", icon: Wrench },
  out_of_service: { label: "Hors service", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function Vehicles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('-created_date'),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: alerts = [] } = useQuery<VehicleAlert[]>({
    queryKey: ['vehicleAlerts'],
    queryFn: () => base44.entities.VehicleAlert.list(),
  });

  const createVehicle = useMutation({
    mutationFn: (data: Partial<Vehicle>) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      toast.success("Vehicule ajoute");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateVehicle = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      setEditingVehicle(null);
      toast.success("Vehicule modifie");
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteVehicle(null);
      toast.success("Vehicule supprime");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleSubmit = (data: Partial<Vehicle>) => {
    if (editingVehicle) {
      updateVehicle.mutate({ id: editingVehicle.id, data });
    } else {
      createVehicle.mutate(data);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch =
      v.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    tracked: vehicles.filter(v => v.tracking_enabled).length,
  };

  const getVehicleAlerts = (registration: string) => {
    return alerts.filter(a => a.vehicle_registration === registration && !a.is_resolved);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Vehicules</h1>
            <p className="text-slate-500">{filteredVehicles.length} vehicule{filteredVehicles.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingVehicle(null);
            setShowForm(true);
          }}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un vehicule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">Actifs</p>
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p className="text-sm text-orange-700 mb-1">Maintenance</p>
          <p className="text-2xl font-bold text-orange-800">{stats.maintenance}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-700 mb-1">Trackes</p>
          <p className="text-2xl font-bold text-blue-800">{stats.tracked}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par immatriculation, marque, modele..."
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
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="maintenance">En maintenance</SelectItem>
              <SelectItem value="out_of_service">Hors service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredVehicles.map((vehicle, index) => {
            const status = statusConfig[vehicle.status] || statusConfig.active;
            const StatusIcon = status.icon;
            const vehicleAlerts = getVehicleAlerts(vehicle.registration);

            return (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50">
                      <Car className="w-5 h-5 text-subito" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{vehicle.registration}</p>
                      <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                    </div>
                  </div>
                  {vehicle.tracking_enabled && (
                    <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200">
                      <MapPin className="w-3 h-3" />
                      GPS
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Annee</span>
                    <span className="font-medium text-slate-800">{vehicle.year || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Carburant</span>
                    <Badge variant="outline" className="capitalize">
                      {vehicle.fuel_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Departement</span>
                    <span className="font-medium text-slate-800">{vehicle.department || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Kilometrage</span>
                    <span className="font-medium text-slate-800">
                      {vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Statut</span>
                    <Badge className={`${status.color} border-0 gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </div>
                </div>

                {vehicleAlerts.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-800">
                        {vehicleAlerts.length} alerte{vehicleAlerts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700">{vehicleAlerts[0]?.title}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingVehicle(vehicle);
                      setShowForm(true);
                    }}
                    className="flex-1 gap-2"
                  >
                    <Edit className="w-3 h-3" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteVehicle(vehicle)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredVehicles.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucun vehicule trouve</p>
          <p className="text-sm text-slate-400 mt-1">Ajoutez votre premier vehicule pour commencer</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Modifier le vehicule' : 'Ajouter un vehicule'}
            </DialogTitle>
          </DialogHeader>
          <VehicleForm
            vehicle={editingVehicle}
            departments={departments}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingVehicle(null);
            }}
            isSubmitting={createVehicle.isPending || updateVehicle.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVehicle} onOpenChange={() => setDeleteVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce vehicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Le vehicule {deleteVehicle?.registration} sera definitivement supprime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVehicle && deleteVehicleMutation.mutate(deleteVehicle.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
