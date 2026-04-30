'use client';

import React from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Fuel } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  created_date: string;
  status?: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface VehicleData {
  totalLiters: number;
  totalCost: number;
  count: number;
}

interface ChartDataItem {
  registration: string;
  liters: number;
  cost: number;
  average: number;
}

interface TableDataItem {
  registration: string;
  vehicle?: Vehicle;
  totalLiters: number;
  totalCost: number;
  count: number;
  avgPerRefuel: number;
  costPerLiter: number;
  vsAverage: number;
}

type Period = 'week' | 'month' | 'year';

interface FuelConsumptionByVehicleProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  period: Period;
}

export default function FuelConsumptionByVehicle({ vehicles, fuelRequests, period }: FuelConsumptionByVehicleProps) {
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

  // Calculate consumption per vehicle
  const vehicleData: Record<string, VehicleData> = {};
  const completedRequests = fuelRequests.filter(r =>
    (r.status === 'completed' || r.status === 'dispensed') &&
    new Date(r.created_date) >= startDate &&
    new Date(r.created_date) <= endDate
  );

  completedRequests.forEach(request => {
    if (!vehicleData[request.vehicle_registration]) {
      vehicleData[request.vehicle_registration] = {
        totalLiters: 0,
        totalCost: 0,
        count: 0
      };
    }
    vehicleData[request.vehicle_registration].totalLiters += request.quantity_liters || 0;
    vehicleData[request.vehicle_registration].totalCost += request.actual_cost || request.estimated_cost || 0;
    vehicleData[request.vehicle_registration].count += 1;
  });

  // Calculate fleet average
  const totalVehicles = Object.keys(vehicleData).length;
  const totalLiters = Object.values(vehicleData).reduce((sum, v) => sum + v.totalLiters, 0);
  const fleetAverage = totalVehicles > 0 ? totalLiters / totalVehicles : 0;

  // Prepare data for chart
  const chartData: ChartDataItem[] = Object.entries(vehicleData)
    .sort((a, b) => b[1].totalLiters - a[1].totalLiters)
    .slice(0, 10)
    .map(([registration, data]) => ({
      registration,
      liters: data.totalLiters,
      cost: data.totalCost,
      average: fleetAverage
    }));

  // Table data with all vehicles
  const tableData: TableDataItem[] = Object.entries(vehicleData)
    .map(([registration, data]) => {
      const vehicle = vehicles.find(v => v.registration === registration);
      const avgPerRefuel = data.count > 0 ? data.totalLiters / data.count : 0;
      const costPerLiter = data.totalLiters > 0 ? data.totalCost / data.totalLiters : 0;
      const vsAverage = fleetAverage > 0 ? ((data.totalLiters - fleetAverage) / fleetAverage * 100) : 0;

      return {
        registration,
        vehicle,
        ...data,
        avgPerRefuel,
        costPerLiter,
        vsAverage
      };
    })
    .sort((a, b) => b.totalLiters - a.totalLiters);

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Top 10 consommations</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="registration" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value: number, name: string) => {
                if (name === 'liters') return [`${value.toFixed(0)} L`, 'Consommation'];
                if (name === 'average') return [`${value.toFixed(0)} L`, 'Moyenne flotte'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="liters" fill="#E04A1F" name="Litres" radius={[8, 8, 0, 0]} />
            <Bar dataKey="average" fill="#94a3b8" name="Moyenne" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Vehicule
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
                  key={row.registration}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-50">
                        <Fuel className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{row.registration}</p>
                        <p className="text-xs text-slate-500">
                          {row.vehicle?.brand} {row.vehicle?.model}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-slate-800">{row.totalLiters.toFixed(0)} L</p>
                    <p className="text-xs text-slate-500">{row.count} plein{row.count > 1 ? 's' : ''}</p>
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
