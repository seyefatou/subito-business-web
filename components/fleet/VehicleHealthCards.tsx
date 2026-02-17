'use client';

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Wrench, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  odometer?: number;
  next_service_km?: number;
}

interface Alert {
  id: string;
  vehicle_registration: string;
  is_resolved: boolean;
}

interface MaintenanceRecord {
  id: string;
  vehicle_registration: string;
}

interface VehicleHealthCardsProps {
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  alerts: Alert[];
}

export default function VehicleHealthCards({ vehicles, maintenanceRecords, alerts }: VehicleHealthCardsProps) {
  // Identify vehicles at risk
  const vehiclesAtRisk = vehicles.filter(v => {
    // Check for maintenance due
    if (v.next_service_km && v.odometer && v.odometer >= v.next_service_km - 500) {
      return true;
    }
    // Check for alerts
    const vehicleAlerts = alerts.filter(a => a.vehicle_registration === v.registration && !a.is_resolved);
    return vehicleAlerts.length > 0;
  });

  // Top vehicles by usage (most maintenance records)
  const vehicleMaintenanceCount: Record<string, number> = {};
  maintenanceRecords.forEach(r => {
    vehicleMaintenanceCount[r.vehicle_registration] =
      (vehicleMaintenanceCount[r.vehicle_registration] || 0) + 1;
  });
  const mostUsedVehicles = Object.entries(vehicleMaintenanceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vehicles at Risk */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Vehicules a risque</h3>
          <Badge variant="outline" className="text-red-600">
            {vehiclesAtRisk.length}
          </Badge>
        </div>

        {vehiclesAtRisk.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Tous les vehicules sont en bon etat</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehiclesAtRisk.slice(0, 5).map((vehicle) => {
              const vehicleAlerts = alerts.filter(
                a => a.vehicle_registration === vehicle.registration && !a.is_resolved
              );
              const maintenanceDue = vehicle.next_service_km && vehicle.odometer &&
                vehicle.odometer >= vehicle.next_service_km - 500;

              return (
                <div key={vehicle.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{vehicle.registration}</p>
                    <p className="text-xs text-slate-600">{vehicle.brand} {vehicle.model}</p>
                    {maintenanceDue && (
                      <p className="text-xs text-red-700 mt-1">
                        Revision a {vehicle.next_service_km} km (actuel: {vehicle.odometer} km)
                      </p>
                    )}
                    {vehicleAlerts.length > 0 && (
                      <p className="text-xs text-red-700 mt-1">
                        {vehicleAlerts.length} alerte(s)
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Most Used Vehicles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Vehicules les plus utilises</h3>
          <TrendingUp className="w-5 h-5 text-slate-400" />
        </div>

        {mostUsedVehicles.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Aucune donnee d&apos;utilisation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mostUsedVehicles.map(([registration, count], index) => {
              const vehicle = vehicles.find(v => v.registration === registration);
              return (
                <div key={registration} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{registration}</p>
                    <p className="text-xs text-slate-600">
                      {vehicle?.brand} {vehicle?.model}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {count} intervention{count > 1 ? 's' : ''}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
