'use client';

import { motion } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";

interface Order {
  id: string;
  final_cost: number;
  service_type: string;
  beneficiary_name: string;
}

const SERVICE_LABELS: Record<string, string> = {
  airport_shuttle: 'Navette Aéroport',
  inter_city: 'Inter-villes',
  intercity: 'Inter-villes',
  vtc_hourly: "VTC à l'heure",
  travel_document: 'Document de voyage',
  flight_reservation: 'Navette Aéroport',
  hotel_reservation: 'Logement',
  flight_and_hotel: 'Vol + Hôtel',
  transport: 'Transport',
  livraison: 'Livraison',
  CIRCUIT: 'Circuit touristique',
  LOGEMENT: 'Logement',
  FLOTTE: 'Location véhicule',
};

const COLORS = ['#E04A1F', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

// ── Dépenses par service ──────────────────────────────────────────────────────

interface SpendingByServiceProps {
  serviceDistribution?: Record<string, { count: number; total: number }>;
}

export function SpendingByService({ serviceDistribution = {} }: SpendingByServiceProps) {
  const entries = Object.entries(serviceDistribution)
    .map(([key, v]) => ({
      name: SERVICE_LABELS[key] || key.replace(/_/g, ' '),
      total: v.total,
      count: v.count,
    }))
    .filter(e => e.total > 0 || e.count > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const maxTotal = Math.max(...entries.map(e => e.total), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-[2rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)] p-6 md:p-8 h-full"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#E04A1F]" />
        </div>
        <h3
          className="text-base font-bold text-[#171c1f]"
          style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
        >
          Dépenses par service
        </h3>
      </div>

      {entries.length === 0 ? (
        <p className="text-slate-400 text-sm italic py-6 text-center">Aucune donnée disponible</p>
      ) : (
        <div className="space-y-5">
          {entries.map((entry, i) => (
            <div key={entry.name}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-[#585e6c] truncate max-w-[55%]">
                  {entry.name}
                </span>
                <span className="text-sm font-extrabold text-[#171c1f] shrink-0 ml-2">
                  {entry.total.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(entry.total / maxTotal) * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {entry.count} commande{entry.count > 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Top voyageurs ─────────────────────────────────────────────────────────────

interface TopTravelersProps {
  orders: Order[];
}

export function TopTravelers({ orders }: TopTravelersProps) {
  const travelerMap: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    const name = o.beneficiary_name && o.beneficiary_name !== '-' ? o.beneficiary_name : null;
    if (!name) continue;
    if (!travelerMap[name]) travelerMap[name] = { count: 0, total: 0 };
    travelerMap[name].count += 1;
    travelerMap[name].total += Number(o.final_cost) || 0;
  }
  const topTravelers = Object.entries(travelerMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-[2rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)] p-6 md:p-8 h-full"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <h3
          className="text-base font-bold text-[#171c1f]"
          style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
        >
          Top voyageurs
        </h3>
      </div>

      {topTravelers.length === 0 ? (
        <p className="text-slate-400 text-sm italic py-6 text-center">Aucun voyageur identifié</p>
      ) : (
        <div className="space-y-3">
          {topTravelers.map(([name, data], i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-[#585e6c]">
                  {name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#171c1f] truncate">{name}</p>
                <p className="text-xs text-slate-400">
                  {data.count} trajet{data.count > 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-sm font-extrabold text-[#171c1f] shrink-0">
                {data.total > 0 ? `${data.total.toLocaleString('fr-FR')} FCFA` : '—'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
