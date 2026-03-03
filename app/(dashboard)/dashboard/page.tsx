'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, DashboardData, TravelDocumentResponse } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Wallet,
  ArrowRight,
  Sparkles,
  Download,
  Zap,
  Plane,
  TrendingUp,
  TrendingDown,
  Loader2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import KPICard from "@/components/dashboard/KPICard";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import LiveMap from "@/components/dashboard/LiveMap";
import ServiceUsageChart from "@/components/dashboard/ServiceUsageChart";

const SERVICE_LABELS: Record<string, string> = {
  airport_shuttle: 'Navette Aéroport',
  inter_city: 'Inter-villes',
  intercity: 'Inter-villes',
  vtc_hourly: 'VTC à l\'heure',
  visa_assistance: 'Visa / Assistance',
  travel_document: 'Document de voyage',
  flight_reservation: 'Réservation vol',
  hotel_reservation: 'Réservation hôtel',
  flight_and_hotel: 'Vol + Hôtel',
  CIRCUIT: 'Circuit touristique',
  LOGEMENT: 'Logement',
  FLOTTE: 'Location véhicule',
};

// Both dashboard endpoints return the same structure
interface RealDashboardData {
  summary?: {
    monthlyOrders?: number;
    ordersInProgress?: number;
    activeOperations?: number;
  };
  kpis?: {
    monthlyExpenses?: number;
    previousMonthExpenses?: number;
    expensesChange?: number;
    monthlyOrders?: number;
    previousMonthOrders?: number;
    ordersChange?: number;
    topService?: { name: string; count: number };
  };
  servicesDistribution?: { service: string; count: number; total: number }[];
}

export default function Dashboard() {
  // 1. Booking dashboard
  const { data: bookingDashRaw, isLoading: loadingBookings } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.bookings.dashboard(),
  });

  // API returns { message, status, data: { summary, kpis, servicesDistribution } }
  const bookingDash: RealDashboardData | undefined = (bookingDashRaw?.data as unknown as RealDashboardData) || undefined;

  // 2. Travel docs dashboard
  const { data: travelDashRaw, isLoading: loadingTravel } = useQuery({
    queryKey: ['travel-docs-dashboard'],
    queryFn: () => api.travelDocuments.dashboard(),
  });

  const travelDash: RealDashboardData | undefined = (travelDashRaw?.data as unknown as RealDashboardData) || undefined;

  // 3. Recent bookings
  const { data: bookingsResponse } = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: () => api.bookings.list(1, 10),
  });
  const recentBookings = bookingsResponse?.data?.items || [];

  // 4. Recent travel documents
  const { data: travelDocsResponse } = useQuery({
    queryKey: ['travel-docs-recent'],
    queryFn: () => api.travelDocuments.list({ page: 1, limit: 10 }),
  });
  const travelDocsRaw = travelDocsResponse?.data;
  const travelDocsData = (travelDocsRaw as unknown as Record<string, unknown>)?.data || travelDocsRaw;
  const recentTravelDocs: TravelDocumentResponse[] = Array.isArray(travelDocsData)
    ? travelDocsData
    : (travelDocsData as Record<string, unknown>)?.items as TravelDocumentResponse[]
      || (travelDocsData as Record<string, unknown>)?.list as TravelDocumentResponse[]
      || [];

  const isLoading = loadingBookings || loadingTravel;

  // ==================== COMPUTED DATA ====================

  // Bookings KPIs (from { summary, kpis, servicesDistribution })
  const bkOrders = bookingDash?.kpis?.monthlyOrders || bookingDash?.summary?.monthlyOrders || 0;
  const bkExpenses = bookingDash?.kpis?.monthlyExpenses || 0;
  const bkInProgress = bookingDash?.summary?.ordersInProgress || bookingDash?.summary?.activeOperations || 0;
  const bkExpensesChange = bookingDash?.kpis?.expensesChange;
  const bkTopService = bookingDash?.kpis?.topService;

  // Travel docs KPIs (same structure)
  const tdOrders = travelDash?.kpis?.monthlyOrders || travelDash?.summary?.monthlyOrders || 0;
  const tdExpenses = travelDash?.kpis?.monthlyExpenses || 0;
  const tdInProgress = travelDash?.summary?.ordersInProgress || travelDash?.summary?.activeOperations || 0;

  // Combined totals
  const grandTotalOrders = bkOrders + tdOrders;
  const grandTotalSpent = bkExpenses + tdExpenses;
  const grandActiveOps = bkInProgress + tdInProgress;

  // Merge servicesDistribution from both
  const serviceMap: Record<string, { count: number; total: number }> = {};
  for (const item of bookingDash?.servicesDistribution || []) {
    const key = item.service;
    if (!serviceMap[key]) serviceMap[key] = { count: 0, total: 0 };
    serviceMap[key].count += item.count;
    serviceMap[key].total += item.total;
  }
  for (const item of travelDash?.servicesDistribution || []) {
    const key = item.service;
    if (!serviceMap[key]) serviceMap[key] = { count: 0, total: 0 };
    serviceMap[key].count += item.count;
    serviceMap[key].total += item.total;
  }

  // Most used service (by count)
  const topServiceEntry = Object.entries(serviceMap).sort((a, b) => b[1].count - a[1].count)[0];
  const topServiceLabel = topServiceEntry
    ? SERVICE_LABELS[topServiceEntry[0]] || topServiceEntry[0].replace(/_/g, ' ')
    : bkTopService
    ? SERVICE_LABELS[bkTopService.name] || bkTopService.name.replace(/_/g, ' ')
    : '—';
  const topServiceCount = topServiceEntry?.[1]?.count || bkTopService?.count || 0;

  // Build orders for ActivityTimeline, LiveMap, ServiceUsageChart
  const bookingOrders = recentBookings.map(b => ({
    id: String(b.id),
    created_date: b.createdAt || '',
    final_cost: b.totalPrice || 0,
    estimated_cost: b.totalPrice || 0,
    service_category: b.serviceType || '',
    service_type: b.serviceType || '',
    status: b.status || '',
    departure_address: '',
    arrival_address: '',
    beneficiary_name: b.clientName || '',
  }));

  const travelDocOrders = recentTravelDocs.map(td => ({
    id: `td-${td.id}`,
    created_date: td.createdAt || '',
    final_cost: (td as Record<string, unknown>).totalPrice as number || (td as Record<string, unknown>).amount as number || 0,
    estimated_cost: (td as Record<string, unknown>).totalPrice as number || (td as Record<string, unknown>).amount as number || 0,
    service_category: 'visa_assistance',
    service_type: 'visa_assistance',
    status: td.status || 'pending',
    departure_address: '',
    arrival_address: '',
    beneficiary_name: [td.firstName, td.lastName].filter(Boolean).join(' ') || (td as Record<string, unknown>).clientName as string || '-',
  }));

  const orders = [...bookingOrders, ...travelDocOrders].sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  );

  // ==================== RENDER ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

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
            Tableau de bord
          </motion.h1>
          <p className="text-slate-500 mt-1">
            Vue d&apos;ensemble de vos opérations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Rapport DG
            </Button>
          </Link>
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
              {grandTotalOrders} commande{grandTotalOrders > 1 ? 's' : ''} ce mois
              {topServiceLabel !== '—' && ` — service principal : ${topServiceLabel} (${topServiceCount})`}
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              {grandActiveOps} opération{grandActiveOps > 1 ? 's' : ''} en cours
              {grandTotalSpent > 0 && ` • ${grandTotalSpent.toLocaleString()} FCFA de dépenses`}
            </p>
          </div>
          <Link href="/tracking">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              Voir les détails
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Dépenses ce mois"
          value={`${grandTotalSpent.toLocaleString()} FCFA`}
          subtitle={`${bkExpenses.toLocaleString()} résa + ${tdExpenses.toLocaleString()} docs`}
          icon={Wallet}
          gradient
          delay={0}
          trend={bkExpensesChange != null ? (bkExpensesChange >= 0 ? 'up' : 'down') : undefined}
          trendValue={bkExpensesChange != null ? `${Math.abs(bkExpensesChange)}%` : undefined}
        />
        <KPICard
          title="Commandes ce mois"
          value={grandTotalOrders}
          subtitle={`${bkOrders} résa + ${tdOrders} docs voyage`}
          icon={ShoppingCart}
          delay={0.1}
        />
        <KPICard
          title="Opérations en cours"
          value={grandActiveOps}
          subtitle={`${bkInProgress} résa + ${tdInProgress} docs`}
          icon={Activity}
          delay={0.2}
        />
        <KPICard
          title="Service principal"
          value={topServiceLabel}
          subtitle={topServiceCount > 0 ? `${topServiceCount} commandes` : 'Aucune donnée'}
          icon={Zap}
          delay={0.3}
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
          <ServiceUsageChart orders={orders} />
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
              { label: "Navette Aéroport", icon: "✈️", href: "/airport-shuttle" },
              { label: "Inter-villes", icon: "🚗", href: "/inter-city" },
              { label: "VTC Horaire", icon: "🕐", href: "/hourly-vtc" },
              { label: "Documents Voyage", icon: "📄", href: "/travel-documents" },
              { label: "Reservations Services", icon: "🗺️", href: "/service-reservations" },
            ].map((action) => (
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
