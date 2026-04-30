'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Fuel, Wrench } from "lucide-react";

const COLORS = ['#E04A1F', '#F7931E', '#FDC830', '#37CDFF', '#A78BFA'];

interface Vehicle {
  id: string;
  department?: string;
}

interface FuelRequest {
  id: string;
  created_date: string;
  status?: string;
  actual_cost?: number;
  estimated_cost?: number;
}

interface MaintenanceRecord {
  id: string;
  created_date: string;
  status?: string;
  cost?: number;
}

interface DepartmentDataItem {
  name: string;
  value: number;
}

interface MonthlyDataItem {
  month: string;
  carburant: number;
  entretien: number;
}

async function fetchVehicles(): Promise<Vehicle[]> {
  return [];
}

async function fetchFuelRequests(): Promise<FuelRequest[]> {
  return [];
}

async function fetchMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  return [];
}

export default function StatisticsSection() {
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
  });

  const { data: fuelRequests = [] } = useQuery<FuelRequest[]>({
    queryKey: ['fuelRequests'],
    queryFn: fetchFuelRequests,
  });

  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenanceRecords'],
    queryFn: fetchMaintenanceRecords,
  });

  // Statistiques par departement
  const departmentStats = vehicles.reduce<Record<string, number>>((acc, v) => {
    const dept = v.department || 'General';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const departmentData: DepartmentDataItem[] = Object.entries(departmentStats).map(([name, value]) => ({
    name,
    value
  }));

  // Couts mensuels
  const monthlyData: MonthlyDataItem[] = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const monthStr = month.toLocaleDateString('fr-FR', { month: 'short' });

    const monthNum = month.getMonth();
    const fuelCost = fuelRequests
      .filter(r => new Date(r.created_date).getMonth() === monthNum && (r.status === 'completed' || r.status === 'dispensed'))
      .reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);

    const maintenanceCost = maintenanceRecords
      .filter(r => new Date(r.created_date).getMonth() === monthNum && r.status === 'completed')
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      month: monthStr,
      carburant: Math.round(fuelCost),
      entretien: Math.round(maintenanceCost)
    };
  });

  const totalFuelCost = fuelRequests.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalCost = totalFuelCost + totalMaintenanceCost;

  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${name} (${(percent * 100).toFixed(0)}%)`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Couts mensuels */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Evolution des couts (6 mois)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="carburant" fill="#E04A1F" name="Carburant" />
              <Bar dataKey="entretien" fill="#37CDFF" name="Entretien" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Repartition par departement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Vehicules par departement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-700" />
            <p className="text-xs text-slate-600">Total vehicules</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{vehicles.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-green-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-4 h-4 text-green-700" />
            <p className="text-xs text-slate-600">Demandes carburant</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{fuelRequests.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-orange-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-orange-700" />
            <p className="text-xs text-slate-600">Entretiens</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{maintenanceRecords.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-purple-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-700" />
            <p className="text-xs text-slate-600">Cout total</p>
          </div>
          <p className="text-xl font-bold text-purple-700">
            {totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">FCFA</p>
        </motion.div>
      </div>
    </div>
  );
}
