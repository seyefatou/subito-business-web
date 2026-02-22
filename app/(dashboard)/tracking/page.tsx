'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, BookingResponse, TravelDocumentResponse } from "@/lib/api";
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
  Eye,
  X,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
} from "@/components/ui/dialog";

const serviceLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  airport_shuttle: { label: "Navette Aeroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  inter_city: { label: "Inter-ville", icon: Car, color: "bg-green-100 text-green-700" },
  vtc_hourly: { label: "VTC Horaire", icon: Clock, color: "bg-purple-100 text-purple-700" },
  visa_assistance: { label: "Documents Voyage", icon: FileText, color: "bg-orange-100 text-orange-700" },
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
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const limit = 10;

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

  console.log('[TRACKING] Raw bookings response:', JSON.stringify(bookingsResponse)?.substring(0, 800));
  console.log('[TRACKING] Raw travel docs response:', JSON.stringify(travelDocsResponse)?.substring(0, 800));

  const rawData = bookingsResponse?.data;
  const bookingsData = (rawData as any)?.data || rawData;
  const regularBookings: BookingResponse[] = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as any)?.items || (bookingsData as any)?.list || [];

  // Convert travel documents to BookingResponse-like format
  const travelDocsRaw = travelDocsResponse?.data;
  const travelDocsData = (travelDocsRaw as any)?.data || travelDocsRaw;
  const travelDocsArray: TravelDocumentResponse[] = Array.isArray(travelDocsData)
    ? travelDocsData
    : (travelDocsData as any)?.items || (travelDocsData as any)?.list || [];

  const travelDocsAsBookings: BookingResponse[] = travelDocsArray.map(td => ({
    id: td.id,
    reference: td.reference || `TD-${td.id}`,
    serviceType: 'visa_assistance',
    status: td.status || 'pending',
    clientName: [td.firstName, td.lastName].filter(Boolean).join(' ') || (td as any).clientName || '-',
    clientPhone: (td as any).phone || (td as any).clientPhone || '',
    clientEmail: (td as any).email || (td as any).clientEmail || '',
    totalPrice: (td as any).totalPrice || (td as any).amount || 0,
    createdAt: td.createdAt,
    updatedAt: td.updatedAt,
  }));

  // Merge and sort by creation date (most recent first)
  const bookings: BookingResponse[] = [...regularBookings, ...travelDocsAsBookings].sort(
    (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  );

  const meta = (rawData as any)?.meta || {};
  const travelDocsMeta = (travelDocsRaw as any)?.meta || {};
  const totalBookingsCount = (meta.total || regularBookings.length) + (travelDocsMeta.total || travelDocsArray.length);
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
      ((b as any).bookingCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((b as any).customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
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
                      const name = booking.clientName || (booking as any).customerName || '-';
                      const code = (booking as any).bookingCode || booking.reference || `#${booking.id}`;
                      const price = booking.totalPrice || (booking as any).totalPrice;

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
                              <p className="text-xs text-slate-500">{booking.clientPhone || (booking as any).customerPhone || ''}</p>
                            </div>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Page {page} sur {totalPages} ({meta.total || filtered.length} resultats)
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
            )}
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
                  {(bookingDetail as any).bookingCode || bookingDetail.reference || `#${bookingDetail.id}`}
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
                <p className="font-medium text-slate-800">{bookingDetail.clientName || (bookingDetail as any).customerName}</p>
                {(bookingDetail.clientPhone || (bookingDetail as any).customerPhone) && (
                  <p className="text-sm text-slate-500">{bookingDetail.clientPhone || (bookingDetail as any).customerPhone}</p>
                )}
                {(bookingDetail.clientEmail || (bookingDetail as any).customerEmail) && (
                  <p className="text-sm text-slate-500">{bookingDetail.clientEmail || (bookingDetail as any).customerEmail}</p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                {/* Travel Document specific fields */}
                {bookingDetail.serviceType === 'visa_assistance' && (
                  <>
                    {(bookingDetail as any).destinationCountry && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Destination</span>
                        <span className="text-sm font-medium text-slate-800">
                          {(bookingDetail as any).destinationCity ? `${(bookingDetail as any).destinationCity}, ` : ''}
                          {(bookingDetail as any).destinationCountry}
                        </span>
                      </div>
                    )}
                    {(bookingDetail as any).departureCountry && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Depart</span>
                        <span className="text-sm font-medium text-slate-800">
                          {(bookingDetail as any).departureCity ? `${(bookingDetail as any).departureCity}, ` : ''}
                          {(bookingDetail as any).departureCountry}
                        </span>
                      </div>
                    )}
                    {(bookingDetail as any).passportNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Passeport</span>
                        <span className="text-sm font-medium text-slate-800">{(bookingDetail as any).passportNumber}</span>
                      </div>
                    )}
                    {(bookingDetail as any).travelReason && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Motif</span>
                        <span className="text-sm font-medium text-slate-800 capitalize">{(bookingDetail as any).travelReason}</span>
                      </div>
                    )}
                    {(bookingDetail as any).flightReservation && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Vol</span>
                        <Badge className="bg-blue-100 text-blue-700 border-0">Reservation vol</Badge>
                      </div>
                    )}
                    {(bookingDetail as any).hotelReservation && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Hotel</span>
                        <Badge className="bg-green-100 text-green-700 border-0">Reservation hotel</Badge>
                      </div>
                    )}
                    {(bookingDetail as any).travelInsurance && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Assurance</span>
                        <Badge className="bg-purple-100 text-purple-700 border-0">Assurance voyage</Badge>
                      </div>
                    )}
                  </>
                )}
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
                {(bookingDetail as any).paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Paiement</span>
                    <span className="text-sm font-medium text-slate-800">{(bookingDetail as any).paymentMethod}</span>
                  </div>
                )}
                {(bookingDetail as any).canal && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Canal</span>
                    <span className="text-sm font-medium text-slate-800">{(bookingDetail as any).canal}</span>
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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
