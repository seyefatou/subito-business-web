'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Shield,
  Car,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  Search,
  Calendar as CalendarIcon,
  Eye,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  Download,
  Plus,
  Hash,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Select imports removed — all selects converted to searchable Combobox (Popover + Command)
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
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
  InsuranceReferenceItem,
  InsuranceReferenceType,
  CreateInsuranceSimulationDto,
  InsuranceSimulationResponse,
  CreateInsuranceContractDto,
  InsuranceContractResponse,
  EmployeeResponse,
  CreateEmployeeDto,
  DepartmentResponse,
} from "@/lib/api";
import EmployeeForm from "@/components/employees/EmployeeForm";

// ==================== TYPES ====================
interface StepDef {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const simulationSteps: StepDef[] = [
  { id: 1, title: "Produit", icon: Shield },
  { id: 2, title: "Vehicule", icon: Car },
  { id: 3, title: "Garanties", icon: FileText },
  { id: 4, title: "Confirmation", icon: Check },
];

interface SimulationFormData {
  productCode: string;
  packCode: string;
  durationCode: string;
  countryCode: string;
  energyCode: string;
  fiscalPower: number;
  numberOfPlaces: number;
  registrationNumber: string;
  replacementCost: number;
  marketValue: number;
  dateOfFirstRegistration: string;
  brandCode: string;
  modelCode: string;
  carTypeCode: string;
  otherBrand: string;
  otherModel: string;
  coverages: Array<{ code: string; option: string | null }>;
  bonus: number;
  malus: number;
  commercialReduction: number;
  discountCode: string;
  customerId: number | null;
}

const initialSimulationForm: SimulationFormData = {
  productCode: '',
  packCode: 'PACK_BASE',
  durationCode: '',
  countryCode: 'SN',
  energyCode: '',
  fiscalPower: 5,
  numberOfPlaces: 5,
  registrationNumber: '',
  replacementCost: 0,
  marketValue: 0,
  dateOfFirstRegistration: '',
  brandCode: '',
  modelCode: '',
  carTypeCode: '',
  otherBrand: '',
  otherModel: '',
  coverages: [{ code: '2', option: null }, { code: '89', option: null }],
  bonus: 0,
  malus: 0,
  commercialReduction: 0,
  discountCode: '',
  customerId: null,
};

const contractStatusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expire", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annule", color: "bg-slate-100 text-slate-700" },
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
};

// ==================== MAIN COMPONENT ====================
export default function Insurance() {
  const [activeTab, setActiveTab] = useState("simulation");
  const [selectedSimulationId, setSelectedSimulationId] = useState<number | null>(null);

  const goToContract = (simulationId: number) => {
    setSelectedSimulationId(simulationId);
    setActiveTab("contract");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl gradient-subito">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assurance</h1>
          <p className="text-slate-500">Gestion des assurances automobile AXA</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="simulation">Nouvelle simulation</TabsTrigger>
          <TabsTrigger value="simulations">Mes simulations</TabsTrigger>
          <TabsTrigger value="contract">Nouveau contrat</TabsTrigger>
          <TabsTrigger value="contracts">Mes contrats</TabsTrigger>
        </TabsList>

        <TabsContent value="simulation" className="mt-6">
          <NewSimulationForm onSuccess={() => setActiveTab("simulations")} onCreateContract={goToContract} />
        </TabsContent>

        <TabsContent value="simulations" className="mt-6">
          <SimulationsList onCreateContract={goToContract} />
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <NewContractForm onSuccess={() => setActiveTab("contracts")} prefilledSimulationId={selectedSimulationId} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <ContractsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== HELPER: useRefData ====================
function useRefData(type: InsuranceReferenceType, params?: { productCode?: string; categoryCode?: string }) {
  const { data } = useQuery({
    queryKey: ['insurance-ref', type, params],
    queryFn: () => api.insurance.getReference(type, params),
  });
  const raw = data?.data || data;
  if (!Array.isArray(raw)) return [];
  // Normalize: API can return strings or objects
  return raw.map((item: any) => {
    if (typeof item === 'string') return { code: item, name: item } as InsuranceReferenceItem;
    return item as InsuranceReferenceItem;
  });
}

// Deduplicate durations (API returns same code for different categories)
function useUniqueDurations() {
  const all = useRefData('durations');
  const seen = new Map<string, InsuranceReferenceItem>();
  for (const d of all) {
    const key = d.code || '';
    if (key && !seen.has(key)) seen.set(key, d);
  }
  return Array.from(seen.values());
}

// ==================== NEW SIMULATION FORM ====================
function NewSimulationForm({ onSuccess, onCreateContract }: { onSuccess: () => void; onCreateContract: (simulationId: number) => void }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SimulationFormData>(initialSimulationForm);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<InsuranceSimulationResponse | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(''); // separate from packCode — used to filter products
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packSearch, setPackSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [durationSearch, setDurationSearch] = useState('');
  const [durationOpen, setDurationOpen] = useState(false);
  const [carTypeSearch, setCarTypeSearch] = useState('');
  const [carTypeOpen, setCarTypeOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [energySearch, setEnergySearch] = useState('');
  const [energyOpen, setEnergyOpen] = useState(false);

  // Packs — fixed values (no API endpoint)
  const packs = [
    { code: 'PACK_BASE', label: 'Pack Base' },
  ];

  // Reference data — category filters products
  const categories = useRefData('categories');
  const selectedCategory = categories.find(c => c.code === categoryFilter);
  const categoryId = selectedCategory?.id;

  // Products fetched only when a category is selected
  const { data: productsRaw } = useQuery({
    queryKey: ['insurance-ref', 'products', categoryId],
    queryFn: () => api.insurance.getReference('products', { categoryCode: categoryId ? String(categoryId) : undefined }),
    enabled: !!categoryId,
  });
  const products: Array<{ id: string; kindLabel: string; branchRiskLabel: string; kind: string; branchRisk: string; usageLabel?: string; [k: string]: unknown }> = (() => {
    const raw = (productsRaw as any)?.data || productsRaw;
    if (Array.isArray(raw)) return raw;
    return [];
  })();
  // Deduplicate products by kindLabel
  const uniqueProducts = (() => {
    const seen = new Map<string, typeof products[0]>();
    for (const p of products) {
      const key = p.id || `${p.branchRisk}-${p.kind}`;
      if (!seen.has(key)) seen.set(key, p);
    }
    return Array.from(seen.values());
  })();

  const carTypes = useRefData('car-types');
  const brands = useRefData('brands');
  const energies = useRefData('energies');
  const durations = useUniqueDurations();
  const countries = useRefData('countries');
  const coveragesRef = useRefData('coverages', {
    productCode: formData.productCode || undefined,
    categoryCode: categoryId ? String(categoryId) : undefined,
  });
  const discounts = useRefData('discounts');

  const updateField = <K extends keyof SimulationFormData>(key: K, value: SimulationFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Garanties obligatoires (RC + Carte digitale)
  const REQUIRED_COVERAGES = ['2', '89'];

  const toggleCoverage = (rawCode: string | number) => {
    const code = String(rawCode);
    // Ne pas permettre de décocher les garanties obligatoires
    if (REQUIRED_COVERAGES.includes(code) && formData.coverages.find(c => c.code === code)) return;
    setFormData(prev => {
      const exists = prev.coverages.find(c => c.code === code);
      if (exists) {
        return { ...prev, coverages: prev.coverages.filter(c => c.code !== code) };
      }
      return { ...prev, coverages: [...prev.coverages, { code, option: null }] };
    });
  };

  const updateCoverageOption = (code: string, option: string | null) => {
    setFormData(prev => ({
      ...prev,
      coverages: prev.coverages.map(c => c.code === code ? { ...c, option } : c),
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateInsuranceSimulationDto) => api.insurance.createSimulation(data),
    onSuccess: (res) => {
      const raw = (res as any)?.data || res;
      // API returns { simulation: {...}, axaResponse: {...} }
      const sim = raw?.simulation || raw;
      setResult(sim);
      setSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      queryClient.invalidateQueries({ queryKey: ['insurance-simulations'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la creation de la simulation");
    },
  });

  const handleSubmit = () => {
    // Build payload matching exact Postman format
    const payload: Record<string, unknown> = {
      productCode: formData.productCode,
      packCode: formData.packCode,
      durationCode: formData.durationCode,
      countryCode: formData.countryCode,
      vehicle: {
        energyCode: formData.energyCode,
        fiscalPower: formData.fiscalPower,
        numberOfPlaces: formData.numberOfPlaces,
        registrationNumber: formData.registrationNumber,
        replacementCost: formData.replacementCost,
        marketValue: formData.marketValue,
        dateOfFirstRegistration: formData.dateOfFirstRegistration,
        brandCode: formData.brandCode,
        modelCode: formData.brandCode === 'ZZ' ? 'ZZ' : formData.modelCode,
        carTypeCode: formData.carTypeCode,
        ...(formData.brandCode === 'ZZ' ? { otherBrand: formData.otherBrand, otherModel: formData.otherModel } : {}),
      },
      coverages: formData.coverages.map(c => ({ code: String(c.code), option: c.option || null })),
      bonus: formData.bonus || 0,
      malus: formData.malus || 0,
      commercialReduction: formData.commercialReduction || 0,
      discountCode: formData.discountCode || '0',
    };
    // Only add optional fields if they have values
    if (formData.customerId) payload.customerId = formData.customerId;
    console.log('[Insurance] Simulation payload:', JSON.stringify(payload, null, 2));
    createMutation.mutate(payload as unknown as CreateInsuranceSimulationDto);
  };

  const handleNext = () => setCurrentStep(s => Math.min(s + 1, 4));
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  const canNext = (): boolean => {
    switch (currentStep) {
      case 1: return !!categoryFilter && !!formData.productCode && !!formData.packCode && !!formData.durationCode && !!formData.countryCode;
      case 2: {
        const regValid = !!formData.registrationNumber && /^[a-zA-Z0-9-]+$/.test(formData.registrationNumber);
        const valuesValid = formData.replacementCost <= 1000000000
          && (formData.marketValue === 0 || formData.replacementCost === 0 || formData.marketValue >= formData.replacementCost);
        const brandValid = formData.brandCode === 'ZZ' ? (!!formData.otherBrand && !!formData.otherModel) : (!!formData.brandCode && !!formData.modelCode);
        return !!formData.carTypeCode && !!formData.energyCode && regValid && valuesValid && !!formData.dateOfFirstRegistration && brandValid;
      }
      case 3: return formData.coverages.length > 0;
      default: return true;
    }
  };

  if (success && result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        <div className="w-20 h-20 rounded-full gradient-subito flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Simulation creee !</h2>
        <p className="text-slate-500 mb-4">
          Simulation #{(result as any).simulationId}
        </p>

        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Prime brute</span>
            <span className="font-medium">{Math.round((result as any).grossPrime || 0).toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Taxes</span>
            <span className="font-medium">{Math.round((result as any).taxe || 0).toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Frais de police</span>
            <span className="font-medium">{Math.round((result as any).policyCost || 0).toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Prime nette</span>
            <span className="font-medium">{Math.round((result as any).netPrime || 0).toLocaleString()} FCFA</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between">
            <span className="font-semibold text-slate-800">Total</span>
            <span className="text-xl font-bold text-orange-600">{Math.round((result as any).totalPrime || 0).toLocaleString()} FCFA</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => { setSuccess(false); setResult(null); setFormData(initialSimulationForm); setCurrentStep(1); }}>
            Nouvelle simulation
          </Button>
          <Button variant="outline" onClick={onSuccess}>
            Voir mes simulations
          </Button>
          <Button className="gradient-subito text-white border-0" onClick={() => onCreateContract((result as any).simulationId)}>
            <FileText className="w-4 h-4 mr-2" />
            Creer le contrat
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {simulationSteps.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep >= step.id ? 'gradient-subito text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs ${currentStep >= step.id ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                {step.title}
              </span>
            </div>
            {i < simulationSteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-orange-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white text-slate-800 rounded-2xl border border-slate-200 p-6 space-y-5"
        >
          {/* Step 1: Produit */}
          {currentStep === 1 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Produit d&apos;assurance</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Categorie — filtre les produits (pas envoyee dans le payload) */}
                <div className="space-y-2">
                  <Label>Categorie *</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {categoryFilter
                          ? (categories.find(c => c.code === categoryFilter)?.name || categories.find(c => c.code === categoryFilter)?.label || categoryFilter)
                          : <span className="text-muted-foreground">Selectionner une categorie</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher une categorie..." value={categorySearch} onValueChange={setCategorySearch} />
                        <CommandList>
                          <CommandEmpty>Aucune categorie trouvee</CommandEmpty>
                          <CommandGroup>
                            {categories.filter(c => (c.name || c.label || c.code || '').toLowerCase().includes(categorySearch.toLowerCase())).map(c => (
                              <CommandItem
                                key={c.code}
                                onSelect={() => {
                                  if (c.code) setCategoryFilter(c.code);
                                  updateField('productCode', ''); // reset produit quand categorie change
                                  setCategoryOpen(false);
                                  setCategorySearch('');
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${categoryFilter === c.code ? 'opacity-100' : 'opacity-0'}`} />
                                {c.name || c.label || c.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Produit — charge selon la categorie selectionnee */}
                <div className="space-y-2">
                  <Label>Produit *</Label>
                  <Popover open={productOpen} onOpenChange={v => categoryFilter && setProductOpen(v)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!categoryFilter}>
                        {formData.productCode
                          ? (() => { const p = uniqueProducts.find(p => ((p as any).tarifSubTarif || p.id) === formData.productCode); return p ? `${p.kindLabel} — ${p.usageLabel || p.branchRiskLabel}` : formData.productCode; })()
                          : <span className="text-muted-foreground">{categoryFilter ? "Selectionner un produit" : "Choisir une categorie d'abord"}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un produit..." value={productSearch} onValueChange={setProductSearch} />
                        <CommandList>
                          <CommandEmpty>Aucun produit trouve</CommandEmpty>
                          <CommandGroup>
                            {uniqueProducts.filter(p => `${p.kindLabel} ${p.usageLabel || ''} ${p.branchRiskLabel || ''}`.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                              <CommandItem
                                key={p.id}
                                onSelect={() => { updateField('productCode', (p as any).tarifSubTarif || p.id); setProductOpen(false); setProductSearch(''); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.productCode === ((p as any).tarifSubTarif || p.id) ? 'opacity-100' : 'opacity-0'}`} />
                                {p.kindLabel} — {p.usageLabel || p.branchRiskLabel}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Pack */}
                <div className="space-y-2">
                  <Label>Pack *</Label>
                  <Popover open={packOpen} onOpenChange={setPackOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.packCode
                          ? (packs.find(p => p.code === formData.packCode)?.label || formData.packCode)
                          : <span className="text-muted-foreground">Selectionner un pack</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={packSearch} onValueChange={setPackSearch} />
                        <CommandList>
                          <CommandEmpty>Aucun pack trouve</CommandEmpty>
                          <CommandGroup>
                            {packs.filter(p => p.label.toLowerCase().includes(packSearch.toLowerCase())).map(p => (
                              <CommandItem key={p.code} onSelect={() => { if (p.code) updateField('packCode', p.code); setPackOpen(false); setPackSearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${formData.packCode === p.code ? 'opacity-100' : 'opacity-0'}`} />
                                {p.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Duree *</Label>
                  <Popover open={durationOpen} onOpenChange={setDurationOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.durationCode
                          ? (durations.find(d => d.code === formData.durationCode)?.label || durations.find(d => d.code === formData.durationCode)?.name || formData.durationCode)
                          : <span className="text-muted-foreground">Selectionner une duree</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={durationSearch} onValueChange={setDurationSearch} />
                        <CommandList>
                          <CommandEmpty>Aucune duree trouvee</CommandEmpty>
                          <CommandGroup>
                            {durations.filter(d => (d.name || d.label || d.code || '').toLowerCase().includes(durationSearch.toLowerCase())).map(d => (
                              <CommandItem key={d.code} onSelect={() => { if (d.code) updateField('durationCode', d.code); setDurationOpen(false); setDurationSearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${formData.durationCode === d.code ? 'opacity-100' : 'opacity-0'}`} />
                                {d.name || d.label || d.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Pays *</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.countryCode
                          ? (countries.find(c => c.code === formData.countryCode)?.name || countries.find(c => c.code === formData.countryCode)?.label || formData.countryCode)
                          : <span className="text-muted-foreground">Selectionner un pays</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un pays..." value={countrySearch} onValueChange={setCountrySearch} />
                        <CommandList>
                          <CommandEmpty>Aucun pays trouve</CommandEmpty>
                          <CommandGroup>
                            {countries.filter(c => (c.name || c.label || c.code || '').toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                              <CommandItem
                                key={c.code}
                                onSelect={() => { if (c.code) updateField('countryCode', c.code); setCountryOpen(false); setCountrySearch(''); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.countryCode === c.code ? 'opacity-100' : 'opacity-0'}`} />
                                {c.name || c.label || c.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Code de reduction</Label>
                  <Popover open={discountOpen} onOpenChange={setDiscountOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.discountCode
                          ? (discounts.find(d => d.code === formData.discountCode)?.name || discounts.find(d => d.code === formData.discountCode)?.label || formData.discountCode)
                          : <span className="text-muted-foreground">Aucun</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un code..." value={discountSearch} onValueChange={setDiscountSearch} />
                        <CommandList>
                          <CommandEmpty>Aucun code trouve</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => { updateField('discountCode', ''); setDiscountOpen(false); setDiscountSearch(''); }}>
                              <Check className={`mr-2 h-4 w-4 ${!formData.discountCode ? 'opacity-100' : 'opacity-0'}`} />
                              Aucun
                            </CommandItem>
                            {discounts.filter(d => (d.name || d.label || d.code || '').toLowerCase().includes(discountSearch.toLowerCase())).map(d => (
                              <CommandItem
                                key={d.code}
                                onSelect={() => { if (d.code) updateField('discountCode', d.code); setDiscountOpen(false); setDiscountSearch(''); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.discountCode === d.code ? 'opacity-100' : 'opacity-0'}`} />
                                {d.name || d.label || d.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Vehicule */}
          {currentStep === 2 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Informations du vehicule</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de vehicule *</Label>
                  <Popover open={carTypeOpen} onOpenChange={setCarTypeOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.carTypeCode
                          ? (carTypes.find(c => c.code === formData.carTypeCode)?.name || carTypes.find(c => c.code === formData.carTypeCode)?.label || formData.carTypeCode)
                          : <span className="text-muted-foreground">Type de vehicule</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={carTypeSearch} onValueChange={setCarTypeSearch} />
                        <CommandList>
                          <CommandEmpty>Aucun type trouve</CommandEmpty>
                          <CommandGroup>
                            {carTypes.filter(c => (c.name || c.label || c.code || '').toLowerCase().includes(carTypeSearch.toLowerCase())).map(c => (
                              <CommandItem key={c.code} onSelect={() => { if (c.code) updateField('carTypeCode', c.code); setCarTypeOpen(false); setCarTypeSearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${formData.carTypeCode === c.code ? 'opacity-100' : 'opacity-0'}`} />
                                {c.name || c.label || c.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Marque *</Label>
                  <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.brandCode
                          ? formData.brandCode === 'ZZ'
                            ? <span className="text-amber-600">Autre</span>
                            : (() => {
                                const found = brands.find(b => (b.brandCode || b.code) === formData.brandCode);
                                return found?.brandLabel || found?.name || formData.brandCode;
                              })()
                          : <span className="text-muted-foreground">Selectionner une marque</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher une marque..." value={brandSearch} onValueChange={setBrandSearch} />
                        <CommandList>
                          <CommandEmpty>Aucune marque trouvee</CommandEmpty>
                          <CommandGroup>
                            {(() => {
                              const seen = new Set<string>();
                              return brands.filter(b => {
                                const code = b.brandCode || b.code;
                                if (!code || seen.has(code)) return false;
                                seen.add(code);
                                return (b.brandLabel || b.name || code || '').toLowerCase().includes(brandSearch.toLowerCase());
                              }).map(b => (
                                <CommandItem
                                  key={b.brandCode || b.code}
                                  onSelect={() => {
                                    setFormData(prev => ({ ...prev, brandCode: b.brandCode || b.code || '', modelCode: '', otherBrand: '', otherModel: '' }));
                                    setBrandOpen(false);
                                    setBrandSearch('');
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.brandCode === (b.brandCode || b.code) && formData.brandCode !== 'ZZ' ? 'opacity-100' : 'opacity-0'}`} />
                                  <span className="font-medium">{b.brandLabel || b.name || b.code}</span>
                                </CommandItem>
                              ));
                            })()}
                          </CommandGroup>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, brandCode: 'ZZ', modelCode: '', otherBrand: '', otherModel: '' }));
                                setBrandOpen(false);
                                setBrandSearch('');
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${formData.brandCode === 'ZZ' ? 'opacity-100' : 'opacity-0'}`} />
                              <span className="font-medium text-amber-600">Autre (marque introuvable)</span>
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Modele *</Label>
                  {formData.brandCode === 'ZZ' ? (
                    <div className="space-y-2">
                      <Input
                        value={formData.otherBrand}
                        onChange={e => updateField('otherBrand', e.target.value)}
                        placeholder="Saisir la marque (ex: Kawasaki)"
                      />
                      <Input
                        value={formData.otherModel}
                        onChange={e => updateField('otherModel', e.target.value)}
                        placeholder="Saisir le modele (ex: Z660)"
                      />
                    </div>
                  ) : (
                    <Popover open={modelOpen} onOpenChange={setModelOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!formData.brandCode || formData.brandCode === 'ZZ'}>
                          {formData.modelCode
                            ? (() => {
                                const found = brands.find(b => (b.brandCode || b.code) === formData.brandCode && b.typeCode === formData.modelCode);
                                return found?.typeLabel || found?.name || formData.modelCode;
                              })()
                            : <span className="text-muted-foreground">{formData.brandCode ? 'Selectionner un modele' : 'Choisir une marque d\'abord'}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher un modele..." value={modelSearch} onValueChange={setModelSearch} />
                          <CommandList>
                            <CommandEmpty>Aucun modele trouve</CommandEmpty>
                            <CommandGroup>
                              {brands
                                .filter(b => (b.brandCode || b.code) === formData.brandCode && (b.typeLabel || b.typeCode || '').toLowerCase().includes(modelSearch.toLowerCase()))
                                .map(b => (
                                  <CommandItem
                                    key={b.typeCode || b.id}
                                    onSelect={() => {
                                      setFormData(prev => ({ ...prev, modelCode: b.typeCode || '' }));
                                      setModelOpen(false);
                                      setModelSearch('');
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${formData.modelCode === b.typeCode ? 'opacity-100' : 'opacity-0'}`} />
                                    <span className="font-medium">{b.typeLabel || b.typeCode}</span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Energie *</Label>
                  <Popover open={energyOpen} onOpenChange={setEnergyOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {formData.energyCode
                          ? (energies.find(e => e.code === formData.energyCode)?.name || energies.find(e => e.code === formData.energyCode)?.label || formData.energyCode)
                          : <span className="text-muted-foreground">Carburant</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={energySearch} onValueChange={setEnergySearch} />
                        <CommandList>
                          <CommandEmpty>Aucune energie trouvee</CommandEmpty>
                          <CommandGroup>
                            {energies.filter(e => (e.name || e.label || e.code || '').toLowerCase().includes(energySearch.toLowerCase())).map(e => (
                              <CommandItem key={e.code} onSelect={() => { if (e.code) updateField('energyCode', e.code); setEnergyOpen(false); setEnergySearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${formData.energyCode === e.code ? 'opacity-100' : 'opacity-0'}`} />
                                {e.name || e.label || e.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Immatriculation *</Label>
                  <Input
                    value={formData.registrationNumber}
                    onChange={e => updateField('registrationNumber', e.target.value.toUpperCase())}
                    placeholder="DK-1234-AB"
                  />
                  <p className="text-xs text-slate-500">Lettres et chiffres uniquement</p>
                </div>

                <div className="space-y-2">
                  <Label>Puissance fiscale</Label>
                  <Input
                    type="number"
                    value={formData.fiscalPower}
                    onChange={e => updateField('fiscalPower', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre de places</Label>
                  <Input
                    type="number"
                    value={formData.numberOfPlaces}
                    onChange={e => updateField('numberOfPlaces', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date de 1ere immatriculation</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dateOfFirstRegistration
                          ? format(new Date(formData.dateOfFirstRegistration), 'dd/MM/yyyy', { locale: fr })
                          : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dateOfFirstRegistration ? new Date(formData.dateOfFirstRegistration) : undefined}
                        onSelect={(d) => {
                          if (d) updateField('dateOfFirstRegistration', format(d, 'yyyy-MM-dd'));
                          setDatePickerOpen(false);
                        }}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Valeur a neuf (FCFA)</Label>
                  <Input
                    type="number"
                    value={formData.replacementCost || ''}
                    onChange={e => {
                      const v = Number(e.target.value);
                      updateField('replacementCost', v > 1000000000 ? 1000000000 : v);
                    }}
                    placeholder="5000000"
                    max={1000000000}
                  />
                  {formData.replacementCost > 1000000000 && (
                    <p className="text-xs text-red-500">Maximum 1 000 000 000 FCFA</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Valeur venale (FCFA)</Label>
                  <Input
                    type="number"
                    value={formData.marketValue || ''}
                    onChange={e => updateField('marketValue', Number(e.target.value))}
                    placeholder="4000000"
                  />
                  {formData.marketValue > 0 && formData.replacementCost > 0 && formData.marketValue < formData.replacementCost && (
                    <p className="text-xs text-red-500">La valeur venale doit etre superieure ou egale a la valeur a neuf</p>
                  )}
                </div>
              </div>

            </>
          )}

          {/* Step 3: Garanties */}
          {currentStep === 3 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Garanties & options</h3>

              <div className="space-y-3">
                {/* Garanties obligatoires */}
                <Label>Garanties obligatoires</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    const catId = categoryId ? Number(categoryId) : null;
                    const filtered = catId
                      ? coveragesRef.filter(cov => (cov as any).categoryId === catId)
                      : coveragesRef;
                    const seen = new Set<string>();
                    return filtered
                      .filter(cov => {
                        const key = String(cov.code);
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return REQUIRED_COVERAGES.includes(key);
                      })
                      .sort((a, b) => ((a as any).orderGuarantee || 0) - ((b as any).orderGuarantee || 0))
                      .map(cov => {
                        const covCode = String(cov.code);
                        const covLabel = (cov as any).description || cov.name || cov.label || covCode;
                        return (
                          <div key={covCode} className="p-4 rounded-xl border-2 border-orange-400 bg-orange-50">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border-2 border-orange-500 bg-orange-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 text-sm">{covLabel}</p>
                                <p className="text-xs text-orange-600">Obligatoire</p>
                              </div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>

                {/* Garanties optionnelles */}
                <Label className="pt-2">Garanties optionnelles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    const catId = categoryId ? Number(categoryId) : null;
                    const filtered = catId
                      ? coveragesRef.filter(cov => (cov as any).categoryId === catId)
                      : coveragesRef;
                    const seen = new Set<string>();
                    return filtered
                      .filter(cov => {
                        const key = String(cov.code);
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return !REQUIRED_COVERAGES.includes(key);
                      })
                      .sort((a, b) => ((a as any).orderGuarantee || 0) - ((b as any).orderGuarantee || 0))
                      .map(cov => {
                        const covCode = String(cov.code);
                        const covLabel = (cov as any).description || cov.name || cov.label || covCode;
                        const selected = formData.coverages.find(c => c.code === covCode);
                        const covOptions = (cov as any).options as Array<{ key: string; value: string; label: string }> | null;
                        const hasOptions = covOptions && covOptions.length > 0;
                        return (
                          <div
                            key={covCode}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              selected ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => toggleCoverage(covCode)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selected ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 text-sm">{covLabel}</p>
                                <p className="text-xs text-slate-500">Code: {covCode}</p>
                              </div>
                            </div>
                            {selected && hasOptions && (
                              <div className="mt-3" onClick={e => e.stopPropagation()}>
                                <Label className="text-xs">Option de garantie</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full mt-1 justify-between text-left font-normal text-sm border-orange-200 hover:border-orange-400 hover:bg-orange-50">
                                      <span className={selected.option ? 'text-slate-800' : 'text-muted-foreground'}>
                                        {selected.option
                                          ? (() => {
                                              const found = covOptions!.find(o => o.value === selected.option);
                                              return found ? `${found.label}${found.value !== '0000' ? ` — ${Number(found.value).toLocaleString()} FCFA` : ''}` : selected.option;
                                            })()
                                          : 'Aucune option'}
                                      </span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Rechercher une option..." className="text-xs h-8" />
                                      <CommandList className="max-h-[200px]">
                                        <CommandEmpty className="text-xs py-2">Aucune option trouvee</CommandEmpty>
                                        <CommandGroup>
                                          <CommandItem className="text-xs py-1.5" onSelect={() => updateCoverageOption(covCode, null)}>
                                            <Check className={`mr-1.5 h-3 w-3 ${!selected.option ? 'opacity-100' : 'opacity-0'}`} />
                                            <span className="text-slate-500">Aucune option</span>
                                          </CommandItem>
                                          {covOptions!.map((opt, idx) => (
                                            <CommandItem
                                              className="text-xs py-1.5"
                                              key={`${opt.value}-${idx}`}
                                              onSelect={() => updateCoverageOption(covCode, opt.value)}
                                            >
                                              <Check className={`mr-1.5 h-3 w-3 ${selected.option === opt.value ? 'opacity-100' : 'opacity-0'}`} />
                                              <span className="font-medium">{opt.label}</span>
                                              {opt.value !== '0000' && <span className="ml-auto text-orange-600 font-semibold">{Number(opt.value).toLocaleString()} FCFA</span>}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Bonus (%)</Label>
                  <Input type="number" value={formData.bonus} onChange={e => updateField('bonus', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Malus (%)</Label>
                  <Input type="number" value={formData.malus} onChange={e => updateField('malus', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Reduction commerciale (%)</Label>
                  <Input type="number" value={formData.commercialReduction} onChange={e => updateField('commercialReduction', Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Recapitulatif de la simulation</h3>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Produit</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Produit:</span> <span className="font-medium">{formData.productCode}</span></div>
                    <div><span className="text-slate-500">Pack:</span> <span className="font-medium">{formData.packCode || '—'}</span></div>
                    <div><span className="text-slate-500">Duree:</span> <span className="font-medium">{formData.durationCode}</span></div>
                    <div><span className="text-slate-500">Pays:</span> <span className="font-medium">{formData.countryCode}</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Vehicule</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Type:</span> <span className="font-medium">{formData.carTypeCode}</span></div>
                    <div><span className="text-slate-500">Marque:</span> <span className="font-medium">{formData.brandCode === 'ZZ' ? `${formData.otherBrand} — ${formData.otherModel}` : (() => { const b = brands.find(x => x.brandCode === formData.brandCode && x.typeCode === formData.modelCode); return b ? `${b.brandLabel} — ${b.typeLabel}` : `${formData.brandCode} / ${formData.modelCode}`; })()}</span></div>
                    <div><span className="text-slate-500">Immat:</span> <span className="font-medium">{formData.registrationNumber}</span></div>
                    <div><span className="text-slate-500">Energie:</span> <span className="font-medium">{formData.energyCode}</span></div>
                    <div><span className="text-slate-500">Valeur neuf:</span> <span className="font-medium">{formData.replacementCost?.toLocaleString()} FCFA</span></div>
                    <div><span className="text-slate-500">Valeur venale:</span> <span className="font-medium">{formData.marketValue?.toLocaleString()} FCFA</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Garanties ({formData.coverages.length})</p>
                  {formData.coverages.map(c => {
                    const ref = coveragesRef.find(r => String(r.code) === c.code);
                    const label = (ref as any)?.description || ref?.name || ref?.label || c.code;
                    const optLabel = c.option && ref?.options
                      ? (() => {
                          const found = ref.options!.find(o => o.value === c.option);
                          return found ? `${found.label} — ${Number(found.value).toLocaleString()} FCFA` : c.option;
                        })()
                      : null;
                    return (
                      <div key={c.code} className="flex justify-between text-sm">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-medium">{optLabel || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canNext()} className="gradient-subito text-white border-0 gap-2">
            Suivant <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gradient-subito text-white border-0 gap-2">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Calculer le tarif
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== SIMULATIONS LIST ====================
function SimulationsList({ onCreateContract }: { onCreateContract: (simulationId: number) => void }) {
  const [page, setPage] = useState(1);
  const [selectedSim, setSelectedSim] = useState<InsuranceSimulationResponse | null>(null);
  const coveragesRef = useRefData('coverages');
  const brands = useRefData('brands');
  const energies = useRefData('energies');
  const durations = useRefData('durations');
  const countries = useRefData('countries');

  const { data: response, isLoading } = useQuery({
    queryKey: ['insurance-simulations', page],
    queryFn: () => api.insurance.listSimulations(page, 20),
  });

  const raw = (response as any)?.data || response;
  // API peut retourner { data: [...], meta: {...} } ou directement un tableau
  const simList = raw?.data || raw?.items || (Array.isArray(raw) ? raw : []);
  const simulations: InsuranceSimulationResponse[] = Array.isArray(simList) ? simList : [];
  const meta = raw?.meta || { page: 1, totalPages: 1, total: 0 };
  console.log('[Simulations] raw:', raw, 'simulations:', simulations);

  const handleDownloadPdf = async (simulationId: number) => {
    try {
      toast.info("Telechargement du devis en cours...");
      const blob = await api.insurance.downloadSimulationPdf(simulationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devis-simulation-${simulationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Devis telecharge !");
    } catch (err: any) {
      console.error('[PDF Download Error] simulationId:', simulationId, 'message:', err?.message, err);
      toast.error(err?.message || "Erreur lors du telechargement");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600">Aucune simulation</h3>
        <p className="text-sm text-slate-400">Creez votre premiere simulation tarifaire</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-left">Prime totale</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {simulations.map(sim => {
                const status = (sim.status || 'PENDING').toUpperCase();
                const isPending = status === 'PENDING';
                return (
                <tr key={sim.simulationId || (sim as any).id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">#{sim.simulationId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{sim.productCode}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                    {Math.round(sim.totalPrime || 0).toLocaleString()} FCFA
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge className={isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                      {isPending ? 'En attente' : status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {sim.createdAt ? format(new Date(sim.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedSim(sim)}>
                        <Eye className="w-3 h-3 mr-1" />
                        Voir
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadPdf(sim.simulationId)}>
                        <Download className="w-3 h-3 mr-1" />
                        Devis PDF
                      </Button>
                      {isPending && (
                        <Button size="sm" className="text-xs gradient-subito text-white border-0" onClick={() => onCreateContract(sim.simulationId)}>
                          Creer contrat
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{meta.total} simulation(s)</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">{page} / {meta.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog details simulation */}
      <Dialog open={!!selectedSim} onOpenChange={(open) => { if (!open) setSelectedSim(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Simulation #{selectedSim?.simulationId}
            </DialogTitle>
          </DialogHeader>

          {selectedSim && (() => {
            const sim = selectedSim;
            const vd = (sim.vehicleData || (sim as any).vehicle) as Record<string, string> | undefined;
            const status = (sim.status || 'PENDING').toUpperCase();
            const isPending = status === 'PENDING';
            const brandRef = vd?.brandCode ? brands.find(b => String(b.code) === String(vd.brandCode)) : null;
            const energyRef = vd?.energyCode ? energies.find(e => String(e.code) === String(vd.energyCode)) : null;
            const durationRef = durations.find(d => String(d.code) === String(sim.durationCode));
            const countryRef = countries.find(c => String(c.code) === String(sim.countryCode));

            return (
              <div className="space-y-6">
                {/* Statut et date */}
                <div className="flex items-center justify-between">
                  <Badge className={isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                    {isPending ? 'En attente' : status}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {sim.createdAt ? format(new Date(sim.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                  </span>
                </div>

                {/* Infos produit */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">Produit</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Code produit</span>
                      <p className="font-medium text-slate-800">{sim.productCode}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Pack</span>
                      <p className="font-medium text-slate-800">{sim.packCode}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Duree</span>
                      <p className="font-medium text-slate-800">{(durationRef as any)?.description || durationRef?.name || durationRef?.label || sim.durationCode}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Pays</span>
                      <p className="font-medium text-slate-800">{(countryRef as any)?.description || countryRef?.name || countryRef?.label || sim.countryCode}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicule */}
                {vd && (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      <Car className="w-4 h-4" /> Vehicule
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Marque</span>
                        <p className="font-medium text-slate-800">{vd.brandCode === 'ZZ' ? `${vd.otherBrand || ''} — ${vd.otherModel || ''}` : ((brandRef as any)?.description || brandRef?.name || brandRef?.label || vd.brandCode || '—')}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Type</span>
                        <p className="font-medium text-slate-800">{vd.carTypeCode || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Immatriculation</span>
                        <p className="font-medium text-slate-800">{vd.registrationNumber || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Energie</span>
                        <p className="font-medium text-slate-800">{(energyRef as any)?.description || energyRef?.name || energyRef?.label || vd.energyCode || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Puissance fiscale</span>
                        <p className="font-medium text-slate-800">{vd.fiscalPower || '—'} CV</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Places</span>
                        <p className="font-medium text-slate-800">{vd.numberOfPlaces || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Valeur marche</span>
                        <p className="font-medium text-slate-800">{vd.marketValue ? Number(vd.marketValue).toLocaleString() + ' FCFA' : '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Cout remplacement</span>
                        <p className="font-medium text-slate-800">{vd.replacementCost ? Number(vd.replacementCost).toLocaleString() + ' FCFA' : '—'}</p>
                      </div>
                      {vd.dateOfFirstRegistration && (
                        <div>
                          <span className="text-slate-500">1ere mise en circulation</span>
                          <p className="font-medium text-slate-800">{vd.dateOfFirstRegistration}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Couvertures */}
                {sim.coverages && sim.coverages.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-green-700">Couvertures</h4>
                    <div className="space-y-1">
                      {sim.coverages.map((c, i) => {
                        const ref = coveragesRef.find(r => String(r.code) === String(c.code));
                        const label = (ref as any)?.description || ref?.name || ref?.label || c.code;
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span className="text-slate-800">{label}</span>
                            {c.option && <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded">Option: {c.option}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detail primes */}
                <div className="bg-orange-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-orange-700">Detail des primes</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Prime nette</span>
                      <span className="font-medium text-slate-800">{Math.round(sim.netPrime || 0).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Prime brute</span>
                      <span className="font-medium text-slate-800">{Math.round(sim.grossPrime || 0).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Taxe</span>
                      <span className="font-medium text-slate-800">{Math.round(sim.taxe || 0).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cout police</span>
                      <span className="font-medium text-slate-800">{Math.round(sim.policyCost || 0).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-orange-200">
                      <span className="font-semibold text-slate-800">Prime totale</span>
                      <span className="text-lg font-bold text-orange-600">{Math.round(sim.totalPrime || 0).toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleDownloadPdf(sim.simulationId)}>
                    <Download className="w-4 h-4 mr-2" />
                    Telecharger devis PDF
                  </Button>
                  {isPending && (
                    <Button className="flex-1 gradient-subito text-white border-0" onClick={() => { setSelectedSim(null); onCreateContract(sim.simulationId); }}>
                      Creer contrat
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== NEW CONTRACT FORM ====================
function NewContractForm({ onSuccess, prefilledSimulationId }: { onSuccess: () => void; prefilledSimulationId?: number | null }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<InsuranceContractResponse | null>(null);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [birthdateOpen, setBirthdateOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState('');
  const [titleOpen, setTitleOpen] = useState(false);
  const [cspSearch, setCspSearch] = useState('');
  const [cspOpen, setCspOpen] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [nationalityOpen, setNationalityOpen] = useState(false);

  const [simulationId, setSimulationId] = useState<number | null>(prefilledSimulationId || null);

  // Update simulationId when prefilledSimulationId changes (coming from another tab)
  React.useEffect(() => {
    if (prefilledSimulationId) setSimulationId(prefilledSimulationId);
  }, [prefilledSimulationId]);

  const [referenceTrxPayment, setReferenceTrxPayment] = useState('');

  // Auto-generate payment reference when simulationId changes
  React.useEffect(() => {
    if (simulationId) {
      const now = new Date();
      const ref = `PAY-${now.getFullYear()}-${String(simulationId).padStart(6, '0')}`;
      setReferenceTrxPayment(ref);
    }
  }, [simulationId]);
  const [startDate, setStartDate] = useState('');
  const [customer, setCustomer] = useState({
    title: '',
    lastName: '',
    firstName: '',
    address: '',
    mobilePhone: '',
    email: '',
    cin: '',
    birthdate: '',
    city: '',
    activity: '',
    csp: '',
    nationality: '221',
    nativeCountry: '221',
  });

  // Employee selection
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const { data: employeesRaw } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.employees.list({ limit: 200, actif: true }),
  });
  const employees: EmployeeResponse[] = (() => {
    const raw = (employeesRaw as any)?.data || employeesRaw;
    const list = raw?.items || (Array.isArray(raw) ? raw : []);
    return Array.isArray(list) ? list : [];
  })();

  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);
  const { data: deptsRaw } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.departments.list(),
  });
  const departments: DepartmentResponse[] = (() => {
    const raw = (deptsRaw as any)?.data || deptsRaw;
    const list = raw?.items || (Array.isArray(raw) ? raw : []);
    return Array.isArray(list) ? list : [];
  })();

  const handleAddEmployee = async (data: CreateEmployeeDto) => {
    setAddEmployeeLoading(true);
    try {
      const res = await api.employees.create(data);
      const emp = (res as any)?.data || res;
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      selectEmployee(emp as EmployeeResponse);
      setShowAddEmployee(false);
      toast.success('Employe ajoute !');
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'ajout");
    } finally {
      setAddEmployeeLoading(false);
    }
  };

  const selectEmployee = (emp: EmployeeResponse | null) => {
    if (emp) {
      setSelectedEmployeeId(emp.id);
      setCustomer(prev => ({
        ...prev,
        lastName: emp.nom || prev.lastName,
        firstName: emp.prenom || prev.firstName,
        email: emp.email || prev.email,
        mobilePhone: emp.telephone || prev.mobilePhone,
        address: emp.adresse || prev.address,
      }));
    } else {
      setSelectedEmployeeId(null);
      setCustomer({
        title: '', lastName: '', firstName: '', address: '',
        mobilePhone: '', email: '', cin: '', birthdate: '',
        city: '', activity: '', csp: '', nationality: '221', nativeCountry: '221',
      });
    }
  };

  // Fetch simulations for dropdown
  const [simSearch, setSimSearch] = useState('');
  const [simOpen, setSimOpen] = useState(false);
  const { data: simListRaw } = useQuery({
    queryKey: ['insurance-simulations-all'],
    queryFn: () => api.insurance.listSimulations(1, 100),
  });
  const allSimulations: InsuranceSimulationResponse[] = (() => {
    const raw = (simListRaw as any)?.data || simListRaw;
    const list = raw?.data || raw?.items || (Array.isArray(raw) ? raw : []);
    return Array.isArray(list) ? list : [];
  })();

  // Reference data
  const titles = useRefData('titles');
  const csps = useRefData('csps');
  const activities = useRefData('activities');
  const countries = useRefData('countries');

  const updateCustomer = (key: string, value: string) => {
    setCustomer(prev => ({ ...prev, [key]: value }));
  };

  const contractSteps: StepDef[] = [
    { id: 1, title: "Simulation", icon: Hash },
    { id: 2, title: "Client", icon: User },
    { id: 3, title: "Confirmation", icon: Check },
  ];

  const createMutation = useMutation({
    mutationFn: (data: CreateInsuranceContractDto) => api.insurance.createContract(data),
    onSuccess: (res) => {
      const data = (res as any)?.data || res;
      setResult(data);
      setSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      queryClient.invalidateQueries({ queryKey: ['insurance-contracts'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la creation du contrat");
    },
  });

  const handleSubmit = () => {
    if (!simulationId) return;
    const payload: CreateInsuranceContractDto = {
      simulationId,
      referenceTrxPayment,
      startDate,
      customer,
    };
    createMutation.mutate(payload);
  };

  const canNext = (): boolean => {
    switch (currentStep) {
      case 1: return !!simulationId && !!referenceTrxPayment && !!startDate;
      case 2: {
        const ageOk = customer.birthdate ? Math.floor((Date.now() - new Date(customer.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) >= 18 : false;
        return !!customer.title && !!customer.lastName && !!customer.firstName && !!customer.mobilePhone && !!customer.cin && !!customer.birthdate && ageOk && !!customer.city;
      }
      default: return true;
    }
  };

  if (success && result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        <div className="w-20 h-20 rounded-full gradient-subito flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Contrat souscrit !</h2>
        <p className="text-slate-500 mb-2">
          N° contrat : <span className="font-mono font-semibold text-subito">{result.contractNumber}</span>
        </p>
        <p className="text-sm text-slate-400 mb-2">
          {result.startDate && format(new Date(result.startDate), 'dd/MM/yyyy')} — {result.endDate && format(new Date(result.endDate), 'dd/MM/yyyy')}
        </p>
        <p className="text-3xl font-bold text-orange-600 mb-6">
          {result.totalPremium?.toLocaleString()} {result.currency || 'XOF'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setSuccess(false); setResult(null); setSimulationId(null); setReferenceTrxPayment(''); setStartDate(''); setCurrentStep(1); }}>
            Nouveau contrat
          </Button>
          <Button className="gradient-subito text-white border-0" onClick={onSuccess}>
            Voir mes contrats
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {contractSteps.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep >= step.id ? 'gradient-subito text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs ${currentStep >= step.id ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                {step.title}
              </span>
            </div>
            {i < contractSteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-orange-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white text-slate-800 rounded-2xl border border-slate-200 p-6 space-y-5"
        >
          {/* Step 1: Simulation & paiement */}
          {currentStep === 1 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Simulation & paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Simulation *</Label>
                  <Popover open={simOpen} onOpenChange={setSimOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {simulationId
                          ? (() => {
                              const s = allSimulations.find(s => s.simulationId === simulationId);
                              return s ? `#${s.simulationId} — ${Math.round(s.totalPrime || 0).toLocaleString()} FCFA` : `#${simulationId}`;
                            })()
                          : <span className="text-muted-foreground">Selectionner une simulation</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher par ID..." value={simSearch} onValueChange={setSimSearch} />
                        <CommandList>
                          <CommandEmpty>Aucune simulation</CommandEmpty>
                          <CommandGroup>
                            {allSimulations
                              .filter(s => {
                                if (!simSearch) return true;
                                return String(s.simulationId).includes(simSearch) || (s.productCode || '').toLowerCase().includes(simSearch.toLowerCase());
                              })
                              .map(s => (
                                <CommandItem
                                  key={s.simulationId}
                                  onSelect={() => { setSimulationId(s.simulationId); setSimOpen(false); setSimSearch(''); }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${simulationId === s.simulationId ? 'opacity-100' : 'opacity-0'}`} />
                                  <span className="font-mono font-medium">#{s.simulationId}</span>
                                  <span className="mx-2 text-slate-400">—</span>
                                  <span className="text-sm text-slate-600">{s.productCode}</span>
                                  <span className="ml-auto font-semibold text-orange-600">{Math.round(s.totalPrime || 0).toLocaleString()} FCFA</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Reference de paiement *</Label>
                  <Input
                    value={referenceTrxPayment}
                    disabled
                    className="bg-slate-50 font-mono"
                    placeholder="Selectionner une simulation"
                  />
                  <p className="text-xs text-slate-500">Generee automatiquement</p>
                </div>
                <div className="space-y-2">
                  <Label>Date de debut du contrat *</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(new Date(startDate), 'dd/MM/yyyy', { locale: fr }) : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(d) => {
                          if (d) setStartDate(format(d, 'yyyy-MM-dd'));
                          setStartDateOpen(false);
                        }}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Client info */}
          {currentStep === 2 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Informations du client</h3>

              {/* Sélecteur employé ou saisie libre */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Selectionner un employe (optionnel)</Label>
                  {selectedEmployeeId && (
                    <Button size="sm" variant="ghost" className="text-xs text-slate-500" onClick={() => selectEmployee(null)}>
                      <X className="w-3 h-3 mr-1" /> Saisie manuelle
                    </Button>
                  )}
                </div>
                <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      {selectedEmployeeId
                        ? (() => {
                            const emp = employees.find(e => e.id === selectedEmployeeId);
                            return emp ? `${emp.prenom} ${emp.nom}` : `Employe #${selectedEmployeeId}`;
                          })()
                        : <span className="text-muted-foreground">Rechercher un employe ou saisir manuellement</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher par nom, prenom..." value={employeeSearch} onValueChange={setEmployeeSearch} />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-2 text-center">
                            <p className="text-sm text-slate-500 mb-2">Aucun employe trouve</p>
                            <Button size="sm" variant="outline" onClick={() => { setEmployeeOpen(false); setShowAddEmployee(true); }}>
                              <Plus className="w-3 h-3 mr-1" /> Ajouter un employe
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {employees
                            .filter(emp => {
                              if (!employeeSearch) return true;
                              const s = employeeSearch.toLowerCase();
                              return (emp.nom || '').toLowerCase().includes(s)
                                || (emp.prenom || '').toLowerCase().includes(s)
                                || (emp.email || '').toLowerCase().includes(s);
                            })
                            .slice(0, 30)
                            .map(emp => (
                              <CommandItem
                                key={emp.id}
                                onSelect={() => { selectEmployee(emp); setEmployeeOpen(false); setEmployeeSearch(''); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${selectedEmployeeId === emp.id ? 'opacity-100' : 'opacity-0'}`} />
                                <div>
                                  <span className="font-medium">{emp.prenom} {emp.nom}</span>
                                  {emp.email && <span className="ml-2 text-xs text-slate-400">{emp.email}</span>}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500">Si le client est un employe, ses infos seront pre-remplies. Sinon, saisissez manuellement.</p>
              </div>

              {/* Dialog ajout employé — même formulaire que la page Employés */}
              <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter un employe</DialogTitle>
                  </DialogHeader>
                  <EmployeeForm
                    departments={departments}
                    onSubmit={handleAddEmployee}
                    onCancel={() => setShowAddEmployee(false)}
                    isSubmitting={addEmployeeLoading}
                  />
                </DialogContent>
              </Dialog>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Civilite *</Label>
                  <Popover open={titleOpen} onOpenChange={setTitleOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {customer.title
                          ? (() => { const t = (titles.length > 0 ? titles : [{ code: 'MR', name: 'Monsieur' }, { code: 'MME', name: 'Madame' }, { code: 'MLLE', name: 'Mademoiselle' }] as InsuranceReferenceItem[]).find(t => t.code === customer.title); return t?.name || t?.label || customer.title; })()
                          : <span className="text-muted-foreground">Civilite</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={titleSearch} onValueChange={setTitleSearch} />
                        <CommandList>
                          <CommandEmpty>Aucun resultat</CommandEmpty>
                          <CommandGroup>
                            {(titles.length > 0 ? titles : [{ code: 'MR', name: 'Monsieur' }, { code: 'MME', name: 'Madame' }, { code: 'MLLE', name: 'Mademoiselle' }] as InsuranceReferenceItem[])
                              .filter(t => (t.name || t.label || t.code || '').toLowerCase().includes(titleSearch.toLowerCase()))
                              .map(t => (
                              <CommandItem key={t.code} onSelect={() => { if (t.code) updateCustomer('title', t.code); setTitleOpen(false); setTitleSearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${customer.title === t.code ? 'opacity-100' : 'opacity-0'}`} />
                                {t.name || t.label || t.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={customer.lastName} onChange={e => updateCustomer('lastName', e.target.value)} placeholder="Diop" />
                </div>
                <div className="space-y-2">
                  <Label>Prenom *</Label>
                  <Input value={customer.firstName} onChange={e => updateCustomer('firstName', e.target.value)} placeholder="Moussa" />
                </div>
                <div className="space-y-2">
                  <Label>Telephone *</Label>
                  <Input value={customer.mobilePhone} onChange={e => updateCustomer('mobilePhone', e.target.value)} placeholder="770001122" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={customer.email} onChange={e => updateCustomer('email', e.target.value)} placeholder="moussa@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>CNI / Passeport *</Label>
                  <Input value={customer.cin} onChange={e => updateCustomer('cin', e.target.value)} placeholder="1234567890123" />
                </div>
                <div className="space-y-2">
                  <Label>Date de naissance *</Label>
                  <Input
                    type="date"
                    value={customer.birthdate}
                    max={format(new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()), 'yyyy-MM-dd')}
                    onChange={e => updateCustomer('birthdate', e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Minimum 18 ans</p>
                  {customer.birthdate && (() => {
                    const age = Math.floor((Date.now() - new Date(customer.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    return age < 18 ? <p className="text-xs text-red-500">Le souscripteur doit avoir au moins 18 ans</p> : null;
                  })()}
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={customer.address} onChange={e => updateCustomer('address', e.target.value)} placeholder="Medina, Rue 21" />
                </div>
                <div className="space-y-2">
                  <Label>Ville *</Label>
                  <Input value={customer.city} onChange={e => updateCustomer('city', e.target.value)} placeholder="DAKAR" />
                </div>
                <div className="space-y-2">
                  <Label>CSP</Label>
                  <Popover open={cspOpen} onOpenChange={setCspOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {customer.csp
                          ? (csps.find(c => c.code === customer.csp)?.name || csps.find(c => c.code === customer.csp)?.label || customer.csp)
                          : <span className="text-muted-foreground">Categorie socio-pro</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={cspSearch} onValueChange={setCspSearch} />
                        <CommandList>
                          <CommandEmpty>Aucun resultat</CommandEmpty>
                          <CommandGroup>
                            {csps.filter(c => (c.name || c.label || c.code || '').toLowerCase().includes(cspSearch.toLowerCase())).map(c => (
                              <CommandItem key={c.code} onSelect={() => { if (c.code) updateCustomer('csp', c.code); setCspOpen(false); setCspSearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${customer.csp === c.code ? 'opacity-100' : 'opacity-0'}`} />
                                {c.name || c.label || c.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Activite</Label>
                  <Popover open={activityOpen} onOpenChange={setActivityOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {customer.activity
                          ? (activities.find(a => a.code === customer.activity)?.name || activities.find(a => a.code === customer.activity)?.label || customer.activity)
                          : <span className="text-muted-foreground">Activite professionnelle</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." value={activitySearch} onValueChange={setActivitySearch} />
                        <CommandList>
                          <CommandEmpty>Aucun resultat</CommandEmpty>
                          <CommandGroup>
                            {activities.filter(a => (a.name || a.label || a.code || '').toLowerCase().includes(activitySearch.toLowerCase())).map(a => (
                              <CommandItem key={a.code} onSelect={() => { if (a.code) updateCustomer('activity', a.code); setActivityOpen(false); setActivitySearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${customer.activity === a.code ? 'opacity-100' : 'opacity-0'}`} />
                                {a.name || a.label || a.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Nationalite</Label>
                  <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {customer.nationality
                          ? (countries.find(c => c.code === customer.nationality)?.name || countries.find(c => c.code === customer.nationality)?.label || customer.nationality)
                          : <span className="text-muted-foreground">Nationalite</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un pays..." value={nationalitySearch} onValueChange={setNationalitySearch} />
                        <CommandList>
                          <CommandEmpty>Aucun resultat</CommandEmpty>
                          <CommandGroup>
                            {countries.filter(c => (c.name || c.label || c.code || '').toLowerCase().includes(nationalitySearch.toLowerCase())).map(c => (
                              <CommandItem key={c.code} onSelect={() => { if (c.code) updateCustomer('nationality', c.code); setNationalityOpen(false); setNationalitySearch(''); }}>
                                <Check className={`mr-2 h-4 w-4 ${customer.nationality === c.code ? 'opacity-100' : 'opacity-0'}`} />
                                {c.name || c.label || c.code}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Recapitulatif du contrat</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Contrat</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Simulation:</span> <span className="font-medium">#{simulationId}</span></div>
                    <div><span className="text-slate-500">Ref. paiement:</span> <span className="font-medium">{referenceTrxPayment}</span></div>
                    <div><span className="text-slate-500">Debut:</span> <span className="font-medium">{startDate && format(new Date(startDate), 'dd/MM/yyyy')}</span></div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Client</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Nom:</span> <span className="font-medium">{customer.title} {customer.firstName} {customer.lastName}</span></div>
                    <div><span className="text-slate-500">Tel:</span> <span className="font-medium">{customer.mobilePhone}</span></div>
                    <div><span className="text-slate-500">Email:</span> <span className="font-medium">{customer.email || '—'}</span></div>
                    <div><span className="text-slate-500">CNI:</span> <span className="font-medium">{customer.cin}</span></div>
                    <div><span className="text-slate-500">Ville:</span> <span className="font-medium">{customer.city || '—'}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setCurrentStep(s => Math.max(s - 1, 1))} disabled={currentStep === 1} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        {currentStep < 3 ? (
          <Button onClick={() => setCurrentStep(s => Math.min(s + 1, 3))} disabled={!canNext()} className="gradient-subito text-white border-0 gap-2">
            Suivant <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gradient-subito text-white border-0 gap-2">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Souscrire le contrat
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== CONTRACTS LIST ====================
function ContractsList() {
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<InsuranceContractResponse | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['insurance-contracts', page],
    queryFn: () => api.insurance.listContracts(page, 20),
  });

  const raw = (response as any)?.data || response;
  const contracts: InsuranceContractResponse[] = raw?.data || [];
  const meta = raw?.meta || { page: 1, totalPages: 1, total: 0 };

  const handleDownloadDocuments = async (contractNumber: string) => {
    try {
      toast.info("Telechargement des documents en cours...");
      const blob = await api.insurance.downloadContractDocuments(contractNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat-${contractNumber}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Documents telecharges !");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du telechargement");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600">Aucun contrat</h3>
        <p className="text-sm text-slate-400">Souscrivez votre premier contrat d&apos;assurance</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">N° contrat</th>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Debut</th>
                <th className="px-4 py-3 text-left">Fin</th>
                <th className="px-4 py-3 text-left">Prime</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map(c => {
                const st = contractStatusLabels[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={c.contractNumber} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedContract(c); setDetailOpen(true); }}>
                    <td className="px-4 py-3 text-sm font-mono text-subito font-semibold">{c.contractNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{(c as any).productCode || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {c.startDate ? format(new Date(c.startDate), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {c.endDate ? format(new Date(c.endDate), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                      {c.totalPremium?.toLocaleString()} {c.currency || 'XOF'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDownloadDocuments(c.contractNumber); }} title="Telecharger les documents">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{meta.total} contrat(s)</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">{page} / {meta.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-subito">
                <Shield className="w-5 h-5 text-white" />
              </div>
              Detail du contrat
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-subito">{selectedContract.contractNumber}</span>
                <Badge className={`${(contractStatusLabels[selectedContract.status] || { color: 'bg-slate-100 text-slate-700' }).color} border-0`}>
                  {(contractStatusLabels[selectedContract.status] || { label: selectedContract.status }).label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">Debut</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedContract.startDate ? format(new Date(selectedContract.startDate), 'dd MMM yyyy', { locale: fr }) : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">Fin</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedContract.endDate ? format(new Date(selectedContract.endDate), 'dd MMM yyyy', { locale: fr }) : '—'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Prime totale</span>
                  <span className="text-2xl font-bold text-orange-600">{selectedContract.totalPremium?.toLocaleString()} {selectedContract.currency || 'XOF'}</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => handleDownloadDocuments(selectedContract.contractNumber)}
              >
                <Download className="w-4 h-4" />
                Telecharger les documents
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
