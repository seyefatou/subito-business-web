'use client';

import React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

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

interface ChartDataPoint {
  month: string;
  carburant: number;
  entretien: number;
}

interface FleetCostChartProps {
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
}

export default function FleetCostChart({ fuelRequests, maintenanceRecords }: FleetCostChartProps) {
  // Generate last 6 months data
  const monthsData: ChartDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthFuel = fuelRequests.filter(r => {
      const reqDate = new Date(r.created_date);
      return reqDate >= monthStart && reqDate <= monthEnd &&
             (r.status === 'completed' || r.status === 'dispensed');
    });

    const monthMaintenance = maintenanceRecords.filter(r => {
      const reqDate = new Date(r.created_date);
      return reqDate >= monthStart && reqDate <= monthEnd && r.status === 'completed';
    });

    monthsData.push({
      month: format(date, 'MMM', { locale: fr }),
      carburant: monthFuel.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0),
      entretien: monthMaintenance.reduce((sum, r) => sum + (r.cost || 0), 0),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-6"
    >
      <h3 className="font-semibold text-slate-800 mb-4">Evolution des couts flotte</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={monthsData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            formatter={(value: number) => `${value.toLocaleString()} FCFA`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="carburant"
            stroke="#E04A1F"
            strokeWidth={2}
            name="Carburant"
            dot={{ fill: '#E04A1F', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="entretien"
            stroke="#4F46E5"
            strokeWidth={2}
            name="Entretien"
            dot={{ fill: '#4F46E5', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
