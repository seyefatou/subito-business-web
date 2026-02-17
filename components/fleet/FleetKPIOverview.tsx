'use client';

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Fuel, Wrench, DollarSign, Car, Activity, LucideIcon } from "lucide-react";

interface Vehicle {
  id: string;
  status?: string;
  odometer?: number;
}

interface FuelRequest {
  id: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface MaintenanceRecord {
  id: string;
  cost?: number;
}

interface VehicleDocument {
  id: string;
  document_type?: string;
  expiry_date?: string;
}

interface KPI {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend: string;
  trendUp: boolean;
}

interface CostBreakdownItem {
  label: string;
  percentage: number;
  color: string;
}

interface FleetKPIOverviewProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
  documents: VehicleDocument[];
  period?: string;
}

export default function FleetKPIOverview({ vehicles, fuelRequests, maintenanceRecords, documents, period }: FleetKPIOverviewProps) {
  // Calculate KPIs
  const totalFuelCost = fuelRequests.reduce((sum, f) => sum + (f.actual_cost || f.estimated_cost || 0), 0);
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);

  // Insurance costs from documents
  const insuranceDocs = documents.filter(d => d.document_type === 'assurance' && d.expiry_date);
  const insuranceCost = insuranceDocs.length * 50000; // Estimate

  const totalCost = totalFuelCost + totalMaintenanceCost + insuranceCost;

  // Total kilometers
  const totalKm = vehicles.reduce((sum, v) => sum + (v.odometer || 0), 0);
  const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;

  // Average fuel consumption
  const totalLiters = fuelRequests.reduce((sum, f) => sum + (f.quantity_liters || 0), 0);
  const avgConsumption = vehicles.length > 0 ? totalLiters / vehicles.length : 0;

  // Utilization rate (vehicles with recent activity)
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const utilizationRate = vehicles.length > 0 ? (activeVehicles / vehicles.length) * 100 : 0;

  // Cost breakdown percentages
  const fuelPercentage = totalCost > 0 ? (totalFuelCost / totalCost) * 100 : 0;
  const maintenancePercentage = totalCost > 0 ? (totalMaintenanceCost / totalCost) * 100 : 0;
  const insurancePercentage = totalCost > 0 ? (insuranceCost / totalCost) * 100 : 0;

  const kpis: KPI[] = [
    {
      label: "Cout total",
      value: `${totalCost.toLocaleString()} FCFA`,
      icon: DollarSign,
      color: "bg-blue-50 text-blue-600",
      trend: "+12%",
      trendUp: true
    },
    {
      label: "Cout/km",
      value: `${Math.round(costPerKm)} FCFA`,
      icon: Activity,
      color: "bg-purple-50 text-purple-600",
      trend: "-5%",
      trendUp: false
    },
    {
      label: "Consommation moy.",
      value: `${avgConsumption.toFixed(1)} L/veh`,
      icon: Fuel,
      color: "bg-orange-50 text-orange-600",
      trend: "+3%",
      trendUp: true
    },
    {
      label: "Taux d'utilisation",
      value: `${utilizationRate.toFixed(0)}%`,
      icon: Car,
      color: "bg-green-50 text-green-600",
      trend: "+8%",
      trendUp: true
    }
  ];

  const costBreakdown: CostBreakdownItem[] = [
    { label: "Carburant", percentage: fuelPercentage, color: "bg-orange-500" },
    { label: "Entretien", percentage: maintenancePercentage, color: "bg-blue-500" },
    { label: "Assurance", percentage: insurancePercentage, color: "bg-purple-500" }
  ];

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trendUp ? TrendingUp : TrendingDown;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs ${
                  kpi.trendUp ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  {kpi.trend}
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Repartition des couts</h3>
        <div className="space-y-4">
          {costBreakdown.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="text-sm font-medium text-slate-800">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className={`h-full ${item.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
