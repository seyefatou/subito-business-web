'use client';

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Package,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Ban,
  Truck,
  Copy,
  Calendar as CalendarIcon,
  CreditCard,
  ArrowRight,
  AlertCircle,
  User,
  Building2,
  Receipt,
  Hash,
  History,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, DeliveryResponse } from "@/lib/api";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirme", color: "bg-blue-100 text-blue-700" },
  assigned: { label: "Assigne", color: "bg-indigo-100 text-indigo-700" },
  picked_up: { label: "Recupere", color: "bg-purple-100 text-purple-700" },
  in_transit: { label: "En transit", color: "bg-cyan-100 text-cyan-700" },
  delivered: { label: "Livre", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annule", color: "bg-red-100 text-red-700" },
};

export default function DeliveryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = parseInt(params?.id || "", 10);

  const { data, isLoading, error } = useQuery<unknown>({
    queryKey: ["delivery-detail-page", id],
    queryFn: () => api.deliveries.get(id),
    enabled: !isNaN(id),
  });

  const raw = data as Record<string, unknown> | undefined;
  const wrapped = raw
    && typeof raw.data === "object"
    && raw.data !== null
    && "id" in (raw.data as Record<string, unknown>)
      ? (raw.data as Record<string, unknown>)
      : raw;
  const deliveryDetail = wrapped as (DeliveryResponse & Record<string, unknown>) | undefined;

  const cancelMutation = useMutation({
    mutationFn: (delId: number) => api.deliveries.cancel(delId),
    onSuccess: () => {
      toast.success("Livraison annulee");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail-page"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Impossible d'annuler cette livraison");
    },
  });

  if (isNaN(id)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Identifiant invalide</p>
        <Button variant="outline" onClick={() => router.push("/deliveries")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (error || !deliveryDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Livraison introuvable</p>
        <Button variant="outline" onClick={() => router.push("/deliveries")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  const statusKey = (deliveryDetail.status || "").toLowerCase();
  const trackSteps = [
    { id: "assigned", label: "Assigne" },
    { id: "picked_up", label: "Recupere" },
    { id: "in_transit", label: "En transit" },
    { id: "delivered", label: "Livre" },
  ];
  const stepIdx = (() => {
    if (statusKey === "delivered") return 3;
    if (statusKey === "in_transit") return 2;
    if (statusKey === "picked_up") return 1;
    if (statusKey === "assigned" || statusKey === "confirmed") return 0;
    return -1;
  })();
  const isCancelled = statusKey === "cancelled";
  const totalAmount = Number(deliveryDetail.totalTTC || deliveryDetail.originalPrice || 0);
  const reference = deliveryDetail.reference || `#${deliveryDetail.id}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* Breadcrumbs + Title + Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/deliveries" className="hover:text-[#E04A1F] cursor-pointer transition-colors font-medium">
              Livraisons
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold">{reference}</span>
          </nav>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E04A1F] mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E04A1F] animate-pulse" />
            Live Tracking
          </p>
          <h1
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Order {reference}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-4 py-1.5 ${
              (statusLabels[statusKey] || { color: "bg-slate-100 text-slate-700" }).color
            } rounded-full text-xs font-bold flex items-center gap-2`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {(statusLabels[statusKey] || { label: deliveryDetail.status }).label}
          </span>
          {(() => {
            const dt = deliveryDetail.deliveryType as Record<string, unknown> | undefined;
            const dtName = (dt?.nom as string | undefined) || (dt?.name as string | undefined);
            return dtName ? (
              <span className="px-4 py-1.5 bg-[#00acbb]/10 text-[#006972] rounded-full text-xs font-bold whitespace-nowrap">
                {dtName}
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Tracking stepper */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center w-full">
            {trackSteps.map((step, i) => {
              const isDone = stepIdx > i;
              const isActive = stepIdx === i;
              const isLast = i === trackSteps.length - 1;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className={`rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "w-10 h-10 bg-[#E04A1F] text-white ring-4 ring-[#ffdbd0]"
                          : isDone
                          ? "w-9 h-9 bg-[#E04A1F] text-white"
                          : "w-9 h-9 bg-[#dfe3e7] text-slate-400"
                      }`}
                    >
                      {isDone || isActive ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? "text-[#E04A1F]" : isDone ? "text-[#171c1f]" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-1 mx-2 -mt-5 rounded-full overflow-hidden bg-[#dfe3e7]">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isDone ? "bg-[#E04A1F] w-full" : "bg-transparent w-0"
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Map + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map placeholder */}
        <div className="lg:col-span-8">
          <div className="relative h-[400px] bg-gradient-to-br from-[#171c1f] via-[#1a2030] to-[#0a1428] rounded-3xl overflow-hidden shadow-xl">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00acbb" />
                  <stop offset="100%" stopColor="#E04A1F" />
                </linearGradient>
              </defs>
              <path
                d="M 80 320 Q 250 280 380 240 T 720 80"
                stroke="url(#routeGrad)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="8 8"
              />
            </svg>
            <div className="absolute left-[8%] bottom-[18%] flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-[#00acbb] ring-4 ring-[#00acbb]/30" />
              <div className="text-[10px] font-bold text-[#00acbb] mt-1 uppercase tracking-widest bg-white/10 backdrop-blur-md px-2 py-0.5 rounded">
                Depart
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#E04A1F]/30 animate-ping rounded-full scale-150" />
                <div className="w-12 h-12 rounded-full bg-[#E04A1F] flex items-center justify-center shadow-2xl shadow-[#E04A1F]/50 relative">
                  <Truck className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="absolute right-[8%] top-[15%] flex flex-col items-center">
              <MapPin className="w-8 h-8 text-[#E04A1F] drop-shadow-lg" fill="#E04A1F" />
              <div className="text-[10px] font-bold text-white mt-1 uppercase tracking-widest bg-[#E04A1F]/80 backdrop-blur-md px-2 py-0.5 rounded">
                Arrivee
              </div>
            </div>
            <div className="absolute top-4 left-4 flex flex-col gap-1 bg-white/10 backdrop-blur-md rounded-xl p-1">
              <button className="w-8 h-8 rounded-lg hover:bg-white/10 text-white flex items-center justify-center font-bold">+</button>
              <button className="w-8 h-8 rounded-lg hover:bg-white/10 text-white flex items-center justify-center font-bold">−</button>
            </div>
            <button className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/10 backdrop-blur-md text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-white/20">
              <ArrowRight className="w-3 h-3" /> Agrandir
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] mb-3">
                <MapPin className="w-4 h-4" />
              </div>
              <p
                className="text-2xl font-black text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {deliveryDetail.distanceKm || deliveryDetail.distance
                  ? Number(deliveryDetail.distanceKm || deliveryDetail.distance).toFixed(1)
                  : "—"}{" "}
                <span className="text-sm text-slate-400">km</span>
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">Distance totale</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-[#dde2f3] flex items-center justify-center text-[#414754] mb-3">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <p
                className="text-2xl font-black text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {deliveryDetail.deliveryTime || "—"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">Heure prevue</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-[#00acbb]/10 flex items-center justify-center text-[#006972] mb-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <p
                className="text-2xl font-black text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {Math.round(totalAmount).toLocaleString("fr-FR")}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">FCFA estimes</p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Courier card */}
          {deliveryDetail.livreur ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E04A1F] to-[#ff7043] flex items-center justify-center text-white font-bold">
                  {deliveryDetail.livreur.prenom?.[0]}
                  {deliveryDetail.livreur.nom?.[0]}
                </div>
                <div>
                  <p className="font-bold text-[#171c1f]">
                    {deliveryDetail.livreur.prenom} {deliveryDetail.livreur.nom}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#E04A1F]">★</span>
                    <span className="font-bold text-[#171c1f]">4.9</span>
                    <span className="text-slate-400">livreur</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#f0f4f8] p-2.5 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Vehicule
                  </p>
                  <p className="text-xs font-bold text-[#171c1f] truncate flex items-center gap-1 mt-1">
                    <Truck className="w-3 h-3" />
                    {(() => {
                      const dt = deliveryDetail.deliveryType as Record<string, unknown> | undefined;
                      return (dt?.nom as string | undefined) || (dt?.name as string | undefined) || "—";
                    })()}
                  </p>
                </div>
                <div className="bg-[#f0f4f8] p-2.5 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    ETA
                  </p>
                  <p className="text-xs font-bold text-[#171c1f] mt-1">
                    {deliveryDetail.deliveryTime || "—"}
                  </p>
                </div>
              </div>
              {deliveryDetail.livreur.telephone && (
                <a
                  href={`tel:${deliveryDetail.livreur.telephone}`}
                  className="block w-full py-3 bg-[#E04A1F] text-white text-sm font-bold rounded-xl text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Appeler le livreur
                </a>
              )}
            </div>
          ) : (
            <div className="bg-[#171c1f] text-white rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#E04A1F]" />
                <p className="font-bold">Recherche d&apos;un livreur</p>
              </div>
              <p className="text-xs text-white/60">
                Notre algorithme selectionne le meilleur courier disponible pour votre colis.
              </p>
            </div>
          )}

          {/* Pickup / Delivery details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              Itineraire
            </p>
            <div className="space-y-4">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00acbb]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00acbb]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#00acbb]">Pick-up</p>
                  <p className="text-sm font-bold text-[#171c1f] truncate">{deliveryDetail.expediteurNom || "—"}</p>
                  <p className="text-xs text-slate-500 break-words">{deliveryDetail.pickupAddress}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {deliveryDetail.expediteurTelephone ? (
                      <a href={`tel:${deliveryDetail.expediteurTelephone}`} className="text-[11px] text-slate-600 hover:text-[#E04A1F] flex items-center gap-1">
                        <Phone className="w-3 h-3" />{deliveryDetail.expediteurTelephone}
                      </a>
                    ) : null}
                    {deliveryDetail.expediteurEmail ? (
                      <a href={`mailto:${deliveryDetail.expediteurEmail}`} className="text-[11px] text-slate-600 hover:text-[#E04A1F] flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{deliveryDetail.expediteurEmail}</span>
                      </a>
                    ) : null}
                    {(() => {
                      const emp = deliveryDetail.expediteurEmployee as { prenom?: string; nom?: string } | undefined;
                      return emp ? (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Employe : {emp.prenom} {emp.nom}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="ml-3 border-l-2 border-dashed border-slate-200 h-3" />

              {/* Dropoff */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#E04A1F]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#E04A1F]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F]">Delivery</p>
                  <p className="text-sm font-bold text-[#171c1f] truncate">{deliveryDetail.destinataireNom || "—"}</p>
                  <p className="text-xs text-slate-500 break-words">{deliveryDetail.dropoffAddress}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {deliveryDetail.destinataireTelephone ? (
                      <a href={`tel:${deliveryDetail.destinataireTelephone}`} className="text-[11px] text-slate-600 hover:text-[#E04A1F] flex items-center gap-1">
                        <Phone className="w-3 h-3" />{deliveryDetail.destinataireTelephone}
                      </a>
                    ) : null}
                    {deliveryDetail.destinataireEmail ? (
                      <a href={`mailto:${deliveryDetail.destinataireEmail}`} className="text-[11px] text-slate-600 hover:text-[#E04A1F] flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{deliveryDetail.destinataireEmail}</span>
                      </a>
                    ) : null}
                    {(() => {
                      const emp = deliveryDetail.destinataireEmployee as { prenom?: string; nom?: string } | undefined;
                      return emp ? (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Employe : {emp.prenom} {emp.nom}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {(deliveryDetail.description || deliveryDetail.notes) && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Contenu du colis
                </p>
                <div className="bg-[#f0f4f8] rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-[#E04A1F] mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {deliveryDetail.description || deliveryDetail.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Share Link */}
          <div className="bg-[#E04A1F] rounded-2xl p-5 text-white relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">
              Lien de suivi
            </p>
            <p className="text-sm font-medium mb-3">
              Partagez le suivi avec votre client en temps reel.
            </p>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  const link = `${window.location.origin}/track/${deliveryDetail.reference || deliveryDetail.id}`;
                  navigator.clipboard.writeText(link);
                  toast.success("Lien copie");
                }
              }}
              className="w-full py-2 bg-white text-[#E04A1F] text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Copy className="w-4 h-4" />
              Copier le lien
            </button>
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          </div>

          {statusKey === "pending" && (
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => cancelMutation.mutate(deliveryDetail.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              Annuler la livraison
            </Button>
          )}
        </div>
      </div>

      {/* Bottom grid: Pricing + Info + Tracking history */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pricing breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F]">
              <Receipt className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Recapitulatif tarifaire</p>
          </div>
          <dl className="space-y-2.5 text-sm">
            {deliveryDetail.originalPrice ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Prix original</dt>
                <dd className="font-medium text-[#171c1f]">{Math.round(Number(deliveryDetail.originalPrice)).toLocaleString("fr-FR")} FCFA</dd>
              </div>
            ) : null}
            {deliveryDetail.totalHT ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Total HT</dt>
                <dd className="font-medium text-[#171c1f]">{Math.round(Number(deliveryDetail.totalHT)).toLocaleString("fr-FR")} FCFA</dd>
              </div>
            ) : null}
            {deliveryDetail.tvaAmount ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">TVA{deliveryDetail.isTva ? " (18%)" : ""}</dt>
                <dd className="font-medium text-[#171c1f]">{Math.round(Number(deliveryDetail.tvaAmount)).toLocaleString("fr-FR")} FCFA</dd>
              </div>
            ) : null}
            {deliveryDetail.discountAmount ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Remise{deliveryDetail.discountPercent ? ` (${deliveryDetail.discountPercent}%)` : ""}</dt>
                <dd className="font-medium text-green-600">−{Math.round(Number(deliveryDetail.discountAmount)).toLocaleString("fr-FR")} FCFA</dd>
              </div>
            ) : null}
            {deliveryDetail.surchargeAmount ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Supplement{deliveryDetail.surchargePercent ? ` (${deliveryDetail.surchargePercent}%)` : ""}</dt>
                <dd className="font-medium text-orange-600">+{Math.round(Number(deliveryDetail.surchargeAmount)).toLocaleString("fr-FR")} FCFA</dd>
              </div>
            ) : null}
            <div className="h-px bg-slate-100 my-2" />
            <div className="flex justify-between items-center">
              <dt className="text-base font-bold text-[#171c1f]">Total TTC</dt>
              <dd className="text-2xl font-black text-[#E04A1F]">{Math.round(totalAmount).toLocaleString("fr-FR")} FCFA</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Statut paiement</span>
              <Badge className={`border-0 text-[10px] ${String(deliveryDetail.paymentStatus || "").toLowerCase() === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {String(deliveryDetail.paymentStatus || "").toLowerCase() === "paid" ? "Paye" : "Non paye"}
              </Badge>
            </div>
            {deliveryDetail.paidBy ? (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Paye par</span>
                <span className="text-xs font-bold text-[#171c1f]">{deliveryDetail.paidBy === "company" ? "Entreprise" : "Client"}</span>
              </div>
            ) : null}
            {deliveryDetail.paymentMethod ? (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Mode de paiement</span>
                <span className="text-xs font-bold text-[#171c1f]">
                  {deliveryDetail.paymentMethod === "cash" ? "Especes"
                    : deliveryDetail.paymentMethod === "mobile_money" ? "Mobile Money"
                    : deliveryDetail.paymentMethod === "wallet" ? "Portefeuille"
                    : deliveryDetail.paymentMethod === "bank_transfer" ? "Virement"
                    : deliveryDetail.paymentMethod}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Delivery info + Type */}
        <div className="lg:col-span-4 space-y-4">
          {/* Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#dde2f3] flex items-center justify-center text-[#414754]">
                <Hash className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Informations livraison</p>
            </div>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Code</dt>
                <dd className="font-mono font-bold text-[#171c1f] truncate">{deliveryDetail.deliveryCode || `#${deliveryDetail.id}`}</dd>
              </div>
              {deliveryDetail.confirmationCode ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Code de confirmation</dt>
                  <dd className="font-mono font-bold text-[#E04A1F] tracking-widest">{deliveryDetail.confirmationCode}</dd>
                </div>
              ) : null}
              {deliveryDetail.deliveryDate ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Date prevue</dt>
                  <dd className="font-bold text-[#171c1f]">{format(new Date(deliveryDetail.deliveryDate), "dd MMM yyyy", { locale: fr })}</dd>
                </div>
              ) : null}
              {deliveryDetail.deliveryTime ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Heure</dt>
                  <dd className="font-bold text-[#171c1f]">{deliveryDetail.deliveryTime}</dd>
                </div>
              ) : null}
              {deliveryDetail.canal ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Canal</dt>
                  <dd><Badge className="bg-slate-100 text-slate-700 border-0 text-[10px]">{String(deliveryDetail.canal)}</Badge></dd>
                </div>
              ) : null}
              {(() => {
                const comp = deliveryDetail.compagny as { companyCode?: string; nomCompagny?: string } | undefined;
                return comp ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Entreprise</dt>
                    <dd className="font-bold text-[#171c1f] flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {comp.companyCode || comp.nomCompagny}
                    </dd>
                  </div>
                ) : null;
              })()}
              {deliveryDetail.invoicePdfUrl ? (
                <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
                  <dt className="text-slate-500">Facture</dt>
                  <dd>
                    <a href={deliveryDetail.invoicePdfUrl as string} target="_blank" rel="noopener noreferrer" className="text-[#E04A1F] font-bold flex items-center gap-1 hover:underline">
                      <FileText className="w-3 h-3" /> Telecharger
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Type details */}
          {(() => {
            const dt = deliveryDetail.deliveryType as Record<string, unknown> | undefined;
            if (!dt) return null;
            const dtName = (dt.nom as string | undefined) || (dt.name as string | undefined);
            const dtImage = dt.image as string | undefined;
            const dtPrixParKm = dt.prixParKm as number | string | undefined;
            const dtPrixMin = dt.prixMinimum as number | string | undefined;
            const dtDesc = dt.description as string | undefined;
            return (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Type de livraison</p>
                <div className="flex items-start gap-3">
                  {dtImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dtImage}
                      alt={dtName || ""}
                      className="w-14 h-14 object-cover rounded-xl bg-slate-50 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#E04A1F]/10 flex items-center justify-center text-[#E04A1F] shrink-0">
                      <Truck className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#171c1f]">{dtName || "—"}</p>
                    <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                      {dtPrixParKm ? (
                        <p>Tarif : <span className="font-bold text-[#171c1f]">{Number(dtPrixParKm).toLocaleString("fr-FR")} FCFA/km</span></p>
                      ) : null}
                      {dtPrixMin ? (
                        <p>Minimum : <span className="font-bold text-[#171c1f]">{Number(dtPrixMin).toLocaleString("fr-FR")} FCFA</span></p>
                      ) : null}
                    </div>
                  </div>
                </div>
                {dtDesc ? (
                  <p className="text-[11px] text-slate-600 mt-3 leading-relaxed line-clamp-3">{dtDesc}</p>
                ) : null}
              </div>
            );
          })()}
        </div>

        {/* Tracking history */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#00acbb]/10 flex items-center justify-center text-[#006972]">
              <History className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Historique</p>
          </div>
          {Array.isArray((deliveryDetail as Record<string, unknown>).tracking) && ((deliveryDetail as Record<string, unknown>).tracking as Array<{ id: number; status?: string; comment?: string; createdAt?: string }>).length > 0 ? (
            <ol className="space-y-3">
              {((deliveryDetail as Record<string, unknown>).tracking as Array<{ id: number; status?: string; comment?: string; createdAt?: string }>).slice().reverse().map((t, idx, arr) => {
                const isLatest = idx === 0;
                const stColor = (statusLabels[t.status || ""] || { color: "bg-slate-100 text-slate-600" }).color;
                return (
                  <li key={t.id} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-3 h-3 rounded-full ${isLatest ? "bg-[#E04A1F] ring-4 ring-[#ffdbd0]" : "bg-slate-300"}`} />
                      {idx < arr.length - 1 ? <div className="flex-1 w-px bg-slate-200 mt-1" /> : null}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <Badge className={`${stColor} border-0 text-[10px]`}>
                        {(statusLabels[t.status || ""] || { label: t.status }).label}
                      </Badge>
                      {t.comment ? <p className="text-xs text-slate-700 mt-1">{t.comment}</p> : null}
                      {t.createdAt ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {format(new Date(t.createdAt), "dd MMM yyyy 'a' HH:mm", { locale: fr })}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-xs text-slate-400 italic">Aucun evenement de suivi</p>
          )}
        </div>
      </div>

    </div>
  );
}
