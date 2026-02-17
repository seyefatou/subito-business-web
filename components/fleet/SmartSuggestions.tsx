'use client';

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingDown, Wrench, MapPin, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Vehicle {
  id: string;
  registration: string;
  tracking_enabled?: boolean;
  status?: string;
  odometer?: number;
  next_service_km?: number;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  created_date: string;
  quantity_liters?: number;
}

interface MaintenanceRecord {
  id: string;
}

interface Suggestion {
  id: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
  title: string;
  message: string;
  action: string;
  actionUrl: string;
}

interface SmartSuggestionsProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
  trackingEnabled?: number;
}

export default function SmartSuggestions({ vehicles, fuelRequests, maintenanceRecords, trackingEnabled }: SmartSuggestionsProps) {
  const suggestions: Suggestion[] = [];

  // Suggestion 1: Enable tracking for cost reduction
  const vehiclesWithoutTracking = vehicles.filter(v => !v.tracking_enabled && v.status === 'active').length;
  if (vehiclesWithoutTracking > 0) {
    suggestions.push({
      id: 'tracking',
      icon: MapPin,
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
      title: 'Reduisez jusqu\'a 15% votre budget carburant',
      message: `Avec le tracking Subito sur ${vehiclesWithoutTracking} vehicule(s), vous pouvez optimiser les trajets et reduire les abus.`,
      action: 'Activer le tracking',
      actionUrl: '/dashboard/fleet/vehicles'
    });
  }

  // Suggestion 2: High consumption vehicles
  const currentMonth = new Date().getMonth();
  const vehicleConsumption: Record<string, number> = {};
  fuelRequests.forEach(r => {
    if (new Date(r.created_date).getMonth() === currentMonth) {
      vehicleConsumption[r.vehicle_registration] =
        (vehicleConsumption[r.vehicle_registration] || 0) + (r.quantity_liters || 0);
    }
  });

  const highConsumptionVehicles = Object.entries(vehicleConsumption)
    .filter(([_, liters]) => liters > 200)
    .length;

  if (highConsumptionVehicles > 0) {
    suggestions.push({
      id: 'consumption',
      icon: TrendingDown,
      color: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-700',
      title: 'Surconsommation detectee',
      message: `${highConsumptionVehicles} vehicule(s) depasse(nt) la consommation normale. Activez le suivi temps reel pour identifier les causes.`,
      action: 'Analyser',
      actionUrl: '/dashboard/fleet/fuel'
    });
  }

  // Suggestion 3: Maintenance due
  const vehiclesDueMaintenance = vehicles.filter(v => {
    if (!v.next_service_km || !v.odometer) return false;
    return v.odometer >= v.next_service_km - 500;
  }).length;

  if (vehiclesDueMaintenance > 0) {
    suggestions.push({
      id: 'maintenance',
      icon: Wrench,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
      title: 'Entretien a planifier',
      message: `${vehiclesDueMaintenance} vehicule(s) approche(nt) de la revision. Planifiez maintenant pour eviter les pannes.`,
      action: 'Planifier',
      actionUrl: '/dashboard/fleet/maintenance'
    });
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h3 className="font-semibold">Suggestions intelligentes</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <div
              key={suggestion.id}
              className={`${suggestion.color} rounded-xl p-4 border`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white/50">
                  <Icon className={`w-5 h-5 ${suggestion.textColor}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${suggestion.textColor} mb-1 text-sm`}>
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {suggestion.message}
                  </p>
                </div>
              </div>
              <Link href={suggestion.actionUrl}>
                <Button size="sm" variant="outline" className="w-full">
                  {suggestion.action}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
