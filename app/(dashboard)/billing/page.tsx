'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, InvoiceResponse, InvoiceBooking, InvoiceTravelDocument, InvoiceCompagny } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Download,
  CreditCard,
  Building,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Smartphone,
  Search,
  Plus,
  Loader2,
  CalendarDays,
  Car,
  Plane,
  MapPin,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Invoice {
  id: string;
  invoice_number?: string;
  company_code?: string;
  company_name?: string;
  period_start?: string;
  period_end?: string;
  total_amount?: number;
  bookings_count?: number;
  status: 'pending' | 'paid' | 'overdue';
  created_date: string;
  payment_method?: string | null;
  paid_at?: string | null;
  compagny?: InvoiceCompagny;
  bookings?: InvoiceBooking[];
  travelDocuments?: InvoiceTravelDocument[];
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const SERVICE_LABELS: Record<string, string> = {
  airport_shuttle: 'Navette Aéroport',
  inter_city: 'Inter-villes',
  intercity: 'Inter-villes',
  vtc_hourly: 'VTC à l\'heure',
  visa_assistance: 'Visa / Assistance',
  travel_document: 'Document de voyage',
};

const statusConfig: Record<string, StatusConfig> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "Payee", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  overdue: { label: "En retard", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Default period: current month
  const today = new Date();
  const firstDay = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
  const lastDay = format(endOfMonth(today), 'yyyy-MM-dd');
  const [requestStartDate, setRequestStartDate] = useState(firstDay);
  const [requestEndDate, setRequestEndDate] = useState(lastDay);

  // Fetch invoices with pagination and status filter
  const { data: invoicesResponse, isLoading: loadingInvoices, error: invoicesError } = useQuery({
    queryKey: ['invoices', currentPage, statusFilter],
    queryFn: () => api.invoices.list({
      page: currentPage,
      limit: pageSize,
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
  });

  // Parse the response - handle { message, status, data: { list, page, pageSize, total } }
  const { invoicesList, invoicesMeta } = (() => {
    if (!invoicesResponse) return { invoicesList: [] as InvoiceResponse[], invoicesMeta: null };

    const resp = invoicesResponse as unknown as Record<string, unknown>;
    // Unwrap ApiResponse wrapper: { message, status, data } -> data
    const payload = (resp?.data ?? resp) as Record<string, unknown>;

    // Find the array in the payload
    let list: InvoiceResponse[] = [];
    const pd = payload?.data as Record<string, unknown> | undefined;
    if (Array.isArray(payload?.list)) list = payload.list as InvoiceResponse[];
    else if (Array.isArray(payload?.items)) list = payload.items as InvoiceResponse[];
    else if (Array.isArray(pd?.list)) list = pd.list as InvoiceResponse[];
    else if (Array.isArray(pd?.items)) list = pd.items as InvoiceResponse[];
    else if (Array.isArray(pd)) list = pd as unknown as InvoiceResponse[];
    else if (Array.isArray(payload)) list = payload as unknown as InvoiceResponse[];

    // Extract pagination metadata
    const src = (payload?.list ? payload : (pd ?? payload)) as Record<string, unknown>;
    const total = Number(src?.total ?? list.length);
    const limit = Number(src?.pageSize ?? src?.limit ?? pageSize);
    const meta = {
      total,
      page: Number(src?.page ?? 1),
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
    };

    return { invoicesList: list, invoicesMeta: meta };
  })();

  const invoices: Invoice[] = invoicesList.map((inv: InvoiceResponse) => {
    const s = inv.status?.toUpperCase();
    return {
      id: String(inv.id),
      invoice_number: inv.reference || inv.invoiceNumber,
      company_code: inv.companyCode,
      company_name: inv.compagnyName || inv.compagny?.nomCompagny,
      period_start: inv.startDate,
      period_end: inv.endDate,
      total_amount: Number(inv.totalAmount) || 0,
      bookings_count: inv.bookingsCount || (inv.bookings?.length ?? 0),
      status: (s === 'PAID' ? 'paid' : s === 'OVERDUE' ? 'overdue' : 'pending') as Invoice['status'],
      created_date: inv.createdAt || '',
      payment_method: inv.paymentMethod,
      paid_at: inv.paidAt,
      compagny: inv.compagny,
      bookings: inv.bookings,
      travelDocuments: inv.travelDocuments,
    };
  });

  // Fetch summary
  const { data: summaryResponse } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn: () => api.invoices.summary(),
  });

  // API returns { data: { totalInvoices, totalAmount, paidAmount, pendingAmount } }
  const summaryRaw = (summaryResponse?.data ?? summaryResponse) as Record<string, unknown> | undefined;

  // Fetch billing stats
  const { data: billingStatsResponse } = useQuery({
    queryKey: ['billing-stats'],
    queryFn: () => api.invoices.billingStats(),
  });

  // Mutation: request invoice generation
  const requestInvoiceMutation = useMutation({
    mutationFn: () => api.invoices.requestInvoice({
      startDate: requestStartDate,
      endDate: requestEndDate,
    }),
    onSuccess: () => {
      toast.success('Demande de facture créée avec succès');
      setShowRequestDialog(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
    },
  });

  // Fetch invoice detail when selected
  const { data: invoiceDetailResponse, isLoading: loadingDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoiceId],
    queryFn: () => api.invoices.get(Number(selectedInvoiceId)),
    enabled: !!selectedInvoiceId,
  });

  const invoiceDetail = (() => {
    if (!invoiceDetailResponse) return null;
    const raw = (invoiceDetailResponse.data ?? invoiceDetailResponse) as Record<string, unknown>;
    const inv = (raw.data ?? raw) as InvoiceResponse;
    if (!inv?.id) return null;
    const s = inv.status?.toUpperCase();
    return {
      id: String(inv.id),
      invoice_number: inv.reference || inv.invoiceNumber,
      company_code: inv.companyCode,
      company_name: inv.compagnyName || inv.compagny?.nomCompagny,
      period_start: inv.startDate,
      period_end: inv.endDate,
      total_amount: Number(inv.totalAmount) || 0,
      bookings_count: inv.bookingsCount || (inv.bookings?.length ?? 0),
      status: (s === 'PAID' ? 'paid' : s === 'OVERDUE' ? 'overdue' : 'pending') as Invoice['status'],
      created_date: inv.createdAt || '',
      payment_method: inv.paymentMethod,
      paid_at: inv.paidAt,
      compagny: inv.compagny,
      bookings: inv.bookings || [],
      travelDocuments: inv.travelDocuments || [],
    } as Invoice;
  })();

  // Use detail from API if available, or fallback to list data
  const selectedInvoice = invoiceDetail || invoices.find(i => i.id === selectedInvoiceId) || null;

  const statsRaw = (billingStatsResponse?.data ?? billingStatsResponse) as Record<string, unknown> | undefined;
  const currentMonthData = statsRaw?.currentMonth as Record<string, unknown> | undefined;
  const facturePrevi = statsRaw?.facturePrevisionnelle as Record<string, unknown> | undefined;

  const now = new Date();
  const monthEnd = endOfMonth(now);

  const currentMonthTotal = Number(currentMonthData?.total ?? summaryRaw?.totalAmount ?? 0);
  const currentMonthCount = Number(currentMonthData?.bookingsCount ?? currentMonthData?.count ?? 0);

  // Facture prévisionnelle: réservations impayées du mois
  const prevTotal = Number(facturePrevi?.total ?? currentMonthTotal);
  const prevCount = Number(facturePrevi?.count ?? currentMonthCount);

  // byService: API returns either an object { key: value } or an array [{ serviceType, total, count }]
  const byServiceRaw = statsRaw?.byService;
  const byCategory: Record<string, number> = {};
  if (byServiceRaw && typeof byServiceRaw === 'object' && !Array.isArray(byServiceRaw)) {
    // Object format: { "airport_shuttle": 200000, "inter_city": 150000 }
    for (const [key, value] of Object.entries(byServiceRaw as Record<string, number>)) {
      const label = SERVICE_LABELS[key] || key?.replace(/_/g, ' ') || 'Autre';
      byCategory[label] = Number(value);
    }
  } else if (Array.isArray(byServiceRaw)) {
    // Array format: [{ serviceType, total, count }]
    for (const s of byServiceRaw as { serviceType: string; total: string | number; count: number }[]) {
      const label = SERVICE_LABELS[s.serviceType] || s.serviceType?.replace(/_/g, ' ') || 'Autre';
      byCategory[label] = Number(s.total);
    }
  }

  // byDepartment: API returns either an object { key: value } or an array [{ departmentName, total, count }]
  const byDeptRaw = statsRaw?.byDepartment;
  const byDepartment: Record<string, number> = {};
  if (byDeptRaw && typeof byDeptRaw === 'object' && !Array.isArray(byDeptRaw)) {
    // Object format: { "Direction": 250000, "Logistique": 200000 }
    for (const [key, value] of Object.entries(byDeptRaw as Record<string, number>)) {
      byDepartment[key || 'Sans département'] = Number(value);
    }
  } else if (Array.isArray(byDeptRaw)) {
    // Array format: [{ departmentName, total, count }]
    for (const d of byDeptRaw as { departmentName: string; total: string | number; count: number }[]) {
      byDepartment[d.departmentName || 'Sans département'] = Number(d.total);
    }
  }

  // Summary fields
  const totalPending = Number(summaryRaw?.pendingAmount ?? summaryRaw?.totalPendingAmount ?? 0);
  const totalPaid = Number(summaryRaw?.paidAmount ?? summaryRaw?.totalPaidAmount ?? 0);

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.company_name?.toLowerCase().includes(q)
    );
  });

  const paymentMethods: PaymentMethod[] = [
    { id: 'virement', label: 'Virement bancaire', icon: Building, desc: 'Sous 2-3 jours ouvres' },
    { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, desc: 'Orange Money, MTN, Wave' },
    { id: 'credit', label: 'Credit entreprise', icon: CreditCard, desc: 'Deduire de votre credit' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturation</h1>
          <p className="text-slate-500 mt-1">Gerez vos factures et paiements</p>
        </div>
        <Button
          onClick={() => setShowRequestDialog(true)}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Demander une facture
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-orange-100">
              <Wallet className="w-5 h-5 text-subito" />
            </div>
            <span className="text-slate-600">Mois en cours</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{currentMonthTotal.toLocaleString()} FCFA</p>
          <p className="text-sm text-slate-500 mt-1">{currentMonthCount} réservation{currentMonthCount > 1 ? 's' : ''} ce mois</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-slate-600">En attente</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalPending.toLocaleString()} FCFA</p>
          <p className="text-sm text-slate-500 mt-1">
            {invoices.filter(i => i.status === 'pending').length} facture(s)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-slate-600">Total paye</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalPaid.toLocaleString()} FCFA</p>
          <p className="text-sm text-slate-500 mt-1">
            {invoices.filter(i => i.status === 'paid').length} facture(s)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-slate-600">Total factures</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{Number(summaryRaw?.totalInvoices ?? invoicesMeta?.total ?? invoices.length)}</p>
          <p className="text-sm text-slate-500 mt-1">
            {currentMonthCount} réservation{currentMonthCount > 1 ? 's' : ''} ce mois
          </p>
        </motion.div>
      </div>

      {/* Main content */}
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="current">Mois en cours</TabsTrigger>
          <TabsTrigger value="invoices">Historique factures</TabsTrigger>
          <TabsTrigger value="payment">Moyens de paiement</TabsTrigger>
        </TabsList>

        {/* Current month breakdown */}
        <TabsContent value="current" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By service */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Par service</h3>
              <div className="space-y-3">
                {Object.entries(byCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600 capitalize">{cat}</span>
                    <span className="font-semibold text-slate-800">{amount.toLocaleString()} FCFA</span>
                  </div>
                ))}
                {Object.keys(byCategory).length === 0 && (
                  <p className="text-slate-400 text-center py-4">Aucune depense ce mois</p>
                )}
              </div>
            </motion.div>

            {/* By department */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Par departement</h3>
              <div className="space-y-3">
                {Object.entries(byDepartment).map(([dept, amount]) => (
                  <div key={dept} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{dept}</span>
                    <span className="font-semibold text-slate-800">{amount.toLocaleString()} FCFA</span>
                  </div>
                ))}
                {Object.keys(byDepartment).length === 0 && (
                  <p className="text-slate-400 text-center py-4">Aucune depense ce mois</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Preview invoice */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Facture previsionnelle - {format(now, 'MMMM yyyy', { locale: fr })}</p>
                <p className="text-3xl font-bold mt-2">{prevTotal.toLocaleString()} FCFA</p>
                <p className="text-slate-400 text-sm mt-1">{prevCount} reservation{prevCount > 1 ? 's' : ''} non facturee{prevCount > 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Date de facturation</p>
                <p className="font-medium mt-1">{format(monthEnd, 'dd MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Invoices history */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Search bar + filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par numero de facture ou periode..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter(''); setCurrentPage(1); }}
                  className={statusFilter === '' ? 'gradient-subito text-white border-0' : ''}
                >
                  Toutes
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                  className={statusFilter === 'pending' ? 'bg-amber-500 hover:bg-amber-600 text-white border-0' : ''}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  En attente
                </Button>
                <Button
                  variant={statusFilter === 'paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter('paid'); setCurrentPage(1); }}
                  className={statusFilter === 'paid' ? 'bg-green-500 hover:bg-green-600 text-white border-0' : ''}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Payées
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : invoicesError ? (
              <div className="px-6 py-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-500 font-medium">Erreur lors du chargement des factures</p>
                <p className="text-slate-400 text-sm mt-1">{(invoicesError as Error)?.message || 'Erreur inconnue'}</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                        Facture
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                        Période
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                        Réservations
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                        Montant
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                        Statut
                      </th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          {searchTerm ? 'Aucune facture trouvée' : 'Aucune facture — cliquez sur "Demander une facture" pour en générer une'}
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => {
                        const status = statusConfig[invoice.status] || statusConfig.pending;
                        return (
                          <tr
                            key={invoice.id}
                            className="hover:bg-slate-50 cursor-pointer"
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-slate-100">
                                  <FileText className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="font-medium text-slate-800">
                                  {invoice.invoice_number || `#${invoice.id}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              {invoice.period_start && invoice.period_end ? (
                                <>
                                  {format(new Date(invoice.period_start), 'dd MMM', { locale: fr })}
                                  {' — '}
                                  {format(new Date(invoice.period_end), 'dd MMM yyyy', { locale: fr })}
                                </>
                              ) : invoice.created_date ? format(new Date(invoice.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {invoice.bookings_count || 0}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {(invoice.total_amount || 0).toLocaleString()} FCFA
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={`${status.color} border-0`}>
                                {status.label}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {invoicesMeta && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                      Page {currentPage} sur {invoicesMeta.totalPages || 1} — {invoicesMeta.total} facture{(invoicesMeta.total ?? 0) > 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(invoicesMeta.totalPages || 1, 5) }, (_, i) => {
                        const start = Math.max(1, Math.min(currentPage - 2, (invoicesMeta.totalPages || 1) - 4));
                        const p = start + i;
                        if (p > (invoicesMeta.totalPages || 1)) return null;
                        return (
                          <Button
                            key={p}
                            variant={p === currentPage ? 'default' : 'outline'}
                            size="sm"
                            className={p === currentPage ? 'gradient-subito text-white border-0' : ''}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= (invoicesMeta.totalPages ?? 1)}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Payment methods */}
        <TabsContent value="payment">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setPaymentMethod(method.id)}
                className={`
                  p-6 rounded-2xl border-2 cursor-pointer transition-all
                  ${paymentMethod === method.id
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    p-3 rounded-xl
                    ${paymentMethod === method.id ? 'gradient-subito' : 'bg-slate-100'}
                  `}>
                    <method.icon className={`w-6 h-6 ${paymentMethod === method.id ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{method.label}</h3>
                    <p className="text-sm text-slate-500">{method.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-6 bg-slate-50 rounded-2xl">
            <h3 className="font-semibold text-slate-800 mb-4">Coordonnees bancaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Banque</p>
                <p className="font-medium text-slate-800">SGBCI Cote d&apos;Ivoire</p>
              </div>
              <div>
                <p className="text-slate-500">IBAN</p>
                <p className="font-medium text-slate-800">CI93 0000 0000 0000 0000 0000 000</p>
              </div>
              <div>
                <p className="text-slate-500">BIC / SWIFT</p>
                <p className="font-medium text-slate-800">SGBFCIAX</p>
              </div>
              <div>
                <p className="text-slate-500">Titulaire</p>
                <p className="font-medium text-slate-800">MYSUBITO SARL</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice detail modal */}
      <Dialog open={!!selectedInvoiceId} onOpenChange={() => setSelectedInvoiceId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {loadingDetail && !selectedInvoice ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : selectedInvoice ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg gradient-subito">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  Facture {selectedInvoice.invoice_number}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Montant + statut */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                  <div>
                    <span className="text-slate-500 text-sm">Montant total</span>
                    <p className="text-xl font-bold text-slate-800">
                      {(selectedInvoice.total_amount || 0).toLocaleString()} FCFA
                    </p>
                  </div>
                  <Badge className={`${(statusConfig[selectedInvoice.status] || statusConfig.pending).color} border-0`}>
                    {(statusConfig[selectedInvoice.status] || statusConfig.pending).label}
                  </Badge>
                </div>

                {/* Détails facture */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {(selectedInvoice.company_name || selectedInvoice.compagny?.nomCompagny) && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Entreprise</p>
                      <p className="font-medium text-slate-800">{selectedInvoice.company_name || selectedInvoice.compagny?.nomCompagny}</p>
                    </div>
                  )}
                  {selectedInvoice.period_start && (
                    <div>
                      <p className="text-slate-500">Du</p>
                      <p className="font-medium text-slate-800">
                        {format(new Date(selectedInvoice.period_start), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                  {selectedInvoice.period_end && (
                    <div>
                      <p className="text-slate-500">Au</p>
                      <p className="font-medium text-slate-800">
                        {format(new Date(selectedInvoice.period_end), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                  {selectedInvoice.paid_at && (
                    <div>
                      <p className="text-slate-500">Payée le</p>
                      <p className="font-medium text-green-700">
                        {format(new Date(selectedInvoice.paid_at), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                  {selectedInvoice.payment_method && (
                    <div>
                      <p className="text-slate-500">Mode de paiement</p>
                      <p className="font-medium text-slate-800">{selectedInvoice.payment_method}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500">Date de création</p>
                    <p className="font-medium text-slate-800">
                      {selectedInvoice.created_date ? format(new Date(selectedInvoice.created_date), 'dd MMMM yyyy', { locale: fr }) : '—'}
                    </p>
                  </div>
                </div>

                {/* Réservations concernées */}
                {selectedInvoice.bookings && selectedInvoice.bookings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Car className="w-4 h-4 text-subito" />
                      Réservations ({selectedInvoice.bookings.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedInvoice.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100">
                              {booking.serviceType === 'airport_shuttle' ? (
                                <Plane className="w-4 h-4 text-subito" />
                              ) : booking.serviceType === 'inter_city' ? (
                                <MapPin className="w-4 h-4 text-subito" />
                              ) : booking.serviceType === 'vtc_hourly' ? (
                                <Car className="w-4 h-4 text-subito" />
                              ) : (
                                <FileText className="w-4 h-4 text-subito" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">
                                {booking.bookingCode || `#${booking.id}`}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{SERVICE_LABELS[booking.serviceType || ''] || booking.serviceType}</span>
                                {booking.clientName && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {booking.clientName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {booking.totalPrice != null && (
                              <p className="font-semibold text-slate-800 text-sm">
                                {Number(booking.totalPrice).toLocaleString()} FCFA
                              </p>
                            )}
                            {booking.createdAt && (
                              <p className="text-xs text-slate-400">
                                {format(new Date(booking.createdAt), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents de voyage concernés */}
                {selectedInvoice.travelDocuments && selectedInvoice.travelDocuments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-subito" />
                      Documents de voyage ({selectedInvoice.travelDocuments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedInvoice.travelDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">
                                {doc.reference || `#${doc.id}`}
                              </p>
                              {(doc.firstName || doc.lastName) && (
                                <p className="text-xs text-slate-500">
                                  {doc.firstName} {doc.lastName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {doc.totalPrice != null && (
                              <p className="font-semibold text-slate-800 text-sm">
                                {Number(doc.totalPrice).toLocaleString()} FCFA
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aucune réservation */}
                {(!selectedInvoice.bookings || selectedInvoice.bookings.length === 0) &&
                 (!selectedInvoice.travelDocuments || selectedInvoice.travelDocuments.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-2">
                    Aucune réservation associée
                  </p>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Download className="w-4 h-4" />
                    Telecharger PDF
                  </Button>
                  {selectedInvoice.status === 'pending' && (
                    <Button className="flex-1 gradient-subito text-white border-0">
                      Payer maintenant
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Request Invoice Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-subito">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              Demander une facture
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">
              Génère une facture regroupant vos réservations non encore facturées sur la période sélectionnée.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={requestStartDate}
                  onChange={(e) => setRequestStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Date fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={requestEndDate}
                  onChange={(e) => setRequestEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => requestInvoiceMutation.mutate()}
              disabled={requestInvoiceMutation.isPending || !requestStartDate || !requestEndDate}
              className="gradient-subito text-white border-0 gap-2"
            >
              {requestInvoiceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Générer la facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
