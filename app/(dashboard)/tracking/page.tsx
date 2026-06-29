'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, BookingResponse, TravelDocumentResponse, ServiceReservationResponse } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin,
  Search,
  Plane,
  Car,
  Clock,
  FileText,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Hotel,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const serviceLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  airport_shuttle: { label: "Navette Aeroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  inter_city: { label: "Inter-ville", icon: Car, color: "bg-green-100 text-green-700" },
  intercity: { label: "Inter-ville", icon: Car, color: "bg-green-100 text-green-700" },
  vtc_hourly: { label: "VTC Horaire", icon: Clock, color: "bg-purple-100 text-purple-700" },
  visa_assistance: { label: "Documents Voyage", icon: FileText, color: "bg-orange-100 text-orange-700" },
  ACTIVITE: { label: "Activite", icon: Compass, color: "bg-emerald-100 text-emerald-700" },
  LOGEMENT: { label: "Logement", icon: Hotel, color: "bg-cyan-100 text-cyan-700" },
  FLOTTE: { label: "Location de vehicule", icon: Car, color: "bg-pink-100 text-pink-700" },
  SALLE: { label: "Salle", icon: Package, color: "bg-orange-100 text-orange-700" },
  CIRCUIT: { label: "Circuit", icon: MapPin, color: "bg-indigo-100 text-indigo-700" },
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

export default function TrackingPage() {
  return (
    <Suspense fallback={null}>
      <Tracking />
    </Suspense>
  );
}

function Tracking() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");

  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearchTerm(s);
  }, [searchParams]);
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const pageSize = 10;
  const apiLimit = 100; // Récupérer plus de données pour paginer côté frontend

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterService, filterStatus]);

  // Fetch all company bookings — 3 types séparés (microservices)
  // Always fetch page 1 with larger limit, paginate frontend
  const { data: shuttleResponse, isLoading: shuttleLoading } = useQuery({
    queryKey: ['bookings-shuttle'],
    queryFn: () => api.bookings.airportShuttle.list(1, apiLimit),
  });
  const { data: interCityResponse, isLoading: interCityLoading } = useQuery({
    queryKey: ['bookings-intercity'],
    queryFn: () => api.bookings.interCity.list(1, apiLimit),
  });
  const { data: vtcResponse, isLoading: vtcLoading } = useQuery({
    queryKey: ['bookings-vtc'],
    queryFn: () => api.bookings.vtcHourly.list(1, apiLimit),
  });
  const isLoading = shuttleLoading || interCityLoading || vtcLoading;

  // Fetch travel documents
  const { data: travelDocsResponse, isLoading: travelDocsLoading } = useQuery({
    queryKey: ['travel-docs-compagny'],
    queryFn: () => api.travelDocuments.list({ page: 1, limit: apiLimit }),
  });

  // Fetch service reservations (activite, logement, flotte)
  const { data: serviceResResponse, isLoading: serviceResLoading } = useQuery({
    queryKey: ['service-reservations-compagny'],
    queryFn: () => api.serviceReservations.list(1, apiLimit),
  });

  // Helper — extraire un tableau depuis une réponse paginée
  function extractItems<T>(res: unknown): T[] {
    const data = (res as any)?.data;
    const payload = data?.data ?? data;
    if (Array.isArray(payload?.list)) return payload.list as T[];
    if (Array.isArray(payload?.items)) return payload.items as T[];
    if (Array.isArray(payload)) return payload as T[];
    return [];
  }
  function extractTotal(res: unknown): number {
    const data = (res as any)?.data;
    const payload = data?.data ?? data;
    const arr = extractItems(res);
    return Number(payload?.total ?? arr.length);
  }

  // Force le serviceType normalisé selon la source (quelle que soit la valeur renvoyée par l'API)
  const shuttleBookings = extractItems<BookingResponse>(shuttleResponse).map(b => ({ ...b, serviceType: 'airport_shuttle' }));
  const interCityBookings = extractItems<BookingResponse>(interCityResponse).map(b => ({ ...b, serviceType: 'inter_city' }));
  const vtcBookings = extractItems<BookingResponse>(vtcResponse).map(b => ({ ...b, serviceType: 'vtc_hourly' }));
  const regularBookings: BookingResponse[] = [...shuttleBookings, ...interCityBookings, ...vtcBookings];
  const bookingsTotal = extractTotal(shuttleResponse) + extractTotal(interCityResponse) + extractTotal(vtcResponse);

  const travelDocsArray = extractItems<TravelDocumentResponse>(travelDocsResponse);
  const travelDocsTotal = extractTotal(travelDocsResponse);

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

  const serviceResArray = extractItems<ServiceReservationResponse>(serviceResResponse);
  const serviceResTotal = extractTotal(serviceResResponse);

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
  const allBookings: BookingResponse[] = [...regularBookings, ...travelDocsAsBookings, ...serviceResAsBookings].sort(
    (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  );

  const isLoadingAll = isLoading || travelDocsLoading || serviceResLoading;

  // Exclude rejected payment requests (refused prise en charge) from the tracking table
  const rejectedPaymentStatuses = ['rejected', 'refused', 'declined'];
  const visibleBookings = allBookings.filter(b => {
    const paymentStatus = String((b as Record<string, unknown>).paymentStatus || '').toLowerCase();
    const status = (b.status || '').toLowerCase();
    if (rejectedPaymentStatuses.includes(paymentStatus)) return false;
    if (status === 'rejected' && b.paidBy === 'company') return false;
    return true;
  });

  // Client-side filtering FIRST
  const filtered = visibleBookings.filter(b => {
    const matchSearch = !searchTerm ||
      (b.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.bookingCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const t = (b.serviceType || '').toLowerCase();
    const normalizedType = t === 'intercity' ? 'inter_city'
      : t === 'airport_shuttle' ? 'airport_shuttle'
      : t === 'inter_city' ? 'inter_city'
      : t === 'vtc_hourly' ? 'vtc_hourly'
      : t === 'visa_assistance' ? 'visa_assistance'
      : b.serviceType || '';
    const matchService = filterService === 'all' || normalizedType === filterService;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchService && matchStatus;
  });

  // Paginate AFTER filtering
  const startIdx = (page - 1) * pageSize;
  const bookings = filtered.slice(startIdx, startIdx + pageSize);
  const totalBookingsCount = filtered.length;
  const totalPages = Math.ceil(totalBookingsCount / pageSize) || 1;

  // Stats
  const stats = {
    total: visibleBookings.length,
    confirmed: visibleBookings.filter(b => b.status === 'confirmed').length,
    inProgress: visibleBookings.filter(b => b.status === 'in_progress').length,
    completed: visibleBookings.filter(b => b.status === 'completed').length,
  };

  const getServiceInfo = (type?: string) => serviceLabels[type || ''] || { label: type || 'Autre', icon: Package, color: "bg-slate-100 text-slate-700" };
  const getStatusInfo = (status?: string) => statusLabels[status || ''] || { label: status || 'Inconnu', color: "bg-slate-100 text-slate-700" };

  // Route detail URL per service type
  const getDetailHref = (booking: BookingResponse): string => {
    const t = booking.serviceType || '';
    if (['airport_shuttle', 'inter_city', 'intercity', 'vtc_hourly'].includes(t)) {
      return `/tracking/${booking.id}?type=${t === 'intercity' ? 'inter_city' : t}`;
    }
    if (t === 'visa_assistance') return `/travel-documents/${booking.id}`;
    // Service reservations go to their own tracking page with proper details
    if (['SALLE', 'FLOTTE', 'LOGEMENT', 'ACTIVITE', 'CIRCUIT', 'HOTEL'].includes(t)) {
      return `/service-reservations/${booking.id}/tracking`;
    }
    return `/tracking/${booking.id}`;
  };

  // Editorial: service quick-filter pills
  const serviceFilters = [
    { id: "all", label: "Tout" },
    { id: "airport_shuttle", label: "Navette" },
    { id: "inter_city", label: "Inter-ville" },
    { id: "vtc_hourly", label: "VTC" },
    { id: "visa_assistance", label: "Documents" },
    { id: "ACTIVITE", label: "Activite" },
    { id: "LOGEMENT", label: "Logement" },
    { id: "FLOTTE", label: "Location" },
    { id: "SALLE", label: "Salle" },
    { id: "CIRCUIT", label: "Circuit" },
  ];

  // Status pill colors
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

      {/* Orders Table Container */}
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
                    {bookings.map((booking, index) => {
                      const service = getServiceInfo(booking.serviceType);
                      const status = getStatusInfo(booking.status);
                      const ServiceIcon = service.icon;
                      const name = booking.clientName || "-";
                      const code = booking.bookingCode || booking.reference || `#${booking.id}`;
                      const price = booking.totalPrice;
                      const pill = statusPillStyle(booking.status);
                      const paymentPaid =
                        String((booking as any).paymentStatus || "").toLowerCase() === "paid";
                      const href = getDetailHref(booking);

                      return (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-[#f0f4f8]/30 transition-colors group cursor-pointer"
                          onClick={() => window.location.href = href}
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
                          <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1.5 text-[#E04A1F] font-bold text-sm hover:underline underline-offset-4"
                            >
                              Details
                            </Link>
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
    </div>
  );
}
