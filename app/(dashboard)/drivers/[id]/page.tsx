"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Star,
  Car,
  Fuel,
  Wrench,
  Calendar,
  Phone,
  Mail,
  Award,
  TrendingUp,
  AlertTriangle,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DriverPerformanceStats from "@/components/drivers/DriverPerformanceStats";
import DriverAssignmentHistory from "@/components/drivers/DriverAssignmentHistory";
import DriverTripHistory from "@/components/drivers/DriverTripHistory";
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
  certifications?: string[];
}

interface FuelRequest {
  id: string;
  driver_name: string;
  created_date: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_registration: string;
  created_date: string;
}

interface DriverAssignment {
  id: string;
  driver_name: string;
  created_date: string;
}

interface Department {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  registration: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DriverProfile({ params }: PageProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  // Resolve params
  React.useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const driverId = resolvedParams?.id || "";

  const { data: driver } = useQuery<Driver | undefined>({
    queryKey: ['driver', driverId],
    queryFn: async () => {
      const drivers = await base44.entities.Driver.list();
      return drivers.find((d: Driver) => d.id === driverId);
    },
    enabled: !!driverId,
  });

  const { data: fuelRequests = [] } = useQuery<FuelRequest[]>({
    queryKey: ['fuelRequests'],
    queryFn: () => base44.entities.FuelRequest.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: assignments = [] } = useQuery<DriverAssignment[]>({
    queryKey: ['driverAssignments'],
    queryFn: () => base44.entities.DriverAssignment.list('-created_date'),
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
      queryClient.invalidateQueries({ queryKey: ['driver'] });
      setShowAddDialog(false);
      toast.success('Chauffeur enregistre avec succes');
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    },
  });

  if (!driver) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/drivers">
            <Button variant="ghost" className="mb-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
        </div>
        <div className="p-12 text-center space-y-4">
          <p className="text-slate-600">Conducteur non trouve</p>
          <Button onClick={() => setShowAddDialog(true)} className="gradient-subito text-white border-0 gap-2">
            <Plus className="w-4 h-4" />
            Enregistrer un nouveau chauffeur
          </Button>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enregistrer un nouveau chauffeur</DialogTitle>
            </DialogHeader>
            <DriverForm
              departments={departments}
              vehicles={vehicles}
              onSubmit={(data) => createDriver.mutate(data)}
              onCancel={() => setShowAddDialog(false)}
              isSubmitting={createDriver.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const driverFuel = fuelRequests.filter(f => f.driver_name === driver.full_name);
  const driverAssignments = assignments.filter(a => a.driver_name === driver.full_name);

  const getLicenseStatus = () => {
    if (!driver.license_expiry) return { status: 'ok', message: 'Pas de date d\'expiration' };
    const expiryDate = new Date(driver.license_expiry);
    const now = new Date();
    const daysUntil = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { status: 'expired', message: 'Permis expire' };
    if (daysUntil <= 30) return { status: 'expiring', message: `Expire dans ${daysUntil} jours` };
    return { status: 'ok', message: 'Valide' };
  };

  const licenseStatus = getLicenseStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/drivers">
          <Button variant="ghost" className="mb-2 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
        </Link>
        <Button onClick={() => setShowAddDialog(true)} className="gradient-subito text-white border-0 gap-2">
          <Plus className="w-4 h-4" />
          Nouveau chauffeur
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {driver.photo_url ? (
            <img src={driver.photo_url} alt={driver.full_name} className="w-32 h-32 rounded-2xl object-cover" />
          ) : (
            <div className="w-32 h-32 rounded-2xl gradient-subito flex items-center justify-center text-white text-4xl font-bold">
              {driver.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{driver.full_name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  {driver.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-slate-800">{driver.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <Badge className="bg-slate-100 text-slate-700">
                    {driver.status === 'active' ? 'Actif' :
                     driver.status === 'on_leave' ? 'En conge' :
                     driver.status === 'suspended' ? 'Suspendu' : 'Termine'}
                  </Badge>
                  {driver.assigned_vehicle && (
                    <Badge variant="outline" className="gap-1">
                      <Car className="w-3 h-3" />
                      {driver.assigned_vehicle}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Telephone</p>
                  <p className="font-medium text-slate-800">{driver.phone}</p>
                </div>
              </div>
              {driver.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-slate-800">{driver.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Permis</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{driver.license_type || '--'}</p>
                    {licenseStatus.status === 'expired' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    {licenseStatus.status === 'expiring' && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{licenseStatus.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {driver.certifications && driver.certifications.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">Certifications</p>
            <div className="flex flex-wrap gap-2">
              {driver.certifications.map((cert, index) => (
                <Badge key={index} variant="secondary">{cert}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="assignments">Affectations</TabsTrigger>
          <TabsTrigger value="trips">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <DriverPerformanceStats
            driver={driver}
            fuelRequests={driverFuel}
            maintenanceRecords={maintenanceRecords}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <DriverAssignmentHistory
            driver={driver}
            assignments={driverAssignments}
          />
        </TabsContent>

        <TabsContent value="trips">
          <DriverTripHistory
            driver={driver}
            fuelRequests={driverFuel}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enregistrer un nouveau chauffeur</DialogTitle>
          </DialogHeader>
          <DriverForm
            departments={departments}
            vehicles={vehicles}
            onSubmit={(data) => createDriver.mutate(data)}
            onCancel={() => setShowAddDialog(false)}
            isSubmitting={createDriver.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
