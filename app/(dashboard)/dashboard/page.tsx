'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, TravelDocumentResponse, ServiceReservationResponse } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  Download,
  ShoppingCart,
  Activity,
  Loader2,
  TrendingUp,
  Zap,
  Plane,
  Car,
  Package,
  ChevronRight,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { SpendingByService, TopTravelers } from "@/components/dashboard/BusinessInsights";
import ServiceUsageChart from "@/components/dashboard/ServiceUsageChart";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";

const SERVICE_LABELS: Record<string, string> = {
  airport_shuttle: 'Navette Aéroport',
  inter_city: 'Inter-villes',
  intercity: 'Inter-villes',
  vtc_hourly: 'VTC à l\'heure',
  travel_document: 'Document de voyage',
  flight_reservation: 'Navette Aéroport',
  hotel_reservation: 'Logement',
  flight_and_hotel: 'Vol + Hôtel',
  CIRCUIT: 'Circuit touristique',
  LOGEMENT: 'Logement',
  FLOTTE: 'Location véhicule',
};

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
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("30d");

  const { data: bookingDashRaw, isLoading: loadingBookings } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.bookings.dashboard(),
  });
  const bookingDash: RealDashboardData | undefined =
    (bookingDashRaw?.data as unknown as RealDashboardData) || undefined;

  const { data: travelDashRaw, isLoading: loadingTravel } = useQuery({
    queryKey: ['travel-docs-dashboard'],
    queryFn: () => api.travelDocuments.dashboard(),
  });
  const travelDash: RealDashboardData | undefined =
    (travelDashRaw?.data as unknown as RealDashboardData) || undefined;

  const { data: bookingsResponse } = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: () => api.bookings.list(1, 10),
  });
  const recentBookings = bookingsResponse?.data?.items || [];

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

  const { data: serviceResResponse, isLoading: loadingServiceRes } = useQuery({
    queryKey: ['service-reservations-recent'],
    queryFn: () => api.serviceReservations.list(1, 10),
  });
  const serviceResRaw = serviceResResponse?.data as Record<string, unknown> | undefined;
  const serviceResPayload = (serviceResRaw?.data ?? serviceResRaw) as Record<string, unknown> | undefined;
  const recentServiceRes: ServiceReservationResponse[] = (() => {
    if (Array.isArray(serviceResPayload?.list)) return serviceResPayload.list as ServiceReservationResponse[];
    if (Array.isArray(serviceResPayload?.items)) return serviceResPayload.items as ServiceReservationResponse[];
    if (Array.isArray(serviceResPayload)) return serviceResPayload as unknown as ServiceReservationResponse[];
    return [];
  })();

  const isLoading = loadingBookings || loadingTravel || loadingServiceRes;

  // ==================== COMPUTED DATA ====================
  const bkOrders = bookingDash?.kpis?.monthlyOrders || bookingDash?.summary?.monthlyOrders || 0;
  const bkExpenses = bookingDash?.kpis?.monthlyExpenses || 0;
  const bkInProgress = bookingDash?.summary?.ordersInProgress || bookingDash?.summary?.activeOperations || 0;
  const bkExpensesChange = bookingDash?.kpis?.expensesChange;
  const bkTopService = bookingDash?.kpis?.topService;

  const tdOrders = travelDash?.kpis?.monthlyOrders || travelDash?.summary?.monthlyOrders || 0;
  const tdExpenses = travelDash?.kpis?.monthlyExpenses || 0;
  const tdInProgress = travelDash?.summary?.ordersInProgress || travelDash?.summary?.activeOperations || 0;

  const grandTotalOrders = bkOrders + tdOrders;
  const grandTotalSpent = bkExpenses + tdExpenses;
  const grandActiveOps = bkInProgress + tdInProgress;

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
  for (const sr of recentServiceRes) {
    const key = sr.serviceType || 'ACTIVITE';
    if (!serviceMap[key]) serviceMap[key] = { count: 0, total: 0 };
    serviceMap[key].count += 1;
    serviceMap[key].total += Number(sr.totalPrice || 0);
  }

  const topServiceEntry = Object.entries(serviceMap).sort((a, b) => b[1].count - a[1].count)[0];
  const topServiceLabel = topServiceEntry
    ? SERVICE_LABELS[topServiceEntry[0]] || topServiceEntry[0].replace(/_/g, ' ')
    : bkTopService
    ? SERVICE_LABELS[bkTopService.name] || bkTopService.name.replace(/_/g, ' ')
    : '—';
  const topServiceCount = topServiceEntry?.[1]?.count || bkTopService?.count || 0;

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

  const travelDocOrders = recentTravelDocs.map(td => {
    const raw = td as Record<string, unknown>;
    const docType = raw.flightReservation && raw.hotelReservation
      ? 'flight_and_hotel'
      : raw.flightReservation
        ? 'flight_reservation'
        : raw.hotelReservation
          ? 'hotel_reservation'
          : 'travel_document';
    return {
      id: `td-${td.id}`,
      created_date: td.createdAt || '',
      final_cost: (raw.totalPrice as number) || (raw.amount as number) || 0,
      estimated_cost: (raw.totalPrice as number) || (raw.amount as number) || 0,
      service_category: docType,
      service_type: docType,
      status: td.status || 'pending',
      departure_address: '',
      arrival_address: '',
      beneficiary_name: [td.firstName, td.lastName].filter(Boolean).join(' ') || (raw.clientName as string) || '-',
    };
  });

  const serviceResOrders = recentServiceRes.map(sr => ({
    id: `sr-${sr.id}`,
    created_date: sr.createdAt || '',
    final_cost: Number(sr.totalPrice || 0),
    estimated_cost: Number(sr.totalPrice || 0),
    service_category: sr.serviceType || 'ACTIVITE',
    service_type: sr.serviceType || 'ACTIVITE',
    status: sr.status || 'pending',
    departure_address: '',
    arrival_address: '',
    beneficiary_name: sr.clientName || '-',
  }));

  const orders = [...bookingOrders, ...travelDocOrders, ...serviceResOrders].sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  );

  // ==================== RENDER ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F] mx-auto mb-4" />
          <p className="text-slate-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Depenses ce mois",
      value: `${grandTotalSpent.toLocaleString("fr-FR")} FCFA`,
      icon: Wallet,
      iconBg: "bg-orange-50",
      iconColor: "text-[#E04A1F]",
      trend:
        bkExpensesChange != null
          ? {
              value: `${bkExpensesChange >= 0 ? "+" : ""}${bkExpensesChange.toFixed(1)}%`,
              up: bkExpensesChange >= 0,
            }
          : null,
    },
    {
      label: "Commandes ce mois",
      value: grandTotalOrders.toString(),
      icon: ShoppingCart,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      trend: { value: "En cours", up: true, neutral: true },
    },
    {
      label: "Operations actives",
      value: grandActiveOps.toString(),
      icon: Activity,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: null,
    },
    {
      label: "Service principal",
      value: topServiceLabel,
      sub: topServiceCount > 0 ? `${topServiceCount} commandes` : "Aucune donnee",
      icon: Zap,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      trend: null,
    },
  ];

  const quickActions = [
    {
      label: "Reserver Navette",
      desc: "Trajet groupe d'entreprise",
      icon: Plane,
      iconBg: "bg-orange-50",
      iconColor: "text-[#E04A1F]",
      href: "/airport-shuttle",
    },
    {
      label: "Commander VTC",
      desc: "Service premium individuel",
      icon: Car,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/hourly-vtc",
    },
    {
      label: "Envoyer un Colis",
      desc: "Livraison express locale",
      icon: Package,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      href: "/deliveries",
    },
    {
      label: "Inter-villes",
      desc: "Trajet longue distance",
      icon: Car,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/inter-city",
    },
  ];

  return (
    <div className="space-y-8 -m-2 md:-m-4 lg:-m-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Tableau de bord
          </motion.h1>
          <p className="text-[#585e6c] font-medium mt-1">
            Aperçu en temps reel de votre activite — {format(new Date(), "MMMM yyyy", { locale: fr })}.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-[#f0f4f8] p-1 rounded-xl">
            {[
              { id: "today", label: "Aujourd'hui" },
              { id: "7d", label: "7 Jours" },
              { id: "30d", label: "30 Jours" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as typeof period)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  period === p.id
                    ? "bg-white shadow-sm text-[#171c1f]"
                    : "text-[#585e6c] hover:text-[#171c1f]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href="/reports">
            <button className="px-5 py-2.5 bg-[#E04A1F] text-white font-bold rounded-xl shadow-lg shadow-[#E04A1F]/20 flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" />
              Rapport DG
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-[1.5rem] shadow-[0_8px_24px_rgba(23,28,31,0.02)] flex flex-col justify-between min-h-[160px] group hover:shadow-lg transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 ${s.iconBg} ${s.iconColor} rounded-xl group-hover:scale-110 transition-transform`}>
                <s.icon className="w-5 h-5" />
              </div>
              {s.trend && (
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    s.trend.neutral
                      ? "text-blue-600 bg-blue-50"
                      : s.trend.up
                      ? "text-emerald-600 bg-emerald-50"
                      : "text-red-600 bg-red-50"
                  }`}
                >
                  {!s.trend.neutral && (
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                  )}
                  {s.trend.value}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[#585e6c]">{s.label}</p>
              <h3
                className="text-2xl font-extrabold text-[#171c1f] mt-1 truncate"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                title={s.value}
              >
                {s.value}
              </h3>
              {s.sub && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{s.sub}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Layout Grid — 2 rangées équilibrées */}
      <div className="grid grid-cols-12 gap-6">

        {/* Rangée 1 : Actions rapides (gauche) | Dépenses par service (droite) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-[2rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)] p-6 md:p-8 h-full">
            <h4 className="text-sm font-bold text-[#585e6c] uppercase tracking-widest mb-5">
              Actions rapides
            </h4>
            <div className="space-y-3">
              {quickActions.map((a) => (
                <Link key={a.label} href={a.href}>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-orange-50 rounded-2xl border border-transparent hover:border-orange-200 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${a.iconBg} ${a.iconColor} flex items-center justify-center`}>
                        <a.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[#171c1f] group-hover:text-[#E04A1F]">
                          {a.label}
                        </p>
                        <p className="text-xs text-[#585e6c]">{a.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#E04A1F] transition-transform group-hover:translate-x-1" />
                  </motion.button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <SpendingByService serviceDistribution={serviceMap} />
        </div>

        {/* Rangée 2 : Top voyageurs (gauche) | Services utilisés (droite) */}
        <div className="col-span-12 lg:col-span-8">
          <TopTravelers orders={orders} />
        </div>

        <div className="col-span-12 lg:col-span-4">
          <ServiceUsageChart serviceDistribution={serviceMap} />
        </div>

      </div>

      {/* Recent Activity */}
      <section className="bg-[#f0f4f8] p-6 md:p-8 rounded-[2rem]">
        <div className="flex justify-between items-center mb-6">
          <h3
            className="text-xl font-bold text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Historique des trajets
          </h3>
          <Link
            href="/tracking"
            className="text-sm font-bold text-[#E04A1F] hover:underline flex items-center gap-1"
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 5).length === 0 ? (
            <p className="text-slate-400 italic text-center py-6">
              Aucune activite recente
            </p>
          ) : (
            orders.slice(0, 5).map((o) => {
              const status = (o.status || "").toLowerCase();
              const statusPill = status.includes("complet") || status === "paid" || status === "termine"
                ? "bg-[#ffdbd0] text-[#3a0a00]"
                : status.includes("pend") || status.includes("attente")
                ? "bg-[#dde2f3] text-[#414754]"
                : status.includes("cancel") || status.includes("annul")
                ? "bg-[#ffdad6] text-[#93000a]"
                : "bg-[#dfe3e7] text-[#171c1f]";
              const statusLabel = status.includes("complet") || status === "paid" || status === "termine"
                ? "Termine"
                : status.includes("pend") || status.includes("attente")
                ? "En attente"
                : status.includes("cancel") || status.includes("annul")
                ? "Annule"
                : (o.status || "—");
              const serviceLabel = SERVICE_LABELS[o.service_type] || o.service_type.replace(/_/g, " ") || "Service";
              return (
                <div
                  key={o.id}
                  className="grid grid-cols-12 items-center p-4 bg-white rounded-2xl hover:bg-orange-50/30 transition-colors group gap-2"
                >
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#E04A1F] group-hover:bg-white transition-colors">
                      <Car className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="col-span-10 sm:col-span-4 sm:pl-4 min-w-0">
                    <p className="font-bold text-[#171c1f] truncate">{serviceLabel}</p>
                    <p className="text-xs text-[#585e6c] truncate">
                      ID: {o.id} {o.beneficiary_name && o.beneficiary_name !== "-" && `• ${o.beneficiary_name}`}
                    </p>
                  </div>
                  <div className="col-span-6 sm:col-span-3 min-w-0">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {o.created_date
                        ? format(new Date(o.created_date), "dd MMM • HH:mm", { locale: fr })
                        : "—"}
                    </p>
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex justify-start">
                    <span className={`px-3 py-1 ${statusPill} text-[10px] font-black uppercase tracking-wider rounded-full whitespace-nowrap`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <p
                      className="font-black text-[#171c1f]"
                      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                    >
                      {(o.final_cost || 0).toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Activity Timeline (compact alt view) */}
      <ActivityTimeline activities={orders.slice(0, 5)} />
    </div>
  );
}
