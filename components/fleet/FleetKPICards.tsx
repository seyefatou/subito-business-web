'use client';

import React from "react";
import { motion } from "framer-motion";
import { Car, MapPin, DollarSign, Fuel, Wrench, AlertCircle, LucideIcon } from "lucide-react";

interface KPI {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
}

interface FleetKPICardsProps {
  activeVehicles: number;
  trackingEnabled: number;
  totalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  unresolvedAlerts: number;
}

export default function FleetKPICards({
  activeVehicles,
  trackingEnabled,
  totalCost,
  fuelCost,
  maintenanceCost,
  unresolvedAlerts
}: FleetKPICardsProps) {
  const kpis: KPI[] = [
    {
      label: "Vehicules actifs",
      value: activeVehicles,
      icon: Car,
      color: "bg-blue-100",
      textColor: "text-blue-700"
    },
    {
      label: "Tracking active",
      value: trackingEnabled,
      subtitle: `sur ${activeVehicles}`,
      icon: MapPin,
      color: "bg-green-100",
      textColor: "text-green-700"
    },
    {
      label: "Cout total flotte",
      value: `${totalCost.toLocaleString()} FCFA`,
      subtitle: "Ce mois",
      icon: DollarSign,
      color: "bg-purple-100",
      textColor: "text-purple-700"
    },
    {
      label: "Carburant",
      value: `${fuelCost.toLocaleString()} FCFA`,
      icon: Fuel,
      color: "bg-orange-100",
      textColor: "text-orange-700"
    },
    {
      label: "Entretien",
      value: `${maintenanceCost.toLocaleString()} FCFA`,
      icon: Wrench,
      color: "bg-slate-100",
      textColor: "text-slate-700"
    },
    {
      label: "Alertes",
      value: unresolvedAlerts,
      icon: AlertCircle,
      color: unresolvedAlerts > 0 ? "bg-red-100" : "bg-green-100",
      textColor: unresolvedAlerts > 0 ? "text-red-700" : "text-green-700"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`${kpi.color} rounded-xl p-4`}
        >
          <div className="flex items-center gap-2 mb-2">
            <kpi.icon className={`w-4 h-4 ${kpi.textColor}`} />
            <p className="text-xs text-slate-600">{kpi.label}</p>
          </div>
          <p className={`text-xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
          {kpi.subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{kpi.subtitle}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
