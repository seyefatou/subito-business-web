'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface Order {
  id: string | number;
  service_category?: string;
}

interface ServiceUsageChartProps {
  orders?: Order[];
}

interface ChartDataItem {
  name: string;
  value: number;
}

const COLORS: string[] = ['#FF6B35', '#FF8B6A', '#FFB59A', '#FF7B7B', '#94a3b8', '#64748b'];

const serviceLabels: Record<string, string> = {
  airport_shuttle: "Navette Aeroport",
  inter_city: "Inter-ville",
  vtc_hourly: "VTC Horaire",
  visa_assistance: "Documents Voyage",
  transport: "Transport",
  livraison: "Livraison",
  assistance: "Assistance",
  carburant: "Carburant",
  flotte: "Location de vehicule",
  administratif: "Administratif",
};

export default function ServiceUsageChart({ orders = [] }: ServiceUsageChartProps) {
  // Aggregate by service category
  const categoryCount = orders.reduce<Record<string, number>>((acc, order) => {
    const cat = order.service_category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const data: ChartDataItem[] = Object.entries(categoryCount).map(([name, value]) => ({
    name: serviceLabels[name] || name,
    value
  })).sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Services utilisés</h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          <p>Aucune donnée disponible</p>
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
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Services utilisés</h3>

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
              {data.map((entry, index) => (
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
              formatter={(value: number) => [`${value} commandes`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-slate-600 truncate">{item.name}</span>
            <span className="text-sm font-semibold text-slate-800 ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
