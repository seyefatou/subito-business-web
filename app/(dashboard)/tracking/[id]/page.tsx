'use client';

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Clock,
  Flag,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  User,
  Loader2,
  CreditCard,
  ShieldCheck,
  Home,
  Building2,
  Mail,
  Calendar,
  AlertCircle,
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
import { api, BookingResponse, BictorysServiceType } from "@/lib/api";
import { extractBookingSub } from "@/lib/bookingResponse";

const serviceLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  airport_shuttle: { label: "Navette Aéroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  AIRPORT_SHUTTLE: { label: "Navette Aéroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  airport_to_city: { label: "Navette Aéroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  city_to_airport: { label: "Navette Aéroport", icon: Plane, color: "bg-blue-100 text-blue-700" },
  inter_city: { label: "Inter-Ville", icon: Car, color: "bg-green-100 text-green-700" },
  intercity: { label: "Inter-Ville", icon: Car, color: "bg-green-100 text-green-700" },
  INTER_CITY_CI: { label: "Inter-Ville", icon: Car, color: "bg-green-100 text-green-700" },
  intercity_ci: { label: "Inter-Ville", icon: Car, color: "bg-green-100 text-green-700" },
  vtc_hourly: { label: "VTC Horaire", icon: Clock, color: "bg-purple-100 text-purple-700" },
  salle: { label: "Salle", icon: Building2, color: "bg-orange-100 text-orange-700" },
  logement: { label: "Logement", icon: Home, color: "bg-cyan-100 text-cyan-700" },
  activite: { label: "Activité", icon: Star, color: "bg-pink-100 text-pink-700" },
  circuit: { label: "Circuit", icon: MapPin, color: "bg-indigo-100 text-indigo-700" },
  vehicule: { label: "Location Véhicule", icon: Car, color: "bg-yellow-100 text-yellow-700" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-700" },
  assigned: { label: "Chauffeur assigné", color: "bg-purple-100 text-purple-700" },
  coordonnees_chauffeur_arrivee: { label: "Chauffeur en route", color: "bg-indigo-100 text-indigo-700" },
  in_progress: { label: "En cours", color: "bg-indigo-100 text-indigo-700" },
  started: { label: "Démarrée", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Terminée", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejetée", color: "bg-red-100 text-red-700" },
};

// Map API step status -> timeline index (1..5)
// 1=En attente, 2=Confirmé, 3=Chauffeur assigné, 4=Prise en charge, 5=Course terminée
function stepIndexFromStatus(status: string): number {
  const k = (status || "").toLowerCase();
  if (k === "completed") return 5;
  if (k === "in_progress" || k === "started" || k === "coordonnees_chauffeur_arrivee") return 4;
  if (k === "assigned") return 3;
  if (k === "confirmed") return 2;
  if (k === "pending") return 1;
  return 1;
}

const FORMAT_FCFA = (n?: number | null) => (n ? Number(n).toLocaleString("fr-FR") + " FCFA" : "—");

export default function TrackingDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = parseInt(params?.id || "", 10);
  const serviceType = searchParams.get("type") || "";

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState("");

  const { data, isLoading, error } = useQuery<unknown>({
    queryKey: ["booking-detail-page", id, serviceType],
    queryFn: async () => {
      const t = (serviceType || "").toLowerCase();
      if (t === "inter_city" || t === "intercity" || t === "intercity_ci") {
        // Use the unified endpoint for Inter-Ville CI
        const res = await fetch(`/api/bookings/airport-shuttle/compagny/${id}`);
        if (!res.ok) throw new Error('Failed to fetch booking');
        return res.json();
      }
      if (t === "vtc_hourly") return api.bookings.vtcHourly.get(id);
      if (t === "salle" || t === "service_reservation" || t === "logement" || t === "activite" || t === "circuit" || t === "vehicule") return api.serviceReservations.get(id);
      return api.bookings.airportShuttle.get(id);
    },
    enabled: !isNaN(id),
  });

  // Backend may return the booking directly OR wrapped in { data: ... }.
  // Detect by checking if .data is an object with an id field.
  const rawBooking = data as Record<string, unknown> | undefined;
  const unwrapped = rawBooking
    && typeof rawBooking.data === "object"
    && rawBooking.data !== null
    && "id" in (rawBooking.data as Record<string, unknown>)
      ? (rawBooking.data as Record<string, unknown>)
      : rawBooking;
  const booking = unwrapped as (BookingResponse & Record<string, unknown>) | undefined;

  const payMutation = useMutation({
    mutationFn: async () => {
      const bictorysType: BictorysServiceType = "booking";
      const res = await api.bictorys.initiate({ serviceType: bictorysType, serviceId: id });
      const checkoutUrl = res?.data?.checkoutUrl || (res as { checkoutUrl?: string })?.checkoutUrl;
      if (!checkoutUrl) throw new Error("URL de paiement Bictorys non disponible");
      window.open(checkoutUrl, "_blank");
      return res;
    },
    onSuccess: () => {
      toast.success("Redirection vers la page de paiement");
      setShowPayDialog(false);
      queryClient.invalidateQueries({ queryKey: ["booking-detail-page"] });
      queryClient.invalidateQueries({ queryKey: ["bookings-compagny"] });
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

  if (error || !booking) {
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

  const sub = extractBookingSub(booking as Record<string, unknown>);
  const trajet = (sub.trajetAeroport as Record<string, unknown> | undefined)
    || (sub.trajetInterVille as Record<string, unknown> | undefined)
    || (sub.trajet as Record<string, unknown> | undefined);
  let vehicule = (trajet?.vehicule as Record<string, unknown> | undefined)
    || (sub.vehicule as Record<string, unknown> | undefined)
    || (booking.vehicule as Record<string, unknown> | undefined);
  // For VTC hourly there's no vehicule object — synthesize one from vehicleType/Label
  if (!vehicule && booking.serviceType === "vtc_hourly") {
    const vehicleTypeMap: Record<string, { emoji: string; capacity: number; description: string }> = {
      berline: { emoji: "🚗", capacity: 3, description: "Berline confortable" },
      berline_premium: { emoji: "🛋️", capacity: 3, description: "Mercedes Classe E ou équivalent" },
      suv: { emoji: "🚙", capacity: 4, description: "SUV spacieux" },
      monospace: { emoji: "🚐", capacity: 6, description: "Monospace 6 places" },
      van: { emoji: "🚌", capacity: 8, description: "Van 8 places" },
    };
    const type = booking.vehicleType as string | undefined;
    const conf = type ? vehicleTypeMap[type] : undefined;
    vehicule = {
      marque: (booking.vehicleTypeLabel as string | undefined) || (conf ? conf.description : "VTC Horaire"),
      model: conf?.description,
      categorie: "VTC Horaire",
      nombrePlace: conf?.capacity,
      vtcEmoji: conf?.emoji || "🚗",
    } as Record<string, unknown>;
  }
  const driver = (sub.driver as Record<string, unknown> | undefined)
    || (booking.driver as Record<string, unknown> | undefined);

  // Merged view: start from top-level booking; sub overrides ONLY when it has a real value
  // (the service sub-object may contain empty strings or nulls for fields the top-level has filled,
  // e.g. airportShuttle.clientName === "" while booking.clientName === "Jean Fall")
  const d = (() => {
    const merged: Record<string, unknown> = { ...booking };
    for (const [k, v] of Object.entries(sub)) {
      if (v !== null && v !== undefined && v !== "") {
        merged[k] = v;
      }
    }
    return merged as BookingResponse & Record<string, unknown>;
  })();

  const bookingCode = d.bookingCode || d.reference || `#${d.id}`;
  const svc = serviceLabels[d.serviceType || ""] || serviceLabels[serviceType] || { label: d.serviceType || "Réservation", icon: Car, color: "bg-slate-100 text-slate-700" };
  const st = statusLabels[d.status || ""] || { label: d.status || "Inconnu", color: "bg-slate-100 text-slate-700" };
  const statusKey = (d.status || "").toLowerCase();
  const isOneWay = (d.isOneWay as boolean | undefined) !== false && !d.pickupDateRetour;
  const isPaid = String((d.paymentStatus as string) || "").toLowerCase() === "paid";
  const canPay = !isPaid && d.paidBy !== "client" && ["confirmed", "completed"].includes(statusKey);
  const hasDriver = !!driver && Object.keys(driver).length > 0;

  // Timeline: prefer the API steps[] array (richer than the single status field)
  const apiSteps = (booking.steps as Array<{ status?: string }> | undefined) || [];
  const latestStepStatus = apiSteps.length > 0
    ? (apiSteps[apiSteps.length - 1].status || "")
    : statusKey;
  const stepIndex = Math.max(
    stepIndexFromStatus(latestStepStatus),
    stepIndexFromStatus(statusKey),
    hasDriver ? 2 : 1,
  );

  // Trajet villes (template) — for airport_shuttle the trajet always has airport as one endpoint
  type VilleObj = { nom?: string; name?: string; isAeroport?: boolean };
  const villeDepartTrajet = (trajet?.villeDepart as VilleObj | undefined)
    || (d.villeDepart as VilleObj | undefined);
  const villeArriveeTrajet = (trajet?.villeArrivee as VilleObj | undefined)
    || (d.villeArrivee as VilleObj | undefined);

  // User's actual travel direction (independent of the template orientation)
  // Fallback: if not stored, infer from pickup address vs airport name.
  // - to_airport: pickup is a city address (Grand Yoff, etc.), so it does NOT contain airport keywords
  // - from_airport: pickup is at the airport itself
  const explicitDirection = (d.direction as string | undefined) || (d.sens as string | undefined);
  const inferDirection = (): "to_airport" | "from_airport" | undefined => {
    if (d.serviceType !== "airport_shuttle") return undefined;
    const pickup = ((d.adressePriseEnChargeAller as string) || "").toLowerCase();
    if (!pickup) return undefined;
    const airportKeywords = /(aéroport|aeroport|airport|aibd|aerogare|terminal)/i;
    return airportKeywords.test(pickup) ? "from_airport" : "to_airport";
  };
  const direction = explicitDirection || inferDirection();
  // CI uses "city_to_airport" / "airport_to_city" — map to the SN convention
  const isToAirport = direction === "to_airport" || direction === "city_to_airport";
  const isFromAirport = direction === "from_airport" || direction === "airport_to_city";

  // Identify which ville is the airport vs the city
  const trajetAirportVille = villeDepartTrajet?.isAeroport ? villeDepartTrajet
    : villeArriveeTrajet?.isAeroport ? villeArriveeTrajet
    : null;
  const trajetCityVille = villeDepartTrajet?.isAeroport ? villeArriveeTrajet
    : villeArriveeTrajet?.isAeroport ? villeDepartTrajet
    : null;

  // Effective origin/destination based on user's actual direction
  const originVille = isToAirport ? trajetCityVille
    : isFromAirport ? trajetAirportVille
    : villeDepartTrajet;
  const destinationVille = isToAirport ? trajetAirportVille
    : isFromAirport ? trajetCityVille
    : villeArriveeTrajet;

  const departVille = originVille?.nom || originVille?.name || (d.departureCity as string) || "";
  const arriveeVille = destinationVille?.nom || destinationVille?.name || (d.arrivalCity as string) || "";

  // Flight number is only relevant when arriving FROM the airport (driver needs to track flight)
  const showFlightNumber = isFromAirport;

  const totalPrice = Number(d.totalPrice || 0);
  const discountAmount = Number(d.discountAmount || 0);
  const baseFare = totalPrice + discountAmount;

  // Trajet hero image (from trajet, then origin or destination ville)
  const heroImage = ((trajet?.image as string[] | undefined)?.[0])
    || (((destinationVille as Record<string, unknown> | undefined)?.image as string[] | undefined)?.[0])
    || (((originVille as Record<string, unknown> | undefined)?.image as string[] | undefined)?.[0]);

  // Departure date/time for prominent display
  // Top-level booking.pickupDate is authoritative; sub-object pickupDateAller is sometimes
  // overwritten with the row creation timestamp by the API, so we use it only as a fallback.
  const dateAller = (booking.pickupDate as string | undefined)
    || (d.pickupDateAller as string | undefined)
    || (d.scheduledDatetime as string | undefined)
    || (d.departureDate as string | undefined);
  const heureAller = (booking.pickupTime as string | undefined)
    || (d.pickupTimeAller as string | undefined);
  const dateAllerFormatted = dateAller
    ? format(new Date(dateAller), "EEEE dd MMMM yyyy", { locale: fr })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* Bouton Retour */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 -ml-2 text-slate-600 hover:text-[#E04A1F]"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>

      {/* Breadcrumbs + Title + Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/tracking" className="hover:text-[#E04A1F] cursor-pointer transition-colors font-medium">
              Suivi commandes
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold">{bookingCode}</span>
          </nav>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Détail de la réservation
          </h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          {(() => {
            const t = (d.serviceType || serviceType || "").toLowerCase();
            const status = (d.status || "").toLowerCase();
            const nonEditableStatuses = [
              "in_progress",
              "started",
              "coordonnees_chauffeur_arrivee",
              "completed",
              "cancelled",
              "rejected",
              "paid",
              "processing",
              "deleted",
            ];
            const slugByType: Record<string, string> = {
              airport_shuttle: "airport-shuttle",
              inter_city: "inter-city",
              intercity: "inter-city",
              vtc_hourly: "hourly-vtc",
            };
            const slug = slugByType[t];
            const canEdit = !!slug && !nonEditableStatuses.includes(status);
            if (!canEdit) return null;
            return (
              <Button
                variant="outline"
                onClick={() => router.push(`/${slug}/${id}/edit`)}
                className="gap-2 rounded-xl"
              >
                Modifier
              </Button>
            );
          })()}
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
          {canPay && (
            <Button
              variant="gradient"
              onClick={() => { setSelectedPayMethod(""); setShowPayDialog(true); }}
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
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 md:gap-3 relative">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#ffdbd0] hidden md:block -translate-y-1/2 z-0" />
          <TimelineStep n={1} label="En attente" current={stepIndex >= 1} active={stepIndex === 1} icon={Clock} />
          <TimelineStep n={2} label="Confirmé" current={stepIndex >= 2} active={stepIndex === 2} icon={CheckCircle2} />
          <TimelineStep n={3} label="Chauffeur assigné" current={stepIndex >= 3} active={stepIndex === 3} icon={Car} />
          <TimelineStep n={4} label="Prise en charge" current={stepIndex >= 4} active={stepIndex === 4} icon={MapPin} />
          <TimelineStep n={5} label="Course terminée" current={stepIndex >= 5} active={stepIndex === 5} icon={Flag} />
        </div>
      </section>

      {/* Hero image (trajet/destination) + Status badges */}
      {heroImage ? (
        <section className="relative h-48 md:h-64 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(23,28,31,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt={`${departVille} → ${arriveeVille}`} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">Itinéraire</p>
                <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {departVille} → {arriveeVille}
                </h2>
              </div>
              <Badge className={`${svc.color} border-0 gap-1.5 px-3 py-1.5 shadow-md`}>
                <svc.icon className="w-3.5 h-3.5" />
                {svc.label}
              </Badge>
            </div>
          </div>
        </section>
      ) : null}

      {/* Status / Service / Payment badges */}
      <div className="flex flex-wrap items-center gap-2">
        {!heroImage && (
          <Badge className={`${svc.color} border-0 gap-1.5 px-3 py-1`}>
            <svc.icon className="w-3.5 h-3.5" />
            {svc.label}
          </Badge>
        )}
        <Badge className={`${st.color} border-0 px-3 py-1`}>{st.label}</Badge>
        <Badge className={`border-0 px-3 py-1 ${isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {isPaid ? "Payé" : "Non payé"}
        </Badge>
        {d.paidBy && (
          <Badge className={`border-0 px-3 py-1 ${d.paidBy === "company" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
            Payé par : {d.paidBy === "company" ? "Entreprise" : "Client"}
          </Badge>
        )}
        {!isOneWay && (
          <Badge className="border-0 px-3 py-1 bg-blue-100 text-blue-700">Aller-retour</Badge>
        )}
      </div>

      {/* Bento Grid — 1 grande card réservation + sidebar paiement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Card principale : tout ce qui concerne la réservation ── */}
        <article className="lg:col-span-8 bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 overflow-hidden divide-y divide-slate-100">

          {/* ── Détails service ── */}
          <div className="p-6 md:p-8">
            <ServiceInfoCard
              booking={d}
              serviceType={d.serviceType || serviceType}
              showFlightNumber={showFlightNumber}
            />
          </div>

          {/* ── Itinéraire ── */}
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Itinéraire</p>
              <Badge className={`border-0 text-xs px-3 py-1 ${isOneWay ? "bg-slate-100 text-slate-700" : "bg-blue-100 text-blue-700"}`}>
                {isOneWay ? "Aller simple" : "Aller-retour"}
              </Badge>
            </div>

            {/* Aller */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                {d.serviceType === "airport_shuttle" ? (
                  <PlaneTakeoff className="w-4 h-4 text-[#E04A1F]" />
                ) : (
                  <Car className="w-4 h-4 text-[#E04A1F]" />
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Aller</p>
                {dateAller ? (
                  <span className="ml-auto text-sm font-semibold text-slate-700">
                    {format(new Date(dateAller), "dd MMM yyyy", { locale: fr })}
                    {heureAller ? ` à ${heureAller}` : ""}
                    {(d.arrivalTime as string | undefined) ? (
                      <span className="text-slate-400 font-normal"> → arr. {d.arrivalTime as string}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <ItineraryTimeline
                origin={isToAirport
                  ? ((d.adressePriseEnChargeAller as string) || (d.adresseDepartAller as string) || (d.adressePriseEnCharge as string) || (d.departAddress as string) || departVille || "—")
                  : isFromAirport
                  ? (departVille || (d.adressePriseEnChargeAller as string) || (d.adresseDepartAller as string) || (d.departAddress as string) || "—")
                  : ((d.adressePriseEnChargeAller as string) || (d.adresseDepartAller as string) || (d.adressePriseEnChargeDepartAller as string) || (d.pickupAddress as string) || (d.adressePriseEnCharge as string) || (d.departAddress as string) || departVille || "—")}
                originLabel={departVille ? `Départ — ${departVille}` : "Prise en charge"}
                destination={isToAirport
                  ? ((d.adresseDestinationAller as string) || (d.adresseArriveeAller as string) || (d.arriveeAddress as string) || arriveeVille || "—")
                  : isFromAirport
                  ? ((d.adressePriseEnChargeAller as string) || (d.adresseDepartAller as string) || (d.adresseDestinationAller as string) || (d.adresseArriveeAller as string) || (d.arriveeAddress as string) || arriveeVille || "—")
                  : ((d.adressePriseEnChargeArriveeAller as string) || (d.adresseArriveeAller as string) || (d.adresseDestinationAller as string) || (d.arriveeAddress as string) || arriveeVille || (d.adresseDestination as string) || "—")}
                destinationLabel={arriveeVille ? `Arrivée — ${arriveeVille}` : "Destination"}
                flightNumber={showFlightNumber ? ((d.flightNumber as string) || (d.flightNumber as string) || undefined) : undefined}
              />
            </div>

            {/* Retour */}
            {!isOneWay && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  {d.serviceType === "airport_shuttle" ? (
                    <PlaneLanding className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Car className="w-4 h-4 text-blue-600" />
                  )}
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Retour</p>
                  {d.pickupDateRetour ? (
                    <span className="ml-auto text-sm font-semibold text-slate-700">
                      {format(new Date(d.pickupDateRetour as string), "dd MMM yyyy", { locale: fr })}
                      {d.pickupTimeRetour ? ` à ${d.pickupTimeRetour}` : ""}
                    </span>
                  ) : null}
                </div>
                <ItineraryTimeline
                  origin={(d.adressePriseEnChargeRetour as string) || (d.adresseDepartRetour as string) || (d.adressePriseEnChargeDepartRetour as string) || arriveeVille || "—"}
                  originLabel={arriveeVille ? `Départ retour — ${arriveeVille}` : "Prise en charge retour"}
                  destination={(d.adresseDestinationRetour as string) || (d.adresseArriveeRetour as string) || departVille || "—"}
                  destinationLabel={departVille ? `Arrivée retour — ${departVille}` : "Destination retour"}
                  flightNumber={isToAirport ? (d.flightNumber as string | undefined) : undefined}
                  variant="return"
                />
              </div>
            )}
          </div>

          {/* ── Informations client ── */}
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">Informations client</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(d.clientName || "C").substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#171c1f] truncate">{d.clientName || "—"}</p>
                {d.canal ? <p className="text-slate-400 text-xs mt-0.5">Via {d.canal}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {d.clientPhone ? (
                <a href={`tel:${d.clientPhone}`} className="flex items-center gap-2 text-[#171c1f] hover:text-[#E04A1F] font-medium transition-colors">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  {d.clientPhone as string}
                </a>
              ) : null}
              {d.clientEmail ? (
                <a href={`mailto:${d.clientEmail}`} className="flex items-center gap-2 text-[#171c1f] hover:text-[#E04A1F] font-medium transition-colors truncate">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{d.clientEmail as string}</span>
                </a>
              ) : null}
              {d.clientAddress ? (
                <div className="flex items-start gap-2 sm:col-span-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  {d.clientAddress as string}
                </div>
              ) : null}
              {d.paidBy ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">Payé par :</span>
                  <Badge className={`border-0 text-xs ${d.paidBy === "company" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                    {d.paidBy === "company" ? "Entreprise" : "Client"}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>


          {/* ── Métadonnées ── */}
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Informations de la commande</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.createdAt ? (
                <KeyValueRow label="Créée le">
                  <span className="font-bold text-[#171c1f]">
                    {format(new Date(d.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </KeyValueRow>
              ) : null}
              {d.updatedAt ? (
                <KeyValueRow label="Mise à jour">
                  <span className="font-bold text-[#171c1f]">
                    {format(new Date(d.updatedAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </KeyValueRow>
              ) : null}
              {bookingCode ? (
                <KeyValueRow label="Référence">
                  <span className="font-mono font-bold text-[#E04A1F]">{bookingCode}</span>
                </KeyValueRow>
              ) : null}
              {d.companyCode ? (
                <KeyValueRow label="Code entreprise">
                  <span className="font-mono font-bold text-[#171c1f]">{d.companyCode as string}</span>
                </KeyValueRow>
              ) : null}
              {d.tag ? (
                <KeyValueRow label="Tag">
                  <Badge className="bg-purple-100 text-purple-700 border-0">{d.tag as string}</Badge>
                </KeyValueRow>
              ) : null}
            </div>
          </div>
        </article>

        {/* ── Sidebar : Paiement + Chauffeur ── */}
        <aside className="lg:col-span-4 flex flex-col gap-6">

          {/* Paiement */}
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
                    Paiement confirmé. Cette réservation est intégralement réglée.
                  </p>
                </div>
              )}
              {canPay && (
                <Button
                  variant="gradient"
                  onClick={() => { setSelectedPayMethod(""); setShowPayDialog(true); }}
                  className="w-full mt-4 gap-2 rounded-xl"
                >
                  <CreditCard className="w-4 h-4" />
                  Payer maintenant
                </Button>
              )}
            </div>
          </article>

          {/* Véhicule prévu */}
          {vehicule && !hasDriver && (
            <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-4">Véhicule prévu</p>
              <VehiculeShowcase vehicule={vehicule} />
            </article>
          )}

          {/* Chauffeur (si assigné) */}
          {hasDriver && (
            <DriverVehicleCard driver={driver} vehicule={vehicule} hasDriver={hasDriver} />
          )}
        </aside>
      </div>

      {/* Pay Booking Dialog */}
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
              <p className="text-sm text-orange-800">
                Wave, Orange Money, carte bancaire, etc.
              </p>
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

interface ItineraryTimelineProps {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  flightNumber?: string;
  variant?: "default" | "return";
}

function ItineraryTimeline({ origin, originLabel, destination, destinationLabel, flightNumber, variant = "default" }: ItineraryTimelineProps) {
  const accentColor = variant === "return" ? "bg-blue-500" : "bg-[#E04A1F]";
  const destAccentColor = variant === "return" ? "bg-[#E04A1F]" : "bg-[#00acbb]";

  return (
    <div className="relative">
      {/* Origin */}
      <div className="flex items-start gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-full ${accentColor} flex items-center justify-center text-white shrink-0 shadow-md`}>
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1 pt-1.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{originLabel}</p>
          <p className="text-base font-bold text-[#171c1f] break-words">{origin}</p>
        </div>
      </div>

      {/* Connecting line */}
      <div className="ml-6 my-2 border-l-2 border-dashed border-slate-300 h-8 flex items-center justify-start pl-6">
        {flightNumber ? (
          <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Plane className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">Vol {flightNumber}</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">Trajet en cours…</div>
        )}
      </div>

      {/* Destination */}
      <div className="flex items-start gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-full ${destAccentColor} flex items-center justify-center text-white shrink-0 shadow-md`}>
          <Home className="w-5 h-5" />
        </div>
        <div className="flex-1 pt-1.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{destinationLabel}</p>
          <p className="text-base font-bold text-[#171c1f] break-words">{destination}</p>
        </div>
      </div>
    </div>
  );
}

interface ServiceInfoCardProps {
  booking: BookingResponse & Record<string, unknown>;
  serviceType: string;
  showFlightNumber?: boolean;
}

function ServiceInfoCard({ booking: d, serviceType, showFlightNumber = true }: ServiceInfoCardProps) {
  const isShuttle = serviceType === "airport_shuttle";
  const isInterCity = serviceType === "inter_city" || serviceType === "intercity";
  const isVtc = serviceType === "vtc_hourly";

  const dateAller = (d.pickupDate as string | undefined)
    || (d.pickupDateAller as string | undefined)
    || (d.scheduledDatetime as string | undefined)
    || (d.departureDate as string | undefined);
  const heureAller = (d.pickupTime as string | undefined)
    || (d.pickupTimeAller as string | undefined);

  const TitleIcon = isShuttle ? PlaneTakeoff : isInterCity ? Car : Clock;
  const titleLabel = isShuttle
    ? (showFlightNumber ? "Vol & navette" : "Navette aéroport")
    : isInterCity ? "Voyage inter-ville"
    : isVtc ? "Course VTC"
    : "Détails service";

  const flightNumber = d.flightNumber as string | undefined;
  const direction = d.direction as string | undefined;
  const directionLabel = direction === "to_airport" ? "Vers l'aéroport"
    : direction === "from_airport" ? "Depuis l'aéroport"
    : undefined;
  const displayFlight = isShuttle && showFlightNumber && !!flightNumber;

  return (
    <article className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 pointer-events-none">
        <TitleIcon className="text-[#E04A1F]/10 w-12 h-12" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] mb-2.5">{titleLabel}</p>
      <div className="relative z-10">
        {displayFlight ? (
          <>
            <h2
              className="text-2xl font-black text-[#171c1f] tracking-tighter leading-none"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {flightNumber}
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-1 mb-3">
              Numéro de vol{directionLabel ? ` • ${directionLabel}` : ""}
            </p>
          </>
        ) : (
          <>
            <h2
              className="text-xl font-black text-[#171c1f] tracking-tighter leading-none"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {dateAller ? format(new Date(dateAller), "dd MMM yyyy", { locale: fr }) : "—"}
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-1 mb-3">
              {heureAller ? `${heureAller}` : ""}
              {heureAller && directionLabel ? " • " : ""}
              {directionLabel || ""}
            </p>
          </>
        )}
        <div className="grid grid-cols-3 gap-x-2 gap-y-2">
          {(d.passengers as number | undefined) ? (
            <InfoStat label="Passagers" value={String(d.passengers)} />
          ) : null}
          {directionLabel && <InfoStat label="Sens" value={directionLabel} />}
          {(d.package as string | undefined) ? (
            <InfoStat label="Forfait" value={d.package as string} />
          ) : null}
          {(d.vehicleType as string | undefined) ? (
            <InfoStat label="Type véhicule" value={d.vehicleType as string} />
          ) : null}
          {(d.siegeBebes as number | undefined) ? (
            <InfoStat label="Sièges bébé" value={String(d.siegeBebes)} />
          ) : null}
          {(d.animalDeCompagnie as boolean | undefined) ? (
            <InfoStat label="Animal" value="Oui" />
          ) : null}
          {(d.adresseSupplement as number | undefined) ? (
            <InfoStat label="Suppl. adresse" value={`${d.adresseSupplement} FCFA`} />
          ) : null}
          {(d.smallBags as number | undefined) ? (
            <InfoStat label="Petits bagages" value={String(d.smallBags)} />
          ) : null}
          {(d.largeBags as number | undefined) ? (
            <InfoStat label="Grands bagages" value={String(d.largeBags)} />
          ) : null}
        </div>
        {(d.specialRequests as string | undefined) || (d.notes as string | undefined) ? (
          <div className="mt-3 p-3 bg-[#f0f4f8] rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 mb-0.5">Demandes spéciales</p>
            <p className="text-xs text-[#171c1f]">{(d.specialRequests as string) || (d.notes as string)}</p>
          </div>
        ) : null}
      </div>
    </article>
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

interface DriverVehicleCardProps {
  driver: Record<string, unknown> | undefined;
  vehicule: Record<string, unknown> | undefined;
  hasDriver: boolean;
}

function DriverVehicleCard({ driver, vehicule, hasDriver }: DriverVehicleCardProps) {
  if (hasDriver && driver) {
    const driverName = (driver.prenom as string || driver.firstName as string || "")
      + " " + (driver.nom as string || driver.lastName as string || "");
    const driverPhone = driver.telephone as string || driver.phone as string;
    const driverPhoto = (driver.photo as string) || (driver.avatar as string);
    const driverRating = driver.rating as number;
    return (
      <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#E04A1F]/10">
        <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">Votre chauffeur</p>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            {driverPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={driverPhoto} alt={driverName} className="w-24 h-24 rounded-full object-cover border-4 border-[#f0f4f8]" />
            ) : (
              <div className="w-24 h-24 rounded-full gradient-subito flex items-center justify-center text-white font-bold text-3xl border-4 border-[#f0f4f8]">
                <User className="w-10 h-10" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-[#171c1f]">{driverName.trim() || "Chauffeur assigné"}</h3>
          {driverRating ? (
            <div className="flex items-center gap-1 text-yellow-500 mt-1">
              <Star className="w-4 h-4 fill-yellow-500" />
              <span className="font-bold text-[#171c1f]">{driverRating}</span>
            </div>
          ) : null}
        </div>
        {vehicule ? <VehiculeBlock vehicule={vehicule} /> : null}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button variant="outline" className="rounded-xl gap-1.5" disabled={!driverPhone}>
            <MessageSquare className="w-4 h-4" />
            Chat
          </Button>
          {driverPhone ? (
            <a href={`tel:${driverPhone}`} className="block">
              <Button variant="outline" className="rounded-xl gap-1.5 w-full">
                <Phone className="w-4 h-4" />
                Appeler
              </Button>
            </a>
          ) : (
            <Button variant="outline" className="rounded-xl gap-1.5" disabled>
              <Phone className="w-4 h-4" />
              Appeler
            </Button>
          )}
        </div>
      </article>
    );
  }

  // No driver yet — show vehicle preview if available
  return (
    <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#E04A1F]/10">
      <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">Véhicule prévu</p>
      {vehicule ? (
        <VehiculeShowcase vehicule={vehicule} />
      ) : (
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
          <p className="font-bold text-[#171c1f] mb-1">Chauffeur à assigner</p>
          <p className="text-sm text-slate-500">Vous serez notifié dès qu&apos;un chauffeur sera affecté.</p>
        </div>
      )}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 font-medium leading-relaxed">
          Chauffeur en attente d&apos;assignation. Vous recevrez ses coordonnées dès l&apos;affectation.
        </p>
      </div>
    </article>
  );
}

interface VehiculeShowcaseProps {
  vehicule: Record<string, unknown>;
}

function VehiculeShowcase({ vehicule }: VehiculeShowcaseProps) {
  const photo = ((vehicule.image as string[] | undefined)?.[0]) || (vehicule.photo as string);
  const marque = vehicule.marque as string | undefined;
  const model = vehicule.model as string | undefined;
  const categorie = vehicule.categorie as string | undefined;
  const places = vehicule.nombrePlace as number | undefined;
  const transmission = vehicule.transmission as string | undefined;
  const climatisation = vehicule.climatisation as boolean | undefined;
  const petitBagage = vehicule.petitBagage as number | undefined;
  const grandBagage = vehicule.grandBagage as number | undefined;
  const vtcEmoji = vehicule.vtcEmoji as string | undefined;

  return (
    <>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={`${marque} ${model}`} className="w-full h-32 object-cover rounded-2xl mb-4" />
      ) : (
        <div className="w-full h-32 rounded-2xl mb-4 bg-gradient-to-br from-[#E04A1F]/10 via-[#E04A1F]/5 to-[#00acbb]/10 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,120,66,0.15),transparent_60%)]" />
          {vtcEmoji ? (
            <span className="text-6xl relative z-10">{vtcEmoji}</span>
          ) : (
            <Car className="w-16 h-16 text-[#E04A1F] relative z-10" />
          )}
        </div>
      )}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-[#171c1f]">{[marque, model].filter(Boolean).join(" ") || "Véhicule"}</h3>
        {categorie ? <p className="text-sm text-slate-500 mt-1">{categorie}</p> : null}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {places ? (
          <div className="bg-[#f0f4f8] p-3 rounded-xl">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Places</dt>
            <dd className="text-sm font-bold text-[#171c1f] mt-0.5">{places}</dd>
          </div>
        ) : null}
        {transmission ? (
          <div className="bg-[#f0f4f8] p-3 rounded-xl">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Boîte</dt>
            <dd className="text-sm font-bold text-[#171c1f] mt-0.5">{transmission}</dd>
          </div>
        ) : null}
        {petitBagage != null ? (
          <div className="bg-[#f0f4f8] p-3 rounded-xl">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Petits bagages</dt>
            <dd className="text-sm font-bold text-[#171c1f] mt-0.5">{petitBagage}</dd>
          </div>
        ) : null}
        {grandBagage != null ? (
          <div className="bg-[#f0f4f8] p-3 rounded-xl">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Grands bagages</dt>
            <dd className="text-sm font-bold text-[#171c1f] mt-0.5">{grandBagage}</dd>
          </div>
        ) : null}
        {climatisation ? (
          <div className="bg-[#f0f4f8] p-3 rounded-xl col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Confort</dt>
            <dd className="text-sm font-bold text-[#171c1f] mt-0.5">Climatisation</dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}

interface VehiculeBlockProps {
  vehicule: Record<string, unknown>;
}

function VehiculeBlock({ vehicule }: VehiculeBlockProps) {
  const photo = ((vehicule.image as string[] | undefined)?.[0]) || (vehicule.photo as string);
  const marque = vehicule.marque as string | undefined;
  const model = vehicule.model as string | undefined;
  const categorie = vehicule.categorie as string | undefined;
  return (
    <div className="bg-[#f0f4f8] p-4 rounded-2xl flex items-center gap-3">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={`${marque} ${model}`} className="w-14 h-14 object-cover rounded-xl shrink-0" />
      ) : (
        <div className="bg-white p-3 rounded-xl shadow-sm text-[#E04A1F]">
          <Car className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-tight text-slate-500">{categorie || "Véhicule"}</p>
        <p className="text-[#171c1f] font-bold truncate">{[marque, model].filter(Boolean).join(" ") || "—"}</p>
      </div>
    </div>
  );
}

interface TrajetPricingCardProps {
  trajet: Record<string, unknown>;
  isOneWay: boolean;
}

function TrajetPricingCard({ trajet, isOneWay }: TrajetPricingCardProps) {
  const prixAllerSimple = trajet.prixAllerSimple as number | undefined;
  const prixAllerRetour = trajet.prixAllerRetour as number | undefined;
  const prixAdresseSupplementaire = trajet.prixAdresseSupplementaire as number | undefined;
  const prixSiegeBebe = trajet.prixSiegeBebe as number | undefined;
  const prixAnimal = trajet.prixAnimalCompagnie as number | undefined;

  return (
    <article className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Tarification du trajet</p>
      <dl className="space-y-3 text-sm">
        {prixAllerSimple ? (
          <div className={`flex justify-between ${isOneWay ? "font-bold" : ""}`}>
            <dt className="text-slate-500">Aller simple</dt>
            <dd className="text-[#171c1f]">{FORMAT_FCFA(prixAllerSimple)}</dd>
          </div>
        ) : null}
        {prixAllerRetour ? (
          <div className={`flex justify-between ${!isOneWay ? "font-bold" : ""}`}>
            <dt className="text-slate-500">Aller-retour</dt>
            <dd className="text-[#171c1f]">{FORMAT_FCFA(prixAllerRetour)}</dd>
          </div>
        ) : null}
        {prixAdresseSupplementaire ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Adresse supplémentaire</dt>
            <dd className="text-[#171c1f]">{FORMAT_FCFA(prixAdresseSupplementaire)}</dd>
          </div>
        ) : null}
        {prixSiegeBebe ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Siège bébé</dt>
            <dd className="text-[#171c1f]">{FORMAT_FCFA(prixSiegeBebe)}</dd>
          </div>
        ) : null}
        {prixAnimal ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Animal de compagnie</dt>
            <dd className="text-[#171c1f]">{FORMAT_FCFA(prixAnimal)}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

