'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  VehiculeLocation,
  InsuranceContractResponse,
  InsuranceSimulationResponse,
  InsuranceReferenceItem,
  CreateInsuranceSimulationDto,
  CreateInsuranceContractDto,
  InsurancePaymentStatusResponse,
  InsurancePaymentCheckoutResponse,
  InsuranceDirectPaymentResponse,
} from "@/lib/api";
import {
  Users,
  Clock,
  BadgeCheck,
  Car,
  Shield,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  X,
  Info,
  Lock,
  CreditCard,
  Building2,
  Award,
  Star,
  Zap,
  Cloud,
  FileText,
  Gavel,
  Download,
  Phone,
  Mail,
  Loader2,
  ShieldCheck,
  HardHat,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Search } from "lucide-react";

// ==================== TOKENS ====================
const KINETIC = "linear-gradient(135deg, #FF7842 0%, #DC3F1A 100%)";
const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ==================== TYPES ====================
type ContractType = "fleet" | "temporary" | "vtc";
type Payment = "checkout" | "mobile_money";

interface AxaCoverage {
  code: string;
  capitalAmount: number;
  label: string;
  option?: string;      // pour les garanties avec options non-numériques (ex: Assistance AA)
  hasOption?: boolean;  // true dès qu'un option ou capital a été sélectionné (même si = 0)
}

interface FormState {
  contractType: ContractType | "";
  // vehicle (AXA codes go in brand/model; date replaces simple year)
  plate: string;
  brand: string;
  model: string;
  dateOfFirstRegistration: string;
  value: string;
  // AXA technical fields
  energyCode: string;
  fiscalPower: number;
  numberOfPlaces: number;
  replacementCost: number;
  carTypeCode: string;
  // marque/modèle libre (quand "AUTRES" sélectionné)
  otherBrand: string;
  otherModel: string;
  // AXA product + coverages
  productCode: string;
  packCode: string;
  durationCode: string;
  countryCode: string;
  axaCoverages: AxaCoverage[];
  // payment
  payment: Payment;
  paymentPhone: string;
  paymentOperator: string;
  // customer (Step 5)
  customerTitle: string;
  customerLastName: string;
  customerFirstName: string;
  customerAddress: string;
  customerMobile: string;
  customerEmail: string;
  customerCin: string;
  customerBirthdate: string;
  customerCity: string;
  customerActivity: string;
  customerCsp: string;
  customerNationality: string;
  customerNativeCountry: string;
  // billing
  raisonSociale: string;
  siret: string;
  billingAddress: string;
  notes: string;
}

const INITIAL: FormState = {
  contractType: "",
  plate: "",
  brand: "",
  model: "",
  dateOfFirstRegistration: "",
  value: "",
  energyCode: "",
  fiscalPower: 5,
  numberOfPlaces: 5,
  replacementCost: 0,
  carTypeCode: "",
  otherBrand: "",
  otherModel: "",
  productCode: "",
  packCode: "PACK_BASE",
  durationCode: "",
  countryCode: "SN",
  axaCoverages: [],
  payment: "mobile_money",
  paymentPhone: "",
  paymentOperator: "wave",
  customerTitle: "",
  customerLastName: "",
  customerFirstName: "",
  customerAddress: "",
  customerMobile: "",
  customerEmail: "",
  customerCin: "",
  customerBirthdate: "",
  customerCity: "",
  customerActivity: "",
  customerCsp: "",
  customerNationality: "221",
  customerNativeCountry: "221",
  raisonSociale: "",
  siret: "",
  billingAddress: "",
  notes: "",
};

const STEPS = [
  { id: 1, label: "Type de contrat" },
  { id: 2, label: "Véhicule" },
  { id: 3, label: "Garanties" },
  { id: 4, label: "Paiement" },
  { id: 5, label: "Souscripteur" },
];

const TOTAL_STEPS = STEPS.length;

const CONTRACT_TYPES: {
  id: ContractType;
  title: string;
  desc: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  accent: "primary" | "tertiary" | "secondary";
}[] = [
  {
    id: "fleet",
    title: "Flotte Automobile",
    desc: "Optimisez la gestion de votre parc de véhicules (dès 5 moteurs). Tarification unifiée et gestion simplifiée des sinistres.",
    features: ["Tarif dégressif par volume", "Espace gestionnaire dédié"],
    icon: Users,
    accent: "primary",
  },
  {
    id: "temporary",
    title: "Assurance Temporaire",
    desc: "Flexibilité maximale pour vos besoins ponctuels. De 1 à 90 jours pour import, export ou prêt de véhicule.",
    features: ["Activation immédiate (PDF)", "Sans engagement longue durée"],
    icon: Clock,
    accent: "tertiary",
  },
  {
    id: "vtc",
    title: "Assurance VTC",
    desc: "Protection complète incluant la Responsabilité Civile Professionnelle pour le transport de personnes à titre onéreux.",
    features: ["RC Pro Exploitation incluse", "Garantie perte d'exploitation"],
    icon: BadgeCheck,
    accent: "secondary",
  },
];

// Defensive unwrap: getReference returns ApiResponse<InsuranceReferenceItem[]> via the
// envelope, but older endpoints occasionally return the array directly — tolerate both.
function unwrapRef(response: unknown): InsuranceReferenceItem[] {
  const r = response as { data?: unknown } | undefined;
  const candidate = (r && 'data' in r ? r.data : r) as unknown;
  if (Array.isArray(candidate)) return candidate as InsuranceReferenceItem[];
  const inner = (candidate as { data?: unknown })?.data;
  return Array.isArray(inner) ? (inner as InsuranceReferenceItem[]) : [];
}

// ==================== MAIN ====================
export default function AssurancePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [success, setSuccess] = useState(false);
  const [contractNumber, setContractNumber] = useState("");

  // Fetch fleet from backend to populate brand / model selects
  const { data: vehiculesResponse } = useQuery({
    queryKey: ["vehicules-public-assurance"],
    queryFn: () => api.vehiculesLocation.listPublic(1, 100),
  });
  const vehiculesRaw = vehiculesResponse?.data;
  const vehicules: VehiculeLocation[] = Array.isArray(vehiculesRaw)
    ? vehiculesRaw
    : (vehiculesRaw as any)?.items || (vehiculesRaw as any)?.list || [];

  const fallbackVehicleImage = useMemo(
    () => vehicules.find((v) => v.images?.[0])?.images?.[0],
    [vehicules]
  );

  // Fetch existing insurance contracts + simulations
  const { data: contractsResponse, isLoading: contractsLoading } = useQuery({
    queryKey: ["insurance-contracts"],
    queryFn: () => api.insurance.listContracts(1, 20),
  });
  const contracts: InsuranceContractResponse[] = contractsResponse?.data?.data || [];

  const { data: simulationsResponse, isLoading: simulationsLoading } = useQuery({
    queryKey: ["insurance-simulations"],
    queryFn: () => api.insurance.listSimulations(1, 20),
  });
  const simulations: InsuranceSimulationResponse[] = simulationsResponse?.data?.data || [];

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const queryClient = useQueryClient();

  // ---- Real backend flow ----
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [simulationResult, setSimulationResult] = useState<InsuranceSimulationResponse | null>(null);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string>("");

  const buildSimulationDto = (): CreateInsuranceSimulationDto => ({
    productCode: form.productCode,
    packCode: form.packCode || "PACK_BASE",
    durationCode: form.durationCode || "12M",
    countryCode: form.countryCode || "SN",
    vehicle: {
      energyCode: form.energyCode,
      fiscalPower: form.fiscalPower,
      numberOfPlaces: form.numberOfPlaces,
      registrationNumber: form.plate,
      replacementCost: form.replacementCost,
      marketValue: Number(form.value) || 0,
      dateOfFirstRegistration: form.dateOfFirstRegistration,
      // Fleet brands/models are free strings — surface them via otherBrand/otherModel
      // (AXA's free-text fallback). brandCode/modelCode mirror the same string so the
      // required fields aren't empty; replace with AXA codes once a mapping is wired.
      brandCode: form.brand,
      modelCode: form.brand === "ZZ" ? "999" : form.model,
      otherBrand: form.brand === "ZZ" ? form.otherBrand : form.brand,
      otherModel: form.brand === "ZZ" ? form.otherModel : form.model,
      carTypeCode: form.carTypeCode,
    },
    coverages: form.axaCoverages.map((c) => ({
      code: c.code,
      ...(c.option ? { option: c.option } : c.capitalAmount > 0 ? { capitalAmount: c.capitalAmount } : {}),
    })),
  });

  const simulationMutation = useMutation({
    mutationFn: (dto: CreateInsuranceSimulationDto) => api.insurance.createSimulation(dto),
    onSuccess: (response) => {
      const sim = ((response as { data?: InsuranceSimulationResponse })?.data
        ?? response) as InsuranceSimulationResponse;
      if (!sim?.simulationId) {
        toast.error("Réponse de simulation invalide");
        return;
      }
      setSimulationId(sim.simulationId);
      setSimulationResult(sim);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["insurance-simulations"] });
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la simulation"),
  });

  const directPayMutation = useMutation({
    mutationFn: (data: { simulationId: number; operator: string; phone: string }) =>
      api.insurance.payDirect(data.simulationId, { operator: data.operator, phone: data.phone }),
    onSuccess: (response) => {
      const r = ((response as { data?: InsuranceDirectPaymentResponse })?.data
        ?? response) as InsuranceDirectPaymentResponse;
      setPaymentInitiated(true);
      toast.success("Paiement Mobile Money envoyé — confirmez sur votre téléphone.");
      if (r.chargeId) setPaymentReference(r.chargeId);
    },
    onError: (err: Error) => toast.error(err.message || "Échec de l'envoi du paiement"),
  });

  const checkoutPayMutation = useMutation({
    mutationFn: (simId: number) => api.insurance.payCheckout(simId),
    onSuccess: (response) => {
      const r = ((response as { data?: InsurancePaymentCheckoutResponse })?.data
        ?? response) as InsurancePaymentCheckoutResponse;
      if (!r?.checkoutUrl) {
        toast.error("URL de paiement absente — réessayez");
        return;
      }
      setPaymentInitiated(true);
      if (r.chargeId) setPaymentReference(r.chargeId);
      window.open(r.checkoutUrl, "_blank", "noopener,noreferrer");
      toast.info("Finalisez le paiement dans le nouvel onglet, puis revenez ici.");
    },
    onError: (err: Error) => toast.error(err.message || "Échec de l'initialisation du paiement"),
  });

  const paymentStatusQuery = useQuery({
    queryKey: ["insurance-payment-status", simulationId],
    queryFn: async () => {
      if (!simulationId) return null;
      const res = await api.insurance.getPaymentStatus(simulationId);
      return ((res as { data?: InsurancePaymentStatusResponse })?.data
        ?? res) as InsurancePaymentStatusResponse;
    },
    enabled: !!simulationId && paymentInitiated && step === 4 && !success,
    refetchInterval: 4000,
  });

  // When payment status flips to a paid state, advance to Step 5.
  useEffect(() => {
    const status = paymentStatusQuery.data?.status?.toLowerCase();
    if (!status) return;
    if (["paid", "completed", "success", "succeeded"].includes(status)) {
      const ref = paymentStatusQuery.data?.chargeId || paymentReference;
      if (ref) setPaymentReference(ref);
      toast.success("Paiement confirmé !");
      setStep(5);
    }
    if (["failed", "canceled", "cancelled"].includes(status)) {
      toast.error("Paiement échoué");
      setPaymentInitiated(false);
    }
  }, [paymentStatusQuery.data, paymentReference]);

  const contractMutation = useMutation({
    mutationFn: (dto: CreateInsuranceContractDto) => api.insurance.createContract(dto),
    onSuccess: (response) => {
      const c = ((response as { data?: InsuranceContractResponse })?.data
        ?? response) as InsuranceContractResponse;
      if (!c?.contractNumber) {
        toast.error("Numéro de contrat manquant dans la réponse");
        return;
      }
      setContractNumber(c.contractNumber);
      setSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      queryClient.invalidateQueries({ queryKey: ["insurance-contracts"] });
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la création du contrat"),
  });

  const submitContract = () => {
    if (!simulationId) {
      toast.error("Simulation manquante");
      return;
    }
    if (!paymentReference) {
      toast.error("Référence de paiement manquante");
      return;
    }
    contractMutation.mutate({
      simulationId,
      referenceTrxPayment: paymentReference,
      startDate: new Date().toISOString().slice(0, 10),
      customer: {
        title: form.customerTitle,
        lastName: form.customerLastName,
        firstName: form.customerFirstName,
        address: form.customerAddress,
        mobilePhone: form.customerMobile,
        email: form.customerEmail,
        cin: form.customerCin,
        birthdate: form.customerBirthdate,
        city: form.customerCity,
        activity: form.customerActivity || undefined,
        csp: form.customerCsp,
        nationality: form.customerNationality,
        nativeCountry: form.customerNativeCountry,
      },
    });
  };

  const triggerPayment = () => {
    if (!simulationId) return;
    if (form.payment === "mobile_money") {
      if (!form.paymentPhone) return toast.error("Numéro de téléphone requis");
      if (!form.paymentOperator) return toast.error("Opérateur requis");
      directPayMutation.mutate({
        simulationId,
        operator: form.paymentOperator,
        phone: form.paymentPhone,
      });
    } else {
      checkoutPayMutation.mutate(simulationId);
    }
  };

  const validate = (s: number): boolean => {
    if (s === 1) {
      if (!form.productCode) return toast.error("Choisissez une catégorie et un produit"), false;
      if (!form.durationCode) return toast.error("Choisissez une durée de contrat"), false;
    }
    if (s === 2) {
      if (!form.brand) return toast.error("Marque requise"), false;
      if (form.brand === "ZZ" && (!form.otherBrand || !form.otherModel)) return toast.error("Saisissez la marque et le modèle"), false;
      if (form.brand !== "ZZ" && !form.model) return toast.error("Modèle requis"), false;
      if (!form.dateOfFirstRegistration) return toast.error("Date de mise en circulation requise"), false;
      if (!form.value || Number(form.value) <= 0) return toast.error("Valeur du véhicule requise"), false;
      if (!form.replacementCost || form.replacementCost <= 0)
        return toast.error("Valeur à neuf (replacement cost) requise"), false;
      if (!form.energyCode) return toast.error("Énergie requise"), false;
      if (!form.carTypeCode) return toast.error("Type de véhicule requis"), false;
      if (!form.fiscalPower || form.fiscalPower <= 0) return toast.error("Puissance fiscale requise"), false;
      if (!form.numberOfPlaces || form.numberOfPlaces <= 0) return toast.error("Nombre de places requis"), false;
      if (!form.plate) return toast.error("Plaque requise"), false;
    }
    if (s === 3) {
      if (!form.productCode) return toast.error("Choisissez un produit d'assurance"), false;
      if (form.axaCoverages.length === 0) return toast.error("Sélectionnez au moins une garantie"), false;
      const missingCapital = form.axaCoverages.find(c =>
        !MANDATORY_COVERAGE_CODES.includes(c.code) && !c.hasOption && !c.option && c.capitalAmount <= 0
      );
      if (missingCapital) return toast.error(`Renseignez un capital pour ${missingCapital.label}`), false;
    }
    if (s === 4) {
      if (form.payment === "mobile_money") {
        if (!form.paymentPhone) return toast.error("Numéro de téléphone requis"), false;
        if (!form.paymentOperator) return toast.error("Opérateur requis"), false;
      }
    }
    if (s === 5) {
      if (!form.customerTitle) return toast.error("Civilité requise"), false;
      if (!form.customerLastName.trim()) return toast.error("Nom requis"), false;
      if (!form.customerFirstName.trim()) return toast.error("Prénom requis"), false;
      if (!form.customerEmail.trim()) return toast.error("Email requis"), false;
      if (!form.customerMobile.trim()) return toast.error("Téléphone requis"), false;
      if (!form.customerCin.trim()) return toast.error("CIN requis"), false;
      if (!form.customerBirthdate) return toast.error("Date de naissance requise"), false;
      if (!form.customerAddress.trim()) return toast.error("Adresse requise"), false;
      if (!form.customerCity.trim()) return toast.error("Ville requise"), false;
      if (!form.customerCsp) return toast.error("CSP requise"), false;
    }
    return true;
  };
  const next = () => {
    if (!validate(step)) return;
    if (step === 3) {
      // 3 → 4 fires the real AXA simulation; advance happens in the mutation onSuccess
      simulationMutation.mutate(buildSimulationDto());
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  if (success) {
    return (
      <SuccessScreen
        contractNumber={contractNumber}
        form={form}
        router={router}
        fallbackVehicleImage={fallbackVehicleImage}
      />
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-14 pb-36 sm:pb-32">
      {/* Mes assurances : contrats + simulations */}
      <MyInsurances
        contracts={contracts}
        contractsLoading={contractsLoading}
        simulations={simulations}
        simulationsLoading={simulationsLoading}
      />

      {/* Stepper */}
      <Stepper step={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <Step1ContractType
              form={form}
              update={update}
              fallbackVehicleImage={fallbackVehicleImage}
            />
          )}
          {step === 2 && (
            <Step2Vehicle form={form} update={update} />
          )}
          {step === 3 && <Step3Coverage form={form} update={update} />}
          {step === 4 && (
            <Step4Payment
              form={form}
              update={update}
              fallbackVehicleImage={fallbackVehicleImage}
              simulation={simulationResult}
              simulationId={simulationId}
              paymentInitiated={paymentInitiated}
              paymentStatus={paymentStatusQuery.data?.status}
            />
          )}
          {step === 5 && <Step5Customer form={form} update={update} />}
        </motion.div>
      </AnimatePresence>

      {/* Floating bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-[#e0bfb6]/20 px-3 py-3 sm:p-4 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs font-medium text-[#5e6473] whitespace-nowrap">
              <span className="sm:hidden">{step}/{TOTAL_STEPS}</span>
              <span className="hidden sm:inline">Étape {step} sur {TOTAL_STEPS}</span>
            </span>
            <div className="flex-1 sm:w-48 h-1 bg-[#dfe3e7] rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundImage: KINETIC }}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {step > 1 && step < 5 && (
              <button
                onClick={back}
                className="px-3 sm:px-5 py-2 text-sm font-bold text-[#5e6473] hover:text-[#171c1f] transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
            {step < 3 && (
              <button
                onClick={next}
                className="text-white px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                Continuer
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={next}
                disabled={simulationMutation.isPending}
                className="text-white px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group disabled:opacity-60"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {simulationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Calcul du devis…</span>
                    <span className="sm:hidden">Calcul…</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Calculer le devis</span>
                    <span className="sm:hidden">Devis</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
            {step === 4 && !paymentInitiated && (
              <button
                onClick={() => {
                  if (!validate(4)) return;
                  triggerPayment();
                }}
                disabled={directPayMutation.isPending || checkoutPayMutation.isPending}
                className="text-white px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group disabled:opacity-60"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {directPayMutation.isPending || checkoutPayMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Payer maintenant</span>
                <span className="sm:hidden">Payer</span>
              </button>
            )}
            {step === 4 && paymentInitiated && (
              <button
                disabled
                className="text-white px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 opacity-70"
                style={{ backgroundImage: KINETIC }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">En attente de confirmation…</span>
                <span className="sm:hidden">En attente…</span>
              </button>
            )}
            {step === 5 && (
              <button
                onClick={() => {
                  if (!validate(5)) return;
                  submitContract();
                }}
                disabled={contractMutation.isPending}
                className="text-white px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group disabled:opacity-60"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {contractMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Souscrire le contrat</span>
                <span className="sm:hidden">Souscrire</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ==================== STEPPER ====================
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-12 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const active = s.id === step;
        const done = s.id < step;
        return (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  active
                    ? "w-9 h-9 sm:w-10 sm:h-10 text-white shadow-lg"
                    : done
                    ? "w-7 h-7 sm:w-8 sm:h-8 text-white bg-emerald-500"
                    : "w-7 h-7 sm:w-8 sm:h-8 bg-[#dfe3e7] text-[#5e6473]"
                }`}
                style={
                  active
                    ? { backgroundImage: KINETIC, boxShadow: "0 8px 16px rgba(172,53,9,0.25)" }
                    : undefined
                }
              >
                {done ? <Check className="w-4 h-4" /> : s.id}
              </span>
              {/* Label: only the active step shows on mobile to save horizontal room */}
              <span
                className={`text-xs lg:text-sm whitespace-nowrap transition-all ${
                  active
                    ? "font-bold text-[#ac3509] inline"
                    : "font-medium text-[#5e6473] hidden sm:inline"
                }`}
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-[2px] w-5 sm:w-8 lg:w-12 bg-[#dfe3e7] shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ==================== MES ASSURANCES (CONTRATS + DEVIS) ====================
function MyInsurances({
  contracts,
  contractsLoading,
  simulations,
  simulationsLoading,
}: {
  contracts: InsuranceContractResponse[];
  contractsLoading: boolean;
  simulations: InsuranceSimulationResponse[];
  simulationsLoading: boolean;
}) {
  const allDone = !contractsLoading && !simulationsLoading;
  if (allDone && contracts.length === 0 && simulations.length === 0) return null;

  return (
    <>
      <ContractsList contracts={contracts} loading={contractsLoading} />
      <SimulationsList simulations={simulations} loading={simulationsLoading} />
    </>
  );
}

// ==================== STEP 1: CONTRACT TYPE ====================
function ContractsList({
  contracts,
  loading,
}: {
  contracts: InsuranceContractResponse[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-10 bg-white rounded-3xl p-7 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#eaeef2] flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#ac3509]" />
        <p className="text-sm text-[#59413a] font-medium">Chargement de vos contrats...</p>
      </div>
    );
  }
  if (contracts.length === 0) return null;

  const fmtFCFA = (n: number) => n.toLocaleString("fr-FR");

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[#ac3509] font-bold text-xs tracking-widest uppercase mb-1">
            Vos contrats
          </p>
          <h2
            className="text-2xl font-extrabold text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Assurances actives ({contracts.length})
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {contracts.map((c) => (
          <ContractCard key={c.contractNumber} contract={c} fmtFCFA={fmtFCFA} />
        ))}
      </div>
    </section>
  );
}

function ContractCard({
  contract,
  fmtFCFA,
}: {
  contract: InsuranceContractResponse;
  fmtFCFA: (n: number) => string;
}) {
  const status = (contract.status || "").toLowerCase();
  const statusStyle =
    status === "active" || status === "actif"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", label: "Actif" }
      : status === "pending" || status === "en_attente"
      ? { bg: "bg-amber-50", text: "text-amber-700", label: "En attente" }
      : status === "expired" || status === "expire"
      ? { bg: "bg-red-50", text: "text-red-700", label: "Expiré" }
      : { bg: "bg-[#f0f4f8]", text: "text-[#59413a]", label: contract.status || "—" };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await api.insurance.downloadContractDocuments(contract.contractNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-${contract.contractNumber}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#eaeef2] hover:shadow-[0_12px_32px_rgba(23,28,31,0.08)] transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundImage: KINETIC }}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a]">
              Contrat
            </p>
            <p
              className="text-base font-extrabold text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui" }}
            >
              {contract.contractNumber}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
            Début
          </p>
          <p className="text-sm font-semibold text-[#171c1f]">{formatDate(contract.startDate)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
            Fin
          </p>
          <p className="text-sm font-semibold text-[#171c1f]">{formatDate(contract.endDate)}</p>
        </div>
      </div>

      <div className="flex items-end justify-between pt-4 border-t border-dashed border-[#dfe3e7]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
            Prime totale
          </p>
          <p
            className="text-xl font-black text-[#ac3509]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            {fmtFCFA(contract.totalPremium || 0)}{" "}
            <span className="text-xs font-bold text-[#59413a]">{contract.currency || "FCFA"}</span>
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-[#ac3509] font-bold text-xs hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </div>
  );
}

// ==================== SIMULATIONS (DEVIS) ====================
function SimulationsList({
  simulations,
  loading,
}: {
  simulations: InsuranceSimulationResponse[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-10 bg-white rounded-3xl p-7 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#eaeef2] flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#ac3509]" />
        <p className="text-sm text-[#59413a] font-medium">Chargement de vos devis...</p>
      </div>
    );
  }
  if (simulations.length === 0) return null;

  const fmtFCFA = (n: number) => n.toLocaleString("fr-FR");

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[#ac3509] font-bold text-xs tracking-widest uppercase mb-1">
            Vos devis
          </p>
          <h2
            className="text-2xl font-extrabold text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Simulations en cours ({simulations.length})
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {simulations.map((s) => (
          <SimulationCard key={s.id} simulation={s} fmtFCFA={fmtFCFA} />
        ))}
      </div>
    </section>
  );
}

function SimulationCard({
  simulation,
  fmtFCFA,
}: {
  simulation: InsuranceSimulationResponse;
  fmtFCFA: (n: number) => string;
}) {
  const status = (simulation.status || "").toLowerCase();
  const statusStyle =
    status === "valid" || status === "valide" || status === "active"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", label: "Valide" }
      : status === "expired" || status === "expire"
      ? { bg: "bg-red-50", text: "text-red-700", label: "Expiré" }
      : status === "converted" || status === "souscrit"
      ? { bg: "bg-[#f0f4f8]", text: "text-[#59413a]", label: "Souscrit" }
      : { bg: "bg-amber-50", text: "text-amber-700", label: simulation.status || "Devis" };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const simId = simulation.simulationId ?? simulation.id;

  const handleDownload = async () => {
    try {
      const blob = await api.insurance.downloadSimulationPdf(simId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devis-${simId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-[#eaeef2] hover:shadow-[0_12px_32px_rgba(23,28,31,0.08)] transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundImage: KINETIC }}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a]">
              Devis
            </p>
            <p
              className="text-base font-extrabold text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui" }}
            >
              #{simId}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
            Pack
          </p>
          <p className="text-sm font-semibold text-[#171c1f]">{simulation.packCode || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
            Créé le
          </p>
          <p className="text-sm font-semibold text-[#171c1f]">{formatDate(simulation.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-end justify-between pt-4 border-t border-dashed border-[#dfe3e7]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
            Prime totale
          </p>
          <p
            className="text-xl font-black text-[#ac3509]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            {fmtFCFA(simulation.totalPrime || 0)}{" "}
            <span className="text-xs font-bold text-[#59413a]">FCFA</span>
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-[#ac3509] font-bold text-xs hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </div>
  );
}

function VehicleThumb({ fallbackVehicleImage }: { fallbackVehicleImage?: string }) {
  const buildChain = (own?: string): string[] => {
    const chain: string[] = [];
    if (own) chain.push(own);
    chain.push("/vehicle-placeholder.jpg");
    return chain;
  };
  const [chain, setChain] = useState<string[]>(() => buildChain(fallbackVehicleImage));
  const [index, setIndex] = useState(0);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setChain(buildChain(fallbackVehicleImage));
    setIndex(0);
    setErrored(false);
  }, [fallbackVehicleImage]);

  if (errored || chain.length === 0) {
    return <Car className="w-6 h-6 text-[#585e6c]" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chain[index]}
      alt=""
      className="w-full h-full object-cover"
      onError={() => {
        if (index < chain.length - 1) setIndex(index + 1);
        else setErrored(true);
      }}
    />
  );
}

function AssuranceVehicleImage({ fallbackVehicleImage }: { fallbackVehicleImage?: string }) {
  const buildChain = (own?: string): string[] => {
    const chain: string[] = ["/series-executive-2024.jpg"];
    if (own && own !== "/series-executive-2024.jpg") chain.push(own);
    chain.push("/vehicle-placeholder.jpg");
    return chain;
  };
  const [chain, setChain] = useState<string[]>(() => buildChain(fallbackVehicleImage));
  const [index, setIndex] = useState(0);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setChain(buildChain(fallbackVehicleImage));
    setIndex(0);
    setErrored(false);
  }, [fallbackVehicleImage]);

  if (errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Car className="w-32 h-32 text-[#8d7169]/30" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chain[index]}
      alt="Véhicule"
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => {
        if (index < chain.length - 1) setIndex(index + 1);
        else setErrored(true);
      }}
    />
  );
}

function Step1ContractType({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  fallbackVehicleImage?: string;
}) {
  const [selectedCatCode, setSelectedCatCode] = React.useState<string>(
    form.productCode ? form.productCode : ""
  );
  const [selectedCatId, setSelectedCatId] = React.useState<string>("");
  const [durationOpen, setDurationOpen] = React.useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["insurance-ref-categories"],
    queryFn: () => api.insurance.getReference("categories"),
  });
  const categories = unwrapRef(categoriesQuery.data);

  const productsQuery = useQuery({
    queryKey: ["insurance-ref-products-by-cat", selectedCatId],
    queryFn: () => api.insurance.getReference("products", { categoryCode: selectedCatId }),
    enabled: !!selectedCatId,
  });
  const products = unwrapRef(productsQuery.data);

  // Les codes retournés par /ref/durations sont des codes internes AXA invalides pour la simulation.
  // On utilise les codes standards acceptés par l'API.
  const DURATION_OPTIONS = [
    { code: "1M", label: "1 mois" },
    { code: "3M", label: "3 mois" },
    { code: "6M", label: "6 mois" },
    { code: "12M", label: "12 mois" },
  ];

  const labelOf = (item: InsuranceReferenceItem) => {
    const raw = item as Record<string, unknown>;
    return (
      item.kindLabel || item.label || item.productLabel || item.libelle || item.nom ||
      item.designation || item.name || item.description ||
      item.code || item.productCode ||
      (item.id != null ? String(item.id) : '') ||
      (Object.values(raw).find((v) => typeof v === 'string' && v.length > 0) as string | undefined) ||
      '—'
    );
  };

  const gradients = [
    "from-[#E04A1F] to-[#C8330F]",
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-violet-600",
    "from-amber-500 to-orange-600",
  ];

  return (
    <div className="space-y-8">

      {/* Catégories */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1" style={{ fontFamily: "Manrope, system-ui" }}>
          Choisissez une catégorie
        </h2>
        <p className="text-slate-500 text-sm mb-4">Sélectionnez le type de couverture adapté à vos besoins.</p>

        {categoriesQuery.isLoading ? (
          <div className="flex items-center gap-3 py-10 text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-[#E04A1F]" />
            Chargement des catégories…
          </div>
        ) : categories.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Aucune catégorie disponible.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, idx) => {
              const active = selectedCatCode === cat.code;
              const label = labelOf(cat);
              return (
                <div
                  key={cat.code}
                  onClick={() => {
                    setSelectedCatCode(cat.code ?? '');
                    setSelectedCatId(String(cat.id ?? cat.code));
                    update("productCode", "");
                    update("axaCoverages", []);
                  }}
                  className={`group relative bg-white rounded-3xl p-6 flex flex-col gap-4 cursor-pointer transition-all duration-200 border-2 ${
                    active
                      ? "border-[#E04A1F] shadow-lg shadow-[#E04A1F]/10"
                      : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center shadow-md shrink-0`}>
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{cat.code}</p>
                    <h3 className="text-base font-extrabold text-slate-800 mb-2" style={{ fontFamily: "Manrope, system-ui" }}>
                      {label}
                    </h3>
                    {cat.description && cat.description !== label && (
                      <p className="text-sm text-slate-500 leading-relaxed">{cat.description}</p>
                    )}
                  </div>
                  <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all ${
                    active ? "bg-[#E04A1F] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}>
                    {active ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Sélectionné</span> : "Sélectionner"}
                  </div>
                  {active && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#E04A1F] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Produits — s'affichent quand une catégorie est choisie */}
      {selectedCatCode && (
        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-1" style={{ fontFamily: "Manrope, system-ui" }}>
            Produits disponibles
          </h2>
          <p className="text-slate-500 text-sm mb-4">Choisissez le produit pour cette catégorie.</p>

          {productsQuery.isLoading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#E04A1F]" />
              Chargement des produits…
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl">
              Aucun produit disponible pour cette catégorie.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p, idx) => {
                const active = form.productCode === (p.code || p.productCode || String(p.id ?? idx));
                const label = labelOf(p);
                const itemKey = p.code || p.productCode || String(p.id ?? idx);
                return (
                  <div
                    key={itemKey}
                    onClick={() => { update("productCode", itemKey); update("axaCoverages", []); }}
                    className={`group relative bg-white rounded-3xl p-6 flex flex-col gap-4 cursor-pointer transition-all duration-200 border-2 ${
                      active
                        ? "border-[#E04A1F] shadow-lg shadow-[#E04A1F]/10"
                        : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center shadow-md shrink-0`}>
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{itemKey}</p>
                      <h3 className="text-base font-extrabold text-slate-800 mb-2" style={{ fontFamily: "Manrope, system-ui" }}>
                        {label}
                      </h3>
                      {p.usageLabel && (
                        <p className="text-sm text-slate-500 leading-relaxed">{p.usageLabel}</p>
                      )}
                    </div>
                    <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all ${
                      active ? "bg-[#E04A1F] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}>
                      {active ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Sélectionné</span> : "Sélectionner"}
                    </div>
                    {active && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#E04A1F] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Durée + Pack — s'affichent quand un produit est choisi */}
      {form.productCode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Durée */}
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1" style={{ fontFamily: "Manrope, system-ui" }}>
              Durée du contrat
            </h2>
            <Popover open={durationOpen} onOpenChange={setDurationOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium text-sm text-left focus:ring-2 focus:ring-[#ac3509]/20 transition-all"
                >
                  <span className={form.durationCode ? "text-[#171c1f]" : "text-[#9ca3af]"}>
                    {DURATION_OPTIONS.find(d => d.code === form.durationCode)?.label || "Sélectionnez une durée"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {DURATION_OPTIONS.map(d => (
                        <CommandItem
                          key={d.code}
                          value={d.label}
                          onSelect={() => { update("durationCode", d.code); setDurationOpen(false); }}
                          className="cursor-pointer"
                        >
                          <Check className={`mr-2 w-4 h-4 shrink-0 ${form.durationCode === d.code ? "opacity-100 text-[#ac3509]" : "opacity-0"}`} />
                          {d.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Pack */}
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1" style={{ fontFamily: "Manrope, system-ui" }}>
              Pack
            </h2>
            <div className="w-full px-4 py-3 bg-[#f0f4f8] rounded-xl font-medium text-sm text-[#171c1f] flex items-center justify-between">
              <span>Pack Base</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ac3509] bg-[#fdf2ef] px-2 py-0.5 rounded-full">Par défaut</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STEP 2: VEHICLE ====================
function Step2Vehicle({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [carTypeOpen, setCarTypeOpen] = useState(false);

  const energiesQuery = useQuery({
    queryKey: ["insurance-ref-energies"],
    queryFn: () => api.insurance.getReference("energies"),
  });
  const energies = unwrapRef(energiesQuery.data);

  // /ref/brands retourne TOUS les couples marque+modèle AXA dans un seul tableau.
  // On en déduit les marques uniques et les modèles filtrés par marque sélectionnée.
  const brandsQuery = useQuery({
    queryKey: ["insurance-ref-brands"],
    queryFn: () => api.insurance.getReference("brands"),
  });
  const axaAllVehicles = unwrapRef(brandsQuery.data);

  const uniqueBrands = useMemo(() => {
    const seen = new Map<string, InsuranceReferenceItem>();
    for (const item of axaAllVehicles) {
      const code = (item.brandCode || '') as string;
      if (code && !seen.has(code)) seen.set(code, item);
    }
    return Array.from(seen.values()).sort((a, b) =>
      ((a.brandLabel || '') as string).localeCompare((b.brandLabel || '') as string, 'fr')
    );
  }, [axaAllVehicles]);

  const filteredModels = useMemo(() => {
    if (!form.brand) return [] as InsuranceReferenceItem[];
    return axaAllVehicles.filter(item => (item.brandCode as string) === form.brand);
  }, [axaAllVehicles, form.brand]);

  const carTypesQuery = useQuery({
    queryKey: ["insurance-ref-car-types"],
    queryFn: () => api.insurance.getReference("car-types"),
  });
  // L'endpoint retourne un tableau de strings (ex: ["Berline", "SUV", ...])
  const carTypesRaw = carTypesQuery.data;
  const carTypeStrings: string[] = useMemo(() => {
    const raw = (carTypesRaw as any);
    const arr = raw?.data ?? raw;
    if (Array.isArray(arr)) {
      return arr.filter((x): x is string => typeof x === 'string');
    }
    return [];
  }, [carTypesRaw]);

  const labelOf = (item: InsuranceReferenceItem) => {
    const raw = item as Record<string, unknown>;
    return (
      item.kindLabel || item.label || item.productLabel || item.libelle || item.nom ||
      item.designation || item.name || item.description ||
      item.code || item.productCode ||
      (item.id != null ? String(item.id) : '') ||
      (Object.values(raw).find((v) => typeof v === 'string' && v.length > 0) as string | undefined) ||
      '—'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Left intro */}
      <div className="lg:col-span-4 flex flex-col gap-7">
        <div className="flex items-center gap-3">
          <span
            className="font-bold text-sm tracking-widest uppercase text-[#ac3509]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Étape 2 sur 5
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#171c1f] leading-[1.1]"
          style={{ fontFamily: "Manrope, system-ui" }}
        >
          Détails du <span className="text-[#ac3509]">véhicule</span>
        </h1>
        <p className="text-[#5e6473] text-lg leading-relaxed">
          Ces informations nous permettent de calculer précisément votre prime d&apos;assurance en
          fonction de la valeur et de la technicité de votre véhicule.
        </p>

        <div className="bg-[#f0f4f8] rounded-xl p-5">
          <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-sm" style={{ fontFamily: "Manrope, system-ui" }}>
              Progression du devis
            </span>
            <span className="font-bold text-[#ac3509]">40%</span>
          </div>
          <div className="w-full bg-[#dfe3e7] h-3 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "40%", backgroundImage: KINETIC }} />
          </div>
        </div>

        <div className="hidden lg:block relative rounded-3xl overflow-hidden aspect-[4/3] mt-auto bg-[#171c1f]">
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: KINETIC }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-7">
            <p
              className="text-white font-bold text-xl italic leading-tight"
              style={{ fontFamily: "Manrope, system-ui" }}
            >
              &ldquo;Un service rapide, efficace et des tarifs enfin transparents pour ma
              flotte.&rdquo;
            </p>
            <p className="text-[#ffb59f] font-medium mt-2 text-sm">
              — Jean-Marc, CEO Velocity Logistics
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="lg:col-span-8">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl sm:rounded-[2rem] p-5 sm:p-7 lg:p-10 shadow-2xl shadow-[#ac3509]/5">
          <div className="space-y-8">
            {/* Plate */}
            <div>
              <label
                className="block font-bold text-sm mb-3 text-[#59413a]"
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                Plaque d&apos;immatriculation
              </label>
              <div className="relative">
                <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ac3509] w-5 h-5" />
                <input
                  type="text"
                  placeholder="DK-1234-AB"
                  value={form.plate}
                  onChange={(e) => update("plate", e.target.value.toUpperCase())}
                  className="w-full pl-12 pr-4 py-5 bg-[#f0f4f8] border-0 rounded-2xl font-extrabold text-2xl tracking-widest uppercase focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all placeholder:text-[#dfe3e7]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex gap-2">
                  <span className="bg-[#ac3509]/10 text-[#ac3509] px-3 py-1 rounded-lg text-[10px] font-bold tracking-tighter uppercase">
                    Auto-complétion
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#5e6473] flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Si vous ne la connaissez pas, vous pouvez remplir les champs suivants manuellement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {/* Brand — combobox avec recherche */}
              <FieldGroup label="Marque">
                <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium text-left focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all disabled:opacity-50"
                      disabled={brandsQuery.isLoading}
                    >
                      <span className={form.brand ? "text-[#171c1f]" : "text-[#9ca3af]"}>
                        {form.brand
                          ? ((uniqueBrands.find(b => (b.brandCode as string) === form.brand)?.brandLabel || form.brand) as string)
                          : brandsQuery.isLoading ? "Chargement…" : "Sélectionnez une marque"}
                      </span>
                      <ChevronDown className="w-5 h-5 text-[#5e6473] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                        <CommandInput placeholder="Rechercher une marque…" className="border-0 focus:ring-0 py-3 text-sm" />
                      </div>
                      <CommandList className="max-h-60 overflow-auto">
                        <CommandEmpty>Aucune marque trouvée.</CommandEmpty>
                        <CommandGroup>
                          {uniqueBrands.map((b) => {
                            const code = (b.brandCode || '') as string;
                            const label = (b.brandLabel || code) as string;
                            return (
                              <CommandItem
                                key={code}
                                value={label}
                                onSelect={() => {
                                  update("brand", code);
                                  update("model", "");
                                  update("otherBrand", "");
                                  update("otherModel", "");
                                  setBrandOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check className={`mr-2 w-4 h-4 shrink-0 ${form.brand === code ? "opacity-100" : "opacity-0"}`} />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FieldGroup>

              {/* Marque libre si "AUTRES" */}
              {form.brand === "ZZ" && (
                <FieldGroup label="Marque (saisie libre)">
                  <input
                    type="text"
                    placeholder="Ex: Mahindra, Chery…"
                    value={form.otherBrand}
                    onChange={(e) => update("otherBrand", e.target.value)}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                  />
                </FieldGroup>
              )}

              {/* Modèle — combobox filtré par marque, ou saisie libre si "AUTRES" */}
              {form.brand === "ZZ" ? (
                <FieldGroup label="Modèle (saisie libre)">
                  <input
                    type="text"
                    placeholder="Ex: Scorpio, Tiggo…"
                    value={form.otherModel}
                    onChange={(e) => update("otherModel", e.target.value)}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                  />
                </FieldGroup>
              ) : (
              <FieldGroup label="Modèle">
                <Popover open={modelOpen} onOpenChange={setModelOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium text-left focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!form.brand || filteredModels.length === 0}
                    >
                      <span className={form.model ? "text-[#171c1f]" : "text-[#9ca3af]"}>
                        {form.model
                          ? ((filteredModels.find(m => (m.typeCode as string) === form.model)?.typeLabel || form.model) as string)
                          : !form.brand
                            ? "Choisissez d'abord une marque"
                            : filteredModels.length === 0
                              ? "Aucun modèle disponible"
                              : "Sélectionnez un modèle"}
                      </span>
                      <ChevronDown className="w-5 h-5 text-[#5e6473] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                        <CommandInput placeholder="Rechercher un modèle…" className="border-0 focus:ring-0 py-3 text-sm" />
                      </div>
                      <CommandList className="max-h-60 overflow-auto">
                        <CommandEmpty>Aucun modèle trouvé.</CommandEmpty>
                        <CommandGroup>
                          {filteredModels.map((m) => {
                            const code = (m.typeCode || m.code || '') as string;
                            const label = (m.typeLabel || code) as string;
                            return (
                              <CommandItem
                                key={code}
                                value={label}
                                onSelect={() => {
                                  update("model", code);
                                  setModelOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check className={`mr-2 w-4 h-4 shrink-0 ${form.model === code ? "opacity-100" : "opacity-0"}`} />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FieldGroup>
              )}

              {/* Date de première mise en circulation */}
              <FieldGroup label="Date de mise en circulation">
                <input
                  type="date"
                  value={form.dateOfFirstRegistration}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => update("dateOfFirstRegistration", e.target.value)}
                  className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                />
              </FieldGroup>

              {/* Type de véhicule — combobox avec recherche */}
              <FieldGroup label="Type de véhicule">
                <Popover open={carTypeOpen} onOpenChange={setCarTypeOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium text-left focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all disabled:opacity-50"
                      disabled={carTypesQuery.isLoading}
                    >
                      <span className={form.carTypeCode ? "text-[#171c1f]" : "text-[#9ca3af]"}>
                        {form.carTypeCode || (carTypesQuery.isLoading ? "Chargement…" : "Sélectionnez un type")}
                      </span>
                      <ChevronDown className="w-5 h-5 text-[#5e6473] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                        <CommandInput placeholder="Rechercher un type…" className="border-0 focus:ring-0 py-3 text-sm" />
                      </div>
                      <CommandList className="max-h-60 overflow-auto">
                        <CommandEmpty>Aucun type trouvé.</CommandEmpty>
                        <CommandGroup>
                          {carTypeStrings.map((t) => (
                            <CommandItem
                              key={t}
                              value={t}
                              onSelect={() => { update("carTypeCode", t); setCarTypeOpen(false); }}
                              className="cursor-pointer"
                            >
                              <Check className={`mr-2 w-4 h-4 shrink-0 ${form.carTypeCode === t ? "opacity-100" : "opacity-0"}`} />
                              {t}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FieldGroup>

              {/* Énergie */}
              <FieldGroup label="Énergie">
                <div className="relative">
                  <select
                    value={form.energyCode}
                    onChange={(e) => update("energyCode", e.target.value)}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">
                      {energiesQuery.isLoading ? "Chargement..." : "Sélectionnez une énergie"}
                    </option>
                    {energies.map((e) => (
                      <option key={e.code} value={e.code}>
                        {labelOf(e)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-5 h-5" />
                </div>
              </FieldGroup>

              {/* Puissance fiscale */}
              <FieldGroup label="Puissance fiscale (CV)">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.fiscalPower || ""}
                  onChange={(e) => update("fiscalPower", Number(e.target.value) || 0)}
                  placeholder="5"
                  className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                />
              </FieldGroup>

              {/* Nombre de places */}
              <FieldGroup label="Nombre de places">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.numberOfPlaces || ""}
                  onChange={(e) => update("numberOfPlaces", Number(e.target.value) || 0)}
                  placeholder="5"
                  className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                />
              </FieldGroup>

              {/* Valeur marché */}
              <FieldGroup label="Valeur marché (FCFA)">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    placeholder="4 000 000"
                    value={form.value}
                    onChange={(e) => update("value", e.target.value)}
                    className="w-full pl-4 pr-16 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#5e6473] text-sm">
                    FCFA
                  </span>
                </div>
              </FieldGroup>

              {/* Valeur à neuf (replacement cost) */}
              <FieldGroup label="Valeur à neuf / remplacement (FCFA)">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    placeholder="5 000 000"
                    value={form.replacementCost || ""}
                    onChange={(e) => update("replacementCost", Number(e.target.value) || 0)}
                    className="w-full pl-4 pr-16 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#5e6473] text-sm">
                    FCFA
                  </span>
                </div>
              </FieldGroup>
            </div>

            <div className="p-5 bg-[#00acbb]/10 rounded-2xl border-l-4 border-[#006972] flex gap-3">
              <ShieldCheck className="w-5 h-5 text-[#006972] shrink-0 mt-0.5" />
              <div>
                <h4
                  className="font-bold text-[#003a3f]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  Pourquoi ces détails ?
                </h4>
                <p className="text-sm text-[#003a3f]/80 mt-1">
                  La valeur à neuf et l&apos;année influencent directement vos garanties Vol et
                  Dommages. Nous optimisons votre couverture pour ne jamais vous faire payer trop
                  cher.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <TrustCard icon={<Zap className="w-5 h-5" />} color="#ac3509" title="Calcul instantané" desc="Nos algorithmes analysent les données en temps réel pour votre devis." />
          <TrustCard icon={<Award className="w-5 h-5" />} color="#006972" title="Garantie Valeur" desc="Option de remboursement à la valeur d'achat jusqu'à 24 mois." />
          <TrustCard icon={<Cloud className="w-5 h-5" />} color="#ac3509" title="Backup Cloud" desc="Vos documents stockés en toute sécurité sur notre portail business." />
        </div>
      </div>
    </div>
  );
}

function TrustCard({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-[#ac3509]/10 transition-colors">
      <span style={{ color }} className="block mb-3">
        {icon}
      </span>
      <h5
        className="font-bold text-sm mb-1 text-[#171c1f]"
        style={{ fontFamily: "Manrope, system-ui" }}
      >
        {title}
      </h5>
      <p className="text-xs text-[#5e6473]">{desc}</p>
    </div>
  );
}

// ==================== STEP 3: COVERAGE ====================
const MANDATORY_COVERAGE_CODES = ['2', '89']; // RC + Carte digitale

function Step3Coverage({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const coveragesQuery = useQuery({
    queryKey: ["insurance-ref-coverages", form.productCode],
    queryFn: () => api.insurance.getReference("coverages", { productCode: form.productCode }),
    enabled: !!form.productCode,
  });
  const coverages = unwrapRef(coveragesQuery.data);

  // Dédupliquer par code (la réponse contient les mêmes codes pour plusieurs categoryId)
  const uniqueCoverages = useMemo(() => {
    const seen = new Map<string, InsuranceReferenceItem>();
    for (const c of coverages) {
      const key = String((c.code ?? c.id) ?? '');
      if (key && !seen.has(key)) seen.set(key, c);
    }
    return Array.from(seen.values()).sort(
      (a, b) => Number(a.orderGuarantee ?? 99) - Number(b.orderGuarantee ?? 99)
    );
  }, [coverages]);

  // Auto-sélectionner les garanties obligatoires dès que la liste est chargée
  useEffect(() => {
    if (uniqueCoverages.length === 0) return;
    const missing = MANDATORY_COVERAGE_CODES.filter(
      mc => !form.axaCoverages.some(c => c.code === mc)
    );
    if (missing.length === 0) return;
    const toAdd = missing.map(mc => {
      const found = uniqueCoverages.find(c => String(c.code ?? c.id) === mc);
      return { code: mc, label: (found?.description as string) || mc, capitalAmount: 0 };
    });
    update("axaCoverages", [...form.axaCoverages, ...toAdd]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueCoverages.length]);

  const isSelected = (code: string) => form.axaCoverages.some(c => c.code === code);
  const getCov = (code: string) => form.axaCoverages.find(c => c.code === code);

  const toggleCoverage = (code: string, label: string) => {
    if (MANDATORY_COVERAGE_CODES.includes(code)) return;
    if (isSelected(code)) {
      update("axaCoverages", form.axaCoverages.filter(c => c.code !== code));
    } else {
      update("axaCoverages", [...form.axaCoverages, { code, label, capitalAmount: 0 }]);
    }
  };

  const setOptionValue = (code: string, optValue: string, optKey: string) => {
    update("axaCoverages", form.axaCoverages.map(c => {
      if (c.code !== code) return c;
      if (optKey === 'AA') return { ...c, option: optValue, capitalAmount: 0, hasOption: true };
      return { ...c, capitalAmount: Number(optValue) || 0, option: undefined, hasOption: true };
    }));
  };

  const setCapital = (code: string, amount: number) => {
    update("axaCoverages", form.axaCoverages.map(c =>
      c.code === code ? { ...c, capitalAmount: amount, hasOption: true } : c
    ));
  };

  const formatOptionLabel = (opt: { key: string; value: string; label: string }) => {
    if (opt.key === 'AA') return `${opt.label} (${opt.value})`;
    const n = Number(opt.value);
    const formattedValue = (opt.value === '0000' || n === 0)
      ? 'Sans franchise'
      : `${n.toLocaleString('fr-FR')} FCFA`;
    return `${opt.label} — ${formattedValue}`;
  };

  return (
    <div>
      <header className="mb-12 text-center max-w-3xl mx-auto">
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-[#171c1f]"
          style={{ fontFamily: "Manrope, system-ui" }}
        >
          Choisissez vos garanties
        </h1>
        <p className="text-lg text-[#5e6473]">
          Responsabilité Civile et Carte Digitale sont obligatoires. Ajoutez les garanties
          complémentaires selon vos besoins.
        </p>
      </header>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-bold text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui" }}>
            Garanties
          </h2>
          {form.axaCoverages.length > 0 && (
            <span className="text-xs font-bold uppercase tracking-wider text-[#ac3509]">
              {form.axaCoverages.length} sélectionnée{form.axaCoverages.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!form.productCode ? (
          <div className="p-7 bg-[#f0f4f8] rounded-2xl text-sm text-[#5e6473] flex items-center gap-3">
            <Info className="w-5 h-5" />
            Aucun produit sélectionné. Retournez à l&apos;étape 1 pour choisir une catégorie.
          </div>
        ) : coveragesQuery.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-[#5e6473]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des garanties…
          </div>
        ) : uniqueCoverages.length === 0 ? (
          <p className="text-sm text-[#5e6473]">Aucune garantie disponible pour ce produit.</p>
        ) : (
          <>
            {/* Garanties obligatoires — en haut, côte à côte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {uniqueCoverages.filter(c => MANDATORY_COVERAGE_CODES.includes(String(c.code ?? c.id ?? ''))).map((c) => {
                const codeStr = String(c.code ?? c.id ?? '');
                const covLabel = (c.description as string) || codeStr;
                return (
                  <div key={codeStr} className="flex items-center gap-3 p-4 rounded-2xl bg-[#fdf2ef] border border-[#ac3509]/30">
                    <div className="w-6 h-6 rounded-md bg-[#ac3509] flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#171c1f] text-sm">{covLabel}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#ac3509]">Obligatoire</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Garanties optionnelles — grille 2 colonnes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uniqueCoverages.filter(c => !MANDATORY_COVERAGE_CODES.includes(String(c.code ?? c.id ?? ''))).map((c) => {
              const codeStr = String(c.code ?? c.id ?? '');
              const isMandatory = MANDATORY_COVERAGE_CODES.includes(codeStr);
              const selected = isMandatory || isSelected(codeStr);
              const covLabel = (c.description as string) || codeStr;
              const covOptions = c.options as Array<{ key: string; value: string; label: string; uuid?: string }> | null;
              const selectedCov = getCov(codeStr);

              return (
                <div
                  key={codeStr}
                  className={`p-5 rounded-2xl border transition-all ${
                    selected ? "bg-white border-[#ac3509]/40 shadow-sm" : "bg-white border-[#eaeef2]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox / Lock */}
                    {isMandatory ? (
                      <div className="w-6 h-6 rounded-md bg-[#ac3509] flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleCoverage(codeStr, covLabel)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          selected ? "bg-[#ac3509] border-[#ac3509]" : "bg-white border-[#dfe3e7]"
                        }`}
                        aria-pressed={selected}
                      >
                        {selected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#171c1f]">{covLabel}</p>
                        {isMandatory && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#ac3509] px-2 py-0.5 rounded-full">
                            Obligatoire
                          </span>
                        )}
                      </div>

                      {/* Options avec valeurs prédéfinies */}
                      {selected && covOptions && covOptions.length > 0 && (
                        <div className="mt-3">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
                            {covOptions[0]?.key === 'AA' ? 'Niveau de garantie' :
                             covOptions[0]?.key === 'FCHDOM' ? 'Franchise' : 'Capital assuré'}
                          </label>
                          <select
                            className="bg-[#f0f4f8] border-0 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#ac3509]/40 w-full sm:w-64"
                            value={covOptions[0]?.key === 'AA' ? (selectedCov?.option || '') : String(selectedCov?.capitalAmount || '')}
                            onChange={(e) => setOptionValue(codeStr, e.target.value, covOptions[0]?.key || '')}
                          >
                            <option value="">Sélectionnez…</option>
                            {covOptions.map((opt) => (
                              <option key={opt.uuid || opt.value} value={opt.value}>
                                {formatOptionLabel(opt)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Capital libre pour les garanties sans options prédéfinies (VOL, Incendie, etc.) */}
                      {selected && !isMandatory && (!covOptions || covOptions.length === 0) && (
                        <div className="mt-3">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
                            Capital assuré (FCFA)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100000}
                            value={selectedCov?.capitalAmount || ""}
                            onChange={(e) => setCapital(codeStr, Number(e.target.value) || 0)}
                            placeholder="5 000 000"
                            className="bg-[#f0f4f8] border-0 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#ac3509]/40 w-full sm:w-48"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ==================== STEP 4: PAYMENT ====================
function Step4Payment({
  form,
  update,
  fallbackVehicleImage,
  simulation,
  simulationId,
  paymentInitiated,
  paymentStatus,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  fallbackVehicleImage?: string;
  simulation: InsuranceSimulationResponse | null;
  simulationId: number | null;
  paymentInitiated: boolean;
  paymentStatus?: string;
}) {
  const handleDownloadPdf = async () => {
    if (!simulationId) return;
    try {
      const blob = await api.insurance.downloadSimulationPdf(simulationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devis-${simulationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Impossible de télécharger le devis");
    }
  };

  const totalPremium = simulation?.totalPremium ?? simulation?.totalPrime ?? 0;
  const currency = simulation?.currency ?? "XOF";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Left form */}
      <section className="lg:col-span-7 space-y-9">
        <header>
          <h1
            className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2 text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Finalisez votre adhésion
          </h1>
          <p className="text-[#59413a] leading-relaxed">
            Sélectionnez le mode de règlement pour activer vos garanties immédiatement.
          </p>
        </header>

        <div className="space-y-5">
          <h2
            className="text-xl font-bold text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Méthode de paiement
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PayCard
              active={form.payment === "mobile_money"}
              onClick={() => update("payment", "mobile_money")}
              icon={<Phone className="w-7 h-7" />}
              title="Mobile Money"
              desc="Wave ou Orange Money — push direct sur votre téléphone."
            />
            <PayCard
              active={form.payment === "checkout"}
              onClick={() => update("payment", "checkout")}
              icon={<CreditCard className="w-7 h-7" />}
              title="Carte / Checkout"
              desc="Page de paiement sécurisée Bictorys (Visa, Mastercard, MM)."
            />
          </div>

          {form.payment === "mobile_money" && (
            <div className="p-6 bg-[#f0f4f8] rounded-2xl space-y-5">
              <FieldGroup label="Opérateur">
                <div className="flex gap-3">
                  {[
                    { value: "wave", label: "Wave" },
                    { value: "orange", label: "Orange Money" },
                    { value: "free", label: "Free Money" },
                  ].map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => update("paymentOperator", op.value)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                        form.paymentOperator === op.value
                          ? "bg-[#ac3509] text-white"
                          : "bg-white text-[#171c1f] hover:bg-[#dfe3e7]"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>
              <FieldGroup label="Numéro de téléphone">
                <input
                  type="tel"
                  placeholder="+221 77 123 45 67"
                  value={form.paymentPhone}
                  onChange={(e) => update("paymentPhone", e.target.value)}
                  className="w-full bg-white border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ac3509]/40 font-medium"
                />
              </FieldGroup>
            </div>
          )}

          {paymentInitiated && (
            <div className="p-5 bg-[#00acbb]/10 rounded-2xl border border-[#00acbb]/20 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#006972] shrink-0 animate-spin" />
              <div>
                <p className="text-sm font-bold text-[#003a3f]">
                  Paiement en cours — statut : {paymentStatus || "en attente"}
                </p>
                <p className="text-xs text-[#003a3f]/70 mt-0.5">
                  {form.payment === "mobile_money"
                    ? "Validez la requête sur votre téléphone."
                    : "Finalisez le paiement dans l'onglet Bictorys, on vérifie automatiquement toutes les 4 secondes."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Right summary */}
      <aside className="lg:col-span-5 lg:sticky lg:top-24">
        <div className="bg-white rounded-3xl p-7 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-[#eaeef2]">
          <h3
            className="text-2xl font-extrabold mb-7 text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Récapitulatif de l&apos;offre
          </h3>

          <div className="flex items-center gap-4 mb-7 p-4 bg-[#f0f4f8] rounded-2xl">
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-[#171c1f]">
              <VehicleThumb fallbackVehicleImage={fallbackVehicleImage} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#59413a]">
                {form.brand && form.model ? `${form.brand} ${form.model}` : "Véhicule à assurer"}
              </p>
              <p className="text-xs font-medium text-[#ac3509]">
                {form.productCode || "Produit non sélectionné"}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-7">
            {(simulation?.coverages?.length ?? 0) > 0 ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a]">
                  Garanties (devis AXA)
                </p>
                {simulation!.coverages!.map((c) => (
                  <Row
                    key={c.code}
                    label={c.label || c.code}
                    value={`${fmt(c.premium ?? 0)} ${currency}`}
                  />
                ))}
              </>
            ) : form.axaCoverages.length > 0 ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#59413a]">
                  Garanties choisies
                </p>
                {form.axaCoverages.map((c) => (
                  <Row key={c.code} label={c.label} value={`${fmt(c.capitalAmount)} FCFA`} />
                ))}
              </>
            ) : (
              <p className="text-sm text-[#5e6473]">Aucune garantie sélectionnée.</p>
            )}
            <div className="pt-4 border-t border-dashed border-[#e0bfb6]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#59413a] mb-1">
                Prime totale TTC
              </p>
              <p
                className="text-3xl font-black text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                {totalPremium > 0 ? `${fmt(totalPremium)} ${currency}` : "—"}
              </p>
              {totalPremium === 0 && (
                <p className="text-xs text-[#59413a] mt-1">
                  Devis non disponible — retournez à l&apos;étape Garanties pour relancer.
                </p>
              )}
            </div>
            {simulationId && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#f0f4f8] hover:bg-[#dfe3e7] text-[#171c1f] font-bold text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger le devis (PDF)
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-[#59413a]/60 leading-tight">
            En cliquant sur &quot;Confirmer & Payer&quot;, vous acceptez nos conditions générales
            de vente et confirmez avoir pris connaissance de la fiche IPID.
          </p>
        </div>

        <div className="mt-5 p-5 bg-[#00acbb]/5 rounded-3xl flex items-start gap-4">
          <Zap className="w-5 h-5 text-[#006972] shrink-0 mt-0.5" />
          <div>
            <h4
              className="font-bold text-sm text-[#003a3f] mb-1"
              style={{ fontFamily: "Manrope, system-ui" }}
            >
              Activation Ultra-Rapide
            </h4>
            <p className="text-xs text-[#003a3f]/80 leading-relaxed">
              Une fois le paiement validé, recevez votre attestation provisoire par email en moins
              de 2 minutes.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PayCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative p-6 rounded-xl cursor-pointer transition-all ${
        active
          ? "bg-white border-2 border-[#ac3509] ring-4 ring-[#ac3509]/5"
          : "bg-[#f0f4f8] hover:bg-white border-2 border-transparent"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <span style={{ color: active ? "#ac3509" : "#5e6473" }}>{icon}</span>
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
            active ? "border-4 border-[#ac3509] bg-white" : "border-2 border-[#e0bfb6]"
          }`}
        />
      </div>
      <h3
        className="font-bold text-base mb-1 text-[#171c1f]"
        style={{ fontFamily: "Manrope, system-ui" }}
      >
        {title}
      </h3>
      <p className="text-sm text-[#59413a] leading-snug">{desc}</p>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 text-sm">
      <span className="text-[#59413a]">{label}</span>
      <span className={bold ? "font-bold" : "font-semibold"} style={{ color: valueColor || "#171c1f" }}>
        {value}
      </span>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-[#59413a]/70 px-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}

// ==================== STEP 5: CUSTOMER (SOUSCRIPTEUR) ====================
function Step5Customer({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const titlesQuery = useQuery({
    queryKey: ["insurance-ref-titles"],
    queryFn: () => api.insurance.getReference("titles"),
  });
  const titles = unwrapRef(titlesQuery.data);

  const cspsQuery = useQuery({
    queryKey: ["insurance-ref-csps"],
    queryFn: () => api.insurance.getReference("csps"),
  });
  const csps = unwrapRef(cspsQuery.data);

  const activitiesQuery = useQuery({
    queryKey: ["insurance-ref-activities"],
    queryFn: () => api.insurance.getReference("activities"),
  });
  const activities = unwrapRef(activitiesQuery.data);

  const countriesQuery = useQuery({
    queryKey: ["insurance-ref-countries"],
    queryFn: () => api.insurance.getReference("countries"),
  });
  const countries = unwrapRef(countriesQuery.data);

  const labelOf = (item: InsuranceReferenceItem) => {
    const raw = item as Record<string, unknown>;
    return (
      item.kindLabel || item.label || item.productLabel || item.libelle || item.nom ||
      item.designation || item.name || item.description ||
      item.code || item.productCode ||
      (item.id != null ? String(item.id) : '') ||
      (Object.values(raw).find((v) => typeof v === 'string' && v.length > 0) as string | undefined) ||
      '—'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-4 space-y-7">
        <h1
          className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#171c1f]"
          style={{ fontFamily: "Manrope, system-ui" }}
        >
          Identité du <span className="text-[#ac3509]">souscripteur</span>
        </h1>
        <p className="text-[#5e6473] leading-relaxed">
          Le contrat AXA est nominatif. Renseignez les informations du titulaire qui figurera sur
          l&apos;attestation.
        </p>
        <div className="p-5 bg-[#00acbb]/10 rounded-xl border-l-4 border-[#006972] flex gap-3">
          <ShieldCheck className="w-5 h-5 text-[#006972] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[#003a3f]" style={{ fontFamily: "Manrope, system-ui" }}>
              Données protégées
            </h4>
            <p className="text-sm text-[#003a3f]/80 mt-1">
              Vos informations sont transmises chiffrées à AXA pour la création du contrat.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="bg-white rounded-3xl p-7 lg:p-9 shadow-[0_8px_24px_rgba(23,28,31,0.04)] space-y-7">
          {/* Identité */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FieldGroup label="Civilité">
              <div className="relative">
                <select
                  value={form.customerTitle}
                  onChange={(e) => update("customerTitle", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40 appearance-none cursor-pointer"
                >
                  <option value="">{titlesQuery.isLoading ? "…" : "Choisir"}</option>
                  {titles.map((t) => (
                    <option key={t.code} value={t.code}>
                      {labelOf(t)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-4 h-4" />
              </div>
            </FieldGroup>

            <FieldGroup label="Nom">
              <input
                type="text"
                value={form.customerLastName}
                onChange={(e) => update("customerLastName", e.target.value)}
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>

            <FieldGroup label="Prénom">
              <input
                type="text"
                value={form.customerFirstName}
                onChange={(e) => update("customerFirstName", e.target.value)}
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="Email">
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => update("customerEmail", e.target.value)}
                placeholder="souscripteur@email.com"
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>
            <FieldGroup label="Téléphone mobile">
              <input
                type="tel"
                value={form.customerMobile}
                onChange={(e) => update("customerMobile", e.target.value)}
                placeholder="770001122"
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>
            <FieldGroup label="CIN">
              <input
                type="text"
                value={form.customerCin}
                onChange={(e) => update("customerCin", e.target.value)}
                placeholder="1234567890123"
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>
            <FieldGroup label="Date de naissance">
              <input
                type="date"
                value={form.customerBirthdate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update("customerBirthdate", e.target.value)}
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>
          </div>

          {/* Adresse */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <FieldGroup label="Adresse">
                <input
                  type="text"
                  value={form.customerAddress}
                  onChange={(e) => update("customerAddress", e.target.value)}
                  placeholder="Avenue Léopold S. Senghor, Médina"
                  className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Ville">
              <input
                type="text"
                value={form.customerCity}
                onChange={(e) => update("customerCity", e.target.value)}
                placeholder="DAKAR"
                className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40"
              />
            </FieldGroup>
          </div>

          {/* Profession + nationalité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="Catégorie socio-professionnelle (CSP)">
              <div className="relative">
                <select
                  value={form.customerCsp}
                  onChange={(e) => update("customerCsp", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40 appearance-none cursor-pointer"
                >
                  <option value="">{cspsQuery.isLoading ? "…" : "Choisir"}</option>
                  {csps.map((c) => (
                    <option key={c.code} value={c.code}>
                      {labelOf(c)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-4 h-4" />
              </div>
            </FieldGroup>
            <FieldGroup label="Activité (optionnel)">
              <div className="relative">
                <select
                  value={form.customerActivity}
                  onChange={(e) => update("customerActivity", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40 appearance-none cursor-pointer"
                >
                  <option value="">{activitiesQuery.isLoading ? "…" : "Aucune"}</option>
                  {activities.map((a) => (
                    <option key={a.code} value={a.code}>
                      {labelOf(a)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-4 h-4" />
              </div>
            </FieldGroup>
            <FieldGroup label="Nationalité">
              <div className="relative">
                <select
                  value={form.customerNationality}
                  onChange={(e) => update("customerNationality", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40 appearance-none cursor-pointer"
                >
                  <option value="">{countriesQuery.isLoading ? "…" : "Choisir"}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {labelOf(c)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-4 h-4" />
              </div>
            </FieldGroup>
            <FieldGroup label="Pays de naissance">
              <div className="relative">
                <select
                  value={form.customerNativeCountry}
                  onChange={(e) => update("customerNativeCountry", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/40 appearance-none cursor-pointer"
                >
                  <option value="">{countriesQuery.isLoading ? "…" : "Choisir"}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {labelOf(c)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-4 h-4" />
              </div>
            </FieldGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SUCCESS SCREEN ====================
function SuccessScreen({
  contractNumber,
  form,
  router,
  fallbackVehicleImage,
}: {
  contractNumber: string;
  form: FormState;
  router: ReturnType<typeof useRouter>;
  fallbackVehicleImage?: string;
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 lg:p-12">
      {/* Decorative bg */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#ac3509]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-[#006972]/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ffdbd0] shadow-sm"
          >
            <CheckCircle2 className="w-10 h-10 text-[#ac3509]" />
          </motion.div>
          <div className="space-y-2">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui" }}
            >
              Contrat Actif
            </h1>
            <p className="text-[#59413a] text-lg max-w-lg mx-auto font-medium">
              Félicitations ! Votre véhicule est désormais protégé par Kinetic Assur.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Policy status */}
          <div className="md:col-span-7 bg-white rounded-[2rem] p-7 shadow-[0_8px_24px_rgba(23,28,31,0.04)] flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-[#ac3509] mb-1">
                    Numéro de Contrat
                  </p>
                  <h3
                    className="text-3xl font-bold tracking-tight text-[#171c1f]"
                    style={{ fontFamily: "Manrope, system-ui" }}
                  >
                    {contractNumber}
                  </h3>
                </div>
                <div className="bg-[#00acbb]/20 text-[#003a3f] px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#003a3f] animate-pulse" />
                  VALIDE
                </div>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#59413a] font-medium">Date d&apos;effet</p>
                    <p className="text-[#171c1f] font-semibold">
                      {new Date().toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#59413a] font-medium">Échéance</p>
                    <p className="text-[#171c1f] font-semibold">Annuelle (Reconduction)</p>
                  </div>
                </div>
                <div className="p-4 bg-[#eaeef2] rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
                    <VehicleThumb fallbackVehicleImage={fallbackVehicleImage} />
                  </div>
                  <div>
                    <p className="text-xs text-[#59413a] font-medium">Véhicule assuré</p>
                    <p className="text-[#171c1f] font-bold uppercase">
                      {form.brand} {form.model}
                      {form.plate ? ` • ${form.plate}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 opacity-10">
              <ShieldCheck className="w-40 h-40 text-[#ac3509]" />
            </div>
          </div>

          {/* Documents */}
          <div className="md:col-span-5 space-y-5">
            <div className="bg-[#f0f4f8] rounded-[2rem] p-7 flex flex-col h-full border border-[#dfe3e7]/50">
              <h4
                className="text-xl font-bold mb-5 text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                Vos documents
              </h4>
              <div className="space-y-3 flex-grow">
                <button
                  type="button"
                  onClick={async () => {
                    if (!contractNumber) return;
                    try {
                      const blob = await api.insurance.downloadContractDocuments(contractNumber);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `contrat-${contractNumber}.zip`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      toast.error("Téléchargement des documents impossible");
                    }
                  }}
                  className="w-full text-left bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#ffdbd0", color: "#ac3509" }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p
                      className="font-bold text-sm text-[#171c1f]"
                      style={{ fontFamily: "Manrope, system-ui" }}
                    >
                      Documents AXA (attestation + CG + quittance)
                    </p>
                    <p className="text-[11px] text-[#5e6473]">ZIP signé</p>
                  </div>
                  <Download className="w-5 h-5 text-[#5e6473]" />
                </button>
              </div>
              <div className="mt-7 pt-5 border-t border-[#dfe3e7]">
                <p className="text-[11px] text-[#59413a] leading-relaxed italic">
                  Une copie de ces documents est également envoyée par AXA à votre email.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-7">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-white font-bold px-9 py-4 rounded-xl shadow-lg active:scale-95 transition-all w-full sm:w-auto text-base"
            style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
          >
            Accéder à mon espace client
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#dfe3e7] text-[#171c1f] font-bold px-9 py-4 rounded-xl hover:bg-[#e4e9ed] transition-colors w-full sm:w-auto text-base"
          >
            Nouveau contrat
          </button>
        </div>

        <div className="bg-white/40 backdrop-blur-md rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 max-w-2xl mx-auto mt-10 border border-white/50">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
              style={{ backgroundImage: KINETIC }}
            >
              S
            </div>
            <div>
              <p className="text-xs font-bold text-[#ac3509] tracking-widest uppercase mb-0.5">
                Besoin d&apos;aide ?
              </p>
              <p className="text-sm text-[#59413a] font-medium">
                Votre conseiller est disponible 24/7
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="tel:+221000000000"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#171c1f] shadow-sm hover:text-[#ac3509] transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href="mailto:support@subito.sn"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#171c1f] shadow-sm hover:text-[#ac3509] transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <footer className="py-12 px-6 text-center mt-10">
        <p className="text-[10px] text-[#e0bfb6] font-medium uppercase tracking-[0.2em]">
          Kinetic Assur © {new Date().getFullYear()} • Régie par le Code des Assurances CIMA
        </p>
      </footer>
    </main>
  );
}

function DocCard({
  icon,
  bg,
  color,
  title,
  meta,
}: {
  icon: React.ReactNode;
  bg: string;
  color: string;
  title: string;
  meta: string;
}) {
  return (
    <a
      href="#"
      className="flex items-center justify-between p-4 bg-white rounded-2xl hover:translate-x-1 transition-transform group shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: bg, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold leading-none mb-1 text-[#171c1f]">{title}</p>
          <p className="text-[10px] text-[#59413a] font-medium uppercase tracking-tighter">
            {meta}
          </p>
        </div>
      </div>
      <Download className="w-5 h-5 text-[#59413a] group-hover:text-[#ac3509] transition-colors" />
    </a>
  );
}
