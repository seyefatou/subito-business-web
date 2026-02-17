'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
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
  Users,
  Building2,
  FileText,
  Filter,
  X,
  FileDown
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface Order {
  id: string;
  tracking_number?: string;
  service_type?: string;
  service_category?: string;
  department?: string;
  beneficiary_name?: string;
  status?: string;
  final_cost?: number;
  estimated_cost?: number;
  created_date: string;
}

interface Department {
  id: string;
  name: string;
}

interface Filters {
  department: string;
  serviceType: string;
  serviceCategory: string;
  minCost: string;
  maxCost: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface CategoryData {
  name: string;
  value: number;
}

interface MonthlyData {
  month: string;
  commandes: number;
  depenses: number;
}

const COLORS = ['#FF6B35', '#FF8B6A', '#FFB59A', '#94a3b8', '#64748b', '#475569'];

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [filters, setFilters] = useState<Filters>({
    department: "all",
    serviceType: "all",
    serviceCategory: "all",
    minCost: "",
    maxCost: "",
    startDate: null,
    endDate: null,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  // Get unique service types and categories
  const serviceTypes = [...new Set(orders.map(o => o.service_type).filter(Boolean))] as string[];
  const serviceCategories = [...new Set(orders.map(o => o.service_category).filter(Boolean))] as string[];

  // Filter by period
  const now = new Date();
  const periodStart = period === "month"
    ? startOfMonth(now)
    : period === "quarter"
      ? startOfMonth(subMonths(now, 2))
      : startOfMonth(subMonths(now, 11));

  // Apply all filters
  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    const orderCost = o.final_cost || o.estimated_cost || 0;

    // Period filter
    if (!filters.startDate && !filters.endDate) {
      if (orderDate < periodStart) return false;
    }

    // Custom date range
    if (filters.startDate && orderDate < filters.startDate) return false;
    if (filters.endDate && orderDate > filters.endDate) return false;

    // Department filter
    if (filters.department !== "all" && o.department !== filters.department) return false;

    // Service type filter
    if (filters.serviceType !== "all" && o.service_type !== filters.serviceType) return false;

    // Service category filter
    if (filters.serviceCategory !== "all" && o.service_category !== filters.serviceCategory) return false;

    // Cost range filter
    if (filters.minCost && orderCost < parseFloat(filters.minCost)) return false;
    if (filters.maxCost && orderCost > parseFloat(filters.maxCost)) return false;

    return true;
  });

  // Calculate stats
  const totalSpending = filteredOrders.reduce((sum, o) => sum + (o.final_cost || o.estimated_cost || 0), 0);
  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
  const avgOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0;

  // Spending by category
  const spendingByCategory = filteredOrders.reduce((acc, o) => {
    const cat = o.service_category || 'other';
    acc[cat] = (acc[cat] || 0) + (o.final_cost || o.estimated_cost || 0);
    return acc;
  }, {} as Record<string, number>);

  const categoryData: CategoryData[] = Object.entries(spendingByCategory)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  // Spending by department
  const spendingByDepartment = filteredOrders.reduce((acc, o) => {
    const dept = o.department || 'General';
    acc[dept] = (acc[dept] || 0) + (o.final_cost || o.estimated_cost || 0);
    return acc;
  }, {} as Record<string, number>);

  const departmentData: CategoryData[] = Object.entries(spendingByDepartment)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly trend (last 6 months)
  const monthlyData: MonthlyData[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStartDate = startOfMonth(subMonths(now, i));
    const monthEndDate = endOfMonth(subMonths(now, i));
    const monthOrders = orders.filter(o => {
      const d = new Date(o.created_date);
      return d >= monthStartDate && d <= monthEndDate;
    });
    monthlyData.push({
      month: format(monthStartDate, 'MMM', { locale: fr }),
      commandes: monthOrders.length,
      depenses: monthOrders.reduce((sum, o) => sum + (o.final_cost || o.estimated_cost || 0), 0) / 1000,
    });
  }

  const resetFilters = () => {
    setFilters({
      department: "all",
      serviceType: "all",
      serviceCategory: "all",
      minCost: "",
      maxCost: "",
      startDate: null,
      endDate: null,
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'startDate' || key === 'endDate') return value !== null;
    return value !== "all" && value !== "";
  }).length;

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Numero',
      'Service',
      'Categorie',
      'Departement',
      'Beneficiaire',
      'Statut',
      'Cout (FCFA)',
    ];

    const rows = filteredOrders.map(o => [
      format(new Date(o.created_date), 'dd/MM/yyyy HH:mm'),
      o.tracking_number || '',
      o.service_type || '',
      o.service_category || '',
      o.department || 'General',
      o.beneficiary_name || '',
      o.status || '',
      (o.final_cost || o.estimated_cost || 0).toString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-subito-${format(now, 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport CSV telecharge');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('RAPPORT SUBITO BUSINESS', 20, 20);

    // Date and period
    doc.setFontSize(10);
    doc.text(`Genere le ${format(now, 'dd MMMM yyyy a HH:mm', { locale: fr })}`, 20, 30);
    doc.text(`Periode: ${filters.startDate && filters.endDate
      ? `${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`
      : period === 'month' ? 'Ce mois' : period === 'quarter' ? 'Ce trimestre' : 'Cette annee'
    }`, 20, 36);

    // Summary
    doc.setFontSize(14);
    doc.text('RESUME EXECUTIF', 20, 50);
    doc.setFontSize(10);
    doc.text(`Depenses totales: ${totalSpending.toLocaleString()} FCFA`, 20, 60);
    doc.text(`Nombre de commandes: ${totalOrders}`, 20, 66);
    doc.text(`Commandes completees: ${completedOrders} (${totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) : 0}%)`, 20, 72);
    doc.text(`Valeur moyenne: ${Math.round(avgOrderValue).toLocaleString()} FCFA`, 20, 78);

    // Active filters
    if (activeFiltersCount > 0) {
      doc.setFontSize(12);
      doc.text('FILTRES APPLIQUES', 20, 92);
      doc.setFontSize(9);
      let y = 100;
      if (filters.department !== "all") {
        doc.text(`- Departement: ${filters.department}`, 25, y);
        y += 6;
      }
      if (filters.serviceType !== "all") {
        doc.text(`- Type de service: ${filters.serviceType}`, 25, y);
        y += 6;
      }
      if (filters.serviceCategory !== "all") {
        doc.text(`- Categorie: ${filters.serviceCategory}`, 25, y);
        y += 6;
      }
      if (filters.minCost || filters.maxCost) {
        doc.text(`- Plage de cout: ${filters.minCost || '0'} - ${filters.maxCost || 'infini'} FCFA`, 25, y);
        y += 6;
      }
    }

    // By category
    doc.setFontSize(14);
    doc.text('DEPENSES PAR CATEGORIE', 20, 110);
    doc.setFontSize(10);
    let yPos = 120;
    categoryData.slice(0, 8).forEach((cat, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${cat.name}: ${cat.value.toLocaleString()} FCFA`, 25, yPos);
      yPos += 8;
    });

    // By department
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text('DEPENSES PAR DEPARTEMENT', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    departmentData.slice(0, 10).forEach((dept, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${dept.name}: ${dept.value.toLocaleString()} FCFA`, 25, yPos);
      yPos += 8;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i}/${pageCount}`, 180, 285);
      doc.text('Subito Business - Confidentiel', 20, 285);
    }

    doc.save(`rapport-subito-${format(now, 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success('Rapport PDF telecharge');
  };

  const kpiItems = [
    { label: "Depenses totales", value: `${totalSpending.toLocaleString()} FCFA`, icon: Wallet, color: "from-orange-500 to-red-500" },
    { label: "Commandes", value: totalOrders, icon: Package, color: "from-blue-500 to-indigo-500" },
    { label: "Taux de completion", value: `${totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) : 0}%`, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { label: "Valeur moyenne", value: `${Math.round(avgOrderValue).toLocaleString()} FCFA`, icon: FileText, color: "from-purple-500 to-pink-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rapports & Analyses</h1>
          <p className="text-slate-500 mt-1">
            {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''}
            {activeFiltersCount > 0 && ` - ${activeFiltersCount} filtre${activeFiltersCount > 1 ? 's' : ''} actif${activeFiltersCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={showFilters ? "default" : "outline"}
            className={`gap-2 ${showFilters ? 'gradient-subito text-white border-0' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-orange-600 text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          {!filters.startDate && !filters.endDate && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette annee</SelectItem>
              </SelectContent>
            </Select>
          )}
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

      {/* Advanced Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800">Filtres personnalises</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
                <X className="w-4 h-4" />
                Reinitialiser
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Periode personnalisee</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {filters.startDate ? format(filters.startDate, 'dd/MM/yy') : 'Debut'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.startDate || undefined}
                      onSelect={(date) => setFilters({ ...filters, startDate: date || null })}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {filters.endDate ? format(filters.endDate, 'dd/MM/yy') : 'Fin'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.endDate || undefined}
                      onSelect={(date) => setFilters({ ...filters, endDate: date || null })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Departement</Label>
              <Select value={filters.department} onValueChange={(v) => setFilters({ ...filters, department: v })}>
                <SelectTrigger>
                  <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les departements</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Type de service</Label>
              <Select value={filters.serviceType} onValueChange={(v) => setFilters({ ...filters, serviceType: v })}>
                <SelectTrigger>
                  <Package className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les services</SelectItem>
                  {serviceTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Categorie</Label>
              <Select value={filters.serviceCategory} onValueChange={(v) => setFilters({ ...filters, serviceCategory: v })}>
                <SelectTrigger>
                  <FileText className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes categories</SelectItem>
                  {serviceCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Cout minimum (FCFA)</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minCost}
                onChange={(e) => setFilters({ ...filters, minCost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Cout maximum (FCFA)</Label>
              <Input
                type="number"
                placeholder="Infini"
                value={filters.maxCost}
                onChange={(e) => setFilters({ ...filters, maxCost: e.target.value })}
              />
            </div>
          </div>

          {/* Filter Summary */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                <span className="font-medium">{filteredOrders.length}</span> commande{filteredOrders.length > 1 ? 's' : ''} trouvee{filteredOrders.length > 1 ? 's' : ''} -
                <span className="font-medium ml-1">{totalSpending.toLocaleString()} FCFA</span> de depenses totales
              </p>
            </div>
          )}
        </motion.div>
      )}

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

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Evolution mensuelle</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="commandes"
                  stroke="#FF6B35"
                  strokeWidth={3}
                  dot={{ fill: '#FF6B35', strokeWidth: 2 }}
                  name="Commandes"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* By category pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Depenses par categorie</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} FCFA`, '']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.slice(0, 6).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-slate-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* By department bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Depenses par departement</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Depenses']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="value" fill="#FF6B35" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
            <h3 className="text-xl font-bold">Rapport Direction Generale</h3>
            <p className="text-slate-400 mt-1">Synthese executive - {format(now, 'MMMM yyyy', { locale: fr })}</p>
          </div>
          <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" />
            Telecharger
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Budget consomme</p>
            <p className="text-2xl font-bold mt-1">{totalSpending.toLocaleString()} FCFA</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Volume de commandes</p>
            <p className="text-2xl font-bold mt-1">{totalOrders}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Service principal</p>
            <p className="text-2xl font-bold mt-1">{categoryData[0]?.name || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Economies estimees</p>
            <p className="text-2xl font-bold mt-1 text-green-400">
              {Math.round(totalSpending * 0.15).toLocaleString()} FCFA
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
