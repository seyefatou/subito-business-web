'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, BookingResponse, TravelDocumentResponse, PaymentOption } from "@/lib/api";
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
  vtc_hourly: { label: "VTC Horaire", icon: Clock, color: "bg-purple-100 text-purple-700" },
  visa_assistance: { label: "Documents Voyage", icon: FileText, color: "bg-orange-100 text-orange-700" },
  CIRCUIT: { label: "Circuit", icon: Compass, color: "bg-emerald-100 text-emerald-700" },
  LOGEMENT: { label: "Logement", icon: Hotel, color: "bg-cyan-100 text-cyan-700" },
  FLOTTE: { label: "Flotte", icon: Car, color: "bg-pink-100 text-pink-700" },
};

const canalLabels: Record<string, string> = {
  Company: "Plateforme Entreprise",
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
  const [selectedPayMethod, setSelectedPayMethod] = useState('');
  const limit = 10;

  // Fetch payment options
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentOptions = (Array.isArray(paymentOptionsResponse?.data) ? paymentOptionsResponse.data : [])
    .filter((o: PaymentOption) => o.type !== 'wallet' && o.name?.toLowerCase() !== 'portefeuille')
    .map((o: PaymentOption) => ({ id: (o.type || o.name || '').toLowerCase(), label: o.name, desc: o.description || '' }));

  // Pay individual booking
  const payIndividualMutation = useMutation({
    mutationFn: ({ id, method }: { id: number; method?: string }) =>
      api.bookings.payIndividual(id, method ? { paymentMethod: method } : undefined),
    onSuccess: () => {
      toast.success('Reservation payee avec succes');
      setShowPayDialog(false);
      setDetailOpen(false);
      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ['bookings-compagny'] });
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

  // Merge and sort by creation date (most recent first)
  const bookings: BookingResponse[] = [...regularBookings, ...travelDocsAsBookings].sort(
    (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  );

  const totalBookingsCount = bookingsTotal + travelDocsTotal;
  const totalPages = Math.ceil(totalBookingsCount / limit) || 1;

  const isLoadingAll = isLoading || travelDocsLoading;

  // Fetch booking detail (handle travel docs separately)
  const isTravelDoc = selectedBooking?.serviceType === 'visa_assistance';
  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['booking-detail', selectedBooking?.id, isTravelDoc],
    queryFn: () => isTravelDoc
      ? api.travelDocuments.get(selectedBooking!.id)
      : api.bookings.get(selectedBooking!.id),
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

  // Client-side filtering
  const filtered = bookings.filter(b => {
    const matchSearch = !searchTerm ||
      (b.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.bookingCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchService = filterService === 'all' || b.serviceType === filterService;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchService && matchStatus;
  });

  // Stats
  const stats = {
    total: totalBookingsCount || bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    inProgress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  const getServiceInfo = (type?: string) => serviceLabels[type || ''] || { label: type || 'Autre', icon: Package, color: "bg-slate-100 text-slate-700" };
  const getStatusInfo = (status?: string) => statusLabels[status || ''] || { label: status || 'Inconnu', color: "bg-slate-100 text-slate-700" };

  const openDetail = (booking: BookingResponse) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl gradient-subito">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suivi des commandes</h1>
          <p className="text-slate-500">Suivez toutes vos reservations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: Package, color: "bg-slate-100" },
          { label: "Confirmees", value: stats.confirmed, icon: CheckCircle2, color: "bg-blue-100" },
          { label: "En cours", value: stats.inProgress, icon: Loader2, color: "bg-indigo-100" },
          { label: "Terminees", value: stats.completed, icon: CheckCircle2, color: "bg-green-100" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, reference..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              <SelectItem value="airport_shuttle">Navette Aeroport</SelectItem>
              <SelectItem value="inter_city">Inter-ville</SelectItem>
              <SelectItem value="vtc_hourly">VTC Horaire</SelectItem>
              <SelectItem value="visa_assistance">Documents Voyage</SelectItem>
              <SelectItem value="CIRCUIT">Circuit</SelectItem>
              <SelectItem value="LOGEMENT">Logement</SelectItem>
              <SelectItem value="FLOTTE">Flotte</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirme</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Termine</SelectItem>
              <SelectItem value="cancelled">Annule</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoadingAll ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucune reservation trouvee</p>
            <p className="text-sm">Les reservations apparaitront ici</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Reference</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Service</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Client</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Canal</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Montant</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Statut</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filtered.map((booking, index) => {
                      const service = getServiceInfo(booking.serviceType);
                      const status = getStatusInfo(booking.status);
                      const ServiceIcon = service.icon;
                      const name = booking.clientName || '-';
                      const code = booking.bookingCode || booking.reference || `#${booking.id}`;
                      const price = booking.totalPrice;

                      return (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => openDetail(booking)}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-medium text-slate-800">{code}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${service.color} border-0 gap-1`}>
                              <ServiceIcon className="w-3 h-3" />
                              {service.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{name}</p>
                              <p className="text-xs text-slate-500">{booking.clientPhone || ''}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {booking.canal ? (
                              <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{canalLabels[booking.canal] || booking.canal}</Badge>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800">
                              {price ? Number(price).toLocaleString() + ' FCFA' : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${status.color} border-0`}>{status.label}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {booking.createdAt ? format(new Date(booking.createdAt), 'dd MMM yyyy', { locale: fr }) : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(booking); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Page {page} sur {totalPages} — {totalBookingsCount} resultat{totalBookingsCount > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      className={p === page ? 'gradient-subito text-white border-0' : ''}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
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
              {/* Service & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const s = getServiceInfo(bookingDetail.serviceType);
                  return <Badge className={`${s.color} border-0 gap-1`}><s.icon className="w-3 h-3" />{s.label}</Badge>;
                })()}
                {(() => {
                  const st = getStatusInfo(bookingDetail.status);
                  return <Badge className={`${st.color} border-0`}>{st.label}</Badge>;
                })()}
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

              {/* ======= AIRPORT SHUTTLE / INTER-CITY: Trajet Aller / Retour ======= */}
              {(bookingDetail.serviceType === 'airport_shuttle' || bookingDetail.serviceType === 'inter_city') && (() => {
                const d = bookingDetail as any;
                const isRoundTrip = d.isOneWay === false || !!d.pickupDateRetour;
                const departVille = d.villeDepart?.nom || d.villeDepart?.name || d.departureCity || '';
                const arriveeVille = d.villeArrivee?.nom || d.villeArrivee?.name || d.arrivalCity || '';
                return (
                  <div className="space-y-3">
                    {/* Route summary */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-800">{departVille}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-800">{arriveeVille}</span>
                      <Badge className={`ml-auto border-0 text-xs ${isRoundTrip ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {isRoundTrip ? 'Aller-retour' : 'Aller simple'}
                      </Badge>
                    </div>

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
                      </div>
                      {/* Addresses for airport shuttle */}
                      {d.adressePriseEnChargeAller && (
                        <div>
                          <p className="text-xs text-slate-500">Adresse de prise en charge</p>
                          <p className="text-sm text-slate-800">{d.adressePriseEnChargeAller}</p>
                        </div>
                      )}
                      {/* Addresses for inter-city */}
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
                      {d.flightNumber && (
                        <div>
                          <p className="text-xs text-slate-500">Numero de vol</p>
                          <p className="text-sm font-medium text-slate-800">{d.flightNumber}</p>
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
                return (
                  <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-semibold text-slate-700">Details VTC</p>
                    </div>
                    {d.scheduledDatetime && (
                      <div>
                        <p className="text-xs text-slate-500">Date & Heure</p>
                        <p className="text-sm font-medium text-slate-800">
                          {format(new Date(d.scheduledDatetime), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                    )}
                    {(d.pickupAddress || d.adressePriseEnCharge) && (
                      <div>
                        <p className="text-xs text-slate-500">Adresse de prise en charge</p>
                        <p className="text-sm text-slate-800">{d.pickupAddress || d.adressePriseEnCharge}</p>
                      </div>
                    )}
                    {d.package && (
                      <div>
                        <p className="text-xs text-slate-500">Forfait</p>
                        <p className="text-sm font-medium text-slate-800">{d.package}</p>
                      </div>
                    )}
                    {d.vehicleType && (
                      <div>
                        <p className="text-xs text-slate-500">Type de vehicule</p>
                        <p className="text-sm font-medium text-slate-800">{d.vehicleType}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ======= VISA / TRAVEL DOCUMENTS ======= */}
              {bookingDetail.serviceType === 'visa_assistance' && (() => {
                const d = bookingDetail as any;
                return (
                  <div className="space-y-3">
                    {d.destinationCountry && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Destination</span>
                        <span className="text-sm font-medium text-slate-800">
                          {d.destinationCity ? `${d.destinationCity}, ` : ''}{d.destinationCountry}
                        </span>
                      </div>
                    )}
                    {d.departureCountry && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Depart</span>
                        <span className="text-sm font-medium text-slate-800">
                          {d.departureCity ? `${d.departureCity}, ` : ''}{d.departureCountry}
                        </span>
                      </div>
                    )}
                    {d.passportNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Passeport</span>
                        <span className="text-sm font-medium text-slate-800">{d.passportNumber}</span>
                      </div>
                    )}
                    {d.travelReason && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Motif</span>
                        <span className="text-sm font-medium text-slate-800 capitalize">{d.travelReason}</span>
                      </div>
                    )}
                    {d.departureDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Date depart</span>
                        <span className="text-sm font-medium text-slate-800">
                          {format(new Date(d.departureDate), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}
                    {d.returnDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Date retour</span>
                        <span className="text-sm font-medium text-slate-800">
                          {format(new Date(d.returnDate), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {d.flightReservation && <Badge className="bg-blue-100 text-blue-700 border-0">Reservation vol</Badge>}
                      {d.hotelReservation && <Badge className="bg-green-100 text-green-700 border-0">Reservation hotel</Badge>}
                      {d.travelInsurance && <Badge className="bg-purple-100 text-purple-700 border-0">Assurance voyage</Badge>}
                    </div>
                  </div>
                );
              })()}

              {/* ======= GENERIC FIELDS (for services without specific sections) ======= */}
              {!['airport_shuttle', 'inter_city', 'vtc_hourly', 'visa_assistance'].includes(bookingDetail.serviceType || '') && (
                <div className="space-y-3">
                  {(bookingDetail as any).departureDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Date depart</span>
                      <span className="text-sm font-medium text-slate-800">
                        {format(new Date((bookingDetail as any).departureDate), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                  )}
                  {(bookingDetail as any).passengers && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Passagers</span>
                      <span className="text-sm font-medium text-slate-800">{(bookingDetail as any).passengers}</span>
                    </div>
                  )}
                </div>
              )}

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

              {/* Pay button for unpaid bookings */}
              {String(bookingDetail.status || '').toUpperCase() !== 'PAID' && String((bookingDetail as any).paymentStatus || '').toUpperCase() !== 'PAID' && bookingDetail.paidBy !== 'client' && (
                <Button
                  className="w-full gradient-subito text-white border-0 gap-2"
                  onClick={() => {
                    const id = bookingDetail.id;
                    setDetailOpen(false);
                    setTimeout(() => {
                      setPayBookingId(id);
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
              Choisissez un mode de paiement.
            </p>
            <div className="space-y-2">
              {paymentOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setSelectedPayMethod(option.id)}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${selectedPayMethod === option.id
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className={`p-2 rounded-lg ${selectedPayMethod === option.id ? 'gradient-subito' : 'bg-slate-100'}`}>
                    <CreditCard className={`w-5 h-5 ${selectedPayMethod === option.id ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{option.label}</p>
                    {option.desc && <p className="text-xs text-slate-500">{option.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Annuler
            </Button>
            <Button
              className="gradient-subito text-white border-0 gap-2"
              disabled={!selectedPayMethod || payIndividualMutation.isPending}
              onClick={() => {
                if (payBookingId && selectedPayMethod) {
                  payIndividualMutation.mutate({ id: payBookingId, method: selectedPayMethod });
                }
              }}
            >
              {payIndividualMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
