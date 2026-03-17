'use client';

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, BookingStatsData, TravelDocStatsData, DashboardData, ServiceReservationResponse } from "@/lib/api";
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
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";

const COLORS = ['#FF6B35', '#FF8B6A', '#FFB59A', '#94a3b8', '#64748b', '#475569'];

const SERVICE_LABELS: Record<string, string> = {
  airport_shuttle: 'Navette Aéroport',
  inter_city: 'Inter-villes',
  intercity: 'Inter-villes',
  vtc_hourly: 'VTC à l\'heure',
  travel_document: 'Document de voyage',
  flight_reservation: 'Navette Aéroport',
  hotel_reservation: 'Logement',
  flight_and_hotel: 'Vol + Hôtel',
  ACTIVITE: 'Activité',
  LOGEMENT: 'Logement',
  FLOTTE: 'Location véhicule',
  CIRCUIT: 'Circuit touristique',
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

  // 2. Travel docs stats (filtered by period)
  const { data: travelStatsRaw, isLoading: loadingTravelStats } = useQuery({
    queryKey: ['travel-stats', startDate, endDate],
    queryFn: () => api.travelDocuments.stats(startDate, endDate),
  });
  const travelStats = extractData<TravelDocStatsData>(travelStatsRaw);

  // 3. Service reservations list (logement, activite, flotte)
  const { data: serviceResResponse, isLoading: loadingServiceRes } = useQuery({
    queryKey: ['service-reservations-report'],
    queryFn: () => api.serviceReservations.list(1, 100),
  });
  const serviceResRaw = serviceResResponse?.data as Record<string, unknown> | undefined;
  const serviceResPayload = (serviceResRaw?.data ?? serviceResRaw) as Record<string, unknown> | undefined;
  const serviceResList: ServiceReservationResponse[] = (() => {
    if (Array.isArray(serviceResPayload?.list)) return serviceResPayload.list as ServiceReservationResponse[];
    if (Array.isArray(serviceResPayload?.items)) return serviceResPayload.items as ServiceReservationResponse[];
    if (Array.isArray(serviceResPayload)) return serviceResPayload as unknown as ServiceReservationResponse[];
    return [];
  })();
  // Filter by date range
  const filteredServiceRes = serviceResList.filter(sr => {
    const d = sr.createdAt ? sr.createdAt.slice(0, 10) : '';
    return d >= startDate && d <= endDate;
  });

  // 4. Booking dashboard (global KPIs)
  const { data: bookingDashRaw } = useQuery({
    queryKey: ['booking-dashboard'],
    queryFn: () => api.bookings.dashboard(),
  });
  const bookingDash = extractData<DashboardData>(bookingDashRaw);

  const isLoading = loadingBookingStats || loadingTravelStats || loadingServiceRes;

  // ==================== COMPUTED DATA ====================

  // KPIs — merge bookings + travel docs + service reservations
  const bkKpis = bookingStats?.kpis;
  const tdKpis = travelStats?.kpis;
  const srTotal = filteredServiceRes.reduce((sum, sr) => sum + Number(sr.totalPrice || 0), 0);
  const srCount = filteredServiceRes.length;

  const totalBookings = (bkKpis?.totalOrders ?? bookingStats?.totalBookings ?? 0) + (tdKpis?.totalOrders ?? 0) + srCount;
  const totalRevenue = (bkKpis?.totalExpenses ?? bookingStats?.totalRevenue ?? 0) + (tdKpis?.totalExpenses ?? 0) + srTotal;
  const avgPrice = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  const completionRate = bkKpis?.completionRate ?? 0;

  // By status (from booking stats)
  const byStatus = bookingStats?.byStatus || {};

  // By service — merge bookings + travel docs + service reservations
  const byServiceData = useMemo(() => {
    const map: Record<string, number> = {};

    // Bookings
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

    // Travel docs
    if (travelStats?.expensesByCategory?.length) {
      for (const item of travelStats.expensesByCategory) {
        const label = SERVICE_LABELS[item.category] || item.category?.replace(/_/g, ' ') || 'Document de voyage';
        map[label] = (map[label] || 0) + Number(item.total);
      }
    }

    // Service reservations (logement, activite, flotte)
    for (const sr of filteredServiceRes) {
      const label = SERVICE_LABELS[sr.serviceType || ''] || sr.serviceType || 'Autre';
      map[label] = (map[label] || 0) + Number(sr.totalPrice || 0);
    }

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookingStats, bookingDash, travelStats, filteredServiceRes]);

  // By department — merge bookings + travel docs
  const byDeptData = useMemo(() => {
    const map: Record<string, number> = {};

    // Bookings
    for (const d of bookingStats?.expensesByDepartment || []) {
      const name = d.departmentName || 'Sans département';
      map[name] = (map[name] || 0) + Number(d.total);
    }

    // Travel docs
    for (const d of travelStats?.expensesByDepartment || []) {
      const name = d.departmentName || 'Sans département';
      map[name] = (map[name] || 0) + Number(d.total);
    }

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookingStats, travelStats]);

  // Monthly evolution — merge bookings + travel docs
  const monthlyData = useMemo(() => {
    const bkEvo = bookingStats?.monthlyEvolution || [];
    const tdEvo = travelStats?.monthlyEvolution || [];

    if (!bkEvo.length && !tdEvo.length) {
      const data = [];
      for (let i = 5; i >= 0; i--) {
        data.push({
          month: format(subMonths(now, i), 'MMM', { locale: fr }),
          total: 0,
        });
      }
      return data;
    }

    const map: Record<string, number> = {};
    for (const m of bkEvo) {
      const key = m.label || m.month;
      map[key] = (map[key] || 0) + Number(m.total);
    }
    for (const m of tdEvo) {
      const key = m.label || m.month;
      map[key] = (map[key] || 0) + Number(m.total);
    }

    return Object.entries(map).map(([month, total]) => ({
      month,
      total: total / 1000,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingStats, travelStats]);

  // ==================== EXPORTS ====================

  const handleExportCSV = () => {
    const fmtPrice = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const periodLabel = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
    const rows: string[][] = [];

    // Header info
    rows.push(['RAPPORT SUBITO BUSINESS', '', '', '']);
    rows.push([`Periode: ${periodLabel}`, '', `Genere le: ${format(now, 'dd/MM/yyyy')}`, '']);
    rows.push([]);

    // KPIs
    rows.push(['RESUME', '', '', '']);
    rows.push(['Indicateur', 'Valeur', '', '']);
    rows.push(['Depenses totales', `${fmtPrice(totalRevenue)} FCFA`, '', '']);
    rows.push(['Nombre de commandes', String(totalBookings), '', '']);
    rows.push(['Prix moyen', `${fmtPrice(avgPrice)} FCFA`, '', '']);
    rows.push(['Taux de completion', `${completionRate}%`, '', '']);
    rows.push([]);

    // Par statut
    const statusEntries = Object.entries(byStatus);
    if (statusEntries.length > 0) {
      rows.push(['REPARTITION PAR STATUT', '', '', '']);
      rows.push(['Statut', 'Nombre', '', '']);
      statusEntries.forEach(([k, v]) => {
        rows.push([STATUS_LABELS[k] || k.replace(/_/g, ' '), String(v), '', '']);
      });
      rows.push([]);
    }

    // Par service
    if (byServiceData.length > 0) {
      const totalServices = byServiceData.reduce((s, i) => s + i.value, 0);
      rows.push(['DEPENSES PAR SERVICE', '', '', '']);
      rows.push(['Service', 'Montant (FCFA)', '% du total', '']);
      byServiceData.forEach(s => {
        const pct = totalServices > 0 ? ((s.value / totalServices) * 100).toFixed(1) + '%' : '0%';
        rows.push([s.name, `${fmtPrice(s.value)} FCFA`, pct, '']);
      });
      rows.push(['TOTAL', `${fmtPrice(totalServices)} FCFA`, '100%', '']);
      rows.push([]);
    }

    // Par département
    if (byDeptData.length > 0) {
      const totalDepts = byDeptData.reduce((s, d) => s + d.value, 0);
      rows.push(['DEPENSES PAR DEPARTEMENT', '', '', '']);
      rows.push(['Departement', 'Montant (FCFA)', '% du total', '']);
      byDeptData.forEach(d => {
        const pct = totalDepts > 0 ? ((d.value / totalDepts) * 100).toFixed(1) + '%' : '0%';
        rows.push([d.name, `${fmtPrice(d.value)} FCFA`, pct, '']);
      });
      rows.push(['TOTAL', `${fmtPrice(totalDepts)} FCFA`, '100%', '']);
      rows.push([]);
    }

    // Evolution mensuelle
    if (monthlyData.length > 0) {
      rows.push(['EVOLUTION MENSUELLE', '', '', '']);
      rows.push(['Mois', 'Montant (x1000 FCFA)', '', '']);
      monthlyData.forEach(m => {
        rows.push([m.month, typeof m.total === 'number' ? `${fmtPrice(Math.round(m.total))}k` : String(m.total), '', '']);
      });
    }

    const csv = rows
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-subito-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport CSV telecharge');
  };

  const handleExportPDF = async () => {
    try {
      const fmtPrice = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const brandR = 232, brandG = 78, brandB = 106;

      let logoBase64: string | null = null;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo_subito_facture.png`);
        if (res.ok) {
          const blob = await res.blob();
          logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch { /* logo optional */ }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 15;
      let y = margin;

      // --- Header band ---
      doc.setFillColor(brandR, brandG, brandB);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Logo (white area)
      if (logoBase64) {
        try { doc.addImage(logoBase64, margin, 6, 34, 18); } catch { /* ignore */ }
      }

      // Title
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT D\'ACTIVITE', pageWidth - margin, 18, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Periode: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`,
        pageWidth - margin, 28, { align: 'right' }
      );
      doc.text(
        `Genere le ${format(now, 'dd MMMM yyyy', { locale: fr })}`,
        pageWidth - margin, 34, { align: 'right' }
      );

      y = 50;

      // --- KPI Cards ---
      const kpiBoxW = (pageWidth - margin * 2 - 9) / 4; // 4 boxes, 3px gap
      const kpiBoxH = 22;
      const kpiData = [
        { label: 'Depenses totales', value: `${fmtPrice(totalRevenue)} FCFA` },
        { label: 'Commandes', value: String(totalBookings) },
        { label: 'Prix moyen', value: `${fmtPrice(avgPrice)} FCFA` },
        { label: 'Taux completion', value: `${completionRate}%` },
      ];

      kpiData.forEach((kpi, i) => {
        const x = margin + i * (kpiBoxW + 3);
        doc.setFillColor(248, 248, 252);
        doc.roundedRect(x, y, kpiBoxW, kpiBoxH, 2, 2, 'F');

        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, x + 4, y + 8);

        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.value, x + 4, y + 17);
      });

      y += kpiBoxH + 10;

      // --- Section: Par Statut ---
      const statusEntries = Object.entries(byStatus);
      if (statusEntries.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(brandR, brandG, brandB);
        doc.setFont('helvetica', 'bold');
        doc.text('REPARTITION PAR STATUT', margin, y);
        y += 3;

        autoTable(doc, {
          startY: y,
          head: [['Statut', 'Nombre']],
          body: statusEntries.map(([k, v]) => [
            STATUS_LABELS[k] || k.replace(/_/g, ' '),
            String(v),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
          alternateRowStyles: { fillColor: [252, 248, 249] },
          columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
          tableWidth: 90,
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Section: Par Service ---
      if (byServiceData.length > 0) {
        if (y > 230) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setTextColor(brandR, brandG, brandB);
        doc.setFont('helvetica', 'bold');
        doc.text('DEPENSES PAR SERVICE', margin, y);
        y += 3;

        const totalServices = byServiceData.reduce((s, i) => s + i.value, 0);

        autoTable(doc, {
          startY: y,
          head: [['Service', 'Montant (FCFA)', '% du total']],
          body: byServiceData.map(s => [
            s.name,
            fmtPrice(s.value) + ' FCFA',
            totalServices > 0 ? ((s.value / totalServices) * 100).toFixed(1) + '%' : '0%',
          ]),
          foot: [['Total', fmtPrice(totalServices) + ' FCFA', '100%']],
          theme: 'striped',
          headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          footStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
          alternateRowStyles: { fillColor: [252, 248, 249] },
          columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' },
            2: { halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Section: Par Département ---
      if (byDeptData.length > 0) {
        if (y > 230) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setTextColor(brandR, brandG, brandB);
        doc.setFont('helvetica', 'bold');
        doc.text('DEPENSES PAR DEPARTEMENT', margin, y);
        y += 3;

        const totalDepts = byDeptData.reduce((s, d) => s + d.value, 0);

        autoTable(doc, {
          startY: y,
          head: [['Departement', 'Montant (FCFA)', '% du total']],
          body: byDeptData.map(d => [
            d.name,
            fmtPrice(d.value) + ' FCFA',
            totalDepts > 0 ? ((d.value / totalDepts) * 100).toFixed(1) + '%' : '0%',
          ]),
          foot: [['Total', fmtPrice(totalDepts) + ' FCFA', '100%']],
          theme: 'striped',
          headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          footStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
          alternateRowStyles: { fillColor: [252, 248, 249] },
          columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' },
            2: { halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Section: Evolution mensuelle ---
      if (monthlyData.length > 0) {
        if (y > 220) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setTextColor(brandR, brandG, brandB);
        doc.setFont('helvetica', 'bold');
        doc.text('EVOLUTION MENSUELLE', margin, y);
        y += 3;

        autoTable(doc, {
          startY: y,
          head: [['Mois', 'Montant (x1000 FCFA)']],
          body: monthlyData.map(m => [
            m.month,
            typeof m.total === 'number' ? fmtPrice(Math.round(m.total)) + 'k' : String(m.total),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
          alternateRowStyles: { fillColor: [252, 248, 249] },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
          tableWidth: 100,
        });
      }

      // --- Footer on every page ---
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Bottom line
        doc.setDrawColor(brandR, brandG, brandB);
        doc.setLineWidth(0.5);
        doc.line(margin, 284, pageWidth - margin, 284);

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('SUBITO INTERNATIONAL SUARL — Confidentiel', margin, 289);
        doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, 289, { align: 'right' });
      }

      doc.save(`rapport-subito-${format(now, 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport PDF telecharge');
    } catch (err) {
      console.error('Erreur generation rapport PDF:', err);
      toast.error('Erreur lors de la generation du rapport PDF');
    }
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
    { label: "Dépenses totales", value: totalRevenue.toLocaleString(), suffix: "FCFA", icon: Wallet, color: "from-orange-500 to-red-500" },
    { label: "Commandes", value: totalBookings, suffix: "", icon: Package, color: "from-blue-500 to-indigo-500" },
    { label: "Taux de complétion", value: `${completionRate}%`, suffix: "", icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { label: "Valeur moyenne", value: avgPrice.toLocaleString(), suffix: "FCFA", icon: FileText, color: "from-purple-500 to-pink-500" },
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiItems.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.color}`}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs sm:text-sm text-slate-500">{kpi.label}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-800 mt-1">{kpi.value}{kpi.suffix && <span className="text-xs sm:text-sm font-semibold text-slate-500"> {kpi.suffix}</span>}</p>
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
              <div key={status} className="text-center p-3 sm:p-4 rounded-xl bg-slate-50">
                <p className="text-base sm:text-lg font-bold text-slate-800">{count}</p>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Budget consommé</p>
            <p className="text-base sm:text-lg font-bold mt-1">{totalRevenue.toLocaleString()} <span className="text-xs sm:text-sm font-semibold text-slate-400">FCFA</span></p>
          </div>
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Volume de commandes</p>
            <p className="text-base sm:text-lg font-bold mt-1">{totalBookings}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Service principal</p>
            <p className="text-sm sm:text-lg font-bold mt-1">{byServiceData[0]?.name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Valeur moyenne</p>
            <p className="text-base sm:text-lg font-bold mt-1">{avgPrice.toLocaleString()} <span className="text-xs sm:text-sm font-semibold text-slate-400">FCFA</span></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
