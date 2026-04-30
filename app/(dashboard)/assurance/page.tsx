'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  VehiculeLocation,
  InsuranceContractResponse,
  InsuranceSimulationResponse,
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
type Tier = "tiers" | "tiers_plus" | "tous_risques";
type Payment = "company_account" | "card";

interface FormState {
  contractType: ContractType | "";
  // vehicle
  plate: string;
  brand: string;
  model: string;
  year: string;
  value: string;
  // tier
  tier: Tier;
  // payment
  payment: Payment;
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
  year: "",
  value: "",
  tier: "tous_risques",
  payment: "company_account",
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
  { id: 5, label: "Confirmation" },
];

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

const TIERS: {
  id: Tier;
  badge: string;
  badgeColor: string;
  title: string;
  monthly: number;
  features: { label: string; included: boolean; bold?: boolean }[];
  recommended?: boolean;
}[] = [
  {
    id: "tiers",
    badge: "Essentiel",
    badgeColor: "#dfe3e7",
    title: "Tiers",
    monthly: 24.9,
    features: [
      { label: "Responsabilité Civile", included: true },
      { label: "Défense Pénale et Recours", included: true },
      { label: "Assistance 0km", included: true },
      { label: "Bris de Glace", included: false },
      { label: "Vol & Incendie", included: false },
    ],
  },
  {
    id: "tous_risques",
    badge: "Sérénité Totale",
    badgeColor: "#ffdbd0",
    title: "Tous Risques",
    monthly: 52.5,
    recommended: true,
    features: [
      { label: "Dommages Tous Accidents", included: true, bold: true },
      { label: "Bris de Glace Intégral (Toit inclus)", included: true },
      { label: "Vol, Incendie & Tempête", included: true },
      { label: "Garantie Conducteur 1M€", included: true },
      { label: "Véhicule de Remplacement", included: true },
    ],
  },
  {
    id: "tiers_plus",
    badge: "Équilibré",
    badgeColor: "#dfe3e7",
    title: "Tiers Plus",
    monthly: 38.15,
    features: [
      { label: "Responsabilité Civile", included: true },
      { label: "Bris de Glace", included: true },
      { label: "Vol & Incendie", included: true },
      { label: "Catastrophes Naturelles", included: true },
      { label: "Dommages Accidents", included: false },
    ],
  },
];

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

  // Demo: simulate contract creation locally — backend wiring kept light
  const submitMutation = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 800));
      const ref = `KA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      return { contractNumber: ref };
    },
    onSuccess: (data) => {
      setContractNumber(data.contractNumber);
      setSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    },
    onError: (e: Error) => toast.error(e.message || "Erreur lors de la souscription"),
  });

  const validate = (s: number): boolean => {
    if (s === 1 && !form.contractType) return toast.error("Choisissez un type de contrat"), false;
    if (s === 2) {
      if (!form.brand || !form.model) return toast.error("Marque et modèle requis"), false;
      if (!form.year) return toast.error("Année requise"), false;
      if (!form.value) return toast.error("Valeur estimée requise"), false;
    }
    if (s === 4) {
      if (!form.raisonSociale.trim()) return toast.error("Raison sociale requise"), false;
    }
    return true;
  };
  const next = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(5, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const selectedTier = TIERS.find((t) => t.id === form.tier)!;
  const annualHT = selectedTier.monthly * 12;
  const taxes = +(annualHT * 0.15).toFixed(2);
  const totalTTC = +(annualHT + taxes).toFixed(2);
  const monthly = +(totalTTC / 12).toFixed(2);

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
              selectedTier={selectedTier}
              annualHT={annualHT}
              taxes={taxes}
              totalTTC={totalTTC}
              monthly={monthly}
              fallbackVehicleImage={fallbackVehicleImage}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[#e0bfb6]/20 p-4 z-40 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-[#5e6473]">
              Étape {step} sur {STEPS.length}
            </span>
            <div className="w-48 h-1 bg-[#dfe3e7] rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${(step / STEPS.length) * 100}%`, backgroundImage: KINETIC }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={back}
                className="px-5 py-2 text-sm font-bold text-[#5e6473] hover:text-[#171c1f] transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            )}
            <button className="hidden lg:block px-5 py-2 text-sm font-bold text-[#5e6473] hover:text-[#171c1f] transition-colors">
              Enregistrer pour plus tard
            </button>
            {step < 4 && (
              <button
                onClick={next}
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                Continuer
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 group"
                style={{ backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.2)" }}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Confirmer & Payer
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

  const simId = simulation.simulationId || simulation.id;

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
  const brands = useMemo(() => {
    const set = new Set<string>();
    vehicules.forEach((v) => v.marque && set.add(v.marque));
    return Array.from(set).sort();
  }, [vehicules]);

  const modelsForBrand = useMemo(() => {
    if (!form.brand) return [] as string[];
    const set = new Set<string>();
    vehicules.forEach((v) => {
      if (v.marque === form.brand && v.modele) set.add(v.modele);
    });
    return Array.from(set).sort();
  }, [vehicules, form.brand]);
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
              {/* Brand */}
              <div className="space-y-3">
                <label
                  className="block font-bold text-sm text-[#59413a]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  Marque du véhicule
                </label>
                <div className="relative">
                  <select
                    value={form.brand}
                    onChange={(e) => {
                      update("brand", e.target.value);
                      update("model", "");
                    }}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">
                      {brands.length === 0 ? "Chargement..." : "Sélectionnez une marque"}
                    </option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-5 h-5" />
                </div>
              </div>

              {/* Model */}
              <div className="space-y-3">
                <label
                  className="block font-bold text-sm text-[#59413a]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  Modèle exact
                </label>
                <div className="relative">
                  <select
                    value={form.model}
                    onChange={(e) => update("model", e.target.value)}
                    disabled={!form.brand || modelsForBrand.length === 0}
                    className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!form.brand
                        ? "Choisissez d'abord une marque"
                        : modelsForBrand.length === 0
                        ? "Aucun modèle disponible"
                        : "Sélectionnez un modèle"}
                    </option>
                    {modelsForBrand.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5e6473] w-5 h-5" />
                </div>
              </div>

              {/* Year */}
              <div className="space-y-3">
                <label
                  className="block font-bold text-sm text-[#59413a]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  Année de mise en circulation
                </label>
                <input
                  type="number"
                  min={1950}
                  max={new Date().getFullYear() + 1}
                  placeholder="YYYY"
                  value={form.year}
                  onChange={(e) => update("year", e.target.value)}
                  className="w-full px-4 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                />
              </div>

              {/* Value */}
              <div className="space-y-3">
                <label
                  className="block font-bold text-sm text-[#59413a]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  Valeur estimée du véhicule
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.value}
                    onChange={(e) => update("value", e.target.value)}
                    className="w-full pl-4 pr-16 py-4 bg-[#f0f4f8] border-0 rounded-xl font-medium focus:ring-2 focus:ring-[#ac3509]/20 focus:bg-white transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#5e6473] text-sm">
                    FCFA
                  </span>
                </div>
              </div>
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
          Comparez nos formules conçues pour votre véhicule. Des garanties essentielles au confort
          absolu du Tous Risques.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
        {TIERS.map((t) => {
          const active = form.tier === t.id;
          const isRecommended = !!t.recommended;
          return (
            <div
              key={t.id}
              onClick={() => update("tier", t.id)}
              className={`relative p-7 lg:p-8 rounded-3xl cursor-pointer transition-all ${
                isRecommended
                  ? "bg-white shadow-2xl shadow-[#ac3509]/10 border-2 border-[#ac3509]/20 lg:-translate-y-4"
                  : active
                  ? "bg-white ring-2 ring-[#ac3509] shadow-xl"
                  : "bg-white border border-transparent hover:shadow-xl hover:shadow-[#dfe3e7]/50"
              }`}
            >
              {isRecommended && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg"
                  style={{ backgroundImage: KINETIC }}
                >
                  RECOMMANDÉ
                </div>
              )}
              <div className="mb-7">
                <span
                  className="text-xs font-bold tracking-widest uppercase text-[#5e6473] px-3 py-1 rounded-full"
                  style={{ backgroundColor: t.badgeColor }}
                >
                  {t.badge}
                </span>
                <h3
                  className="text-2xl font-bold mt-4 text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  {t.title}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className={`text-4xl lg:text-5xl font-extrabold ${
                      isRecommended ? "text-[#ac3509]" : "text-[#171c1f]"
                    }`}
                    style={{ fontFamily: "Manrope, system-ui" }}
                  >
                    {fmt(t.monthly)} €
                  </span>
                  <span className="text-[#5e6473] text-sm">/mois</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {f.included ? (
                      <CheckCircle2
                        className="w-5 h-5 shrink-0"
                        style={{ color: isRecommended ? "#ac3509" : "#006972" }}
                      />
                    ) : (
                      <X className="w-5 h-5 text-[#8d7169]/40 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        f.included
                          ? f.bold
                            ? "font-semibold text-[#171c1f]"
                            : "text-[#171c1f]"
                          : "text-[#5e6473] line-through opacity-50"
                      }`}
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-4 rounded-2xl font-bold transition-all ${
                  active || isRecommended
                    ? "text-white shadow-xl"
                    : "bg-[#dfe3e7] text-[#171c1f] hover:bg-[#e4e9ed]"
                } ${isRecommended ? "py-5 text-lg" : ""}`}
                style={
                  active || isRecommended
                    ? { backgroundImage: KINETIC, boxShadow: "0 12px 24px rgba(172,53,9,0.3)" }
                    : undefined
                }
              >
                {active ? "Sélectionné" : isRecommended ? `Sélectionner ${t.title}` : "Choisir cette offre"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="mt-20 hidden lg:block overflow-hidden bg-[#f0f4f8] rounded-3xl p-1">
        <div className="bg-white rounded-[1.4rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f4f8]/50">
                <th
                  className="py-7 px-7 font-bold text-lg text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  Garanties détaillées
                </th>
                <th className="py-7 px-7 text-center font-bold text-[#171c1f]">Tiers</th>
                <th className="py-7 px-7 text-center font-bold text-[#171c1f]">Tiers Plus</th>
                <th className="py-7 px-7 text-center font-bold bg-[#ffdbd0]/30 text-[#ac3509]">
                  Tous Risques
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { label: "Responsabilité Civile & Défense", a: "check", b: "check", c: "check" },
                { label: "Assistance 24h/24 & 0km", a: "check", b: "check", c: "check" },
                { label: "Protection du Conducteur (1M€)", a: "Option", b: "check", c: "check" },
                { label: "Bris de Glace sans franchise", a: "—", b: "check", c: "check" },
                { label: "Dommages Électriques (Câbles, Batterie)", a: "—", b: "—", c: "check" },
                { label: "Effets personnels & Accessoires", a: "—", b: "Jusqu'à 500k FCFA", c: "Jusqu'à 3M FCFA" },
              ].map((row, idx) => (
                <tr key={idx} className={idx === 5 ? "" : "border-b border-[#eaeef2]"}>
                  <td className="py-5 px-7 font-semibold text-[#171c1f]">{row.label}</td>
                  <td className="py-5 px-7 text-center">
                    {row.a === "check" ? (
                      <Check className="w-5 h-5 text-[#006972] inline" />
                    ) : (
                      <span className="text-[#5e6473]">{row.a}</span>
                    )}
                  </td>
                  <td className="py-5 px-7 text-center">
                    {row.b === "check" ? (
                      <Check className="w-5 h-5 text-[#006972] inline" />
                    ) : (
                      <span className="text-[#5e6473]">{row.b}</span>
                    )}
                  </td>
                  <td className="py-5 px-7 text-center bg-[#ffdbd0]/10">
                    {row.c === "check" ? (
                      <Check className="w-5 h-5 text-[#ac3509] inline" />
                    ) : (
                      <span className="font-bold text-[#ac3509]">{row.c}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upsell banner */}
      <div className="mt-12 bg-[#e4e9ed] rounded-3xl p-7 flex flex-col md:flex-row items-center gap-7">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-[#171c1f] flex items-center justify-center">
          <Zap className="w-10 h-10 text-[#ff7043]" />
        </div>
        <div className="flex-grow text-center md:text-left">
          <h4
            className="text-xl font-bold mb-1 text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Spécial Véhicules Électriques
          </h4>
          <p className="text-[#5e6473] text-sm max-w-2xl">
            Toutes nos formules incluent l&apos;assistance panne d&apos;énergie et la protection de
            votre borne de recharge à domicile sans surcoût.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[10px] font-bold text-[#ac3509] border-2 border-white">
            +4k
          </div>
          <span className="text-xs font-bold text-[#59413a]">Déjà assurés chez nous</span>
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 4: PAYMENT ====================
function Step4Payment({
  form,
  update,
  selectedTier,
  annualHT,
  taxes,
  totalTTC,
  monthly,
  fallbackVehicleImage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  selectedTier: typeof TIERS[number];
  annualHT: number;
  taxes: number;
  totalTTC: number;
  monthly: number;
  fallbackVehicleImage?: string;
}) {
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
              active={form.payment === "company_account"}
              onClick={() => update("payment", "company_account")}
              icon={<Building2 className="w-7 h-7" />}
              title="Compte Entreprise"
              desc="Facturation centralisée pour votre flotte. Prélèvement Wave / OM automatique."
            />
            <PayCard
              active={form.payment === "card"}
              onClick={() => update("payment", "card")}
              icon={<CreditCard className="w-7 h-7" />}
              title="Carte Bancaire"
              desc="Visa, Mastercard, Wave ou OM. Paiement sécurisé et instantané."
            />
          </div>
        </div>

        <div className="p-7 bg-[#f0f4f8] rounded-2xl space-y-7">
          <h2
            className="text-xl font-bold text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui" }}
          >
            Informations de facturation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7 gap-y-5">
            <FieldGroup label="Raison sociale">
              <input
                type="text"
                placeholder="Velocity Dynamics SARL"
                value={form.raisonSociale}
                onChange={(e) => update("raisonSociale", e.target.value)}
                className="w-full bg-white border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ac3509]/40 font-medium"
              />
            </FieldGroup>
            <FieldGroup label="N° NINEA / RCCM">
              <input
                type="text"
                placeholder="0040842901"
                value={form.siret}
                onChange={(e) => update("siret", e.target.value)}
                className="w-full bg-white border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ac3509]/40 font-medium"
              />
            </FieldGroup>
            <div className="md:col-span-2">
              <FieldGroup label="Adresse de facturation">
                <input
                  type="text"
                  placeholder="Avenue Léopold Sédar Senghor, Dakar"
                  value={form.billingAddress}
                  onChange={(e) => update("billingAddress", e.target.value)}
                  className="w-full bg-white border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ac3509]/40 font-medium"
                />
              </FieldGroup>
            </div>
            <div className="md:col-span-2">
              <FieldGroup label="Notes (optionnel)">
                <Textarea
                  placeholder="Préférences, instructions particulières..."
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={2}
                  className="bg-white border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#ac3509]/40"
                />
              </FieldGroup>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[#00acbb]/10 rounded-xl border border-[#00acbb]/20">
            <ShieldCheck className="w-5 h-5 text-[#006972] shrink-0" />
            <p className="text-sm font-medium text-[#003a3f]">
              Vos factures seront envoyées chaque mois à l&apos;adresse email :{" "}
              <span className="underline">facturation@entreprise.sn</span>
            </p>
          </div>
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
                Formule {selectedTier.title}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-7">
            <Row label="Prime annuelle HT" value={`${fmt(annualHT)} FCFA`} />
            <Row label="Taxes & contributions (15%)" value={`${fmt(taxes)} FCFA`} />
            <Row label="Frais de dossier" value="OFFERT" valueColor="#006972" bold />
            <div className="pt-4 border-t border-dashed border-[#e0bfb6] flex justify-between items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#59413a] mb-1">
                  Total TTC / an
                </p>
                <p
                  className="text-3xl font-black text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui" }}
                >
                  {fmt(totalTTC)} FCFA
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#59413a]">Soit environ</p>
                <p className="text-base font-bold text-[#ac3509]">
                  {fmt(monthly)} <span className="text-xs font-normal text-[#171c1f]">FCFA/mois</span>
                </p>
              </div>
            </div>
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
                <DocCard icon={<FileText className="w-5 h-5" />} bg="#ffdbd0" color="#ac3509" title="Attestation Provisoire" meta="PDF • 1.2 MB" />
                <DocCard icon={<Gavel className="w-5 h-5" />} bg="#dde2f3" color="#585e6c" title="Conditions Générales" meta="PDF • 4.8 MB" />
              </div>
              <div className="mt-7 pt-5 border-t border-[#dfe3e7]">
                <p className="text-[11px] text-[#59413a] leading-relaxed italic">
                  Une copie de ces documents vous a été envoyée par email.
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
