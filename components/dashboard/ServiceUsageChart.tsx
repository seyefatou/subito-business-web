'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface ServiceUsageChartProps {
  serviceDistribution?: Record<string, { count: number; total: number }>;
}

interface ChartDataItem {
  name: string;
  value: number;
  percent: number;
  total: number;
}

const COLORS: string[] = ['#FF6B35', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

const serviceLabels: Record<string, string> = {
  airport_shuttle: "Navette Aeroport",
  inter_city: "Inter-ville",
  intercity: "Inter-ville",
  vtc_hourly: "VTC Horaire",
  travel_document: "Document de voyage",
  flight_reservation: "Navette Aeroport",
  hotel_reservation: "Logement",
  flight_and_hotel: "Vol + Hotel",
  transport: "Transport",
  livraison: "Livraison",
  assistance: "Assistance",
  carburant: "Carburant",
  flotte: "Location de vehicule",
  CIRCUIT: "Circuit touristique",
  LOGEMENT: "Logement",
  FLOTTE: "Location vehicule",
  administratif: "Administratif",
};

export default function ServiceUsageChart({ serviceDistribution = {} }: ServiceUsageChartProps) {
  const entries = Object.entries(serviceDistribution);
  const totalCount = entries.reduce((sum, [, v]) => sum + v.count, 0);

  const data: ChartDataItem[] = entries
    .map(([key, v]) => ({
      name: serviceLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: v.count,
      percent: totalCount > 0 ? Math.round((v.count / totalCount) * 100) : 0,
      total: v.total,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Services utilises</h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          <p>Aucune donnee disponible</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200 p-6"
    >
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Services utilises</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              formatter={(value: number, _name: string, props: { payload?: ChartDataItem }) => {
                const p = props.payload;
                return [
                  `${value} commande${value > 1 ? 's' : ''} (${p?.percent ?? 0}%) — ${(p?.total ?? 0).toLocaleString()} FCFA`,
                  ''
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend */}
      <div className="space-y-2 mt-4">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-slate-600 truncate flex-1">{item.name}</span>
            <span className="text-sm text-slate-500">{item.value} cmd</span>
            <span className="text-sm font-semibold text-slate-800">{item.percent}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
