'use client';

import React from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { User, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#E04A1F', '#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];

interface FuelRequest {
  id: string;
  driver_name?: string;
  created_date: string;
  status?: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface DriverData {
  totalLiters: number;
  totalCost: number;
  count: number;
}

interface ChartDataItem {
  name: string;
  value: number;
}

interface TableDataItem {
  name: string;
  totalLiters: number;
  totalCost: number;
  count: number;
  avgPerRefuel: number;
  costPerLiter: number;
  vsAverage: number;
}

type Period = 'week' | 'month' | 'year';

interface FuelConsumptionByDriverProps {
  fuelRequests: FuelRequest[];
  period: Period;
}

export default function FuelConsumptionByDriver({ fuelRequests, period }: FuelConsumptionByDriverProps) {
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

  // Calculate consumption per driver
  const driverData: Record<string, DriverData> = {};
  const completedRequests = fuelRequests.filter(r =>
    (r.status === 'completed' || r.status === 'dispensed') &&
    new Date(r.created_date) >= startDate &&
    new Date(r.created_date) <= endDate
  );

  completedRequests.forEach(request => {
    const driver = request.driver_name || 'Non specifie';
    if (!driverData[driver]) {
      driverData[driver] = {
        totalLiters: 0,
        totalCost: 0,
        count: 0
      };
    }
    driverData[driver].totalLiters += request.quantity_liters || 0;
    driverData[driver].totalCost += request.actual_cost || request.estimated_cost || 0;
    driverData[driver].count += 1;
  });

  // Calculate average
  const totalDrivers = Object.keys(driverData).length;
  const totalLiters = Object.values(driverData).reduce((sum, v) => sum + v.totalLiters, 0);
  const driverAverage = totalDrivers > 0 ? totalLiters / totalDrivers : 0;

  // Prepare chart data
  const chartData: ChartDataItem[] = Object.entries(driverData)
    .sort((a, b) => b[1].totalLiters - a[1].totalLiters)
    .slice(0, 8)
    .map(([name, data]) => ({
      name,
      value: data.totalLiters
    }));

  // Table data
  const tableData: TableDataItem[] = Object.entries(driverData)
    .map(([name, data]) => {
      const avgPerRefuel = data.count > 0 ? data.totalLiters / data.count : 0;
      const costPerLiter = data.totalLiters > 0 ? data.totalCost / data.totalLiters : 0;
      const vsAverage = driverAverage > 0 ? ((data.totalLiters - driverAverage) / driverAverage * 100) : 0;

      return {
        name,
        ...data,
        avgPerRefuel,
        costPerLiter,
        vsAverage
      };
    })
    .sort((a, b) => b.totalLiters - a.totalLiters);

  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${name} (${(percent * 100).toFixed(0)}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Repartition par chauffeur</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(0)} L`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Chauffeur
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Total litres
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Cout total
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Moy/plein
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
                      <div className="p-2 rounded-lg bg-blue-50">
                        <User className="w-4 h-4 text-blue-600" />
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
                    <p className="text-sm text-slate-700">{row.avgPerRefuel.toFixed(0)} L</p>
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
