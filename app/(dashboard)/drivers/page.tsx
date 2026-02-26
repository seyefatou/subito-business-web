"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  User,
  Plus,
  Search,
  Star,
  Car,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import DriverForm from "@/components/drivers/DriverForm";
import { toast } from "sonner";

interface Driver {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  status: string;
  license_type?: string;
  license_expiry?: string;
  assigned_vehicle?: string;
  department?: string;
  rating?: number;
}

interface Department {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
}

interface StatusConfig {
  label: string;
  color: string;
}

const statusConfig: Record<string, StatusConfig> = {
  active: { label: "Actif", color: "bg-green-100 text-green-700" },
  on_leave: { label: "En conge", color: "bg-blue-100 text-blue-700" },
  suspended: { label: "Suspendu", color: "bg-orange-100 text-orange-700" },
  terminated: { label: "Termine", color: "bg-red-100 text-red-700" },
};

export default function Drivers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteDriver, setDeleteDriver] = useState<Driver | null>(null);

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date'),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const createDriver = useMutation({
    mutationFn: (data: Partial<Driver>) => base44.entities.Driver.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowForm(false);
      toast.success("Conducteur ajoute");
    },
  });

  const updateDriver = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) => base44.entities.Driver.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowForm(false);
      setEditingDriver(null);
      toast.success("Conducteur modifie");
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Driver.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteDriver(null);
      toast.success("Conducteur supprime");
    },
  });

  const handleSubmit = (data: Partial<Driver>) => {
    if (editingDriver) {
      updateDriver.mutate({ id: editingDriver.id, data });
    } else {
      createDriver.mutate(data);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch =
      d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    onLeave: drivers.filter(d => d.status === 'on_leave').length,
    withVehicle: drivers.filter(d => d.assigned_vehicle).length,
  };

  const getLicenseStatus = (driver: Driver) => {
    if (!driver.license_expiry) return 'ok';
    const expiryDate = new Date(driver.license_expiry);
    const now = new Date();
    const daysUntil = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 30) return 'expiring';
    return 'ok';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Conducteurs</h1>
            <p className="text-slate-500">{filteredDrivers.length} conducteur{filteredDrivers.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingDriver(null);
            setShowForm(true);
          }}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un conducteur
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">Actifs</p>
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-700 mb-1">En conge</p>
          <p className="text-2xl font-bold text-blue-800">{stats.onLeave}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <p className="text-sm text-purple-700 mb-1">Avec vehicule</p>
          <p className="text-2xl font-bold text-purple-800">{stats.withVehicle}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un conducteur..."
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
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="on_leave">En conge</SelectItem>
              <SelectItem value="suspended">Suspendu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => {
          const status = statusConfig[driver.status] || statusConfig.active;
          const licenseStatus = getLicenseStatus(driver);

          return (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <Link href={`/drivers/${driver.id}`}>
                <div className="flex items-start gap-4 mb-4">
                  {driver.photo_url ? (
                    <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl gradient-subito flex items-center justify-center text-white text-xl font-bold">
                      {driver.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{driver.full_name}</h3>
                    <p className="text-sm text-slate-500">{driver.phone}</p>
                    {driver.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-slate-700">{driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Statut</span>
                    <Badge className={`${status.color} border-0`}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Permis</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-800">{driver.license_type || '--'}</span>
                      {licenseStatus === 'expired' && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                      {licenseStatus === 'expiring' && (
                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                      )}
                    </div>
                  </div>
                  {driver.assigned_vehicle && (
                    <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-blue-50">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">{driver.assigned_vehicle}</span>
                    </div>
                  )}
                  {driver.department && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Departement</span>
                      <span className="font-medium text-slate-800">{driver.department}</span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingDriver(driver);
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
                  onClick={() => setDeleteDriver(driver)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? 'Modifier' : 'Ajouter'} un conducteur
            </DialogTitle>
          </DialogHeader>
          <DriverForm
            driver={editingDriver}
            departments={departments}
            vehicles={vehicles}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingDriver(null);
            }}
            isSubmitting={createDriver.isPending || updateDriver.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDriver} onOpenChange={() => setDeleteDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce conducteur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDriver && deleteDriverMutation.mutate(deleteDriver.id)}
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
