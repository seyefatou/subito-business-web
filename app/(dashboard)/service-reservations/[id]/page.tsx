'use client';

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  ChevronRight,
  CheckCircle2,
  Car,
  Hotel,
  Compass,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  User,
  Users,
  Star,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api, ServiceReservationResponse } from "@/lib/api";

const serviceLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; tint: string }> = {
  FLOTTE: { label: "Location de véhicule", icon: Car, color: "bg-pink-100 text-pink-700", tint: "from-pink-500 to-rose-500" },
  LOGEMENT: { label: "Logement", icon: Hotel, color: "bg-cyan-100 text-cyan-700", tint: "from-cyan-500 to-teal-500" },
  ACTIVITE: { label: "Activité", icon: Compass, color: "bg-emerald-100 text-emerald-700", tint: "from-emerald-500 to-green-500" },
  HOTEL: { label: "Hôtel", icon: Hotel, color: "bg-cyan-100 text-cyan-700", tint: "from-cyan-500 to-teal-500" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En cours", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Terminée", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejetée", color: "bg-red-100 text-red-700" },
};

function stepIndexFromStatus(status: string): number {
  const k = (status || "").toLowerCase();
  if (k === "completed") return 4;
  if (k === "in_progress") return 3;
  if (k === "confirmed") return 2;
  return 1;
}

const FORMAT_FCFA = (n?: number | string | null) => {
  const v = Number(n || 0);
  return v ? v.toLocaleString("fr-FR") + " FCFA" : "—";
};

export default function ServiceReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = parseInt(params?.id || "", 10);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  const { data, isLoading, error } = useQuery<unknown>({
    queryKey: ["service-reservation-detail", id],
    queryFn: () => api.serviceReservations.get(id),
    enabled: !isNaN(id),
  });

  // Backend may return raw or wrapped { data: ... }. Detect by presence of id.
  const raw = data as Record<string, unknown> | undefined;
  const wrapped = raw
    && typeof raw.data === "object"
    && raw.data !== null
    && "id" in (raw.data as Record<string, unknown>)
      ? (raw.data as Record<string, unknown>)
      : raw;
  const d = wrapped as (ServiceReservationResponse & Record<string, unknown>) | undefined;

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await api.bictorys.initiate({ serviceType: "service_reservation", serviceId: id });
      const checkoutUrl = res?.data?.checkoutUrl || (res as { checkoutUrl?: string })?.checkoutUrl;
      if (!checkoutUrl) throw new Error("URL de paiement Bictorys non disponible");
      window.open(checkoutUrl, "_blank");
      return res;
    },
    onSuccess: () => {
      toast.success("Redirection vers la page de paiement");
      setShowPayDialog(false);
      queryClient.invalidateQueries({ queryKey: ["service-reservation-detail"] });
      queryClient.invalidateQueries({ queryKey: ["service-reservations-compagny"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors du paiement");
    },
  });

  if (isNaN(id)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Identifiant invalide</p>
        <Button variant="outline" onClick={() => router.push("/tracking")}>
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

  if (error || !d) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Réservation introuvable</p>
        <Button variant="outline" onClick={() => router.push("/tracking")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  const reference = d.reference || `SRV-${d.id}`;
  const serviceType = (d.serviceType as string) || "";
  const svc = serviceLabels[serviceType] || { label: serviceType || "Réservation", icon: Compass, color: "bg-slate-100 text-slate-700", tint: "from-slate-400 to-slate-600" };
  const statusKey = ((d.status as string) || "pending").toLowerCase();
  const st = statusLabels[statusKey] || { label: d.status as string, color: "bg-slate-100 text-slate-700" };
  const stepIndex = stepIndexFromStatus(statusKey);

  const isPaid = String((d.paymentStatus as string) || "").toLowerCase() === "paid";
  const canPay = !isPaid && d.paidBy !== "client" && ["confirmed", "completed"].includes(statusKey);

  const dateDebut = d.dateDebut as string | undefined;
  const dateFin = d.dateFin as string | undefined;
  const dateDebutFormatted = dateDebut ? format(new Date(dateDebut), "EEEE dd MMMM yyyy", { locale: fr }) : null;

  const totalPrice = Number(d.totalPrice || 0);
  const discountAmount = Number((d as Record<string, unknown>).discountAmount || 0);
  const baseFare = totalPrice + discountAmount;

  const vehicule = d.vehiculeLocation;
  const logement = d.logement;
  const circuit = d.circuit;
  const activite = (d as Record<string, unknown>).activite as { id: number; titre?: string; ville?: string; duree?: string; prix?: number; images?: string[] } | undefined;

  const itemImages: string[] = (vehicule?.images as string[] | undefined)
    || (logement?.images as string[] | undefined)
    || (circuit?.images as string[] | undefined)
    || (activite?.images as string[] | undefined)
    || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* Breadcrumbs + Title + Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/tracking" className="hover:text-[#E04A1F] cursor-pointer transition-colors font-medium">
              Suivi commandes
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold">{reference}</span>
          </nav>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {svc.label}
          </h1>
          {dateDebutFormatted && (
            <div className="mt-3 inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl gradient-subito flex items-center justify-center text-white shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">Début</p>
                <p className="text-sm font-bold text-[#171c1f] mt-1">{dateDebutFormatted}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-xl">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
          {canPay && (
            <Button
              variant="gradient"
              onClick={() => setShowPayDialog(true)}
              className="gap-2 rounded-xl px-6"
            >
              <CreditCard className="w-4 h-4" />
              Payer cette réservation
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <section className="bg-[#f0f4f8] p-6 md:p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 md:gap-6 relative">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#ffdbd0] hidden md:block -translate-y-1/2 z-0" />
          <TimelineStep n={1} label="Demande créée" current={stepIndex >= 1} active={stepIndex === 1} icon={CheckCircle2} />
          <TimelineStep n={2} label="Confirmée" current={stepIndex >= 2} active={stepIndex === 2} icon={CheckCircle2} />
          <TimelineStep n={3} label="En cours" current={stepIndex >= 3} active={stepIndex === 3} icon={svc.icon} />
          <TimelineStep n={4} label="Terminée" current={stepIndex >= 4} active={stepIndex === 4} icon={ShieldCheck} />
        </div>
      </section>

      {/* Hero image */}
      {itemImages.length > 0 && (
        <section className="relative h-48 md:h-64 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(23,28,31,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={itemImages[imageIdx]} alt={svc.label} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {itemImages.length > 1 && (
            <>
              <button
                onClick={() => setImageIdx((p) => (p - 1 + itemImages.length) % itemImages.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImageIdx((p) => (p + 1) % itemImages.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                {imageIdx + 1} / {itemImages.length}
              </div>
            </>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">{svc.label}</p>
                <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {(vehicule && [vehicule.marque, vehicule.modele].filter(Boolean).join(" "))
                    || logement?.nom
                    || circuit?.titre
                    || activite?.titre
                    || svc.label}
                </h2>
              </div>
              <Badge className={`${svc.color} border-0 gap-1.5 px-3 py-1.5 shadow-md`}>
                <svc.icon className="w-3.5 h-3.5" />
                {svc.label}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        {itemImages.length === 0 && (
          <Badge className={`${svc.color} border-0 gap-1.5 px-3 py-1`}>
            <svc.icon className="w-3.5 h-3.5" />
            {svc.label}
          </Badge>
        )}
        <Badge className={`${st.color} border-0 px-3 py-1`}>{st.label}</Badge>
        <Badge className={`border-0 px-3 py-1 ${isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {isPaid ? "Payé" : "Non payé"}
        </Badge>
        {d.paidBy ? (
          <Badge className={`border-0 px-3 py-1 ${d.paidBy === "company" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
            Payé par : {d.paidBy === "company" ? "Entreprise" : "Client"}
          </Badge>
        ) : null}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left col */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-3 md:items-start">
          {/* Service-specific card */}
          {serviceType === "FLOTTE" && vehicule ? (
            <VehiculeCard vehicule={vehicule} />
          ) : null}
          {(serviceType === "LOGEMENT" || serviceType === "HOTEL") && logement ? (
            <LogementCard logement={logement} />
          ) : null}
          {serviceType === "ACTIVITE" && (circuit || activite) ? (
            <ActiviteCard item={(circuit || activite) as { titre?: string; ville?: string; duree?: string; prix?: number; descriptionCourte?: string; inclus?: string[] }} />
          ) : null}

          {/* Client card */}
          <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">Informations client</p>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg gradient-subito flex items-center justify-center text-white font-bold text-xs shrink-0">
                {(d.clientName || "C").substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-[#171c1f] truncate leading-tight">{d.clientName || "—"}</p>
                {(d as Record<string, unknown>).canal ? <p className="text-slate-500 text-[10px] leading-tight mt-0.5">Canal : {String((d as Record<string, unknown>).canal)}</p> : null}
              </div>
            </div>
            <dl className="space-y-1.5 text-xs">
              {d.clientPhone ? (
                <KeyValueRow label="Téléphone">
                  <a href={`tel:${d.clientPhone}`} className="font-bold text-[#171c1f] hover:text-[#E04A1F] transition-colors flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {d.clientPhone}
                  </a>
                </KeyValueRow>
              ) : null}
              {d.clientEmail ? (
                <KeyValueRow label="Email">
                  <a href={`mailto:${d.clientEmail}`} className="font-bold text-[#171c1f] hover:text-[#E04A1F] transition-colors truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{d.clientEmail}</span>
                  </a>
                </KeyValueRow>
              ) : null}
              {d.nombrePersonnes ? (
                <KeyValueRow label="Personnes">
                  <span className="font-bold text-[#171c1f] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {d.nombrePersonnes}
                  </span>
                </KeyValueRow>
              ) : null}
              {d.adresseLivraison ? (
                <KeyValueRow label="Adresse de livraison">
                  <span className="font-bold text-[#171c1f]">{d.adresseLivraison}</span>
                </KeyValueRow>
              ) : null}
            </dl>
          </article>

          {/* Period card */}
          <article className="md:col-span-2 bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-1">Période de réservation</p>
              <h3 className="text-xl font-bold text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {dateDebut && dateFin
                  ? `${format(new Date(dateDebut), "dd MMM yyyy", { locale: fr })} → ${format(new Date(dateFin), "dd MMM yyyy", { locale: fr })}`
                  : dateDebut
                  ? format(new Date(dateDebut), "dd MMM yyyy", { locale: fr })
                  : "—"}
              </h3>
            </div>
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <PeriodEndpoint
                date={dateDebut}
                label="Début"
                accent="bg-[#E04A1F]"
              />
              {dateFin ? (
                <PeriodEndpoint
                  date={dateFin}
                  label="Fin"
                  accent="bg-blue-500"
                />
              ) : null}
            </div>
            {d.notes ? (
              <div className="px-6 md:px-8 pb-6 md:pb-8">
                <div className="p-3 bg-[#f0f4f8] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 mb-0.5">Notes</p>
                  <p className="text-xs text-[#171c1f]">{String(d.notes)}</p>
                </div>
              </div>
            ) : null}
          </article>
        </div>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Price Summary */}
          <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Récapitulatif paiement</p>
            <div className="space-y-3">
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tarif de base</span>
                    <span className="font-medium text-[#171c1f]">{FORMAT_FCFA(baseFare)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Remise</span>
                    <span className="font-medium text-green-600">−{FORMAT_FCFA(discountAmount)}</span>
                  </div>
                  <div className="h-px bg-slate-100 my-2" />
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-[#171c1f]">Total</span>
                <span className="text-2xl font-black text-[#E04A1F]">{FORMAT_FCFA(totalPrice)}</span>
              </div>

              {d.paymentMethod ? (
                <div className="flex justify-between items-center text-sm pt-3">
                  <span className="text-slate-500">Mode de paiement</span>
                  <span className="font-medium text-[#171c1f]">
                    {d.paymentMethod === "cash" ? "Espèces"
                      : d.paymentMethod === "mobile_money" ? "Mobile Money"
                      : d.paymentMethod === "wallet" ? "Portefeuille"
                      : d.paymentMethod === "bank_transfer" ? "Virement bancaire"
                      : (d.paymentMethod as string)}
                  </span>
                </div>
              ) : null}

              {isPaid && (
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-start gap-3 mt-4">
                  <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800 font-medium leading-relaxed">
                    Paiement confirmé. Cette réservation est intégralement réglée.
                  </p>
                </div>
              )}

              {canPay && (
                <Button
                  variant="gradient"
                  onClick={() => setShowPayDialog(true)}
                  className="w-full mt-4 gap-2 rounded-xl"
                >
                  <CreditCard className="w-4 h-4" />
                  Payer maintenant
                </Button>
              )}
            </div>
          </article>

          {/* Métadonnées */}
          <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Métadonnées</p>
            <dl className="space-y-3">
              {d.createdAt ? (
                <KeyValueRow label="Créée le">
                  <span className="font-bold text-[#171c1f]">
                    {format(new Date(d.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </KeyValueRow>
              ) : null}
              {d.updatedAt ? (
                <KeyValueRow label="Modifiée le">
                  <span className="font-bold text-[#171c1f]">
                    {format(new Date(d.updatedAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </KeyValueRow>
              ) : null}
              {(d as Record<string, unknown>).tag ? (
                <KeyValueRow label="Tag">
                  <Badge className="bg-purple-100 text-purple-700 border-0">{String((d as Record<string, unknown>).tag)}</Badge>
                </KeyValueRow>
              ) : null}
            </dl>
          </article>
        </aside>
      </div>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              Payer cette réservation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Vous allez être redirigé vers Bictorys pour finaliser le paiement de <strong>{FORMAT_FCFA(totalPrice)}</strong>.
            </p>
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
              <p className="text-sm text-orange-800">Wave, Orange Money, carte bancaire, etc.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Annuler</Button>
            <Button
              variant="gradient"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
              className="gap-2"
            >
              {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Payer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface TimelineStepProps {
  n: number;
  label: string;
  current: boolean;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

function TimelineStep({ n, label, current, active, icon: Icon }: TimelineStepProps) {
  if (active) {
    return (
      <div className="flex items-center gap-4 bg-white border border-[#E04A1F]/30 p-4 rounded-2xl z-10 w-full md:w-auto shadow-sm backdrop-blur-sm">
        <div className="w-10 h-10 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F]">En cours</p>
          <p className="font-bold text-[#171c1f] text-sm">{label}</p>
        </div>
      </div>
    );
  }
  if (current) {
    return (
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl z-10 w-full md:w-auto shadow-sm">
        <div className="w-10 h-10 rounded-full gradient-subito flex items-center justify-center text-white shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Étape {n}</p>
          <p className="font-bold text-[#171c1f] text-sm">{label}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl z-10 w-full md:w-auto opacity-60">
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Étape {n}</p>
        <p className="font-bold text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

interface KeyValueRowProps {
  label: string;
  children: React.ReactNode;
}

function KeyValueRow({ label, children }: KeyValueRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface InfoStatProps {
  label: string;
  value: string;
}

function InfoStat({ label, value }: InfoStatProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#171c1f] truncate">{value}</p>
    </div>
  );
}

interface PeriodEndpointProps {
  date?: string;
  label: string;
  accent: string;
}

function PeriodEndpoint({ date, label, accent }: PeriodEndpointProps) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-full ${accent} flex items-center justify-center text-white shrink-0 shadow-md`}>
        <Calendar className="w-5 h-5" />
      </div>
      <div className="flex-1 pt-1.5 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-base font-bold text-[#171c1f] break-words">
          {date ? format(new Date(date), "EEEE dd MMMM yyyy", { locale: fr }) : "—"}
        </p>
      </div>
    </div>
  );
}

interface VehiculeCardProps {
  vehicule: Record<string, unknown>;
}

function VehiculeCard({ vehicule }: VehiculeCardProps) {
  const marque = vehicule.marque as string | undefined;
  const modele = vehicule.modele as string | undefined;
  const annee = vehicule.annee as number | undefined;
  const places = vehicule.places as number | undefined;
  const transmission = vehicule.transmission as string | undefined;
  const carburant = vehicule.carburant as string | undefined;
  const climatisation = !!vehicule.climatisation;
  const chauffeur = !!vehicule.chauffeur;
  const gps = !!vehicule.gps;
  const prixParJour = vehicule.prixParJour as number | undefined;
  const caution = vehicule.caution as number | undefined;
  const zoneOperations = vehicule.zoneOperations as string | undefined;

  return (
    <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 pointer-events-none">
        <Car className="text-[#E04A1F]/10 w-12 h-12" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">Véhicule</p>
      <div className="relative z-10">
        <h2
          className="text-xl font-black text-[#171c1f] tracking-tight leading-none"
          style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
        >
          {[marque, modele].filter(Boolean).join(" ") || "—"}
        </h2>
        <p className="text-slate-500 text-xs font-medium mt-1 mb-3">
          {annee ? `Année ${annee}` : "Véhicule de location"}
        </p>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-2">
          {places ? <InfoStat label="Places" value={String(places)} /> : null}
          {transmission ? <InfoStat label="Boîte" value={transmission} /> : null}
          {carburant ? <InfoStat label="Carburant" value={carburant} /> : null}
          {prixParJour ? <InfoStat label="Prix/jour" value={`${prixParJour.toLocaleString("fr-FR")} FCFA`} /> : null}
          {caution ? <InfoStat label="Caution" value={`${caution.toLocaleString("fr-FR")} FCFA`} /> : null}
          {zoneOperations ? <InfoStat label="Zone" value={zoneOperations} /> : null}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {climatisation ? <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Climatisation</Badge> : null}
          {chauffeur ? <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">Avec chauffeur</Badge> : null}
          {gps ? <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">GPS</Badge> : null}
        </div>
      </div>
    </article>
  );
}

interface LogementCardProps {
  logement: Record<string, unknown>;
}

function LogementCard({ logement }: LogementCardProps) {
  const nom = logement.nom as string | undefined;
  const type = logement.type as string | undefined;
  const ville = logement.ville as string | undefined;
  const quartier = logement.quartier as string | undefined;
  const nbreEtoiles = logement.nbreEtoiles as number | undefined;
  const capacite = logement.capacite as number | undefined;
  const nbreChambres = logement.nbreChambres as number | undefined;
  const salleDeBain = logement.salleDeBain as number | undefined;
  const prixParNuit = logement.prixParNuit as number | undefined;
  const heureCheckIn = logement.heureCheckIn as string | undefined;
  const heureCheckOut = logement.heureCheckOut as string | undefined;

  return (
    <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 pointer-events-none">
        <Hotel className="text-[#E04A1F]/10 w-12 h-12" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">Logement</p>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <h2
            className="text-xl font-black text-[#171c1f] tracking-tight leading-none"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {nom || "—"}
          </h2>
          {nbreEtoiles ? (
            <div className="flex items-center gap-0.5 text-yellow-500">
              {Array.from({ length: nbreEtoiles }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-500" />
              ))}
            </div>
          ) : null}
        </div>
        <p className="text-slate-500 text-xs font-medium mt-1 mb-3 flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          {[quartier, ville].filter(Boolean).join(", ") || type || "Logement"}
        </p>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-2">
          {capacite ? <InfoStat label="Capacité" value={`${capacite} pers.`} /> : null}
          {nbreChambres ? <InfoStat label="Chambres" value={String(nbreChambres)} /> : null}
          {salleDeBain ? <InfoStat label="Salles de bain" value={String(salleDeBain)} /> : null}
          {prixParNuit ? <InfoStat label="Prix/nuit" value={`${prixParNuit.toLocaleString("fr-FR")} FCFA`} /> : null}
          {heureCheckIn ? <InfoStat label="Check-in" value={heureCheckIn} /> : null}
          {heureCheckOut ? <InfoStat label="Check-out" value={heureCheckOut} /> : null}
        </dl>
      </div>
    </article>
  );
}

interface ActiviteCardProps {
  item: { titre?: string; ville?: string; duree?: string; prix?: number; descriptionCourte?: string; inclus?: string[] };
}

function ActiviteCard({ item }: ActiviteCardProps) {
  return (
    <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 pointer-events-none">
        <Compass className="text-[#E04A1F]/10 w-12 h-12" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">Activité / Circuit</p>
      <div className="relative z-10">
        <h2
          className="text-xl font-black text-[#171c1f] tracking-tight leading-none"
          style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
        >
          {item.titre || "—"}
        </h2>
        {item.ville ? (
          <p className="text-slate-500 text-xs font-medium mt-1 mb-3 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {item.ville}
          </p>
        ) : null}
        {item.descriptionCourte ? (
          <p className="text-xs text-slate-700 mb-3 line-clamp-3">{item.descriptionCourte}</p>
        ) : null}
        <dl className="grid grid-cols-2 gap-x-2 gap-y-2">
          {item.duree ? <InfoStat label="Durée" value={item.duree} /> : null}
          {item.prix ? <InfoStat label="Prix" value={`${Number(item.prix).toLocaleString("fr-FR")} FCFA`} /> : null}
        </dl>
        {item.inclus && item.inclus.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 mb-1">Inclus</p>
            <div className="flex flex-wrap gap-1">
              {item.inclus.slice(0, 4).map((it, i) => (
                <Badge key={i} className="bg-emerald-50 text-emerald-700 border-0 text-[10px]">{it}</Badge>
              ))}
              {item.inclus.length > 4 ? <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px]">+{item.inclus.length - 4}</Badge> : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
