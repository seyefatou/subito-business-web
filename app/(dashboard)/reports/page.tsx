'use client';

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, BookingStatsData, DashboardData } from "@/lib/api";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  Package,
  Wallet,
  Building2,
  FileText,
  FileDown,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const COLORS = ['#FF6B35', '#FF8B6A', '#FFB59A', '#94a3b8', '#64748b', '#475569'];

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
};

function extractData<T>(response: unknown): T | null {
  if (!response) return null;
  const r = response as Record<string, unknown>;
  const payload = r.data ?? r;
  return (payload as Record<string, unknown>)?.data
    ? (payload as Record<string, unknown>).data as T
    : payload as T;
}

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const now = new Date();

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    if (customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    let s: Date, e: Date;
    if (period === "month") {
      s = startOfMonth(now);
      e = endOfMonth(now);
    } else if (period === "quarter") {
      s = startOfMonth(subMonths(now, 2));
      e = endOfMonth(now);
    } else {
      s = startOfMonth(subMonths(now, 11));
      e = endOfMonth(now);
    }
    return {
      startDate: format(s, 'yyyy-MM-dd'),
      endDate: format(e, 'yyyy-MM-dd'),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  // ==================== API CALLS ====================

  // 1. Booking stats (filtered by period) — primary data source for reports
  const { data: bookingStatsRaw, isLoading: loadingBookingStats } = useQuery({
    queryKey: ['booking-stats', startDate, endDate],
    queryFn: () => api.bookings.stats(startDate, endDate),
  });
  const bookingStats = extractData<BookingStatsData>(bookingStatsRaw);

  // 2. Booking dashboard (global KPIs)
  const { data: bookingDashRaw } = useQuery({
    queryKey: ['booking-dashboard'],
    queryFn: () => api.bookings.dashboard(),
  });
  const bookingDash = extractData<DashboardData>(bookingDashRaw);

  const isLoading = loadingBookingStats;

  // ==================== COMPUTED DATA ====================

  // KPIs — from bookings/compagny/stats
  const kpis = bookingStats?.kpis;
  const totalBookings = kpis?.totalOrders ?? bookingStats?.totalBookings ?? 0;
  const totalRevenue = kpis?.totalExpenses ?? bookingStats?.totalRevenue ?? 0;
  const avgPrice = kpis?.averageValue ?? bookingStats?.averagePrice ?? (totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0);
  const completionRate = kpis?.completionRate ?? 0;

  // By status (from booking stats)
  const byStatus = bookingStats?.byStatus || {};

  // By service — from bookingStats.expensesByCategory or fallback to bookingDash.byService
  const byServiceData = useMemo(() => {
    const map: Record<string, number> = {};

    if (bookingStats?.expensesByCategory?.length) {
      for (const item of bookingStats.expensesByCategory) {
        const label = SERVICE_LABELS[item.category] || item.category?.replace(/_/g, ' ') || 'Autre';
        map[label] = (map[label] || 0) + Number(item.total);
      }
    } else if (bookingDash?.byService) {
      Object.entries(bookingDash.byService).forEach(([key, val]) => {
        const label = SERVICE_LABELS[key] || key.replace(/_/g, ' ');
        map[label] = (map[label] || 0) + val;
      });
    }

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookingStats, bookingDash]);

  // By department (from bookingStats.expensesByDepartment)
  const byDeptData = useMemo(() => {
    if (!bookingStats?.expensesByDepartment?.length) return [];
    return bookingStats.expensesByDepartment
      .map(d => ({ name: d.departmentName || 'Sans département', value: Number(d.total) }))
      .sort((a, b) => b.value - a.value);
  }, [bookingStats]);

  // Monthly evolution (from bookingStats.monthlyEvolution)
  const monthlyData = useMemo(() => {
    if (!bookingStats?.monthlyEvolution?.length) {
      // Fallback: generate empty months
      const data = [];
      for (let i = 5; i >= 0; i--) {
        data.push({
          month: format(subMonths(now, i), 'MMM', { locale: fr }),
          total: 0,
        });
      }
      return data;
    }
    return bookingStats.monthlyEvolution.map(m => ({
      month: m.label || m.month,
      total: Number(m.total) / 1000, // in thousands for readability
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingStats]);

  // ==================== EXPORTS ====================

  const handleExportCSV = () => {
    const headers = ['Indicateur', 'Valeur'];
    const rows = [
      ['Total commandes', String(totalBookings)],
      ['Revenus total (FCFA)', String(totalRevenue)],
      ['Prix moyen (FCFA)', String(avgPrice)],
      ['Taux de complétion (%)', String(completionRate)],
      ['', ''],
      ['--- Par statut ---', ''],
      ...Object.entries(byStatus).map(([k, v]) => [k, String(v)]),
      ['', ''],
      ['--- Par service ---', ''],
      ...byServiceData.map(s => [s.name, String(s.value)]),
      ['', ''],
      ['--- Par département ---', ''],
      ...byDeptData.map(d => [d.name, String(d.value)]),
    ];

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-subito-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport CSV téléchargé');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('RAPPORT SUBITO BUSINESS', 20, 20);

    doc.setFontSize(10);
    doc.text(`Généré le ${format(now, 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 20, 30);
    doc.text(`Période: ${format(new Date(startDate), 'dd/MM/yyyy')} — ${format(new Date(endDate), 'dd/MM/yyyy')}`, 20, 36);

    doc.setFontSize(14);
    doc.text('RÉSUMÉ', 20, 50);
    doc.setFontSize(10);
    doc.text(`Dépenses totales: ${totalRevenue.toLocaleString()} FCFA`, 20, 60);
    doc.text(`Nombre de commandes: ${totalBookings}`, 20, 66);
    doc.text(`Prix moyen: ${avgPrice.toLocaleString()} FCFA`, 20, 72);
    doc.text(`Taux de complétion: ${completionRate}%`, 20, 78);

    doc.setFontSize(14);
    doc.text('PAR STATUT', 20, 94);
    doc.setFontSize(10);
    let y = 104;
    Object.entries(byStatus).forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 25, y);
      y += 6;
    });

    doc.setFontSize(14);
    doc.text('PAR SERVICE', 20, y + 10);
    doc.setFontSize(10);
    y += 20;
    byServiceData.slice(0, 8).forEach(s => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${s.name}: ${s.value.toLocaleString()} FCFA`, 25, y);
      y += 6;
    });

    doc.setFontSize(14);
    doc.text('PAR DÉPARTEMENT', 20, y + 10);
    doc.setFontSize(10);
    y += 20;
    byDeptData.slice(0, 10).forEach(d => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${d.name}: ${d.value.toLocaleString()} FCFA`, 25, y);
      y += 6;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i}/${pageCount}`, 180, 285);
      doc.text('Subito Business — Confidentiel', 20, 285);
    }

    doc.save(`rapport-subito-${format(now, 'yyyy-MM-dd')}.pdf`);
    toast.success('Rapport PDF téléchargé');
  };

  // ==================== RENDER ====================

  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    completed: 'Terminé',
    cancelled: 'Annulé',
    in_progress: 'En cours',
  };

  const kpiItems = [
    { label: "Dépenses totales", value: `${totalRevenue.toLocaleString()} FCFA`, icon: Wallet, color: "from-orange-500 to-red-500" },
    { label: "Commandes", value: totalBookings, icon: Package, color: "from-blue-500 to-indigo-500" },
    { label: "Taux de complétion", value: `${completionRate}%`, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { label: "Valeur moyenne", value: `${avgPrice.toLocaleString()} FCFA`, icon: FileText, color: "from-purple-500 to-pink-500" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Rapports & Analyses</h1>
            <p className="text-slate-500 mt-1">
              Statistiques du {format(new Date(startDate), 'dd MMM', { locale: fr })} au {format(new Date(endDate), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={(v) => { setPeriod(v); setCustomStart(""); setCustomEnd(""); }}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <FileDown className="w-4 h-4" />
            CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Custom date range */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="space-y-1 flex-1">
            <Label className="text-sm text-slate-600">Période personnalisée</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          {(customStart || customEnd) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCustomStart(""); setCustomEnd(""); }}
              className="text-slate-500"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.color}`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Status breakdown */}
      {Object.keys(byStatus).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Répartition par statut</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="text-center p-4 rounded-xl bg-slate-50">
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-sm text-slate-500 mt-1 capitalize">
                  {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">
            Évolution mensuelle <span className="text-sm font-normal text-slate-400">(en milliers FCFA)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()}k FCFA`, 'Dépenses']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#FF6B35"
                  strokeWidth={3}
                  dot={{ fill: '#FF6B35', strokeWidth: 2 }}
                  name="Dépenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* By service pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Dépenses par service</h3>
          {byServiceData.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Aucune donnée pour cette période</p>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byServiceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {byServiceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} FCFA`, '']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {byServiceData.slice(0, 6).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-slate-600 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* By department bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Dépenses par département</h3>
          {byDeptData.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Aucune donnée pour cette période</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDeptData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={120} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Dépenses']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#FF6B35" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">Rapport Direction Générale</h3>
            <p className="text-slate-400 mt-1">
              Synthèse — {format(new Date(startDate), 'dd MMM', { locale: fr })} au {format(new Date(endDate), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
          <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" />
            Télécharger
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Budget consommé</p>
            <p className="text-2xl font-bold mt-1">{totalRevenue.toLocaleString()} FCFA</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Volume de commandes</p>
            <p className="text-2xl font-bold mt-1">{totalBookings}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Service principal</p>
            <p className="text-2xl font-bold mt-1">{byServiceData[0]?.name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Valeur moyenne</p>
            <p className="text-2xl font-bold mt-1">{avgPrice.toLocaleString()} FCFA</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
