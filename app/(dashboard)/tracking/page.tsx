'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiResponse, BookingResponse, TravelDocumentResponse, ServiceReservationResponse, PaymentOption, BictorysServiceType } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin,
  Search,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Car,
  Clock,
  FileText,
  Eye,
  X,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Compass,
  Hotel,
  ArrowRight,
  Building2,
  User,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const serviceLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  airport_shuttle: { label: "Navette Aeroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  inter_city: { label: "Inter-ville", icon: Car, color: "bg-green-100 text-green-700" },
  intercity: { label: "Inter-ville", icon: Car, color: "bg-green-100 text-green-700" },
  vtc_hourly: { label: "VTC Horaire", icon: Clock, color: "bg-purple-100 text-purple-700" },
  visa_assistance: { label: "Documents Voyage", icon: FileText, color: "bg-orange-100 text-orange-700" },
  ACTIVITE: { label: "Activite", icon: Compass, color: "bg-emerald-100 text-emerald-700" },
  LOGEMENT: { label: "Logement", icon: Hotel, color: "bg-cyan-100 text-cyan-700" },
  FLOTTE: { label: "Location de vehicule", icon: Car, color: "bg-pink-100 text-pink-700" },
};

const canalLabels: Record<string, string> = {
  Company: "Plateforme Entreprise",
  company: "Plateforme Entreprise",
  "App Mobile": "Application Mobile",
  WhatsApp: "WhatsApp",
  Web: "Site Web",
  Admin: "Administration",
  API: "API",
  Phone: "Telephone",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirme", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En cours", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Termine", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annule", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejete", color: "bg-red-100 text-red-700" },
  processing: { label: "En traitement", color: "bg-amber-100 text-amber-700" },
  deleted: { label: "Supprime", color: "bg-slate-100 text-slate-500" },
  paid: { label: "Paye", color: "bg-emerald-100 text-emerald-700" },
};

export default function Tracking() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payBookingId, setPayBookingId] = useState<number | null>(null);
  const [payBookingServiceType, setPayBookingServiceType] = useState<string>('');
  const [selectedPayMethod, setSelectedPayMethod] = useState('');
  const [payerType, setPayerType] = useState<'company' | 'client' | ''>('');
  const [clientPayLink, setClientPayLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const limit = 10;

  // Fetch payment options
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentOptions = [
    { id: 'bictorys', label: 'Payer en ligne', desc: 'Wave, Orange Money, carte bancaire…' },
  ];

  // Pay individual booking via Bictorys
  const payIndividualMutation = useMutation({
    mutationFn: async ({ id, serviceType }: { id: number; serviceType?: string }) => {
      const bictorysType: BictorysServiceType = ['ACTIVITE', 'LOGEMENT', 'FLOTTE'].includes(serviceType || '')
        ? 'service_reservation' : 'booking';
      const res = await api.bictorys.initiate({ serviceType: bictorysType, serviceId: id });
      const checkoutUrl = res?.data?.checkoutUrl || (res as any)?.checkoutUrl;
      if (!checkoutUrl) throw new Error('URL de paiement Bictorys non disponible');
      window.open(checkoutUrl, '_blank');
      return res;
    },
    onSuccess: () => {
      toast.success('Redirection vers la page de paiement');
      setShowPayDialog(false);
      setDetailOpen(false);
      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ['bookings-compagny'] });
      queryClient.invalidateQueries({ queryKey: ['service-reservations-compagny'] });
      queryClient.invalidateQueries({ queryKey: ['booking-detail'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du paiement');
    },
  });

  // Fetch all company bookings
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings-compagny', page],
    queryFn: () => api.bookings.list(page, limit),
  });

  // Fetch travel documents
  const { data: travelDocsResponse, isLoading: travelDocsLoading } = useQuery({
    queryKey: ['travel-docs-compagny', page],
    queryFn: () => api.travelDocuments.list({ page, limit }),
  });

  // Fetch service reservations (activite, logement, flotte)
  const { data: serviceResResponse, isLoading: serviceResLoading } = useQuery({
    queryKey: ['service-reservations-compagny', page],
    queryFn: () => api.serviceReservations.list(page, limit),
  });

  // Parse bookings response: handle { list, page, pageSize, total } or { items, total, page, limit }
  const rawData = bookingsResponse?.data as Record<string, unknown> | undefined;
  const bookingsPayload = (rawData?.data ?? rawData) as Record<string, unknown> | undefined;
  const regularBookings: BookingResponse[] = (() => {
    if (Array.isArray(bookingsPayload?.list)) return bookingsPayload.list as BookingResponse[];
    if (Array.isArray(bookingsPayload?.items)) return bookingsPayload.items as BookingResponse[];
    if (Array.isArray(bookingsPayload)) return bookingsPayload as unknown as BookingResponse[];
    return [];
  })();
  const bookingsTotal = Number(bookingsPayload?.total ?? regularBookings.length);

  // Parse travel documents response
  const travelDocsRaw = travelDocsResponse?.data as Record<string, unknown> | undefined;
  const travelDocsPayload = (travelDocsRaw?.data ?? travelDocsRaw) as Record<string, unknown> | undefined;
  const travelDocsArray: TravelDocumentResponse[] = (() => {
    if (Array.isArray(travelDocsPayload?.list)) return travelDocsPayload.list as TravelDocumentResponse[];
    if (Array.isArray(travelDocsPayload?.items)) return travelDocsPayload.items as TravelDocumentResponse[];
    if (Array.isArray(travelDocsPayload)) return travelDocsPayload as unknown as TravelDocumentResponse[];
    return [];
  })();
  const travelDocsTotal = Number(travelDocsPayload?.total ?? travelDocsArray.length);

  const travelDocsAsBookings: BookingResponse[] = travelDocsArray.map(td => ({
    id: td.id,
    reference: td.reference || `TD-${td.id}`,
    serviceType: 'visa_assistance',
    status: td.status || 'pending',
    clientName: [td.firstName, td.lastName].filter(Boolean).join(' ') || '-',
    clientPhone: (td as Record<string, unknown>).phone as string || '',
    clientEmail: (td as Record<string, unknown>).email as string || '',
    totalPrice: Number((td as Record<string, unknown>).totalPrice || 0),
    canal: (td as Record<string, unknown>).canal as string || undefined,
    createdAt: td.createdAt,
    updatedAt: td.updatedAt,
  }));

  // Parse service reservations response
  const serviceResRaw = serviceResResponse?.data as Record<string, unknown> | undefined;
  const serviceResPayload = (serviceResRaw?.data ?? serviceResRaw) as Record<string, unknown> | undefined;
  const serviceResArray: ServiceReservationResponse[] = (() => {
    if (Array.isArray(serviceResPayload?.list)) return serviceResPayload.list as ServiceReservationResponse[];
    if (Array.isArray(serviceResPayload?.items)) return serviceResPayload.items as ServiceReservationResponse[];
    if (Array.isArray(serviceResPayload)) return serviceResPayload as unknown as ServiceReservationResponse[];
    return [];
  })();
  const serviceResTotal = Number(serviceResPayload?.total ?? serviceResArray.length);

  const serviceResAsBookings: BookingResponse[] = serviceResArray.map(sr => ({
    id: sr.id,
    reference: sr.reference || `SRV-${sr.id}`,
    serviceType: sr.serviceType || 'ACTIVITE',
    status: sr.status || 'pending',
    paymentStatus: (sr as Record<string, unknown>).paymentStatus as string || undefined,
    clientName: sr.clientName || '-',
    clientPhone: sr.clientPhone || '',
    clientEmail: sr.clientEmail || '',
    totalPrice: Number(sr.totalPrice || 0),
    paidBy: sr.paidBy as 'client' | 'company' | undefined,
    paymentMethod: sr.paymentMethod || undefined,
    canal: (sr as Record<string, unknown>).canal as string || undefined,
    createdAt: sr.createdAt,
    updatedAt: sr.updatedAt,
  }));

  // Merge and sort by creation date (most recent first)
  const bookings: BookingResponse[] = [...regularBookings, ...travelDocsAsBookings, ...serviceResAsBookings].sort(
    (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  );

  const totalBookingsCount = bookingsTotal + travelDocsTotal + serviceResTotal;
  const totalPages = Math.ceil(totalBookingsCount / limit) || 1;

  const isLoadingAll = isLoading || travelDocsLoading || serviceResLoading;

  // Fetch booking detail (handle travel docs and service reservations separately)
  const isTravelDoc = selectedBooking?.serviceType === 'visa_assistance';
  const isServiceRes = ['ACTIVITE', 'LOGEMENT', 'FLOTTE'].includes(selectedBooking?.serviceType || '');
  const { data: detailResponse, isLoading: detailLoading } = useQuery<ApiResponse<BookingResponse | TravelDocumentResponse | ServiceReservationResponse>>({
    queryKey: ['booking-detail', selectedBooking?.id, isTravelDoc, isServiceRes],
    queryFn: async () => {
      if (isTravelDoc) return api.travelDocuments.get(selectedBooking!.id);
      if (isServiceRes) return api.serviceReservations.get(selectedBooking!.id);
      return api.bookings.get(selectedBooking!.id);
    },
    enabled: !!selectedBooking?.id && detailOpen,
  });
  const rawDetail = detailResponse?.data;
  const bookingDetail = isTravelDoc && rawDetail
    ? {
        ...selectedBooking,
        ...rawDetail,
        clientName: [rawDetail.firstName, rawDetail.lastName].filter(Boolean).join(' ') || (rawDetail as any).clientName,
        clientPhone: (rawDetail as any).phone || (rawDetail as any).clientPhone,
        clientEmail: (rawDetail as any).email || (rawDetail as any).clientEmail,
        serviceType: 'visa_assistance',
      } as BookingResponse
    : (rawDetail || selectedBooking) as BookingResponse;

  // Exclude rejected payment requests (refused prise en charge) from the tracking table
  const rejectedPaymentStatuses = ['rejected', 'refused', 'declined'];
  const visibleBookings = bookings.filter(b => {
    const paymentStatus = String((b as Record<string, unknown>).paymentStatus || '').toLowerCase();
    const status = (b.status || '').toLowerCase();
    // Hide if payment request was rejected by the company
    if (rejectedPaymentStatuses.includes(paymentStatus)) return false;
    // Hide if status is rejected and it was a company-paid booking (prise en charge refusée)
    if (status === 'rejected' && b.paidBy === 'company') return false;
    return true;
  });

  // Client-side filtering
  const filtered = visibleBookings.filter(b => {
    const matchSearch = !searchTerm ||
      (b.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.bookingCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const normalizedType = b.serviceType === 'intercity' ? 'inter_city' : b.serviceType;
    const matchService = filterService === 'all' || normalizedType === filterService;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchService && matchStatus;
  });

  // Stats
  const stats = {
    total: visibleBookings.length,
    confirmed: visibleBookings.filter(b => b.status === 'confirmed').length,
    inProgress: visibleBookings.filter(b => b.status === 'in_progress').length,
    completed: visibleBookings.filter(b => b.status === 'completed').length,
  };

  const getServiceInfo = (type?: string) => serviceLabels[type || ''] || { label: type || 'Autre', icon: Package, color: "bg-slate-100 text-slate-700" };
  const getStatusInfo = (status?: string) => statusLabels[status || ''] || { label: status || 'Inconnu', color: "bg-slate-100 text-slate-700" };

  const openDetail = (booking: BookingResponse) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  // Editorial: service quick-filter pills (keep status filter as Select to preserve every status option)
  const serviceFilters = [
    { id: "all", label: "Tout" },
    { id: "airport_shuttle", label: "Navette" },
    { id: "inter_city", label: "Inter-ville" },
    { id: "vtc_hourly", label: "VTC" },
    { id: "visa_assistance", label: "Documents" },
    { id: "ACTIVITE", label: "Activite" },
    { id: "LOGEMENT", label: "Logement" },
    { id: "FLOTTE", label: "Location" },
  ];

  // Status pill colors (editorial: pill with dot)
  const statusPillStyle = (s?: string): { bg: string; text: string; dot: string; pulse?: boolean } => {
    const k = (s || "").toLowerCase();
    if (k === "completed" || k === "paid")
      return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    if (k === "in_progress" || k === "processing")
      return { bg: "bg-[#ffdbd0]", text: "text-[#852300]", dot: "bg-[#E04A1F]", pulse: true };
    if (k === "confirmed")
      return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" };
    if (k === "pending")
      return { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
    if (k === "cancelled" || k === "rejected")
      return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
    return { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  };

  return (
    <div className="space-y-8 -m-2 md:-m-4 lg:-m-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[#171c1f] mb-2"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Mes Commandes
          </h1>
          <p className="text-[#585e6c] font-medium">
            Vous avez{" "}
            <span className="text-[#E04A1F] font-bold">{totalBookingsCount}</span>{" "}
            commande{totalBookingsCount > 1 ? "s" : ""} au total — {stats.inProgress} en cours,{" "}
            {stats.completed} termine{stats.completed > 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Rechercher une commande..."
              className="pl-10 pr-4 py-2.5 bg-white border-none rounded-xl text-sm w-64 shadow-sm focus:ring-2 focus:ring-[#E04A1F]/20 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-white border-none rounded-xl shadow-sm h-11 px-4 font-semibold">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirme</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Termine</SelectItem>
              <SelectItem value="paid">Paye</SelectItem>
              <SelectItem value="cancelled">Annule</SelectItem>
              <SelectItem value="processing">En traitement</SelectItem>
              <SelectItem value="deleted">Supprime</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Service Quick Filters (pills) */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {serviceFilters.map((f) => {
          const active = filterService === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilterService(f.id)}
              className={`px-6 py-2 rounded-full text-sm whitespace-nowrap font-bold transition-all ${
                active
                  ? "bg-[#E04A1F] text-white shadow-sm"
                  : "bg-[#f0f4f8] text-[#585e6c] hover:bg-[#e4e9ed]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Orders Table Container (editorial bento) */}
      <div className="bg-[#f0f4f8] rounded-[2rem] p-4">
        <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
          {isLoadingAll ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucune reservation trouvee</p>
              <p className="text-sm">Les reservations apparaitront ici</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] uppercase tracking-[0.15em] font-bold border-b border-[#eaeef2]">
                    <th className="px-6 py-5">ID Commande</th>
                    <th className="px-4 py-5">Service</th>
                    <th className="px-4 py-5">Date</th>
                    <th className="px-4 py-5">Client / Canal</th>
                    <th className="px-4 py-5">Statut</th>
                    <th className="px-4 py-5">Paiement</th>
                    <th className="px-4 py-5 text-right">Montant</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaeef2]/50">
                  <AnimatePresence>
                    {filtered.map((booking, index) => {
                      const service = getServiceInfo(booking.serviceType);
                      const status = getStatusInfo(booking.status);
                      const ServiceIcon = service.icon;
                      const name = booking.clientName || "-";
                      const code = booking.bookingCode || booking.reference || `#${booking.id}`;
                      const price = booking.totalPrice;
                      const pill = statusPillStyle(booking.status);
                      const paymentPaid =
                        String((booking as any).paymentStatus || "").toLowerCase() === "paid";

                      return (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-[#f0f4f8]/30 transition-colors group"
                        >
                          <td className="px-6 py-5">
                            <span className="font-mono text-sm font-bold text-[#E04A1F]">
                              {code}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl ${service.color} flex items-center justify-center shrink-0`}>
                                <ServiceIcon className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-sm text-[#171c1f] whitespace-nowrap">
                                {service.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm">
                              <p className="font-bold text-[#171c1f]">
                                {booking.createdAt
                                  ? format(new Date(booking.createdAt), "dd MMM yyyy", { locale: fr })
                                  : "-"}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {booking.createdAt
                                  ? format(new Date(booking.createdAt), "HH:mm", { locale: fr })
                                  : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm max-w-[180px]">
                              <p className="font-medium text-[#171c1f] truncate">{name}</p>
                              <p className="text-slate-400 text-xs truncate">
                                {booking.canal
                                  ? canalLabels[booking.canal] || booking.canal
                                  : booking.clientPhone || "—"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={`px-3 py-1.5 ${pill.bg} ${pill.text} rounded-full text-[11px] font-bold flex items-center gap-2 w-fit whitespace-nowrap`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${pill.dot} ${pill.pulse ? "animate-pulse" : ""}`}
                              />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            {paymentPaid ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-bold whitespace-nowrap">
                                Paye
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[11px] font-bold whitespace-nowrap">
                                Non paye
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-5 text-right whitespace-nowrap">
                            <span
                              className="font-black text-[#171c1f]"
                              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                            >
                              {price ? Number(price).toLocaleString("fr-FR") + " FCFA" : "-"}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            {['airport_shuttle', 'inter_city', 'intercity', 'vtc_hourly'].includes(booking.serviceType || '') ? (
                              <Link
                                href={`/tracking/${booking.id}?type=${booking.serviceType === 'intercity' ? 'inter_city' : booking.serviceType}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#E04A1F] font-bold text-sm hover:underline underline-offset-4"
                              >
                                Details
                              </Link>
                            ) : booking.serviceType === 'visa_assistance' ? (
                              <Link
                                href={`/travel-documents/${booking.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#E04A1F] font-bold text-sm hover:underline underline-offset-4"
                              >
                                Details
                              </Link>
                            ) : ['FLOTTE', 'LOGEMENT', 'ACTIVITE', 'HOTEL'].includes(booking.serviceType || '') ? (
                              <Link
                                href={`/service-reservations/${booking.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#E04A1F] font-bold text-sm hover:underline underline-offset-4"
                              >
                                Details
                              </Link>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(booking);
                                }}
                                className="text-[#E04A1F] font-bold text-sm hover:underline underline-offset-4"
                              >
                                Details
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoadingAll && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-2 sm:px-6 py-6 gap-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Page {page} sur {totalPages} — {totalBookingsCount} resultat
              {totalBookingsCount > 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                const active = p === page;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${
                      active
                        ? "bg-[#E04A1F] text-white shadow-lg shadow-[#E04A1F]/20"
                        : "bg-white text-[#171c1f] shadow-sm hover:bg-[#eaeef2]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Insights Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#E04A1F] p-8 rounded-[2rem] text-white flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <Package className="w-8 h-8 opacity-50" />
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
              Total
            </span>
          </div>
          <div>
            <p
              className="text-3xl font-black"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {stats.total}
            </p>
            <p className="text-white/80 text-sm font-medium">
              Commandes visibles{filterStatus !== "all" ? " (filtrees)" : ""}
            </p>
          </div>
        </div>

        <div className="bg-[#f0f4f8] p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <Loader2 className="w-8 h-8 text-[#E04A1F]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              En cours
            </span>
          </div>
          <div>
            <p
              className="text-3xl font-black text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {stats.inProgress}
            </p>
            <p className="text-slate-500 text-sm font-medium">
              Operations actuellement en transit
            </p>
          </div>
        </div>

        <div className="bg-[#171c1f] p-8 rounded-[2rem] text-white flex flex-col justify-between min-h-[160px] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-sm font-medium text-white/60 mb-2">Statut global</p>
            <p
              className="text-xl font-bold"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {stats.completed} commande{stats.completed > 1 ? "s" : ""} terminee
              {stats.completed > 1 ? "s" : ""} avec succes.
            </p>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <CheckCircle2 className="w-5 h-5 text-[#E04A1F]" />
            <span className="text-xs font-bold text-[#E04A1F]">
              Taux de reussite{" "}
              {stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E04A1F]/20 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detail de la reservation
              {bookingDetail && (
                <span className="font-mono text-sm text-slate-500">
                  {bookingDetail.bookingCode || bookingDetail.reference || `#${bookingDetail.id}`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : bookingDetail ? (
            <div className="space-y-4">
              {/* Service, Status & Payment */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const s = getServiceInfo(bookingDetail.serviceType);
                  return <Badge className={`${s.color} border-0 gap-1`}><s.icon className="w-3 h-3" />{s.label}</Badge>;
                })()}
                {(() => {
                  const st = getStatusInfo(bookingDetail.status);
                  return <Badge className={`${st.color} border-0`}>{st.label}</Badge>;
                })()}
                {String((bookingDetail as any).paymentStatus || '').toLowerCase() === 'paid'
                  ? <Badge className="bg-green-100 text-green-700 border-0">Payé</Badge>
                  : <Badge className="bg-yellow-100 text-yellow-700 border-0">Non payé</Badge>
                }
              </div>

              {/* Client */}
              <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                <p className="text-sm font-semibold text-slate-600">Client</p>
                <p className="font-medium text-slate-800">{bookingDetail.clientName}</p>
                {bookingDetail.clientPhone && (
                  <p className="text-sm text-slate-500">{bookingDetail.clientPhone}</p>
                )}
                {bookingDetail.clientEmail && (
                  <p className="text-sm text-slate-500">{bookingDetail.clientEmail}</p>
                )}
                {bookingDetail.paidBy && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500">Paye par :</span>
                    <Badge className={`text-xs border-0 ${bookingDetail.paidBy === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {bookingDetail.paidBy === 'company' ? 'Entreprise' : 'Client'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* ======= AIRPORT SHUTTLE: Trajet Aller / Retour ======= */}
              {bookingDetail.serviceType === 'airport_shuttle' && (() => {
                const d = bookingDetail as any;
                const isRoundTrip = d.isOneWay === false || !!d.pickupDateRetour;
                const departVille = d.villeDepart?.nom || d.villeDepart?.name || d.departureCity || '';
                const arriveeVille = d.villeArrivee?.nom || d.villeArrivee?.name || d.arrivalCity || '';
                return (
                  <div className="space-y-3">
                    {/* Route summary */}
                    {(departVille || arriveeVille) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
                        <Plane className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{departVille || '—'}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{arriveeVille || '—'}</span>
                        <Badge className={`ml-auto border-0 text-xs shrink-0 ${isRoundTrip ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {isRoundTrip ? 'Aller-retour' : 'Aller simple'}
                        </Badge>
                      </div>
                    )}

                    {/* ALLER */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <PlaneTakeoff className="w-4 h-4 text-orange-600" />
                        <p className="text-sm font-semibold text-slate-700">Aller</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Date & Heure</p>
                          <p className="text-sm font-medium text-slate-800">
                            {d.pickupDateAller ? format(new Date(d.pickupDateAller), 'dd MMM yyyy', { locale: fr }) : '—'}
                            {d.pickupTimeAller ? ` a ${d.pickupTimeAller}` : ''}
                          </p>
                        </div>
                        {d.passengers && (
                          <div>
                            <p className="text-xs text-slate-500">Passagers</p>
                            <p className="text-sm font-medium text-slate-800">{d.passengers}</p>
                          </div>
                        )}
                        {d.flightNumber && (
                          <div>
                            <p className="text-xs text-slate-500">Numero de vol</p>
                            <p className="text-sm font-medium text-slate-800">{d.flightNumber}</p>
                          </div>
                        )}
                      </div>
                      {d.adressePriseEnChargeAller && (
                        <div>
                          <p className="text-xs text-slate-500">Adresse de prise en charge</p>
                          <p className="text-sm text-slate-800">{d.adressePriseEnChargeAller}</p>
                        </div>
                      )}
                    </div>

                    {/* RETOUR */}
                    {isRoundTrip && (
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <PlaneLanding className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-semibold text-slate-700">Retour</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Date & Heure</p>
                            <p className="text-sm font-medium text-slate-800">
                              {d.pickupDateRetour ? format(new Date(d.pickupDateRetour), 'dd MMM yyyy', { locale: fr }) : '—'}
                              {d.pickupTimeRetour ? ` a ${d.pickupTimeRetour}` : ''}
                            </p>
                          </div>
                        </div>
                        {d.adressePriseEnChargeRetour && (
                          <div>
                            <p className="text-xs text-slate-500">Adresse de prise en charge retour</p>
                            <p className="text-sm text-slate-800">{d.adressePriseEnChargeRetour}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ======= INTER-CITY: Trajet Aller / Retour (route) ======= */}
              {bookingDetail.serviceType === 'inter_city' && (() => {
                const d = bookingDetail as any;
                const isRoundTrip = d.isOneWay === false || !!d.pickupDateRetour;
                const departVille = d.villeDepart?.nom || d.villeDepart?.name || d.departureCity || '';
                const arriveeVille = d.villeArrivee?.nom || d.villeArrivee?.name || d.arrivalCity || '';
                return (
                  <div className="space-y-3">
                    {/* Route summary */}
                    {(departVille || arriveeVille) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{departVille || '—'}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{arriveeVille || '—'}</span>
                        <Badge className={`ml-auto border-0 text-xs shrink-0 ${isRoundTrip ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {isRoundTrip ? 'Aller-retour' : 'Aller simple'}
                        </Badge>
                      </div>
                    )}

                    {/* ALLER */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-semibold text-slate-700">Aller</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Date & Heure depart</p>
                          <p className="text-sm font-medium text-slate-800">
                            {d.pickupDateAller ? format(new Date(d.pickupDateAller), 'dd MMM yyyy', { locale: fr }) : '—'}
                            {d.pickupTimeAller || d.departureTime ? ` a ${d.pickupTimeAller || d.departureTime}` : ''}
                          </p>
                        </div>
                        {d.arrivalTime && (
                          <div>
                            <p className="text-xs text-slate-500">Heure d&apos;arrivee</p>
                            <p className="text-sm font-medium text-slate-800">{d.arrivalTime}</p>
                          </div>
                        )}
                        {d.passengers && (
                          <div>
                            <p className="text-xs text-slate-500">Passagers</p>
                            <p className="text-sm font-medium text-slate-800">{d.passengers}</p>
                          </div>
                        )}
                        {d.vehicleType && (
                          <div>
                            <p className="text-xs text-slate-500">Vehicule</p>
                            <p className="text-sm font-medium text-slate-800">{d.vehicleType}</p>
                          </div>
                        )}
                      </div>
                      {d.adressePriseEnChargeDepartAller && (
                        <div>
                          <p className="text-xs text-slate-500">Adresse depart</p>
                          <p className="text-sm text-slate-800">{d.adressePriseEnChargeDepartAller}</p>
                        </div>
                      )}
                      {d.adressePriseEnChargeArriveeAller && (
                        <div>
                          <p className="text-xs text-slate-500">Adresse arrivee</p>
                          <p className="text-sm text-slate-800">{d.adressePriseEnChargeArriveeAller}</p>
                        </div>
                      )}
                    </div>

                    {/* RETOUR */}
                    {isRoundTrip && (
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-semibold text-slate-700">Retour</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Date & Heure depart</p>
                            <p className="text-sm font-medium text-slate-800">
                              {d.pickupDateRetour ? format(new Date(d.pickupDateRetour), 'dd MMM yyyy', { locale: fr }) : '—'}
                              {d.pickupTimeRetour || d.departureTimeRetour ? ` a ${d.pickupTimeRetour || d.departureTimeRetour}` : ''}
                            </p>
                          </div>
                          {d.arrivalTimeRetour && (
                            <div>
                              <p className="text-xs text-slate-500">Heure d&apos;arrivee</p>
                              <p className="text-sm font-medium text-slate-800">{d.arrivalTimeRetour}</p>
                            </div>
                          )}
                        </div>
                        {d.adressePriseEnChargeDepartRetour && (
                          <div>
                            <p className="text-xs text-slate-500">Adresse depart retour</p>
                            <p className="text-sm text-slate-800">{d.adressePriseEnChargeDepartRetour}</p>
                          </div>
                        )}
                        {d.adressePriseEnChargeArriveeRetour && (
                          <div>
                            <p className="text-xs text-slate-500">Adresse arrivee retour</p>
                            <p className="text-sm text-slate-800">{d.adressePriseEnChargeArriveeRetour}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ======= VTC HOURLY ======= */}
              {bookingDetail.serviceType === 'vtc_hourly' && (() => {
                const d = bookingDetail as any;
                const pickupAddress = d.pickupAddress || d.adressePriseEnCharge;
                return (
                  <div className="space-y-3">
                    {/* Route summary */}
                    {(pickupAddress || d.package) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {pickupAddress || '—'}
                        </span>
                        {d.package && (
                          <Badge className="ml-auto border-0 text-xs bg-purple-100 text-purple-700 shrink-0">
                            {d.package}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Trajet card */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-semibold text-slate-700">Details du trajet</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {d.scheduledDatetime && (
                          <div>
                            <p className="text-xs text-slate-500">Date & Heure</p>
                            <p className="text-sm font-medium text-slate-800">
                              {format(new Date(d.scheduledDatetime), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                        )}
                        {d.vehicleType && (
                          <div>
                            <p className="text-xs text-slate-500">Type de vehicule</p>
                            <p className="text-sm font-medium text-slate-800">{d.vehicleType}</p>
                          </div>
                        )}
                        {d.package && (
                          <div>
                            <p className="text-xs text-slate-500">Forfait</p>
                            <p className="text-sm font-medium text-slate-800">{d.package}</p>
                          </div>
                        )}
                        {d.country && (
                          <div>
                            <p className="text-xs text-slate-500">Pays</p>
                            <p className="text-sm font-medium text-slate-800">{d.country}</p>
                          </div>
                        )}
                      </div>
                      {pickupAddress && (
                        <div>
                          <p className="text-xs text-slate-500">Adresse de prise en charge</p>
                          <p className="text-sm text-slate-800">{pickupAddress}</p>
                        </div>
                      )}
                      {d.notes && (
                        <div>
                          <p className="text-xs text-slate-500">Notes</p>
                          <p className="text-sm text-slate-800">{d.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ======= VISA / TRAVEL DOCUMENTS ======= */}
              {bookingDetail.serviceType === 'visa_assistance' && (() => {
                const d = bookingDetail as any;
                const departLabel = [d.departureCity, d.departureCountry].filter(Boolean).join(', ');
                const destinationLabel = [d.destinationCity, d.destinationCountry].filter(Boolean).join(', ');
                const hasReturn = !!d.returnDate;
                return (
                  <div className="space-y-3">
                    {/* Route summary */}
                    {(departLabel || destinationLabel) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{departLabel || '—'}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{destinationLabel || '—'}</span>
                        <Badge className={`ml-auto border-0 text-xs shrink-0 ${hasReturn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {hasReturn ? 'Aller-retour' : 'Aller simple'}
                        </Badge>
                      </div>
                    )}

                    {/* ALLER */}
                    {(d.departureDate || departLabel) && (
                      <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <PlaneTakeoff className="w-4 h-4 text-orange-600" />
                          <p className="text-sm font-semibold text-slate-700">Depart</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {d.departureDate && (
                            <div>
                              <p className="text-xs text-slate-500">Date</p>
                              <p className="text-sm font-medium text-slate-800">
                                {format(new Date(d.departureDate), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          )}
                          {departLabel && (
                            <div>
                              <p className="text-xs text-slate-500">Ville / Pays</p>
                              <p className="text-sm font-medium text-slate-800">{departLabel}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RETOUR */}
                    {hasReturn && (
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <PlaneLanding className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-semibold text-slate-700">Retour</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Date</p>
                            <p className="text-sm font-medium text-slate-800">
                              {format(new Date(d.returnDate), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                          {destinationLabel && (
                            <div>
                              <p className="text-xs text-slate-500">Provenance</p>
                              <p className="text-sm font-medium text-slate-800">{destinationLabel}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents & details card */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <p className="text-sm font-semibold text-slate-700">Documents & details</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {d.passportNumber && (
                          <div>
                            <p className="text-xs text-slate-500">Passeport</p>
                            <p className="text-sm font-medium text-slate-800">{d.passportNumber}</p>
                          </div>
                        )}
                        {d.nationality && (
                          <div>
                            <p className="text-xs text-slate-500">Nationalite</p>
                            <p className="text-sm font-medium text-slate-800">{d.nationality}</p>
                          </div>
                        )}
                        {d.travelReason && (
                          <div>
                            <p className="text-xs text-slate-500">Motif</p>
                            <p className="text-sm font-medium text-slate-800 capitalize">{d.travelReason}</p>
                          </div>
                        )}
                        {d.numberOfPeople && (
                          <div>
                            <p className="text-xs text-slate-500">Voyageurs</p>
                            <p className="text-sm font-medium text-slate-800">{d.numberOfPeople}</p>
                          </div>
                        )}
                        {d.hotelCategory && (
                          <div>
                            <p className="text-xs text-slate-500">Categorie hotel</p>
                            <p className="text-sm font-medium text-slate-800">{d.hotelCategory}</p>
                          </div>
                        )}
                        {d.roomType && (
                          <div>
                            <p className="text-xs text-slate-500">Type de chambre</p>
                            <p className="text-sm font-medium text-slate-800">{d.roomType}</p>
                          </div>
                        )}
                      </div>
                      {(d.flightReservation || d.hotelReservation || d.travelInsurance) && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1.5">Services inclus</p>
                          <div className="flex flex-wrap gap-2">
                            {d.flightReservation && <Badge className="bg-blue-100 text-blue-700 border-0 gap-1"><Plane className="w-3 h-3" />Reservation vol</Badge>}
                            {d.hotelReservation && <Badge className="bg-green-100 text-green-700 border-0 gap-1"><Hotel className="w-3 h-3" />Reservation hotel</Badge>}
                            {d.travelInsurance && <Badge className="bg-purple-100 text-purple-700 border-0">Assurance voyage</Badge>}
                          </div>
                        </div>
                      )}
                      {d.hotelDetails && (
                        <div>
                          <p className="text-xs text-slate-500">Details hotel</p>
                          <p className="text-sm text-slate-800">{d.hotelDetails}</p>
                        </div>
                      )}
                      {d.notes && (
                        <div>
                          <p className="text-xs text-slate-500">Notes</p>
                          <p className="text-sm text-slate-800">{d.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ======= GENERIC FIELDS (for services without specific sections) ======= */}
              {!['airport_shuttle', 'inter_city', 'vtc_hourly', 'visa_assistance'].includes(bookingDetail.serviceType || '') && (() => {
                const d = bookingDetail as any;
                const hasContent = d.departureDate || d.passengers || d.pickupAddress || d.dropoffAddress || d.notes;
                if (!hasContent) return null;
                return (
                  <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-700">Details du service</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {d.departureDate && (
                        <div>
                          <p className="text-xs text-slate-500">Date depart</p>
                          <p className="text-sm font-medium text-slate-800">
                            {format(new Date(d.departureDate), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                        </div>
                      )}
                      {d.passengers && (
                        <div>
                          <p className="text-xs text-slate-500">Passagers</p>
                          <p className="text-sm font-medium text-slate-800">{d.passengers}</p>
                        </div>
                      )}
                    </div>
                    {d.pickupAddress && (
                      <div>
                        <p className="text-xs text-slate-500">Adresse de prise en charge</p>
                        <p className="text-sm text-slate-800">{d.pickupAddress}</p>
                      </div>
                    )}
                    {d.dropoffAddress && (
                      <div>
                        <p className="text-xs text-slate-500">Adresse de depose</p>
                        <p className="text-sm text-slate-800">{d.dropoffAddress}</p>
                      </div>
                    )}
                    {d.notes && (
                      <div>
                        <p className="text-xs text-slate-500">Notes</p>
                        <p className="text-sm text-slate-800">{d.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ======= COMMON FIELDS (all services) ======= */}
              <div className="space-y-3">
                {bookingDetail.clientAddress && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Adresse client</span>
                    <span className="text-sm font-medium text-slate-800">{bookingDetail.clientAddress}</span>
                  </div>
                )}
                {bookingDetail.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Mode de paiement</span>
                    <span className="text-sm font-medium text-slate-800">
                      {bookingDetail.paymentMethod === 'cash' ? 'Especes' :
                       bookingDetail.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                       bookingDetail.paymentMethod === 'wallet' ? 'Portefeuille' :
                       bookingDetail.paymentMethod === 'bank_transfer' ? 'Virement bancaire' :
                       bookingDetail.paymentMethod}
                    </span>
                  </div>
                )}
                {bookingDetail.canal && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Canal</span>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{canalLabels[bookingDetail.canal] || bookingDetail.canal}</Badge>
                  </div>
                )}
                {bookingDetail.tag && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Tag</span>
                    <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">{bookingDetail.tag}</Badge>
                  </div>
                )}
                {bookingDetail.discountAmount != null && bookingDetail.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Remise</span>
                    <span className="text-sm font-medium text-green-600">
                      -{Number(bookingDetail.discountAmount).toLocaleString()} FCFA
                      {bookingDetail.discountPercent ? ` (${bookingDetail.discountPercent}%)` : ''}
                    </span>
                  </div>
                )}
                {bookingDetail.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Cree le</span>
                    <span className="text-sm font-medium text-slate-800">
                      {format(new Date(bookingDetail.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              {bookingDetail.totalPrice && (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="text-2xl font-bold text-orange-600">{Number(bookingDetail.totalPrice).toLocaleString()} FCFA</span>
                </div>
              )}

              {/* Pay button — when reservation is confirmed or completed and not yet paid */}
              {['confirmed', 'completed'].includes(String(bookingDetail.status || '').toLowerCase()) && String((bookingDetail as any).paymentStatus || '').toUpperCase() !== 'PAID' && bookingDetail.paidBy !== 'client' && (
                <Button
                  className="w-full gradient-subito text-white border-0 gap-2"
                  onClick={() => {
                    const id = bookingDetail.id;
                    const sType = bookingDetail.serviceType || '';
                    setDetailOpen(false);
                    setTimeout(() => {
                      setPayBookingId(id);
                      setPayBookingServiceType(sType);
                      setSelectedPayMethod('');
                      setShowPayDialog(true);
                    }, 150);
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  Payer cette reservation
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Pay Booking Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-subito">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              Payer la reservation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">
              Vous allez etre redirige vers la page de paiement Bictorys pour choisir votre moyen de paiement (Wave, Orange Money, carte bancaire…).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Annuler
            </Button>
            <Button
              className="gradient-subito text-white border-0 gap-2"
              disabled={payIndividualMutation.isPending}
              onClick={() => {
                if (payBookingId) {
                  payIndividualMutation.mutate({ id: payBookingId, serviceType: payBookingServiceType });
                }
              }}
            >
              {payIndividualMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Payer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
