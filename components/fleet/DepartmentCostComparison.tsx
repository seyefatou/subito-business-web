'use client';

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Vehicle {
  id: string;
  registration: string;
  department?: string;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  actual_cost?: number;
  estimated_cost?: number;
}

interface MaintenanceRecord {
  id: string;
  vehicle_registration: string;
  cost?: number;
}

interface Department {
  id: string;
  name: string;
}

interface DepartmentStats {
  name: string;
  carburant: number;
  entretien: number;
  vehicles: number;
}

interface DepartmentCostComparisonProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
  departments: Department[];
}

export default function DepartmentCostComparison({ vehicles, fuelRequests, maintenanceRecords, departments }: DepartmentCostComparisonProps) {
  const deptStats: DepartmentStats[] = departments.map(dept => {
    const deptVehicles = vehicles.filter(v => v.department === dept.name);
    const deptRegistrations = deptVehicles.map(v => v.registration);

    const fuelCost = fuelRequests
      .filter(f => deptRegistrations.includes(f.vehicle_registration))
      .reduce((sum, f) => sum + (f.actual_cost || f.estimated_cost || 0), 0);

    const maintenanceCost = maintenanceRecords
      .filter(m => deptRegistrations.includes(m.vehicle_registration))
      .reduce((sum, m) => sum + (m.cost || 0), 0);

    return {
      name: dept.name,
      carburant: Math.round(fuelCost / 1000),
      entretien: Math.round(maintenanceCost / 1000),
      vehicles: deptVehicles.length
    };
  }).filter(d => d.vehicles > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Couts par departement</h3>

      {deptStats.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400">
          Aucune donnee disponible
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={deptStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} label={{ value: 'k FCFA', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number) => `${value}k FCFA`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="carburant" fill="#E04A1F" name="Carburant" radius={[8, 8, 0, 0]} />
            <Bar dataKey="entretien" fill="#3B82F6" name="Entretien" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
