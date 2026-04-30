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
  FileText,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Hotel,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  User,
  Stamp,
  Globe,
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
import { api, TravelDocumentResponse } from "@/lib/api";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-700" },
  processing: { label: "En traitement", color: "bg-amber-100 text-amber-700" },
  in_progress: { label: "En cours", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Terminée", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejetée", color: "bg-red-100 text-red-700" },
};

const travelReasonLabels: Record<string, string> = {
  tourisme: "Tourisme",
  affaires: "Affaires",
  etudes: "Études",
  visite: "Visite familiale",
  autre: "Autre",
};

function stepIndexFromStatus(status: string): number {
  const k = (status || "").toLowerCase();
  if (k === "completed") return 4;
  if (k === "in_progress" || k === "processing") return 3;
  if (k === "confirmed") return 2;
  return 1;
}

const FORMAT_FCFA = (n?: number | null) => (n ? Number(n).toLocaleString("fr-FR") + " FCFA" : "—");

export default function TravelDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = parseInt(params?.id || "", 10);

  const [showPayDialog, setShowPayDialog] = useState(false);

  const { data, isLoading, error } = useQuery<unknown>({
    queryKey: ["travel-document-detail", id],
    queryFn: () => api.travelDocuments.get(id),
    enabled: !isNaN(id),
  });

  // Backend returns the travel doc directly (no { data: ... } wrapper),
  // even though the typed signature claims ApiResponse<T>. Handle both.
  const raw = data as Record<string, unknown> | undefined;
  const wrapped = raw && typeof raw.data === "object" && raw.data !== null && "id" in (raw.data as Record<string, unknown>)
    ? (raw.data as Record<string, unknown>)
    : raw;
  const d = wrapped as (TravelDocumentResponse & Record<string, unknown>) | undefined;

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await api.bictorys.initiate({ serviceType: "booking", serviceId: id });
      const checkoutUrl = res?.data?.checkoutUrl || (res as { checkoutUrl?: string })?.checkoutUrl;
      if (!checkoutUrl) throw new Error("URL de paiement Bictorys non disponible");
      window.open(checkoutUrl, "_blank");
      return res;
    },
    onSuccess: () => {
      toast.success("Redirection vers la page de paiement");
      setShowPayDialog(false);
      queryClient.invalidateQueries({ queryKey: ["travel-document-detail"] });
      queryClient.invalidateQueries({ queryKey: ["travel-documents-compagny"] });
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
        <p className="text-lg font-semibold text-slate-700">Document de voyage introuvable</p>
        <Button variant="outline" onClick={() => router.push("/tracking")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  const reference = d.reference || `TD-${d.id}`;
  const status = (d.status as string) || "pending";
  const statusKey = status.toLowerCase();
  const st = statusLabels[statusKey] || { label: status, color: "bg-slate-100 text-slate-700" };
  const stepIndex = stepIndexFromStatus(statusKey);

  const clientName = [d.firstName, d.lastName].filter(Boolean).join(" ") || (d.clientName as string) || "—";
  const clientPhone = (d.phone as string) || (d.clientPhone as string);
  const clientEmail = (d.email as string) || (d.clientEmail as string);

  const departureCity = d.departureCity as string | undefined;
  const departureCountry = d.departureCountry as string | undefined;
  const destinationCity = d.destinationCity as string | undefined;
  const destinationCountry = d.destinationCountry as string | undefined;
  const departLabel = [departureCity, departureCountry].filter(Boolean).join(", ");
  const destinationLabel = [destinationCity, destinationCountry].filter(Boolean).join(", ");

  const departureDate = d.departureDate as string | undefined;
  const returnDate = d.returnDate as string | undefined;
  const isRoundTrip = !!returnDate;

  const departureDateFormatted = departureDate
    ? format(new Date(departureDate), "EEEE dd MMMM yyyy", { locale: fr })
    : null;

  const passportNumber = d.passportNumber as string | undefined;
  const nationality = d.nationality as string | undefined;
  const birthDate = d.birthDate as string | undefined;
  const travelReason = d.travelReason as string | undefined;
  const travelReasonLabel = travelReason ? travelReasonLabels[travelReason] || travelReason : undefined;
  const numberOfPeople = d.numberOfPeople as number | undefined;
  const hotelCategory = d.hotelCategory as string | undefined;
  const roomType = d.roomType as string | undefined;
  const hotelDetails = d.hotelDetails as string | undefined;
  const notes = d.notes as string | undefined;

  const flightReservation = !!d.flightReservation;
  const hotelReservation = !!d.hotelReservation;
  const travelInsurance = !!d.travelInsurance;

  const totalPrice = Number(d.totalPrice || 0);
  const discountAmount = Number(d.discountAmount || 0);
  const baseFare = totalPrice + discountAmount;
  const isPaid = String((d.paymentStatus as string) || "").toLowerCase() === "paid";
  const canPay = !isPaid && d.paidBy !== "client" && ["confirmed", "completed"].includes(statusKey);

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
            Détail des documents de voyage
          </h1>
          {departureDateFormatted && (
            <div className="mt-3 inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl gradient-subito flex items-center justify-center text-white shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">Départ</p>
                <p className="text-sm font-bold text-[#171c1f] mt-1">{departureDateFormatted}</p>
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
              Payer cette demande
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <section className="bg-[#f0f4f8] p-6 md:p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 md:gap-6 relative">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#ffdbd0] hidden md:block -translate-y-1/2 z-0" />
          <TimelineStep n={1} label="Demande créée" current={stepIndex >= 1} active={stepIndex === 1} icon={FileText} />
          <TimelineStep n={2} label="Confirmée" current={stepIndex >= 2} active={stepIndex === 2} icon={CheckCircle2} />
          <TimelineStep n={3} label="En traitement" current={stepIndex >= 3} active={stepIndex === 3} icon={Stamp} />
          <TimelineStep n={4} label="Documents prêts" current={stepIndex >= 4} active={stepIndex === 4} icon={ShieldCheck} />
        </div>
      </section>

      {/* Status / Service / Payment badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-orange-100 text-orange-700 border-0 gap-1.5 px-3 py-1">
          <FileText className="w-3.5 h-3.5" />
          Documents Voyage
        </Badge>
        <Badge className={`${st.color} border-0 px-3 py-1`}>{st.label}</Badge>
        <Badge className={`border-0 px-3 py-1 ${isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {isPaid ? "Payé" : "Non payé"}
        </Badge>
        {d.paidBy ? (
          <Badge className={`border-0 px-3 py-1 ${d.paidBy === "company" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
            Payé par : {d.paidBy === "company" ? "Entreprise" : "Client"}
          </Badge>
        ) : null}
        <Badge className={`border-0 px-3 py-1 ${isRoundTrip ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
          {isRoundTrip ? "Aller-retour" : "Aller simple"}
        </Badge>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Voyageur + Itinéraire + Documents */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-3 md:items-start">
          {/* Voyageur card */}
          <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 pointer-events-none">
              <User className="text-[#E04A1F]/10 w-12 h-12" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">Voyageur</p>
            <div className="flex items-center gap-2.5 mb-3 relative z-10">
              <div className="w-9 h-9 rounded-lg gradient-subito flex items-center justify-center text-white font-bold text-xs shrink-0">
                {clientName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-[#171c1f] truncate leading-tight">{clientName}</p>
                {nationality ? <p className="text-slate-500 text-[10px] leading-tight mt-0.5">{nationality}</p> : null}
              </div>
            </div>
            <dl className="space-y-1.5 text-xs relative z-10">
              {clientPhone ? (
                <KeyValueRow label="Téléphone">
                  <a href={`tel:${clientPhone}`} className="font-bold text-[#171c1f] hover:text-[#E04A1F] transition-colors flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {clientPhone}
                  </a>
                </KeyValueRow>
              ) : null}
              {clientEmail ? (
                <KeyValueRow label="Email">
                  <a href={`mailto:${clientEmail}`} className="font-bold text-[#171c1f] hover:text-[#E04A1F] transition-colors truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{clientEmail}</span>
                  </a>
                </KeyValueRow>
              ) : null}
              {birthDate ? (
                <KeyValueRow label="Naissance">
                  <span className="font-bold text-[#171c1f]">
                    {format(new Date(birthDate), "dd MMM yyyy", { locale: fr })}
                  </span>
                </KeyValueRow>
              ) : null}
              {numberOfPeople ? (
                <KeyValueRow label="Voyageurs">
                  <span className="font-bold text-[#171c1f]">{numberOfPeople}</span>
                </KeyValueRow>
              ) : null}
            </dl>
          </article>

          {/* Documents card */}
          <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 pointer-events-none">
              <FileText className="text-[#E04A1F]/10 w-12 h-12" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">Documents</p>
            <div className="relative z-10">
              {passportNumber ? (
                <>
                  <h2
                    className="text-xl font-black text-[#171c1f] tracking-tight leading-none"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    {passportNumber}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-1 mb-3">
                    Numéro de passeport
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400 italic mb-3">Passeport non renseigné</p>
              )}
              <dl className="grid grid-cols-2 gap-x-2 gap-y-2">
                {travelReasonLabel ? (
                  <InfoStat label="Motif" value={travelReasonLabel} />
                ) : null}
                {hotelCategory ? (
                  <InfoStat label="Cat. hôtel" value={hotelCategory} />
                ) : null}
                {roomType ? (
                  <InfoStat label="Chambre" value={roomType} />
                ) : null}
              </dl>
              {hotelDetails ? (
                <div className="mt-3 p-3 bg-[#f0f4f8] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 mb-0.5">Détails hôtel</p>
                  <p className="text-xs text-[#171c1f]">{hotelDetails}</p>
                </div>
              ) : null}
              {notes ? (
                <div className="mt-3 p-3 bg-[#f0f4f8] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 mb-0.5">Notes</p>
                  <p className="text-xs text-[#171c1f]">{notes}</p>
                </div>
              ) : null}
            </div>
          </article>

          {/* Itinéraire card */}
          <article className="md:col-span-2 bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-1">Itinéraire</p>
                <h3 className="text-xl font-bold text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {departLabel && destinationLabel ? `${departLabel} → ${destinationLabel}` : "Trajet"}
                </h3>
              </div>
              <Badge className={`border-0 text-xs px-3 py-1 ${isRoundTrip ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                {isRoundTrip ? "Aller-retour" : "Aller simple"}
              </Badge>
            </div>

            {/* Aller */}
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-5">
                <PlaneTakeoff className="w-4 h-4 text-[#E04A1F]" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Aller</p>
                {departureDate ? (
                  <span className="ml-auto text-sm font-medium text-slate-600">
                    {format(new Date(departureDate), "dd MMM yyyy", { locale: fr })}
                  </span>
                ) : null}
              </div>
              <ItineraryEndpoints
                origin={departLabel || "—"}
                originLabel="Départ"
                destination={destinationLabel || "—"}
                destinationLabel="Destination"
              />
            </div>

            {/* Retour */}
            {isRoundTrip && (
              <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 mb-5">
                  <PlaneLanding className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Retour</p>
                  {returnDate ? (
                    <span className="ml-auto text-sm font-medium text-slate-600">
                      {format(new Date(returnDate), "dd MMM yyyy", { locale: fr })}
                    </span>
                  ) : null}
                </div>
                <ItineraryEndpoints
                  origin={destinationLabel || "—"}
                  originLabel="Provenance"
                  destination={departLabel || "—"}
                  destinationLabel="Retour à"
                  variant="return"
                />
              </div>
            )}
          </article>
        </div>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Services inclus */}
          <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#E04A1F]/10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">Services inclus</p>
            <div className="space-y-3">
              <ServiceLine
                included={flightReservation}
                icon={Plane}
                label="Réservation de vol"
                description="Attestation certifiée pour le dossier visa"
              />
              <ServiceLine
                included={hotelReservation}
                icon={Hotel}
                label="Réservation d'hôtel"
                description="Confirmation de logement"
              />
              <ServiceLine
                included={travelInsurance}
                icon={ShieldCheck}
                label="Assurance voyage"
                description="Couverture santé et annulation"
              />
            </div>
          </article>

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
                    <span className="text-slate-500">Remise{d.discountPercent ? ` (${d.discountPercent}%)` : ""}</span>
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
                    Paiement confirmé. Cette demande est intégralement réglée.
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
              {(d.canal as string | undefined) ? (
                <KeyValueRow label="Canal">
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{d.canal as string}</Badge>
                </KeyValueRow>
              ) : null}
              {(d.companyCode as string | undefined) ? (
                <KeyValueRow label="Code entreprise">
                  <span className="font-mono font-bold text-[#171c1f]">{d.companyCode as string}</span>
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
              Payer cette demande
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

interface ItineraryEndpointsProps {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  variant?: "default" | "return";
}

function ItineraryEndpoints({ origin, originLabel, destination, destinationLabel, variant = "default" }: ItineraryEndpointsProps) {
  const accentColor = variant === "return" ? "bg-blue-500" : "bg-[#E04A1F]";
  const destAccentColor = variant === "return" ? "bg-[#E04A1F]" : "bg-[#00acbb]";

  return (
    <div className="relative">
      <div className="flex items-start gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-full ${accentColor} flex items-center justify-center text-white shrink-0 shadow-md`}>
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1 pt-1.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{originLabel}</p>
          <p className="text-base font-bold text-[#171c1f] break-words">{origin}</p>
        </div>
      </div>

      <div className="ml-6 my-2 border-l-2 border-dashed border-slate-300 h-8 flex items-center justify-start pl-6">
        <div className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-full flex items-center gap-1.5">
          <Plane className="w-3 h-3 text-[#E04A1F]" />
          <span className="text-xs font-bold text-orange-700">Vol international</span>
        </div>
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-full ${destAccentColor} flex items-center justify-center text-white shrink-0 shadow-md`}>
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1 pt-1.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{destinationLabel}</p>
          <p className="text-base font-bold text-[#171c1f] break-words">{destination}</p>
        </div>
      </div>
    </div>
  );
}

interface ServiceLineProps {
  included: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

function ServiceLine({ included, icon: Icon, label, description }: ServiceLineProps) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-2xl ${included ? "bg-green-50 border border-green-100" : "bg-slate-50 border border-slate-100 opacity-60"}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${included ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-[#171c1f]">{label}</p>
          {included ? (
            <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5 py-0">Inclus</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] px-1.5 py-0">Non</Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
