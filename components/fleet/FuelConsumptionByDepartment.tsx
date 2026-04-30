'use client';

import React from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FuelRequest {
  id: string;
  department?: string;
  created_date: string;
  status?: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface Department {
  id: string;
  name: string;
}

interface DeptData {
  totalLiters: number;
  totalCost: number;
  count: number;
}

interface ChartDataItem {
  name: string;
  liters: number;
  cost: number;
}

interface TableDataItem {
  name: string;
  totalLiters: number;
  totalCost: number;
  count: number;
  avgPerRefuel: number;
  costPerLiter: number;
  vsAverage: number;
  percentOfTotal: number;
}

type Period = 'week' | 'month' | 'year';

interface FuelConsumptionByDepartmentProps {
  fuelRequests: FuelRequest[];
  departments: Department[];
  period: Period;
}

export default function FuelConsumptionByDepartment({ fuelRequests, departments, period }: FuelConsumptionByDepartmentProps) {
  // Calculate date range
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const startDate = new Date();

    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getDateRange();

  // Calculate consumption per department
  const deptData: Record<string, DeptData> = {};
  const completedRequests = fuelRequests.filter(r =>
    (r.status === 'completed' || r.status === 'dispensed') &&
    new Date(r.created_date) >= startDate &&
    new Date(r.created_date) <= endDate
  );

  completedRequests.forEach(request => {
    const dept = request.department || 'Non specifie';
    if (!deptData[dept]) {
      deptData[dept] = {
        totalLiters: 0,
        totalCost: 0,
        count: 0
      };
    }
    deptData[dept].totalLiters += request.quantity_liters || 0;
    deptData[dept].totalCost += request.actual_cost || request.estimated_cost || 0;
    deptData[dept].count += 1;
  });

  // Calculate average
  const totalDepts = Object.keys(deptData).length;
  const totalLiters = Object.values(deptData).reduce((sum, v) => sum + v.totalLiters, 0);
  const totalCost = Object.values(deptData).reduce((sum, v) => sum + v.totalCost, 0);
  const deptAverage = totalDepts > 0 ? totalLiters / totalDepts : 0;

  // Prepare chart data
  const chartData: ChartDataItem[] = Object.entries(deptData)
    .sort((a, b) => b[1].totalCost - a[1].totalCost)
    .map(([name, data]) => ({
      name,
      liters: data.totalLiters,
      cost: data.totalCost
    }));

  // Table data
  const tableData: TableDataItem[] = Object.entries(deptData)
    .map(([name, data]) => {
      const avgPerRefuel = data.count > 0 ? data.totalLiters / data.count : 0;
      const costPerLiter = data.totalLiters > 0 ? data.totalCost / data.totalLiters : 0;
      const vsAverage = deptAverage > 0 ? ((data.totalLiters - deptAverage) / deptAverage * 100) : 0;
      const percentOfTotal = totalCost > 0 ? (data.totalCost / totalCost * 100) : 0;

      return {
        name,
        ...data,
        avgPerRefuel,
        costPerLiter,
        vsAverage,
        percentOfTotal
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Couts par departement</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value: number, name: string) => {
                if (name === 'liters') return [`${value.toFixed(0)} L`, 'Litres'];
                if (name === 'cost') return [`${value.toLocaleString()} FCFA`, 'Cout'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="cost" fill="#E04A1F" name="Cout" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-orange-100 rounded-xl p-4">
          <p className="text-xs text-slate-600 mb-1">Cout total</p>
          <p className="text-2xl font-bold text-orange-700">
            {totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">FCFA</p>
        </div>
        <div className="bg-blue-100 rounded-xl p-4">
          <p className="text-xs text-slate-600 mb-1">Total litres</p>
          <p className="text-2xl font-bold text-blue-700">
            {totalLiters.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500">Litres</p>
        </div>
        <div className="bg-purple-100 rounded-xl p-4">
          <p className="text-xs text-slate-600 mb-1">Prix moyen/L</p>
          <p className="text-2xl font-bold text-purple-700">
            {totalLiters > 0 ? (totalCost / totalLiters).toFixed(0) : 0}
          </p>
          <p className="text-xs text-slate-500">FCFA</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Departement
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Total litres
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Cout total
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  % du total
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Prix/L
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  vs Moyenne
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((row, index) => (
                <motion.tr
                  key={row.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50">
                        <Building2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.count} plein{row.count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-slate-800">{row.totalLiters.toFixed(0)} L</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-medium text-slate-800">
                      {row.totalCost.toLocaleString()} FCFA
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant="outline" className="text-slate-700">
                      {row.percentOfTotal.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-slate-700">{row.costPerLiter.toFixed(0)} FCFA</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge
                      variant="outline"
                      className={
                        row.vsAverage > 20 ? 'text-red-600 border-red-200' :
                        row.vsAverage < -20 ? 'text-green-600 border-green-200' :
                        'text-slate-600 border-slate-200'
                      }
                    >
                      {row.vsAverage > 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(row.vsAverage).toFixed(0)}%
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
