'use client';

import React from "react";
import { motion } from "framer-motion";
import { Fuel, TrendingUp, AlertTriangle, DollarSign, LucideIcon } from "lucide-react";

interface Driver {
  id: string;
  full_name: string;
  infractions_count?: number;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  quantity_liters?: number;
  actual_cost?: number;
  estimated_cost?: number;
  created_date: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  description?: string;
  cost?: number;
  date: string;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

interface DriverPerformanceStatsProps {
  driver: Driver;
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
}

export default function DriverPerformanceStats({
  driver,
  fuelRequests,
  maintenanceRecords
}: DriverPerformanceStatsProps) {
  const totalFuelCost = fuelRequests.reduce((sum, f) => sum + (f.actual_cost || f.estimated_cost || 0), 0);
  const totalLiters = fuelRequests.reduce((sum, f) => sum + (f.quantity_liters || 0), 0);
  const avgConsumption = fuelRequests.length > 0 ? totalLiters / fuelRequests.length : 0;

  const stats: StatItem[] = [
    {
      label: "Cout carburant total",
      value: `${totalFuelCost.toLocaleString()} FCFA`,
      icon: DollarSign,
      color: "bg-slate-100 text-slate-600"
    },
    {
      label: "Consommation moyenne",
      value: `${avgConsumption.toFixed(1)} L`,
      icon: Fuel,
      color: "bg-slate-100 text-slate-600"
    },
    {
      label: "Demandes carburant",
      value: fuelRequests.length,
      icon: TrendingUp,
      color: "bg-slate-100 text-slate-600"
    },
    {
      label: "Infractions",
      value: driver.infractions_count || 0,
      icon: AlertTriangle,
      color: "bg-slate-100 text-slate-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <div className={`p-3 rounded-xl ${stat.color} w-fit mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Historique carburant</h3>
        {fuelRequests.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Aucune demande de carburant</p>
        ) : (
          <div className="space-y-3">
            {fuelRequests.slice(0, 10).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <p className="font-medium text-slate-800">{request.vehicle_registration}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(request.created_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{request.quantity_liters} L</p>
                  <p className="text-sm text-slate-500">
                    {(request.actual_cost || request.estimated_cost || 0).toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
