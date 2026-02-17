'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Wallet,
  ArrowRight,
  Sparkles,
  Download,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

import KPICard from "@/components/dashboard/KPICard";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import LiveMap from "@/components/dashboard/LiveMap";
import ServiceUsageChart from "@/components/dashboard/ServiceUsageChart";

interface Order {
  id: string;
  created_date: string;
  final_cost?: number;
  estimated_cost?: number;
  service_category: string;
  status: string;
  departure_address?: string;
  arrival_address?: string;
  beneficiary_name?: string;
}

interface ServiceCounts {
  [key: string]: number;
}

export default function Dashboard() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  // Calculate KPIs
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthOrders = orders.filter((o: Order) => {
    const d = new Date(o.created_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthOrders = orders.filter((o: Order) => {
    const d = new Date(o.created_date);
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === lastMonth && d.getFullYear() === year;
  });

  const thisMonthSpending = thisMonthOrders.reduce((sum: number, o: Order) => sum + (o.final_cost || o.estimated_cost || 0), 0);
  const lastMonthSpending = lastMonthOrders.reduce((sum: number, o: Order) => sum + (o.final_cost || o.estimated_cost || 0), 0);

  const spendingTrend = lastMonthSpending > 0
    ? ((thisMonthSpending - lastMonthSpending) / lastMonthSpending * 100).toFixed(1)
    : 0;

  const ordersTrend = lastMonthOrders.length > 0
    ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length * 100).toFixed(1)
    : 0;

  // Most used service
  const serviceCounts: ServiceCounts = thisMonthOrders.reduce((acc: ServiceCounts, o: Order) => {
    acc[o.service_category] = (acc[o.service_category] || 0) + 1;
    return acc;
  }, {});
  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

  const avgDeliveryTime = 32; // Placeholder - would calculate from actual data

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-slate-800"
          >
            Bonjour 👋
          </motion.h1>
          <p className="text-slate-500 mt-1">
            Voici le resume de vos operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Rapport DG
          </Button>
        </div>
      </div>

      {/* Smart notification banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full transform translate-x-20 -translate-y-20" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/20">
            <Sparkles className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium">
              Votre entreprise a effectue {thisMonthOrders.length} commandes ce mois-ci
              {topService && `, dont ${topService[1]} en ${topService[0]}`}
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              Delai moyen de livraison : {avgDeliveryTime} min
            </p>
          </div>
          <Button variant="secondary" size="sm" className="whitespace-nowrap">
            Voir les details
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Depenses du mois"
          value={`${thisMonthSpending.toLocaleString()} FCFA`}
          subtitle="vs mois dernier"
          icon={Wallet}
          trend={Number(spendingTrend) <= 0 ? "down" : "up"}
          trendValue={`${Math.abs(Number(spendingTrend))}%`}
          gradient
          delay={0}
        />
        <KPICard
          title="Commandes"
          value={thisMonthOrders.length}
          subtitle="ce mois-ci"
          icon={ShoppingCart}
          trend={Number(ordersTrend) >= 0 ? "up" : "down"}
          trendValue={`${Math.abs(Number(ordersTrend))}%`}
          delay={0.1}
        />
        <KPICard
          title="Service le plus utilise"
          value={topService ? topService[0].charAt(0).toUpperCase() + topService[0].slice(1) : "—"}
          subtitle={topService ? `${topService[1]} commandes` : "Aucune donnee"}
          icon={Zap}
          delay={0.2}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Map */}
        <div className="lg:col-span-2">
          <LiveMap orders={orders} />
        </div>

        {/* Right column - Chart */}
        <div>
          <ServiceUsageChart orders={thisMonthOrders} />
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimeline activities={orders.slice(0, 5)} />

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Navette Aeroport", icon: "✈️", href: "/airport-shuttle" },
              { label: "Inter-villes", icon: "🚗", href: "/inter-city" },
              { label: "Carburant", icon: "⛽", href: "/fuel-management" },
              { label: "Flotte", icon: "🚙", href: "/fleet" },
            ].map((action, index) => (
              <Link key={action.label} href={action.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 transition-all cursor-pointer group"
                >
                  <span className="text-2xl">{action.icon}</span>
                  <p className="font-medium text-slate-700 mt-2 group-hover:text-subito transition-colors">
                    {action.label}
                  </p>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-subito mt-1 transition-colors" />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
