'use client';

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Manrope } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  MapPin,
  Navigation,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Users,
  Briefcase,
  DoorOpen,
  Fuel,
  Car,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Wifi,
  Baby,
  UserPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  Lock,
  Info,
  Loader2,
  X,
  Phone,
  Mail,
  CreditCard,
  Building2,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { searchAddresses, type AddressSuggestion } from "@/components/ui/address-autocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  api,
  VehiculeLocation,
  CreateServiceReservationDto,
  EmployeeResponse,
  DepartmentResponse,
  CreateEmployeeDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import EmployeeForm from "@/components/employees/EmployeeForm";

// ==================== FONTS & TOKENS ====================
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-velocity-headline",
  display: "swap",
});

const KINETIC_GRADIENT = "linear-gradient(135deg, #FF7842 0%, #DC3F1A 100%)";

// ==================== TYPES ====================
type ProtectionTier = "basic" | "plus" | "ultimate";
type PaymentChoice = "company_account" | "client";

interface FormState {
  pickupLocation: string;
  dropoffLocation: string;
  sameLocation: boolean;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  vehiculeId: number | null;
  protection: ProtectionTier;
  extras: { gps: boolean; childSeat: boolean; secondDriver: boolean; wifi: boolean };
  driverFirstName: string;
  driverLastName: string;
  driverEmail: string;
  driverPhone: string;
  driverDob: string;
  driverLicense: string;
  employeeId: number | null;
  payment: PaymentChoice;
  notes: string;
}

const initialState: FormState = {
  pickupLocation: "",
  dropoffLocation: "",
  sameLocation: true,
  pickupDate: "",
  pickupTime: "10:00",
  dropoffDate: "",
  dropoffTime: "10:00",
  vehiculeId: null,
  protection: "basic",
  extras: { gps: false, childSeat: false, secondDriver: false, wifi: false },
  driverFirstName: "",
  driverLastName: "",
  driverEmail: "",
  driverPhone: "",
  driverDob: "",
  driverLicense: "",
  employeeId: null,
  payment: "company_account",
  notes: "",
};

const STEPS = [
  { id: 1, label: "Véhicule" },
  { id: 2, label: "Options" },
  { id: 3, label: "Conducteur" },
  { id: 4, label: "Récapitulatif" },
];

const PROTECTION_TIERS: {
  id: ProtectionTier;
  name: string;
  subtitle: string;
  pricePerDay: number;
  features: { label: string; included: boolean }[];
  popular?: boolean;
}[] = [
  {
    id: "basic",
    name: "Basique",
    subtitle: "Couverture standard",
    pricePerDay: 0,
    features: [
      { label: "Rachat dommages collision", included: true },
      { label: "Protection vol", included: true },
      { label: "Franchise 1 500 000 FCFA", included: false },
    ],
  },
  {
    id: "plus",
    name: "Velocity Plus",
    subtitle: "Franchise réduite + bris de glace",
    pricePerDay: 9500,
    popular: true,
    features: [
      { label: "Pneus & bris de glace", included: true },
      { label: "Assistance routière 24/7", included: true },
      { label: "Franchise réduite à 300 000 FCFA", included: true },
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    subtitle: "Zéro souci",
    pricePerDay: 19000,
    features: [
      { label: "Tout le pack Plus inclus", included: true },
      { label: "Couverture accident personnel", included: true },
      { label: "Franchise 0 FCFA", included: true },
    ],
  },
];

const EXTRAS_CATALOG: {
  key: keyof FormState["extras"];
  label: string;
  desc: string;
  pricePerDay: number;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "gps", label: "GPS Navigation", desc: "Cartes à jour en temps réel", pricePerDay: 5000, icon: Navigation },
  { key: "childSeat", label: "Siège enfant", desc: "Sécurité pour vos petits", pricePerDay: 7500, icon: Baby },
  { key: "secondDriver", label: "Second conducteur", desc: "Pour partager la route", pricePerDay: 9500, icon: UserPlus },
  { key: "wifi", label: "Wi-Fi mobile", desc: "Hotspot 5G jusqu'à 5 appareils", pricePerDay: 3000, icon: Wifi },
];

// ==================== HELPERS ====================
const fmt = (n: number) => n.toLocaleString("fr-FR");

function combineDate(date: string, time: string): string {
  if (!date) return "";
  const t = time || "10:00";
  return `${date.slice(0, 10)}T${t}:00`;
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

function cleanPhone(p: string): string {
  return p.replace(/[\s\-.()]/g, "");
}
function isValidPhone(p: string): boolean {
  return /^\+?\d{7,15}$/.test(cleanPhone(p));
}

// ==================== MAIN COMPONENT ====================
export default function LocationVehiculePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const presetVehiculeId = searchParams.get("vehiculeLocationId");
  const [step, setStep] = useState<number>(presetVehiculeId ? 2 : 1);
  const [form, setForm] = useState<FormState>({
    ...initialState,
    vehiculeId: presetVehiculeId ? Number(presetVehiculeId) : null,
  });
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [transmissionFilter, setTransmissionFilter] = useState<"all" | "Manuelle" | "Automatique">("all");
  const [seatsFilter, setSeatsFilter] = useState<number | null>(null);

  // Data queries
  const { data: vehiculesResponse, isLoading: vehiculesLoading } = useQuery({
    queryKey: ["vehicules-public"],
    queryFn: () => api.vehiculesLocation.listPublic(1, 50),
  });
  const vehiculesRaw = vehiculesResponse?.data;
  const vehicules: VehiculeLocation[] = Array.isArray(vehiculesRaw)
    ? vehiculesRaw
    : (vehiculesRaw as any)?.items || (vehiculesRaw as any)?.list || [];

  const { data: employeesResponse } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.employees.list({ limit: 100, actif: true }),
  });
  const employeesRaw = employeesResponse?.data;
  const employees: EmployeeResponse[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as any)?.items || (employeesRaw as any)?.list || [];

  const { data: departmentsResponse } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(1, 100),
  });
  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];

  // Derived
  const selectedVehicule = useMemo(
    () => vehicules.find((v) => v.id === form.vehiculeId) || null,
    [vehicules, form.vehiculeId]
  );

  // First real vehicle image available — used as fallback when a vehicle has no own image
  const fallbackVehicleImage = useMemo(
    () => vehicules.find((v) => v.images?.[0])?.images?.[0],
    [vehicules]
  );

  const startISO = combineDate(form.pickupDate, form.pickupTime);
  const endISO = combineDate(form.dropoffDate || form.pickupDate, form.dropoffTime);
  const days = diffDays(startISO, endISO);

  const baseRental = (selectedVehicule?.prixParJour || 0) * days;
  const protectionTier = PROTECTION_TIERS.find((t) => t.id === form.protection)!;
  const protectionCost = protectionTier.pricePerDay * days;
  const extrasCost = EXTRAS_CATALOG.reduce(
    (sum, e) => sum + (form.extras[e.key] ? e.pricePerDay * days : 0),
    0
  );
  const subtotal = baseRental + protectionCost + extrasCost;
  const total = subtotal;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: CreateServiceReservationDto) => api.serviceReservations.create(dto),
    onSuccess: (res) => {
      const ref = res.data?.reference || `LOC-${Date.now()}`;
      const id = res.data?.id;
      setBookingRef(ref);
      queryClient.invalidateQueries({ queryKey: ["service-reservations"] });

      if (form.payment === "company_account" && id) {
        // Trigger Bictorys payment for company account
        bictorysMutation.mutate({ id });
      } else {
        setSuccess(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la réservation"),
  });

  const bictorysMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await api.bictorys.initiate({ serviceType: "service_reservation", serviceId: id });
      const checkoutUrl = res?.data?.checkoutUrl || (res as any)?.checkoutUrl;
      if (!checkoutUrl) throw new Error("URL de paiement Bictorys non disponible");
      window.open(checkoutUrl, "_blank");
      return res;
    },
    onSuccess: () => {
      toast.success("Redirection vers la page de paiement");
      setSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors du paiement");
      setSuccess(true);
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: CreateEmployeeDto) => api.employees.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      const emp = res.data;
      if (emp) {
        setForm((f) => ({
          ...f,
          employeeId: emp.id,
          driverFirstName: emp.prenom || "",
          driverLastName: emp.nom || "",
          driverEmail: emp.email || "",
          driverPhone: emp.telephone || "",
        }));
      }
      setShowAddEmployee(false);
      toast.success("Employé ajouté avec succès");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de l'ajout"),
  });

  // Handlers
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const pickEmployee = (emp: EmployeeResponse) => {
    setForm((f) => ({
      ...f,
      employeeId: emp.id,
      driverFirstName: emp.prenom || "",
      driverLastName: emp.nom || "",
      driverEmail: emp.email || "",
      driverPhone: emp.telephone || "",
    }));
    setEmployeePopoverOpen(false);
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.pickupLocation.trim()) return toast.error("Lieu de prise en charge requis"), false;
      if (!form.pickupDate) return toast.error("Date de prise en charge requise"), false;
      if (!form.vehiculeId) return toast.error("Sélectionnez un véhicule"), false;
      return true;
    }
    if (s === 3) {
      if (!form.driverFirstName.trim()) return toast.error("Prénom du conducteur requis"), false;
      if (!form.driverLastName.trim()) return toast.error("Nom du conducteur requis"), false;
      if (!form.driverPhone.trim() || !isValidPhone(form.driverPhone))
        return toast.error("Numéro de téléphone invalide"), false;
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = () => {
    if (!selectedVehicule) {
      toast.error("Aucun véhicule sélectionné");
      return;
    }
    const extrasNotes = EXTRAS_CATALOG.filter((e) => form.extras[e.key]).map((e) => e.label);
    const composedNotes = [
      form.notes,
      `Protection: ${protectionTier.name}`,
      extrasNotes.length ? `Extras: ${extrasNotes.join(", ")}` : null,
      form.dropoffLocation && form.dropoffLocation !== form.pickupLocation
        ? `Retour à: ${form.dropoffLocation}`
        : null,
      form.driverDob ? `Date de naissance: ${form.driverDob}` : null,
      form.driverLicense ? `Permis: ${form.driverLicense}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const dto: CreateServiceReservationDto = {
      serviceType: "FLOTTE",
      vehiculeLocationId: selectedVehicule.id,
      clientName: `${form.driverFirstName} ${form.driverLastName}`.trim(),
      clientPhone: cleanPhone(form.driverPhone),
      clientEmail: form.driverEmail || undefined,
      dateDebut: startISO,
      dateFin: endISO || undefined,
      employeeId: form.employeeId || undefined,
      adresseLivraison: form.pickupLocation,
      notes: composedNotes || undefined,
    };
    createMutation.mutate(dto);
  };

  const reset = () => {
    setForm(initialState);
    setStep(1);
    setSuccess(false);
    setBookingRef("");
  };

  // Auto-sync dropoff (location + date/time follow pickup)
  useEffect(() => {
    setForm((f) => ({
      ...f,
      dropoffLocation: f.pickupLocation,
      dropoffDate: f.pickupDate,
      dropoffTime: f.pickupTime,
    }));
  }, [form.pickupLocation, form.pickupDate, form.pickupTime]);

  // ==================== RENDER ====================
  if (success) {
    return (
      <div className={`${manrope.variable} min-h-[60vh] flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2
            className="text-3xl font-extrabold text-[#171c1f] mb-2"
            style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
          >
            Réservation confirmée
          </h2>
          <p className="text-[#59413a] mb-6">Votre location a été enregistrée avec succès.</p>
          <div className="bg-[#f0f4f8] rounded-2xl p-5 mb-8 inline-block">
            <p className="text-xs font-bold uppercase tracking-widest text-[#585e6c]">Référence</p>
            <p className="text-2xl font-extrabold font-mono text-[#171c1f] mt-1">{bookingRef}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset} className="rounded-xl h-12 px-6">
              Nouvelle réservation
            </Button>
            <Button
              onClick={() => router.push("/tracking")}
              className="rounded-xl h-12 px-6 text-white border-0"
              style={{ backgroundImage: KINETIC_GRADIENT }}
            >
              Voir mes réservations
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`${manrope.variable} text-[#171c1f]`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Progress */}
      <ProgressBar step={step} />

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <SearchAndVehicleStep
              form={form}
              update={update}
              vehicules={vehicules}
              loading={vehiculesLoading}
              transmissionFilter={transmissionFilter}
              setTransmissionFilter={setTransmissionFilter}
              seatsFilter={seatsFilter}
              setSeatsFilter={setSeatsFilter}
              fallbackVehicleImage={fallbackVehicleImage}
            />
          )}
          {step === 2 && (
            <OptionsStep
              form={form}
              update={update}
              days={days}
              selectedVehicule={selectedVehicule}
              startISO={startISO}
              endISO={endISO}
              baseRental={baseRental}
              protectionCost={protectionCost}
              extrasCost={extrasCost}
              total={total}
              protectionTier={protectionTier}
              fallbackVehicleImage={fallbackVehicleImage}
            />
          )}
          {step === 3 && (
            <DriverPaymentStep
              form={form}
              update={update}
              employees={employees}
              employeePopoverOpen={employeePopoverOpen}
              setEmployeePopoverOpen={setEmployeePopoverOpen}
              employeeSearch={employeeSearch}
              setEmployeeSearch={setEmployeeSearch}
              pickEmployee={pickEmployee}
              onAddEmployee={() => setShowAddEmployee(true)}
              selectedVehicule={selectedVehicule}
              days={days}
              startISO={startISO}
              endISO={endISO}
              total={total}
              fallbackVehicleImage={fallbackVehicleImage}
            />
          )}
          {step === 4 && (
            <RecapStep
              form={form}
              selectedVehicule={selectedVehicule}
              days={days}
              startISO={startISO}
              endISO={endISO}
              baseRental={baseRental}
              protectionCost={protectionCost}
              extrasCost={extrasCost}
              total={total}
              protectionTier={protectionTier}
              fallbackVehicleImage={fallbackVehicleImage}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="mt-12 flex items-center justify-between border-t border-[#dfe3e7] pt-6">
        <Button
          variant="ghost"
          onClick={back}
          disabled={step === 1}
          className="rounded-xl h-12 text-[#59413a] hover:bg-[#eaeef2]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        {step < 4 ? (
          <Button
            onClick={next}
            className="rounded-xl h-12 px-8 text-white border-0 font-bold"
            style={{
              backgroundImage: KINETIC_GRADIENT,
              fontFamily: "var(--font-velocity-headline), system-ui",
            }}
          >
            Continuer
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={createMutation.isPending || bictorysMutation.isPending}
            className="rounded-xl h-12 px-8 text-white border-0 font-bold"
            style={{
              backgroundImage: KINETIC_GRADIENT,
              fontFamily: "var(--font-velocity-headline), system-ui",
            }}
          >
            {createMutation.isPending || bictorysMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmer la réservation
          </Button>
        )}
      </div>

      {/* Add employee dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un employé</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            departments={departments}
            onSubmit={(data) => createEmployeeMutation.mutate(data)}
            onCancel={() => setShowAddEmployee(false)}
            isSubmitting={createEmployeeMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== STEP 1: SEARCH + VEHICLE (COMBINED) ====================
function SearchAndVehicleStep({
  form,
  update,
  vehicules,
  loading,
  transmissionFilter,
  setTransmissionFilter,
  seatsFilter,
  setSeatsFilter,
  fallbackVehicleImage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  vehicules: VehiculeLocation[];
  loading: boolean;
  transmissionFilter: "all" | "Manuelle" | "Automatique";
  setTransmissionFilter: (v: "all" | "Manuelle" | "Automatique") => void;
  seatsFilter: number | null;
  setSeatsFilter: (v: number | null) => void;
  fallbackVehicleImage?: string;
}) {
  const seatOptions = useMemo(() => {
    const set = new Set<number>();
    vehicules.forEach((v) => v.places && set.add(v.places));
    return Array.from(set).sort((a, b) => a - b);
  }, [vehicules]);

  const filtered = useMemo(
    () =>
      vehicules.filter((v) => {
        if (transmissionFilter !== "all" && v.transmission !== transmissionFilter) return false;
        if (seatsFilter !== null && v.places !== seatsFilter) return false;
        return true;
      }),
    [vehicules, transmissionFilter, seatsFilter]
  );

  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [transmissionFilter, seatsFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="mb-2">
        <p className="text-[#ac3509] font-bold tracking-widest uppercase text-xs mb-3">
          Location de véhicule premium
        </p>
        <h1
          className="text-4xl md:text-5xl font-black leading-tight max-w-2xl text-[#171c1f]"
          style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
        >
          Là où la précision rencontre la{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: KINETIC_GRADIENT }}>
            vélocité
          </span>
          .
        </h1>
        <p className="text-[#585e6c] mt-4 text-lg max-w-xl">
          Accélérez vos opérations. Réservez en quelques clics un véhicule adapté à votre mission.
        </p>
      </div>

      {/* Compact search bar */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_8px_24px_rgba(23,28,31,0.06)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FieldGroup label="Lieu de prise en charge" icon={<MapPin className="w-5 h-5" />}>
            <JolofAddressInput
              value={form.pickupLocation}
              onChange={(val) => update("pickupLocation", val)}
              placeholder="Ville, aéroport, adresse"
            />
          </FieldGroup>
          <FieldGroup label="Date de prise en charge" icon={<CalendarIcon className="w-5 h-5" />}>
            <input
              type="date"
              value={form.pickupDate}
              onChange={(e) => update("pickupDate", e.target.value)}
              className="w-full pl-12 pr-2 py-4 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
            />
          </FieldGroup>
          <FieldGroup label="Heure" icon={<Clock className="w-5 h-5" />}>
            <input
              type="time"
              value={form.pickupTime}
              onChange={(e) => update("pickupTime", e.target.value)}
              className="w-full pl-12 pr-2 py-4 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
            />
          </FieldGroup>
        </div>
      </div>

      {/* Vehicle selection */}
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-8">
          <div>
            <h3 className="font-extrabold text-xl mb-6 text-[#171c1f]" style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}>
              Filtres
            </h3>
            <div className="space-y-4 mb-8">
              <label className="text-xs font-black uppercase tracking-tighter text-[#59413a]">Transmission</label>
              <div className="grid grid-cols-2 gap-2">
                {(["Manuelle", "Automatique"] as const).map((t) => {
                  const active = transmissionFilter === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTransmissionFilter(active ? "all" : t)}
                      className={`py-3 px-3 rounded-xl text-sm font-bold transition-all ${active ? "text-white shadow-md" : "bg-white text-[#171c1f] hover:bg-[#eaeef2]"}`}
                      style={active ? { backgroundImage: KINETIC_GRADIENT } : undefined}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            {seatOptions.length > 0 && (
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-tighter text-[#59413a]">Nombre de places</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSeatsFilter(null)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${seatsFilter === null ? "text-white" : "bg-white text-[#171c1f] hover:bg-[#eaeef2]"}`}
                    style={seatsFilter === null ? { backgroundImage: KINETIC_GRADIENT } : undefined}
                  >
                    Toutes
                  </button>
                  {seatOptions.map((n) => {
                    const active = seatsFilter === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setSeatsFilter(active ? null : n)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${active ? "text-white" : "bg-white text-[#171c1f] hover:bg-[#eaeef2]"}`}
                        style={active ? { backgroundImage: KINETIC_GRADIENT } : undefined}
                      >
                        {n} places
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="p-6 rounded-3xl bg-[#f0f4f8]">
            <h4 className="font-bold text-[#171c1f] mb-2" style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}>
              Besoin d&apos;aide ?
            </h4>
            <p className="text-sm text-[#59413a] mb-3">Notre concierge est dispo 24/7.</p>
            <button className="text-[#ac3509] font-bold text-sm flex items-center gap-2">
              Contacter le support <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Vehicle grid */}
        <div className="flex-1">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-black text-3xl text-[#171c1f] tracking-tight" style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}>
                Flotte disponible
              </h2>
              <p className="text-[#59413a] mt-1 text-sm">
                {loading ? "Chargement..." : `${filtered.length} véhicule${filtered.length > 1 ? "s" : ""} pour votre trajet.`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[2rem] overflow-hidden animate-pulse h-96">
                  <div className="h-48 bg-[#eaeef2]" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-[#eaeef2] rounded w-3/4" />
                    <div className="h-4 bg-[#eaeef2] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center">
              <Car className="w-16 h-16 text-[#dfe3e7] mx-auto mb-4" />
              <p className="font-bold text-[#171c1f]">Aucun véhicule ne correspond</p>
              <p className="text-sm text-[#585e6c] mt-1">Essayez d&apos;élargir vos filtres.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginated.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicule={v}
                    selected={v.id === form.vehiculeId}
                    onSelect={() => update("vehiculeId", v.id)}
                    fallbackVehicleImage={fallbackVehicleImage}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#171c1f] font-bold text-sm hover:bg-[#eaeef2] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Précédent
                  </button>
                  <span className="text-sm font-bold text-[#59413a]">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{ backgroundImage: KINETIC_GRADIENT }}
                  >
                    Suivant <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== HERO ====================
function Hero() {
  return (
    <div className="mb-10">
      <p className="text-[#ac3509] font-bold tracking-widest uppercase text-xs mb-3">
        Location de véhicule premium
      </p>
      <h1
        className="text-4xl md:text-5xl font-black leading-tight max-w-2xl text-[#171c1f]"
        style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
      >
        Là où la précision rencontre la{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: KINETIC_GRADIENT }}
        >
          vélocité
        </span>
        .
      </h1>
      <p className="text-[#585e6c] mt-4 text-lg max-w-xl">
        Accélérez vos opérations. Réservez en quelques clics un véhicule adapté à votre mission.
      </p>
    </div>
  );
}

// ==================== PROGRESS BAR ====================
function ProgressBar({ step }: { step: number }) {
  const pct = (step / STEPS.length) * 100;
  const current = STEPS.find((s) => s.id === step);
  return (
    <div className="mb-10">
      <div className="flex justify-between mb-3">
        <span
          className="text-sm font-semibold text-[#ac3509] uppercase tracking-widest"
          style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
        >
          Étape {step} sur {STEPS.length}
        </span>
        <span className="text-sm font-medium text-[#59413a]">{current?.label}</span>
      </div>
      <div className="h-1.5 w-full bg-[#eaeef2] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundImage: KINETIC_GRADIENT }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ==================== STEP 1: SEARCH ====================
function SearchStep({
  form,
  update,
  onContinue,
  fallbackVehicleImage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onContinue: () => void;
  fallbackVehicleImage?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 lg:p-10 shadow-[0_24px_48px_rgba(23,28,31,0.06)] relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 opacity-[0.05]"
          style={{ backgroundImage: KINETIC_GRADIENT }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <Search className="w-7 h-7 text-[#ac3509]" />
            <h2
              className="text-2xl font-extrabold text-[#171c1f]"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              Trouvez votre véhicule
            </h2>
          </div>

          <div className="space-y-6">
            {/* Location */}
            <FieldGroup
              label="Lieu de prise en charge"
              icon={<MapPin className="w-5 h-5" />}
            >
              <JolofAddressInput
                value={form.pickupLocation}
                onChange={(val) => update("pickupLocation", val)}
                placeholder="Ville, aéroport, adresse"
              />
            </FieldGroup>

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Date de prise" icon={<CalendarIcon className="w-5 h-5" />}>
                <input
                  type="date"
                  value={form.pickupDate}
                  onChange={(e) => update("pickupDate", e.target.value)}
                  className="w-full pl-12 pr-2 py-4 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                />
              </FieldGroup>
              <FieldGroup label="Heure" icon={<Clock className="w-5 h-5" />}>
                <input
                  type="time"
                  value={form.pickupTime}
                  onChange={(e) => update("pickupTime", e.target.value)}
                  className="w-full pl-12 pr-2 py-4 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                />
              </FieldGroup>
            </div>

            <div className="pt-4">
              <button
                onClick={onContinue}
                className="w-full py-5 rounded-2xl text-white font-extrabold text-lg shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                style={{
                  backgroundImage: KINETIC_GRADIENT,
                  fontFamily: "var(--font-velocity-headline), system-ui",
                  boxShadow: "0 16px 32px rgba(172, 53, 9, 0.25)",
                }}
              >
                Rechercher des véhicules
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-[#f0f4f8] rounded-[2rem] overflow-hidden p-6 flex flex-col">
          <span className="inline-block bg-[#00acbb]/20 text-[#006972] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter mb-3 self-start">
            Nouveau dans la flotte
          </span>
          <h4
            className="text-xl font-bold text-[#171c1f] mb-2 leading-tight"
            style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
          >
            Série Executive 2024
          </h4>
          <p className="text-sm text-[#59413a] font-medium leading-relaxed mb-6">
            Boostez vos déplacements pro avec nos dernières arrivées de berlines électriques.
          </p>
          <ExecutiveImage fallbackVehicleImage={fallbackVehicleImage} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard value="500+" label="Véhicules" color="#ac3509" />
          <StatCard value="24/7" label="Support" color="#006972" />
        </div>
      </div>
    </div>
  );
}

function ExecutiveImage({ fallbackVehicleImage }: { fallbackVehicleImage?: string }) {
  return (
    <div className="rounded-2xl overflow-hidden h-40 bg-[#eaeef2] flex items-center justify-center">
      <VehicleImage
        src="/series-executive-2024.jpg"
        fallbackSrc={fallbackVehicleImage}
        alt="Série Executive 2024"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function VehicleImage({
  src,
  fallbackSrc,
  alt,
  className,
  iconSize = "w-16 h-16",
}: {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  iconSize?: string;
}) {
  // Resolution chain: own image → another real vehicle image → /vehicle-placeholder.jpg → Car icon
  const buildChain = (own?: string, fb?: string): string[] => {
    const chain: string[] = [];
    if (own) chain.push(own);
    if (fb && fb !== own) chain.push(fb);
    chain.push("/vehicle-placeholder.jpg");
    return chain;
  };
  const [chain, setChain] = useState<string[]>(() => buildChain(src, fallbackSrc));
  const [index, setIndex] = useState(0);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setChain(buildChain(src, fallbackSrc));
    setIndex(0);
    setErrored(false);
  }, [src, fallbackSrc]);

  if (errored || chain.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Car className={`${iconSize} text-[#8d7169]/30`} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chain[index]}
      alt={alt}
      className={className}
      onError={() => {
        if (index < chain.length - 1) setIndex(index + 1);
        else setErrored(true);
      }}
    />
  );
}

function JolofAddressInput({
  value,
  onChange,
  placeholder,
  countryCode = "sn",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  countryCode?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (text: string) => {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchAddresses(text, countryCode);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setLoading(false);
    }, 350);
  };

  const handleSelect = (s: AddressSuggestion) => {
    onChange(s.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        className="w-full pl-12 pr-10 py-4 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all placeholder:text-[#8d7169]/60"
      />
      {loading && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#8d7169]" />
      )}
      {showSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-[#dfe3e7] rounded-2xl shadow-xl max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={i}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-[#ffe5dc] transition-colors border-b border-[#eaeef2] last:border-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#ac3509] mt-0.5 shrink-0" />
                <p className="text-sm text-[#171c1f] leading-snug">{s.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-[#59413a] px-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8d7169]">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-[0_8px_16px_rgba(23,28,31,0.03)] flex flex-col items-center text-center">
      <span
        className="text-2xl font-black"
        style={{ color, fontFamily: "var(--font-velocity-headline), system-ui" }}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#8d7169] mt-1">
        {label}
      </span>
    </div>
  );
}

// ==================== STEP 2: VEHICLE SELECTION ====================
function VehicleSelectionStep({
  vehicules,
  loading,
  selectedId,
  onSelect,
  transmissionFilter,
  setTransmissionFilter,
  seatsFilter,
  setSeatsFilter,
  fallbackVehicleImage,
}: {
  vehicules: VehiculeLocation[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  transmissionFilter: "all" | "Manuelle" | "Automatique";
  setTransmissionFilter: (v: "all" | "Manuelle" | "Automatique") => void;
  seatsFilter: number | null;
  setSeatsFilter: (v: number | null) => void;
  fallbackVehicleImage?: string;
}) {
  const seatOptions = useMemo(() => {
    const set = new Set<number>();
    vehicules.forEach((v) => v.places && set.add(v.places));
    return Array.from(set).sort((a, b) => a - b);
  }, [vehicules]);

  const filtered = useMemo(
    () =>
      vehicules.filter((v) => {
        if (transmissionFilter !== "all" && v.transmission !== transmissionFilter) return false;
        if (seatsFilter !== null && v.places !== seatsFilter) return false;
        return true;
      }),
    [vehicules, transmissionFilter, seatsFilter]
  );

  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [transmissionFilter, seatsFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      <aside className="w-full lg:w-72 shrink-0 space-y-8">
        <div>
          <h3
            className="font-extrabold text-xl mb-6 text-[#171c1f]"
            style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
          >
            Filtres
          </h3>
          <div className="space-y-4 mb-8">
            <label className="text-xs font-black uppercase tracking-tighter text-[#59413a]">
              Transmission
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["Manuelle", "Automatique"] as const).map((t) => {
                const active = transmissionFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTransmissionFilter(active ? "all" : t)}
                    className={`py-3 px-3 rounded-xl text-sm font-bold transition-all ${
                      active ? "text-white shadow-md" : "bg-white text-[#171c1f] hover:bg-[#eaeef2]"
                    }`}
                    style={active ? { backgroundImage: KINETIC_GRADIENT } : undefined}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {seatOptions.length > 0 && (
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-tighter text-[#59413a]">
                Nombre de places
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSeatsFilter(null)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    seatsFilter === null
                      ? "text-white"
                      : "bg-white text-[#171c1f] hover:bg-[#eaeef2]"
                  }`}
                  style={seatsFilter === null ? { backgroundImage: KINETIC_GRADIENT } : undefined}
                >
                  Toutes
                </button>
                {seatOptions.map((n) => {
                  const active = seatsFilter === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setSeatsFilter(active ? null : n)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        active ? "text-white" : "bg-white text-[#171c1f] hover:bg-[#eaeef2]"
                      }`}
                      style={active ? { backgroundImage: KINETIC_GRADIENT } : undefined}
                    >
                      {n} places
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-[#f0f4f8] relative overflow-hidden">
          <div className="relative z-10">
            <h4
              className="font-bold text-[#171c1f] mb-2"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              Besoin d&apos;aide ?
            </h4>
            <p className="text-sm text-[#59413a] mb-3">Notre concierge est dispo 24/7.</p>
            <button className="text-[#ac3509] font-bold text-sm flex items-center gap-2">
              Contacter le support <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2
              className="font-black text-3xl text-[#171c1f] tracking-tight"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              Flotte disponible
            </h2>
            <p className="text-[#59413a] mt-1 text-sm">
              {loading ? "Chargement..." : `${filtered.length} véhicule${filtered.length > 1 ? "s" : ""} pour votre trajet.`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[2rem] overflow-hidden animate-pulse h-96"
              >
                <div className="h-48 bg-[#eaeef2]" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-[#eaeef2] rounded w-3/4" />
                  <div className="h-4 bg-[#eaeef2] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center">
            <Car className="w-16 h-16 text-[#dfe3e7] mx-auto mb-4" />
            <p className="font-bold text-[#171c1f]">Aucun véhicule ne correspond</p>
            <p className="text-sm text-[#585e6c] mt-1">Essayez d&apos;élargir vos filtres.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginated.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicule={v}
                  selected={v.id === selectedId}
                  onSelect={() => onSelect(v.id)}
                  fallbackVehicleImage={fallbackVehicleImage}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#171c1f] font-bold text-sm hover:bg-[#eaeef2] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Précédent
                </button>
                <span className="text-sm font-bold text-[#59413a]">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ backgroundImage: KINETIC_GRADIENT }}
                >
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VehicleCard({
  vehicule,
  selected,
  onSelect,
  fallbackVehicleImage,
}: {
  vehicule: VehiculeLocation;
  selected: boolean;
  onSelect: () => void;
  fallbackVehicleImage?: string;
}) {
  return (
    <div
      className={`group bg-white rounded-[2rem] overflow-hidden flex flex-col transition-all duration-300 cursor-pointer ${
        selected ? "ring-2 ring-[#ac3509] shadow-[0_24px_48px_rgba(172,53,9,0.15)]" : "hover:shadow-[0_24px_48px_rgba(23,28,31,0.08)]"
      }`}
      onClick={onSelect}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#eaeef2]">
        <VehicleImage
          src={vehicule.images?.[0]}
          fallbackSrc={fallbackVehicleImage}
          alt={`${vehicule.marque} ${vehicule.modele}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {vehicule.type && (
          <div className="absolute top-4 left-4">
            <span className="px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-[#ac3509]">
              {vehicule.type}
            </span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3
              className="font-extrabold text-xl text-[#171c1f] leading-tight"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              {vehicule.marque} {vehicule.modele}
            </h3>
            {vehicule.annee && (
              <p className="text-[#585e6c] text-xs mt-1">Année {vehicule.annee}</p>
            )}
          </div>
          <div className="text-right">
            <span
              className="block text-xl font-black text-[#ac3509]"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              {fmt(vehicule.prixParJour || 0)}
            </span>
            <span className="text-[10px] font-bold text-[#585e6c] uppercase tracking-widest">
              FCFA / jour
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {vehicule.transmission && (
            <FeatureBadge icon={<Settings2 className="w-4 h-4" />} label={vehicule.transmission} />
          )}
          {vehicule.places && (
            <FeatureBadge icon={<Users className="w-4 h-4" />} label={`${vehicule.places} places`} />
          )}
          {vehicule.carburant && (
            <FeatureBadge icon={<Fuel className="w-4 h-4" />} label={vehicule.carburant} />
          )}
          {vehicule.zoneOperations && (
            <FeatureBadge icon={<MapPin className="w-4 h-4" />} label={vehicule.zoneOperations} />
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`mt-auto w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all ${
            selected
              ? "text-white shadow-xl"
              : "bg-[#eaeef2] text-[#171c1f] hover:bg-[#dfe3e7]"
          }`}
          style={
            selected
              ? { backgroundImage: KINETIC_GRADIENT, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }
              : undefined
          }
        >
          {selected ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Sélectionné
            </span>
          ) : (
            "Choisir ce véhicule"
          )}
        </button>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f0f4f8]">
      <span className="text-[#ac3509]">{icon}</span>
      <span className="text-xs font-bold text-[#171c1f] truncate">{label}</span>
    </div>
  );
}

// ==================== STEP 3: OPTIONS & PROTECTION ====================
function OptionsStep({
  form,
  update,
  days,
  selectedVehicule,
  startISO,
  endISO,
  baseRental,
  protectionCost,
  extrasCost,
  total,
  protectionTier,
  fallbackVehicleImage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  days: number;
  selectedVehicule: VehiculeLocation | null;
  startISO: string;
  endISO: string;
  baseRental: number;
  protectionCost: number;
  extrasCost: number;
  total: number;
  protectionTier: typeof PROTECTION_TIERS[number];
  fallbackVehicleImage?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-8 space-y-12">
        <section>
          <h2
            className="text-xl font-bold mb-6 text-[#171c1f]"
            style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
          >
            Choisissez votre protection
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PROTECTION_TIERS.map((tier) => {
              const active = form.protection === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`bg-white p-7 rounded-2xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] relative overflow-hidden flex flex-col ${
                    active ? "ring-2 ring-[#ac3509]" : ""
                  } ${tier.popular ? "ring-2 ring-[#ac3509]" : ""}`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 bg-[#ac3509] px-4 py-1 text-[10px] uppercase font-bold text-white rounded-bl-lg">
                      Populaire
                    </div>
                  )}
                  <div className="mb-5">
                    <h3
                      className="font-bold text-lg text-[#171c1f]"
                      style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
                    >
                      {tier.name}
                    </h3>
                    <p className="text-sm text-[#585e6c]">{tier.subtitle}</p>
                  </div>
                  <div className="mb-6">
                    {tier.pricePerDay === 0 ? (
                      <span
                        className="text-3xl font-extrabold text-[#171c1f]"
                        style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
                      >
                        Inclus
                      </span>
                    ) : (
                      <>
                        <span
                          className="text-3xl font-extrabold text-[#171c1f]"
                          style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
                        >
                          {fmt(tier.pricePerDay)}
                        </span>
                        <span className="text-sm text-[#585e6c]"> FCFA/jour</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6 flex-grow">
                    {tier.features.map((f, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-3 text-sm ${
                          f.included ? "text-[#171c1f]" : "text-[#585e6c]"
                        }`}
                      >
                        {f.included ? (
                          <CheckCircle2 className="w-4 h-4 text-[#ac3509] shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-[#dfe3e7] shrink-0" />
                        )}
                        {f.label}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => update("protection", tier.id)}
                    className={`w-full py-3 font-semibold rounded-xl transition-all ${
                      active
                        ? "text-white shadow-lg"
                        : "bg-[#eaeef2] text-[#171c1f] hover:bg-[#dfe3e7]"
                    }`}
                    style={
                      active
                        ? { backgroundImage: KINETIC_GRADIENT, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }
                        : undefined
                    }
                  >
                    {active ? "Sélectionné" : "Choisir"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2
            className="text-xl font-bold mb-6 text-[#171c1f]"
            style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
          >
            Services additionnels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {EXTRAS_CATALOG.map((extra) => {
              const active = form.extras[extra.key];
              const Icon = extra.icon;
              return (
                <div
                  key={extra.key}
                  className={`bg-[#f0f4f8] p-5 rounded-2xl transition-all ${
                    active ? "ring-2 ring-[#ac3509] bg-white" : "hover:bg-white"
                  }`}
                >
                  <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-[#ac3509]" />
                  </div>
                  <h4 className="font-bold text-[#171c1f] mb-1">{extra.label}</h4>
                  <p className="text-xs text-[#585e6c] mb-4 leading-relaxed">{extra.desc}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-[#171c1f]">
                      {fmt(extra.pricePerDay)}
                      <span className="text-[10px] font-normal text-[#585e6c]"> FCFA/j</span>
                    </span>
                    <button
                      onClick={() =>
                        update("extras", { ...form.extras, [extra.key]: !active })
                      }
                      className="text-[#ac3509] font-bold text-sm flex items-center gap-1"
                    >
                      {active ? (
                        <>
                          <Check className="w-4 h-4" />
                          Ajouté
                        </>
                      ) : (
                        <>+ Ajouter</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <SummarySidebar
        selectedVehicule={selectedVehicule}
        startISO={startISO}
        endISO={endISO}
        days={days}
        baseRental={baseRental}
        protectionCost={protectionCost}
        extrasCost={extrasCost}
        total={total}
        protectionTier={protectionTier}
        fallbackVehicleImage={fallbackVehicleImage}
      />
    </div>
  );
}

// ==================== STEP 4: DRIVER + PAYMENT ====================
function DriverPaymentStep({
  form,
  update,
  employees,
  employeePopoverOpen,
  setEmployeePopoverOpen,
  employeeSearch,
  setEmployeeSearch,
  pickEmployee,
  onAddEmployee,
  selectedVehicule,
  days,
  startISO,
  endISO,
  total,
  fallbackVehicleImage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  employees: EmployeeResponse[];
  employeePopoverOpen: boolean;
  setEmployeePopoverOpen: (v: boolean) => void;
  employeeSearch: string;
  setEmployeeSearch: (v: string) => void;
  pickEmployee: (e: EmployeeResponse) => void;
  onAddEmployee: () => void;
  selectedVehicule: VehiculeLocation | null;
  days: number;
  startISO: string;
  endISO: string;
  total: number;
  fallbackVehicleImage?: string;
}) {
  const filteredEmployees = employees.filter((e) => {
    const q = employeeSearch.toLowerCase();
    return (
      !q ||
      `${e.prenom || ""} ${e.nom || ""}`.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
      <div className="md:col-span-8 space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#eaeef2] text-[#ac3509]">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-[#171c1f]"
                style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
              >
                Informations du conducteur
              </h2>
              <p className="text-sm text-[#59413a]">
                Doivent correspondre au permis de conduire fourni.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex-1 h-12 px-4 rounded-xl bg-[#f0f4f8] text-left flex items-center justify-between text-sm font-medium text-[#171c1f] hover:bg-[#eaeef2] transition-colors">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#ac3509]" />
                    {form.employeeId
                      ? `${form.driverFirstName} ${form.driverLastName}`
                      : "Choisir un employé existant"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8d7169]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Rechercher un employé..."
                    value={employeeSearch}
                    onValueChange={setEmployeeSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
                    <CommandGroup>
                      {filteredEmployees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          onSelect={() => pickEmployee(emp)}
                          className="cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">
                              {emp.prenom} {emp.nom}
                            </p>
                            {emp.email && (
                              <p className="text-xs text-[#585e6c]">{emp.email}</p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              onClick={onAddEmployee}
              className="rounded-xl h-12 border-[#dfe3e7]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nouvel employé
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldInline label="Prénom" required>
              <input
                type="text"
                placeholder="Ex. Aida"
                value={form.driverFirstName}
                onChange={(e) => update("driverFirstName", e.target.value)}
                className="w-full h-14 px-4 rounded-xl bg-[#eaeef2] border-none focus:ring-2 focus:ring-[#ac3509]/40 focus:bg-white transition-all"
              />
            </FieldInline>
            <FieldInline label="Nom" required>
              <input
                type="text"
                placeholder="Ex. Diallo"
                value={form.driverLastName}
                onChange={(e) => update("driverLastName", e.target.value)}
                className="w-full h-14 px-4 rounded-xl bg-[#eaeef2] border-none focus:ring-2 focus:ring-[#ac3509]/40 focus:bg-white transition-all"
              />
            </FieldInline>
            <FieldInline label="Téléphone" required>
              <PhoneInput
                value={form.driverPhone}
                onChange={(v) => update("driverPhone", v || "")}
                defaultCountryCode="+221"
                placeholder="77 123 45 67"
                className="[&_input]:h-14 [&_input]:rounded-xl [&_input]:bg-[#eaeef2] [&_input]:border-none"
              />
            </FieldInline>
            <FieldInline label="Email">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={form.driverEmail}
                onChange={(e) => update("driverEmail", e.target.value)}
                className="w-full h-14 px-4 rounded-xl bg-[#eaeef2] border-none focus:ring-2 focus:ring-[#ac3509]/40 focus:bg-white transition-all"
              />
            </FieldInline>
            <FieldInline label="Date de naissance">
              <input
                type="date"
                value={form.driverDob}
                onChange={(e) => update("driverDob", e.target.value)}
                className="w-full h-14 px-4 rounded-xl bg-[#eaeef2] border-none focus:ring-2 focus:ring-[#ac3509]/40 focus:bg-white transition-all"
              />
            </FieldInline>
            <FieldInline label="Numéro de permis">
              <input
                type="text"
                placeholder="SN123456789"
                value={form.driverLicense}
                onChange={(e) => update("driverLicense", e.target.value)}
                className="w-full h-14 px-4 rounded-xl bg-[#eaeef2] border-none focus:ring-2 focus:ring-[#ac3509]/40 focus:bg-white transition-all"
              />
            </FieldInline>
          </div>

          <FieldInline label="Notes (optionnel)">
            <Textarea
              placeholder="Instructions particulières..."
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="rounded-xl bg-[#eaeef2] border-none focus-visible:ring-2 focus-visible:ring-[#ac3509]/40 focus-visible:bg-white"
            />
          </FieldInline>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#eaeef2] text-[#ac3509]">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-[#171c1f]"
                style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
              >
                Mode de paiement
              </h2>
              <p className="text-sm text-[#59413a]">
                Choisissez comment cette location sera réglée.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PaymentOption
              active={form.payment === "company_account"}
              onClick={() => update("payment", "company_account")}
              icon={<Building2 className="w-5 h-5" />}
              title="Compte entreprise"
              desc="Facturation directe à l'entreprise via Bictorys."
              badge="Bictorys"
            />
            <PaymentOption
              active={form.payment === "client"}
              onClick={() => update("payment", "client")}
              icon={<CreditCard className="w-5 h-5" />}
              title="Carte personnelle"
              desc="Le conducteur règle lui-même (Wave, Orange Money, carte)."
              badge="Wave • OM • Visa"
            />
          </div>
        </section>
      </div>

      <SummarySidebar
        selectedVehicule={selectedVehicule}
        startISO={startISO}
        endISO={endISO}
        days={days}
        baseRental={(selectedVehicule?.prixParJour || 0) * days}
        protectionCost={
          PROTECTION_TIERS.find((t) => t.id === form.protection)!.pricePerDay * days
        }
        extrasCost={EXTRAS_CATALOG.reduce(
          (s, e) => s + (form.extras[e.key] ? e.pricePerDay * days : 0),
          0
        )}
        total={total}
        protectionTier={PROTECTION_TIERS.find((t) => t.id === form.protection)!}
        fallbackVehicleImage={fallbackVehicleImage}
      />
    </div>
  );
}

function FieldInline({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[#59413a] ml-1">
        {label} {required && <span className="text-[#ac3509]">*</span>}
      </label>
      {children}
    </div>
  );
}

function PaymentOption({
  active,
  onClick,
  icon,
  title,
  desc,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all ${
        active
          ? "bg-white border-[#ac3509] shadow-md"
          : "bg-[#f0f4f8] border-transparent hover:border-[#dfe3e7]"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          active ? "text-white" : "bg-white text-[#ac3509]"
        }`}
        style={active ? { backgroundImage: KINETIC_GRADIENT } : undefined}
      >
        {icon}
      </div>
      <div className="flex-grow min-w-0">
        <span
          className="block font-bold text-base mb-1 text-[#171c1f]"
          style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
        >
          {title}
        </span>
        <span className="block text-sm text-[#585e6c] mb-2 leading-relaxed">{desc}</span>
        <span className="text-[10px] font-bold text-[#ac3509] uppercase tracking-tight">
          {badge}
        </span>
      </div>
      {active && (
        <CheckCircle2 className="w-5 h-5 text-[#ac3509] shrink-0" />
      )}
    </button>
  );
}

// ==================== STEP 5: RECAP ====================
function RecapStep({
  form,
  selectedVehicule,
  days,
  startISO,
  endISO,
  baseRental,
  protectionCost,
  extrasCost,
  total,
  protectionTier,
  fallbackVehicleImage,
}: {
  form: FormState;
  selectedVehicule: VehiculeLocation | null;
  days: number;
  startISO: string;
  endISO: string;
  baseRental: number;
  protectionCost: number;
  extrasCost: number;
  total: number;
  protectionTier: typeof PROTECTION_TIERS[number];
  fallbackVehicleImage?: string;
}) {
  const activeExtras = EXTRAS_CATALOG.filter((e) => form.extras[e.key]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 space-y-6">
        {/* Vehicle card */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(23,28,31,0.04)] flex flex-col md:flex-row">
          <div className="md:w-1/2 relative h-56 md:h-auto bg-[#eaeef2]">
            <VehicleImage
              src={selectedVehicule?.images?.[0]}
              fallbackSrc={fallbackVehicleImage}
              alt={`${selectedVehicule?.marque ?? ""} ${selectedVehicule?.modele ?? ""}`}
              className="w-full h-full object-cover"
              iconSize="w-20 h-20"
            />
            {selectedVehicule?.type && (
              <div className="absolute top-4 left-4">
                <span className="bg-white/95 text-[#ac3509] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedVehicule.type}
                </span>
              </div>
            )}
          </div>
          <div className="md:w-1/2 p-7 flex flex-col justify-center">
            <h2
              className="text-2xl font-bold mb-2 text-[#171c1f]"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              {selectedVehicule?.marque} {selectedVehicule?.modele}
            </h2>
            <p className="text-[#585e6c] mb-5 text-sm">
              {selectedVehicule?.annee && `${selectedVehicule.annee} • `}
              {selectedVehicule?.carburant || ""}
              {selectedVehicule?.transmission && ` • ${selectedVehicule.transmission}`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {selectedVehicule?.places && (
                <RecapMini icon={<Users className="w-4 h-4" />} label={`${selectedVehicule.places} places`} />
              )}
              {selectedVehicule?.transmission && (
                <RecapMini icon={<Settings2 className="w-4 h-4" />} label={selectedVehicule.transmission} />
              )}
              <RecapMini icon={<ShieldCheck className="w-4 h-4" />} label={protectionTier.name} />
              <RecapMini icon={<CalendarIcon className="w-4 h-4" />} label={`${days} jour${days > 1 ? "s" : ""}`} />
            </div>
          </div>
        </section>

        {/* Period & driver */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#f0f4f8] rounded-2xl p-7 space-y-5">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-[#ac3509]" />
              <h3
                className="font-bold text-base text-[#171c1f]"
                style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
              >
                Période de location
              </h3>
            </div>
            <div className="space-y-4">
              <div className="relative pl-5 border-l-2 border-[#ff7043]">
                <p className="text-xs font-bold text-[#ac3509] uppercase mb-1">Prise en charge</p>
                <p className="font-bold text-[#171c1f]">
                  {startISO ? format(new Date(startISO), "EEE d MMM • HH:mm", { locale: fr }) : "—"}
                </p>
                <p className="text-sm text-[#585e6c]">{form.pickupLocation || "—"}</p>
              </div>
              <div className="relative pl-5 border-l-2 border-[#dfe3e7]">
                <p className="text-xs font-bold text-[#585e6c] uppercase mb-1">Retour</p>
                <p className="font-bold text-[#171c1f]">
                  {endISO ? format(new Date(endISO), "EEE d MMM • HH:mm", { locale: fr }) : "—"}
                </p>
                <p className="text-sm text-[#585e6c]">
                  {form.dropoffLocation || form.pickupLocation || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#f0f4f8] rounded-2xl p-7 space-y-5">
            <div className="flex items-center gap-3">
              <BadgeCheck className="w-5 h-5 text-[#ac3509]" />
              <h3
                className="font-bold text-base text-[#171c1f]"
                style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
              >
                Conducteur
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-[#585e6c] uppercase mb-1">Nom</p>
                <p className="font-bold text-[#171c1f]">
                  {form.driverFirstName} {form.driverLastName}
                </p>
              </div>
              {form.driverEmail && (
                <div className="flex items-center gap-2 text-sm text-[#171c1f]">
                  <Mail className="w-3.5 h-3.5 text-[#8d7169]" />
                  {form.driverEmail}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-[#171c1f]">
                <Phone className="w-3.5 h-3.5 text-[#8d7169]" />
                {form.driverPhone}
              </div>
            </div>
          </div>
        </div>

        {/* Extras */}
        {(activeExtras.length > 0 || protectionTier.id !== "basic") && (
          <section className="bg-[#f0f4f8] rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-5">
              <ShieldAlert className="w-5 h-5 text-[#ac3509]" />
              <h3
                className="font-bold text-base text-[#171c1f]"
                style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
              >
                Extras & couverture
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#ffdbd0] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#ac3509]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#171c1f]">{protectionTier.name}</p>
                    <p className="text-xs text-[#585e6c]">{protectionTier.subtitle}</p>
                  </div>
                </div>
                <span className="font-bold text-[#171c1f]">
                  {protectionTier.pricePerDay === 0 ? "Inclus" : `${fmt(protectionCost)} FCFA`}
                </span>
              </div>
              {activeExtras.map((e) => {
                const Icon = e.icon;
                return (
                  <div
                    key={e.key}
                    className="flex justify-between items-center bg-white p-4 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#dde2f3] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#414754]" />
                      </div>
                      <div>
                        <p className="font-bold text-[#171c1f]">{e.label}</p>
                        <p className="text-xs text-[#585e6c]">{e.desc}</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#171c1f]">
                      {fmt(e.pricePerDay * days)} FCFA
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Right: total */}
      <div className="lg:col-span-4 lg:sticky lg:top-24">
        <div className="bg-[#dfe3e7] rounded-2xl p-7 shadow-xl">
          <h3
            className="font-extrabold text-xl mb-7 text-[#171c1f]"
            style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
          >
            Détail du prix
          </h3>
          <div className="space-y-3 mb-7 text-sm">
            <Row label={`Location (${days} j)`} value={`${fmt(baseRental)} FCFA`} />
            {protectionCost > 0 && (
              <Row label={protectionTier.name} value={`${fmt(protectionCost)} FCFA`} />
            )}
            {extrasCost > 0 && <Row label="Extras" value={`${fmt(extrasCost)} FCFA`} />}
            <div className="h-px bg-[#8d7169]/20 my-3" />
            <Row label="Sous-total" value={`${fmt(total)} FCFA`} />
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 mb-6 text-center border border-white/40">
            <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">
              Total à payer
            </p>
            <p
              className="text-3xl font-black text-[#171c1f]"
              style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
            >
              {fmt(total)} FCFA
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[#006972]">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              Paiement sécurisé SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecapMini({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#59413a]">
      <span className="text-[#ac3509]">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#59413a] font-medium">
      <span>{label}</span>
      <span className="text-[#171c1f] font-semibold">{value}</span>
    </div>
  );
}

// ==================== SUMMARY SIDEBAR (Steps 3 & 4) ====================
function SummarySidebar({
  selectedVehicule,
  startISO,
  endISO,
  days,
  baseRental,
  protectionCost,
  extrasCost,
  total,
  protectionTier,
  fallbackVehicleImage,
}: {
  selectedVehicule: VehiculeLocation | null;
  startISO: string;
  endISO: string;
  days: number;
  baseRental: number;
  protectionCost: number;
  extrasCost: number;
  total: number;
  protectionTier: typeof PROTECTION_TIERS[number];
  fallbackVehicleImage?: string;
}) {
  return (
    <div className="lg:col-span-4 md:col-span-4">
      <div className="lg:sticky lg:top-24 space-y-5">
        <div className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(23,28,31,0.08)] overflow-hidden">
          <div className="h-44 relative bg-[#eaeef2]">
            <VehicleImage
              src={selectedVehicule?.images?.[0]}
              fallbackSrc={fallbackVehicleImage}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-5 text-white">
              <h4
                className="font-extrabold text-lg leading-tight"
                style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
              >
                {selectedVehicule?.marque} {selectedVehicule?.modele}
              </h4>
              <p className="text-xs opacity-80">
                {selectedVehicule?.transmission} • {selectedVehicule?.places} places
              </p>
            </div>
          </div>

          <div className="p-7">
            <div className="space-y-5 pb-5 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#585e6c] tracking-widest mb-1">
                    Prise en charge
                  </p>
                  <p className="text-sm font-bold text-[#171c1f]">
                    {startISO ? format(new Date(startISO), "d MMM • HH:mm", { locale: fr }) : "—"}
                  </p>
                </div>
                <CalendarIcon className="w-4 h-4 text-[#dfe3e7]" />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#585e6c] tracking-widest mb-1">
                    Retour
                  </p>
                  <p className="text-sm font-bold text-[#171c1f]">
                    {endISO ? format(new Date(endISO), "d MMM • HH:mm", { locale: fr }) : "—"}
                  </p>
                </div>
                <CalendarIcon className="w-4 h-4 text-[#dfe3e7]" />
              </div>
            </div>

            <div className="space-y-3 mb-7 border-t border-dashed border-[#dfe3e7] pt-5">
              <Row label={`Location (${days} j)`} value={`${fmt(baseRental)} FCFA`} />
              {protectionCost > 0 && (
                <Row label={protectionTier.name} value={`${fmt(protectionCost)} FCFA`} />
              )}
              {extrasCost > 0 && <Row label="Extras" value={`${fmt(extrasCost)} FCFA`} />}
              <div className="flex justify-between text-sm py-2 border-t border-dashed border-[#dfe3e7]">
                <span className="text-[#585e6c]">Protection</span>
                <span className="font-bold text-[#ac3509]">{protectionTier.name}</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-5">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#585e6c] tracking-widest">
                  Total
                </p>
                <p
                  className="text-2xl font-extrabold text-[#171c1f]"
                  style={{ fontFamily: "var(--font-velocity-headline), system-ui" }}
                >
                  {fmt(total)} FCFA
                </p>
              </div>
              <p className="text-[10px] text-[#585e6c] text-right">Taxes incluses</p>
            </div>
            <p className="text-[10px] text-center text-[#585e6c] italic">
              Annulation gratuite jusqu&apos;à 48h avant la prise en charge
            </p>
          </div>
        </div>

        <div className="bg-[#00acbb]/10 p-5 rounded-2xl border border-[#00acbb]/20 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#006972] shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#003a3f]">Garantie Subito Velocity</p>
            <p className="text-[10px] text-[#003a3f]/80">
              Meilleur prix et flotte récente garantis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
