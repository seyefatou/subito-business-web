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
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

import KPICard from "@/components/dashboard/KPICard";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import LiveMap from "@/components/dashboard/LiveMap";
import ServiceUsageChart from "@/components/dashboard/ServiceUsageChart";

export default function Dashboard() {
  // Fetch bookings dashboard data
  const { data: dashboardResponse, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.bookings.dashboard(),
  });

  // Fetch travel documents dashboard data
  const { data: travelDocsDashResponse } = useQuery({
    queryKey: ['travel-docs-dashboard'],
    queryFn: () => api.travelDocuments.dashboard(),
  });

  const bookingsDash: DashboardData | undefined = dashboardResponse?.data;
  const travelDocsDash: DashboardData | undefined = travelDocsDashResponse?.data;

  // Merge stats from both sources
  const totalBookings = (bookingsDash?.totalBookings || 0) + (travelDocsDash?.totalBookings || 0);
  const activeBookings = (bookingsDash?.activeBookings || 0) + (travelDocsDash?.activeBookings || 0);
  const totalSpent = (bookingsDash?.totalSpent || 0) + (travelDocsDash?.totalSpent || 0);

  // Merge byService from both
  const byService: Record<string, number> = { ...(bookingsDash?.byService || {}) };
  if (travelDocsDash?.byService) {
    Object.entries(travelDocsDash.byService).forEach(([key, val]) => {
      byService[key] = (byService[key] || 0) + val;
    });
  }
  // Ensure travel docs appear even if not in byService
  if (travelDocsDash?.totalBookings && !byService['visa_assistance']) {
    byService['visa_assistance'] = travelDocsDash.totalBookings;
  }

  // Most used service
  const topService = Object.entries(byService).sort((a, b) => b[1] - a[1])[0];

  // Fetch recent bookings
  const { data: bookingsResponse } = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: () => api.bookings.list(1, 10),
  });
  const recentBookings = bookingsResponse?.data?.items || [];

  // Fetch recent travel documents
  const { data: travelDocsResponse } = useQuery({
    queryKey: ['travel-docs-recent'],
    queryFn: () => api.travelDocuments.list({ page: 1, limit: 10 }),
  });
  const travelDocsRaw = travelDocsResponse?.data;
  const travelDocsData = (travelDocsRaw as any)?.data || travelDocsRaw;
  const recentTravelDocs: TravelDocumentResponse[] = Array.isArray(travelDocsData)
    ? travelDocsData
    : (travelDocsData as any)?.items || (travelDocsData as any)?.list || [];

  // Map bookings to order-like format
  const bookingOrders = recentBookings.map(b => ({
    id: String(b.id),
    created_date: b.createdAt || '',
    final_cost: b.totalPrice || 0,
    estimated_cost: b.totalPrice || 0,
    service_category: b.serviceType || '',
    status: b.status || '',
    departure_address: '',
    arrival_address: '',
    beneficiary_name: b.clientName || '',
  }));

  // Map travel documents to same format
  const travelDocOrders = recentTravelDocs.map(td => ({
    id: `td-${td.id}`,
    created_date: td.createdAt || '',
    final_cost: (td as any).totalPrice || (td as any).amount || 0,
    estimated_cost: (td as any).totalPrice || (td as any).amount || 0,
    service_category: 'visa_assistance',
    status: td.status || 'pending',
    departure_address: '',
    arrival_address: '',
    beneficiary_name: [td.firstName, td.lastName].filter(Boolean).join(' ') || (td as any).clientName || '-',
  }));

  // Merge and sort by date
  const orders = [...bookingOrders, ...travelDocOrders].sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  );

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
              Votre entreprise a effectue {totalBookings} commandes
              {topService && `, dont ${topService[1]} en ${topService[0]}`}
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              {activeBookings} commande{activeBookings > 1 ? 's' : ''} en cours
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
          title="Depenses totales"
          value={`${totalSpent.toLocaleString()} FCFA`}
          subtitle="total"
          icon={Wallet}
          gradient
          delay={0}
        />
        <KPICard
          title="Commandes"
          value={totalBookings}
          subtitle={`dont ${activeBookings} en cours`}
          icon={ShoppingCart}
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
              { label: "Navette Aeroport", icon: "✈️", href: "/airport-shuttle" },
              { label: "Inter-villes", icon: "🚗", href: "/inter-city" },
              { label: "VTC Horaire", icon: "🕐", href: "/hourly-vtc" },
              { label: "Documents Voyage", icon: "📄", href: "/travel-documents" },
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
