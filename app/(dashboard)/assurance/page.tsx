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
  // AXA product + coverages
  productCode: string;
  packCode: string;
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
  productCode: "",
  packCode: "PACK_BASE",
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
    durationCode: "12M",
    countryCode: "SN",
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
      modelCode: form.model,
      otherBrand: form.brand,
      otherModel: form.model,
      carTypeCode: form.carTypeCode,
    },
    coverages: form.axaCoverages.map((c) => ({ code: c.code, capitalAmount: c.capitalAmount })),
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
    if (s === 1 && !form.contractType) return toast.error("Choisissez un type de contrat"), false;
    if (s === 2) {
      if (!form.brand || !form.model) return toast.error("Marque et modèle requis"), false;
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
      const missingCapital = form.axaCoverages.find(c => !c.capitalAmount || c.capitalAmount <= 0);
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
    <main className="max-w-7xl mx-auto px-6 py-10 lg:py-14 pb-32">
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
            <Step2Vehicle form={form} update={update} vehicules={vehicules} />
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[#e0bfb6]/20 p-4 z-40 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-[#5e6473]">
              Étape {step} sur {TOTAL_STEPS}
            </span>
            <div className="w-48 h-1 bg-[#dfe3e7] rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundImage: KINETIC }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && step < 5 && (
              <button
                onClick={back}
                className="px-5 py-2 text-sm font-bold text-[#5e6473] hover:text-[#171c1f] transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            )}
            {step < 3 && (
              <button
                onClick={next}
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group"
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
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group disabled:opacity-60"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {simulationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calcul du devis…
                  </>
                ) : (
                  <>
                    Calculer le devis
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
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group disabled:opacity-60"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {directPayMutation.isPending || checkoutPayMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Payer maintenant
              </button>
            )}
            {step === 4 && paymentInitiated && (
              <button
                disabled
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 opacity-70"
                style={{ backgroundImage: KINETIC }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                En attente de confirmation…
              </button>
            )}
            {step === 5 && (
              <button
                onClick={() => {
                  if (!validate(5)) return;
                  submitContract();
                }}
                disabled={contractMutation.isPending}
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group disabled:opacity-60"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {contractMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Souscrire le contrat
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
    <div className="flex items-center gap-3 lg:gap-4 mb-12 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const active = s.id === step;
        const done = s.id < step;
        return (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  active
                    ? "w-10 h-10 text-white shadow-lg"
                    : done
                    ? "w-8 h-8 text-white bg-emerald-500"
                    : "w-8 h-8 bg-[#dfe3e7] text-[#5e6473]"
                }`}
                style={
                  active
                    ? { backgroundImage: KINETIC, boxShadow: "0 8px 16px rgba(172,53,9,0.25)" }
                    : undefined
                }
              >
                {done ? <Check className="w-4 h-4" /> : s.id}
              </span>
              <span
                className={`text-xs lg:text-sm whitespace-nowrap transition-all ${
                  active ? "font-bold text-[#ac3509]" : "font-medium text-[#5e6473]"
                }`}
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-[2px] w-8 lg:w-12 bg-[#dfe3e7] shrink-0" />
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
  fallbackVehicleImage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  fallbackVehicleImage?: string;
}) {
  return (
    <>
      <div className="grid lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-8">
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Propulsez votre <span className="text-[#ac3509] italic">mobilité</span>.
          </h1>
          <p className="text-lg text-[#5e6473] max-w-2xl leading-relaxed">
            Sélectionnez le type de couverture adapté à vos besoins. Que vous gériez une flotte
            d&apos;entreprise ou votre propre activité de transport, nos solutions s&apos;ajustent
            à votre cinétique.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONTRACT_TYPES.map((c) => {
          const Icon = c.icon;
          const active = form.contractType === c.id;
          const accentColor =
            c.accent === "primary" ? "#ac3509" : c.accent === "tertiary" ? "#006972" : "#5e6473";
          return (
            <div
              key={c.id}
              onClick={() => update("contractType", c.id)}
              className={`group relative bg-white rounded-[1.5rem] p-7 flex flex-col justify-between overflow-hidden transition-all duration-300 cursor-pointer ${
                active
                  ? "ring-2 ring-[#ac3509] shadow-[0_24px_48px_rgba(172,53,9,0.15)]"
                  : "hover:shadow-[0_8px_24px_rgba(23,28,31,0.06)]"
              }`}
            >
              <div
                className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ color: accentColor }}
              >
                <Icon className="w-24 h-24" />
              </div>
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3
                  className="text-xl font-bold mb-3 text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  {c.title}
                </h3>
                <p className="text-[#5e6473] text-sm leading-relaxed mb-5">{c.desc}</p>
                <ul className="space-y-2.5 mb-7">
                  {c.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-medium text-[#171c1f]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  active ? "text-white" : "bg-[#e4e9ed] text-[#171c1f] group-hover:text-white"
                }`}
                style={
                  active
                    ? { backgroundImage: KINETIC }
                    : { transition: "all 0.3s ease" }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    if (c.accent === "primary") e.currentTarget.style.backgroundImage = KINETIC;
                    else if (c.accent === "tertiary") e.currentTarget.style.backgroundColor = "#006972";
                    else e.currentTarget.style.backgroundColor = "#5e6473";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundImage = "";
                    e.currentTarget.style.backgroundColor = "";
                  }
                }}
              >
                {active ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Sélectionné
                  </span>
                ) : (
                  "Choisir ce contrat"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Help section */}
      <div className="mt-20 grid lg:grid-cols-2 gap-10 items-center">
        <div className="relative rounded-[2rem] overflow-hidden aspect-video shadow-2xl bg-[#eaeef2]">
          <AssuranceVehicleImage fallbackVehicleImage={fallbackVehicleImage} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-7">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl w-full max-w-sm">
              <p
                className="text-sm font-bold mb-1 text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                Besoin d&apos;aide ?
              </p>
              <p className="text-xs text-[#5e6473] mb-3">
                Nos experts Flotte sont disponibles pour une étude personnalisée de vos besoins.
              </p>
              <button className="flex items-center gap-2 text-xs font-bold text-[#ac3509]">
                Prendre rendez-vous <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-7 lg:pl-8">
          <div>
            <h4
              className="text-xl font-bold mb-3 text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui" }}
            >
              Pourquoi choisir Kinetic Assur ?
            </h4>
            <p className="text-[#5e6473] leading-relaxed">
              Nous ne nous contentons pas d&apos;assurer vos véhicules. Nous protégeons votre
              productivité avec des outils digitaux de pointe et une assistance réactive en cas de
              sinistre.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="p-5 bg-[#f0f4f8] rounded-2xl border-l-4 border-[#ac3509]">
              <span
                className="block text-2xl font-black text-[#ac3509] mb-1"
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                24/7
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#414754]">
                Assistance active
              </span>
            </div>
            <div className="p-5 bg-[#f0f4f8] rounded-2xl border-l-4 border-[#006972]">
              <span
                className="block text-2xl font-black text-[#006972] mb-1"
                style={{ fontFamily: "Manrope, system-ui" }}
              >
                100%
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#414754]">
                Digitalisé
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== STEP 2: VEHICLE ====================
function Step2Vehicle({
  form,
  update,
  vehicules,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  vehicules: VehiculeLocation[];
}) {
  const energiesQuery = useQuery({
    queryKey: ["insurance-ref-energies"],
    queryFn: () => api.insurance.getReference("energies"),
  });
  const energies = unwrapRef(energiesQuery.data);

  const labelOf = (item: InsuranceReferenceItem) =>
    item.label || item.name || item.description || item.code;

  // Brand / model / car type dropdowns are derived from the company's fleet — AXA's
  // /ref/brands sample exposes only {code,label} (no nested models) and /ref/car-types
  // currently returns nothing. Trim + lowercase to dedupe variants like
  // "Toyota" vs "Toyota " vs "TOYOTA".
  const normalize = (s: string | null | undefined) => (s ?? "").trim();
  const dedupKey = (s: string) => s.toLocaleLowerCase("fr");
  const distinct = (values: Array<string | null | undefined>) => {
    const seen = new Map<string, string>();
    for (const v of values) {
      const n = normalize(v);
      if (!n) continue;
      const key = dedupKey(n);
      if (!seen.has(key)) seen.set(key, n);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "fr"));
  };

  const fleetBrands = useMemo(() => distinct(vehicules.map((v) => v.marque)), [vehicules]);

  const brandModels = useMemo(() => {
    if (!form.brand) return [] as string[];
    const target = dedupKey(form.brand);
    return distinct(
      vehicules
        .filter((v) => dedupKey(normalize(v.marque)) === target)
        .map((v) => v.modele)
    );
  }, [vehicules, form.brand]);

  const fleetCarTypes = useMemo(() => distinct(vehicules.map((v) => v.type)), [vehicules]);

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
          className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#171c1f] leading-[1.1]"
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
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-7 lg:p-10 shadow-2xl shadow-[#ac3509]/5">
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
              {/* Brand — derived from the company's fleet */}
              <FieldGroup label="Marque">
                <div className="relative">
                  <select
                    value={form.brand}
                    onChange={(e) => {
                      update("brand", e.target.value);
                      // Reset model — the available models depend on the brand.
                      update("model", "");
                    }}
                    disabled={fleetBrands.length === 0}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {fleetBrands.length === 0
                        ? "Aucune marque disponible dans la flotte"
                        : "Sélectionnez une marque"}
                    </option>
                    {fleetBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-5 h-5" />
                </div>
              </FieldGroup>

              {/* Model — filtered by the selected brand from the fleet */}
              <FieldGroup label="Modèle">
                <div className="relative">
                  <select
                    value={form.model}
                    onChange={(e) => update("model", e.target.value)}
                    disabled={!form.brand || brandModels.length === 0}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!form.brand
                        ? "Choisissez d'abord une marque"
                        : brandModels.length === 0
                          ? "Aucun modèle disponible"
                          : "Sélectionnez un modèle"}
                    </option>
                    {brandModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-5 h-5" />
                </div>
              </FieldGroup>

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

              {/* Type de véhicule — derived from the fleet */}
              <FieldGroup label="Type de véhicule">
                <div className="relative">
                  <select
                    value={form.carTypeCode}
                    onChange={(e) => update("carTypeCode", e.target.value)}
                    disabled={fleetCarTypes.length === 0}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {fleetCarTypes.length === 0
                        ? "Aucun type disponible"
                        : "Sélectionnez un type"}
                    </option>
                    {fleetCarTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-5 h-5" />
                </div>
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
function Step3Coverage({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const productsQuery = useQuery({
    queryKey: ["insurance-ref-products"],
    queryFn: () => api.insurance.getReference("products"),
  });
  const products = unwrapRef(productsQuery.data);

  const coveragesQuery = useQuery({
    queryKey: ["insurance-ref-coverages", form.productCode],
    queryFn: () => api.insurance.getReference("coverages", { productCode: form.productCode }),
    enabled: !!form.productCode,
  });
  const coverages = unwrapRef(coveragesQuery.data);

  const labelOf = (item: InsuranceReferenceItem) =>
    item.label || item.name || item.description || item.code;

  const isSelected = (code: string) => form.axaCoverages.some((c) => c.code === code);
  const capitalOf = (code: string) =>
    form.axaCoverages.find((c) => c.code === code)?.capitalAmount ?? 0;

  const toggleCoverage = (code: string, label: string) => {
    if (isSelected(code)) {
      update("axaCoverages", form.axaCoverages.filter((c) => c.code !== code));
    } else {
      update("axaCoverages", [...form.axaCoverages, { code, label, capitalAmount: 0 }]);
    }
  };

  const setCapital = (code: string, amount: number) => {
    update(
      "axaCoverages",
      form.axaCoverages.map((c) => (c.code === code ? { ...c, capitalAmount: amount } : c))
    );
  };

  return (
    <div>
      <header className="mb-12 text-center max-w-3xl mx-auto">
        <h1
          className="text-4xl font-extrabold tracking-tight mb-3 text-[#171c1f]"
          style={{ fontFamily: "Manrope, system-ui" }}
        >
          Choisissez votre niveau de protection
        </h1>
        <p className="text-lg text-[#5e6473]">
          Sélectionnez le produit AXA et les garanties à inclure dans votre contrat. Le capital
          assuré conditionne la prime.
        </p>
      </header>

      {/* Product picker */}
      <section className="mb-12">
        <h2
          className="text-xl font-bold mb-5 text-[#171c1f]"
          style={{ fontFamily: "Manrope, system-ui" }}
        >
          Produit d&apos;assurance
        </h2>
        {productsQuery.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-[#5e6473]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des produits AXA…
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-[#5e6473]">Aucun produit disponible.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => {
              const active = form.productCode === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => update("productCode", p.code)}
                  className={`text-left p-6 rounded-2xl transition-all ${
                    active
                      ? "bg-white ring-2 ring-[#ac3509] shadow-xl"
                      : "bg-white border border-[#eaeef2] hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: active ? "#ffdbd0" : "#f0f4f8",
                        color: active ? "#ac3509" : "#5e6473",
                      }}
                    >
                      <Shield className="w-5 h-5" />
                    </div>
                    {active && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#ac3509] bg-[#ffdbd0] px-2 py-0.5 rounded-full">
                        Choisi
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#171c1f] mb-1">{labelOf(p)}</h3>
                  <p className="text-xs font-mono text-[#5e6473]">{p.code}</p>
                  {p.description && (
                    <p className="text-sm text-[#5e6473] mt-2 leading-relaxed">{p.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Coverages */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2
            className="text-xl font-bold text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
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
            <Info className="w-5 h-5 text-[#5e6473]" />
            Sélectionnez d&apos;abord un produit pour voir les garanties disponibles.
          </div>
        ) : coveragesQuery.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-[#5e6473]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des garanties…
          </div>
        ) : coverages.length === 0 ? (
          <p className="text-sm text-[#5e6473]">Aucune garantie disponible pour ce produit.</p>
        ) : (
          <div className="space-y-3">
            {coverages.map((c) => {
              const selected = isSelected(c.code);
              const label = labelOf(c);
              return (
                <div
                  key={c.code}
                  className={`flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border transition-all ${
                    selected ? "bg-white border-[#ac3509]/40 shadow-sm" : "bg-white border-[#eaeef2]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCoverage(c.code, label)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? "bg-[#ac3509] border-[#ac3509]" : "bg-white border-[#dfe3e7]"
                    }`}
                    aria-pressed={selected}
                  >
                    {selected && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#171c1f]">{label}</p>
                    <p className="text-xs font-mono text-[#5e6473] mt-0.5">{c.code}</p>
                    {c.description && (
                      <p className="text-sm text-[#5e6473] mt-1 leading-relaxed">{c.description}</p>
                    )}
                  </div>
                  {selected && (
                    <div className="md:w-56">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#59413a] mb-1">
                        Capital assuré (FCFA)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100000}
                        value={capitalOf(c.code) || ""}
                        onChange={(e) => setCapital(c.code, Number(e.target.value) || 0)}
                        placeholder="5 000 000"
                        className="w-full bg-[#f0f4f8] border-0 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#ac3509]/40"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

  const labelOf = (item: InsuranceReferenceItem) =>
    item.label || item.name || item.description || item.code;

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
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#171c1f]"
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
