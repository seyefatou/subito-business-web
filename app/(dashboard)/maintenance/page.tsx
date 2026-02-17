'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import {
  Wrench,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";
import MaintenanceCalendar from "@/components/maintenance/MaintenanceCalendar";
import ServiceProviderManager from "@/components/maintenance/ServiceProviderManager";
import MaintenanceHistory from "@/components/maintenance/MaintenanceHistory";
import { toast } from "sonner";

interface MaintenanceRecord {
  id: string;
  created_date: string;
  status: string;
  type: string;
  cost?: number;
  vehicle_registration?: string;
  next_service_km?: number;
  odometer_at_service?: number;
}

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  department?: string;
  odometer?: number;
  next_service_km?: number;
  last_service_km?: number;
}

interface VehicleAlert {
  id: string;
  alert_type: string;
  is_resolved: boolean;
  vehicle_registration?: string;
  message?: string;
  created_date: string;
}

interface ServiceProvider {
  id: string;
  name: string;
}

type TypeIconsKey = 'vidange' | 'filtres' | 'freins' | 'pneus' | 'batterie' | 'revision' | 'reparation' | 'autre';

const typeIcons: Record<TypeIconsKey, string> = {
  vidange: "oil",
  filtres: "wrench",
  freins: "stop",
  pneus: "circle",
  batterie: "battery",
  revision: "check",
  reparation: "hammer",
  autre: "cog"
};

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-created_date'),
  });

  const { data: alerts = [] } = useQuery<VehicleAlert[]>({
    queryKey: ['vehicleAlerts'],
    queryFn: () => base44.entities.VehicleAlert.list('-created_date'),
  });

  const { data: serviceProviders = [] } = useQuery<ServiceProvider[]>({
    queryKey: ['serviceProviders'],
    queryFn: () => base44.entities.ServiceProvider.list(),
  });

  // Filter maintenance alerts
  const maintenanceAlerts = alerts.filter(a =>
    a.alert_type === 'maintenance_due' && !a.is_resolved
  );

  // Stats
  const scheduledMaintenance = maintenanceRecords.filter(r => r.status === 'scheduled').length;
  const completedThisMonth = maintenanceRecords.filter(r => {
    if (r.status !== 'completed') return false;
    const date = new Date(r.created_date);
    return date.getMonth() === new Date().getMonth();
  }).length;

  const totalCostThisMonth = maintenanceRecords
    .filter(r => {
      if (r.status !== 'completed') return false;
      const date = new Date(r.created_date);
      return date.getMonth() === new Date().getMonth();
    })
    .reduce((sum, r) => sum + (r.cost || 0), 0);

  const createRecord = useMutation({
    mutationFn: (data: Partial<MaintenanceRecord>) => base44.entities.MaintenanceRecord.create(data),
    onSuccess: async (newRecord: MaintenanceRecord) => {
      // Update vehicle odometer and next service if provided
      if (newRecord.next_service_km && newRecord.vehicle_registration) {
        const vehicle = vehicles.find(v => v.registration === newRecord.vehicle_registration);
        if (vehicle) {
          await base44.entities.Vehicle.update(vehicle.id, {
            odometer: newRecord.odometer_at_service || vehicle.odometer,
            next_service_km: newRecord.next_service_km,
            last_service_km: newRecord.odometer_at_service
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowDialog(false);
      setEditingRecord(null);
      toast.success("Intervention enregistree avec succes");
    },
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceRecord> }) =>
      base44.entities.MaintenanceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      setShowDialog(false);
      setEditingRecord(null);
      toast.success("Intervention mise a jour");
    },
  });

  const handleSubmit = (data: Partial<MaintenanceRecord>) => {
    if (editingRecord) {
      updateRecord.mutate({ id: editingRecord.id, data });
    } else {
      createRecord.mutate(data);
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Entretien & Maintenance</h1>
            <p className="text-slate-500">Gestion preventive et predictive</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingRecord(null);
            setShowDialog(true);
          }}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Planifier une intervention
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-700" />
            <p className="text-xs text-slate-600">Alertes</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{maintenanceAlerts.length}</p>
          <p className="text-xs text-slate-500">A traiter</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-blue-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <p className="text-xs text-slate-600">Planifiees</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{scheduledMaintenance}</p>
          <p className="text-xs text-slate-500">Interventions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <p className="text-xs text-slate-600">Realisees</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{completedThisMonth}</p>
          <p className="text-xs text-slate-500">Ce mois</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-purple-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-700" />
            <p className="text-xs text-slate-600">Cout mensuel</p>
          </div>
          <p className="text-xl font-bold text-purple-700">
            {totalCostThisMonth.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">FCFA</p>
        </motion.div>
      </div>

      {/* Maintenance Alerts */}
      {maintenanceAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                {maintenanceAlerts.length} vehicule{maintenanceAlerts.length > 1 ? 's necessitent' : ' necessite'} une intervention
              </h3>
              <div className="space-y-2">
                {maintenanceAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{alert.vehicle_registration}</p>
                      <p className="text-sm text-slate-600">{alert.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const vehicle = vehicles.find(v => v.registration === alert.vehicle_registration);
                        if (vehicle) {
                          setEditingRecord({
                            id: '',
                            created_date: '',
                            status: 'scheduled',
                            type: 'revision',
                            vehicle_registration: vehicle.registration,
                            odometer_at_service: vehicle.odometer
                          });
                          setShowDialog(true);
                        }
                      }}
                    >
                      Planifier
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Users className="w-4 h-4" />
            Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Analyse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <MaintenanceCalendar
            records={maintenanceRecords}
            vehicles={vehicles}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="history">
          <MaintenanceHistory
            records={maintenanceRecords}
            vehicles={vehicles}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="providers">
          <ServiceProviderManager />
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by Type */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Couts par type d&apos;intervention</h3>
              <div className="space-y-3">
                {Object.entries(
                  maintenanceRecords
                    .filter(r => r.status === 'completed')
                    .reduce((acc: Record<string, number>, r) => {
                      acc[r.type] = (acc[r.type] || 0) + (r.cost || 0);
                      return acc;
                    }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, cost]) => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {cost.toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Cost by Vehicle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Couts par vehicule</h3>
              <div className="space-y-3">
                {Object.entries(
                  maintenanceRecords
                    .filter(r => r.status === 'completed')
                    .reduce((acc: Record<string, number>, r) => {
                      if (r.vehicle_registration) {
                        acc[r.vehicle_registration] = (acc[r.vehicle_registration] || 0) + (r.cost || 0);
                      }
                      return acc;
                    }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([registration, cost]) => {
                    const vehicle = vehicles.find(v => v.registration === registration);
                    return (
                      <div key={registration} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-800">{registration}</p>
                          <p className="text-xs text-slate-500">
                            {vehicle?.brand} {vehicle?.model}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800">
                          {cost.toLocaleString()} FCFA
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord?.id ? 'Modifier l\'intervention' : 'Planifier une intervention'}
            </DialogTitle>
          </DialogHeader>
          <MaintenanceForm
            record={editingRecord}
            vehicles={vehicles}
            serviceProviders={serviceProviders}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowDialog(false);
              setEditingRecord(null);
            }}
            isSubmitting={createRecord.isPending || updateRecord.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
