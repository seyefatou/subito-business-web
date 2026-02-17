'use client';

import React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ['#FF6B35', '#F77F73', '#4F46E5', '#10B981', '#F59E0B', '#EC4899'];

interface FuelRequest {
  id: string;
  created_date: string;
  quantity_liters?: number;
  actual_cost?: number;
  estimated_cost?: number;
  fuel_type?: string;
  department?: string;
}

interface FuelConsumptionChartProps {
  requests: FuelRequest[];
}

interface MonthlyData {
  month: string;
  litres: number;
  cout: number;
}

interface FuelTypeData {
  name: string;
  value: number;
}

interface DepartmentData {
  name: string;
  litres: number;
  cout: number;
}

export default function FuelConsumptionChart({ requests }: FuelConsumptionChartProps) {
  // Aggregate by month
  const last6Months: MonthlyData[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthRequests = requests.filter(r => {
      const reqDate = new Date(r.created_date);
      return reqDate >= monthStart && reqDate <= monthEnd;
    });

    last6Months.push({
      month: format(date, 'MMM', { locale: fr }),
      litres: monthRequests.reduce((sum, r) => sum + (r.quantity_liters || 0), 0),
      cout: monthRequests.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0),
    });
  }

  // Aggregate by fuel type
  const byFuelType = requests.reduce<Record<string, FuelTypeData>>((acc, r) => {
    const type = r.fuel_type || 'inconnu';
    if (!acc[type]) {
      acc[type] = { name: type, value: 0 };
    }
    acc[type].value += r.quantity_liters || 0;
    return acc;
  }, {});
  const fuelTypeData = Object.values(byFuelType);

  // Aggregate by department
  const byDepartment = requests.reduce<Record<string, DepartmentData>>((acc, r) => {
    const dept = r.department || 'General';
    if (!acc[dept]) {
      acc[dept] = { name: dept, litres: 0, cout: 0 };
    }
    acc[dept].litres += r.quantity_liters || 0;
    acc[dept].cout += r.actual_cost || r.estimated_cost || 0;
    return acc;
  }, {});
  const departmentData = Object.values(byDepartment);

  return (
    <div className="space-y-6">
      {/* Monthly Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-4">Consommation mensuelle</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={last6Months}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="litres"
              stroke="#FF6B35"
              strokeWidth={2}
              name="Litres"
              dot={{ fill: '#FF6B35', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Fuel Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="font-semibold text-slate-800 mb-4">Par type de carburant</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={fuelTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: { name: string; value: number }) => `${name}: ${value.toFixed(0)}L`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {fuelTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* By Department */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="font-semibold text-slate-800 mb-4">Par departement</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Bar dataKey="litres" fill="#FF6B35" name="Litres" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Cost Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-4">Evolution des couts</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={last6Months}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toLocaleString()} FCFA`}
            />
            <Bar dataKey="cout" fill="#4F46E5" name="Cout (FCFA)" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
