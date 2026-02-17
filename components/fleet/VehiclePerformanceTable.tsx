'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  odometer?: number;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface MaintenanceRecord {
  id: string;
  vehicle_registration: string;
  cost?: number;
}

interface VehicleStats extends Vehicle {
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  totalLiters: number;
  avgConsumption: number;
  costPerKm: number;
  maintenanceCount: number;
}

interface VehiclePerformanceTableProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
  detailed?: boolean;
}

type SortableField = 'totalCost' | 'fuelCost' | 'maintenanceCost' | 'costPerKm' | 'avgConsumption' | 'totalLiters' | 'maintenanceCount';

export default function VehiclePerformanceTable({ vehicles, fuelRequests, maintenanceRecords, detailed }: VehiclePerformanceTableProps) {
  const [sortBy, setSortBy] = useState<SortableField>("totalCost");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const vehicleStats: VehicleStats[] = vehicles.map(vehicle => {
    const vehicleFuel = fuelRequests.filter(f => f.vehicle_registration === vehicle.registration);
    const vehicleMaintenance = maintenanceRecords.filter(m => m.vehicle_registration === vehicle.registration);

    const fuelCost = vehicleFuel.reduce((sum, f) => sum + (f.actual_cost || f.estimated_cost || 0), 0);
    const maintenanceCost = vehicleMaintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCost = fuelCost + maintenanceCost;

    const totalLiters = vehicleFuel.reduce((sum, f) => sum + (f.quantity_liters || 0), 0);
    const avgConsumption = totalLiters / (vehicleFuel.length || 1);

    const costPerKm = (vehicle.odometer ?? 0) > 0 ? totalCost / (vehicle.odometer ?? 1) : 0;

    return {
      ...vehicle,
      fuelCost,
      maintenanceCost,
      totalCost,
      totalLiters,
      avgConsumption,
      costPerKm,
      maintenanceCount: vehicleMaintenance.length
    };
  });

  const sortedVehicles = [...vehicleStats].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    return (a[sortBy] - b[sortBy]) * multiplier;
  });

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  interface Column {
    key: string;
    label: string;
    sortable: boolean;
  }

  const columns: Column[] = [
    { key: "registration", label: "Vehicule", sortable: false },
    { key: "totalCost", label: "Cout total", sortable: true },
    { key: "fuelCost", label: "Carburant", sortable: true },
    { key: "maintenanceCost", label: "Entretien", sortable: true },
    { key: "costPerKm", label: "Cout/km", sortable: true },
    { key: "avgConsumption", label: "Conso. moy.", sortable: true },
  ];

  if (detailed) {
    columns.push(
      { key: "totalLiters", label: "Litres total", sortable: true },
      { key: "maintenanceCount", label: "Entretiens", sortable: true }
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">Performance par vehicule</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key as SortableField)}
                      className="flex items-center gap-2 hover:text-slate-700"
                    >
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedVehicles.map((vehicle, index) => (
              <motion.tr
                key={vehicle.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{vehicle.registration}</p>
                    <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-800">
                    {vehicle.totalCost.toLocaleString()} FCFA
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-700">
                    {vehicle.fuelCost.toLocaleString()} FCFA
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-700">
                    {vehicle.maintenanceCost.toLocaleString()} FCFA
                  </p>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="font-mono">
                    {Math.round(vehicle.costPerKm)} FCFA/km
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700">
                      {vehicle.avgConsumption.toFixed(1)} L
                    </span>
                    {vehicle.avgConsumption > 50 && (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </td>
                {detailed && (
                  <>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">
                        {vehicle.totalLiters.toFixed(0)} L
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary">{vehicle.maintenanceCount}</Badge>
                    </td>
                  </>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
