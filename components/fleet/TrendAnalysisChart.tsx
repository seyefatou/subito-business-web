'use client';

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FuelRequest {
  id: string;
  created_date: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface MaintenanceRecord {
  id: string;
  created_date: string;
  cost?: number;
}

interface ChartDataItem {
  month: string;
  carburant: number;
  entretien: number;
  total: number;
  litres: number;
}

interface TrendAnalysisChartProps {
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
  period?: string;
}

export default function TrendAnalysisChart({ fuelRequests, maintenanceRecords, period }: TrendAnalysisChartProps) {
  // Group by month for the last 12 months
  const months: { date: Date; month: string; year: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      date,
      month: format(date, 'MMM', { locale: fr }),
      year: date.getFullYear()
    });
  }

  const chartData: ChartDataItem[] = months.map(({ date, month }) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const fuelCost = fuelRequests
      .filter(f => {
        const fDate = new Date(f.created_date);
        return fDate >= monthStart && fDate <= monthEnd;
      })
      .reduce((sum, f) => sum + (f.actual_cost || f.estimated_cost || 0), 0);

    const maintenanceCost = maintenanceRecords
      .filter(m => {
        const mDate = new Date(m.created_date);
        return mDate >= monthStart && mDate <= monthEnd;
      })
      .reduce((sum, m) => sum + (m.cost || 0), 0);

    const fuelLiters = fuelRequests
      .filter(f => {
        const fDate = new Date(f.created_date);
        return fDate >= monthStart && fDate <= monthEnd;
      })
      .reduce((sum, f) => sum + (f.quantity_liters || 0), 0);

    return {
      month,
      carburant: Math.round(fuelCost / 1000),
      entretien: Math.round(maintenanceCost / 1000),
      total: Math.round((fuelCost + maintenanceCost) / 1000),
      litres: Math.round(fuelLiters)
    };
  });

  const totalSum = chartData.reduce((sum, d) => sum + d.total, 0);
  const monthlyAverage = Math.round(totalSum / chartData.length);
  const maxTotal = Math.max(...chartData.map(d => d.total));
  const trendPercent = chartData[0]?.total > 0
    ? Math.round(((chartData[11]?.total - chartData[0]?.total) / chartData[0]?.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cost Trends */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Evolution des couts (12 derniers mois)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} label={{ value: 'k FCFA', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'litres') return `${value} L`;
                return `${value}k FCFA`;
              }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              fill="#FF6B35"
              fillOpacity={0.1}
              stroke="#FF6B35"
              strokeWidth={2}
              name="Total"
            />
            <Line
              type="monotone"
              dataKey="carburant"
              stroke="#FFA500"
              strokeWidth={2}
              name="Carburant"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="entretien"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Entretien"
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Fuel Consumption Trends */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Consommation de carburant (litres)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} label={{ value: 'Litres', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number) => `${value} L`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="litres"
              stroke="#FF6B35"
              strokeWidth={3}
              dot={{ r: 5, fill: '#FF6B35' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <p className="text-sm text-blue-700 mb-2">Moyenne mensuelle</p>
          <p className="text-2xl font-bold text-blue-900">
            {monthlyAverage}k FCFA
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <p className="text-sm text-orange-700 mb-2">Pic mensuel</p>
          <p className="text-2xl font-bold text-orange-900">
            {maxTotal}k FCFA
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <p className="text-sm text-green-700 mb-2">Tendance</p>
          <p className="text-2xl font-bold text-green-900">
            {trendPercent > 0 ? '+' : ''}{trendPercent}%
          </p>
        </div>
      </div>
    </div>
  );
}
