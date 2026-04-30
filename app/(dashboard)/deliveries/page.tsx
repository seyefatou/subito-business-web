'use client';

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Package,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  Search,
  UserPlus,
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  Eye,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  Ban,
  Truck,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
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
  CreateDeliveryDto,
  DeliveryResponse,
  DeliveryEstimate,
  DeliveryType,
  CreateEmployeeDto,
  EmployeeResponse,
  DepartmentResponse,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

// ==================== TYPES ====================
interface StepDef {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepDef[] = [
  { id: 1, title: "Livraison", icon: Package },
  { id: 2, title: "Adresses", icon: MapPin },
  { id: 3, title: "Expediteur", icon: User },
  { id: 4, title: "Destinataire", icon: User },
  { id: 5, title: "Details", icon: FileText },
  { id: 6, title: "Confirmation", icon: Check },
];

interface FormData {
  deliveryTypeId: number | null;
  deliveryDate: string;
  deliveryTime: string;
  expediteurNom: string;
  expediteurTelephone: string;
  expediteurEmail: string;
  destinataireNom: string;
  destinataireTelephone: string;
  destinataireEmail: string;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffAddress: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  description: string;
  notes: string;
  employeeId: number | null;
  destinataireEmployeeId: number | null;
}

const initialFormData: FormData = {
  deliveryTypeId: null,
  deliveryDate: '',
  deliveryTime: '',
  expediteurNom: '',
  expediteurTelephone: '',
  expediteurEmail: '',
  destinataireNom: '',
  destinataireTelephone: '',
  destinataireEmail: '',
  pickupAddress: '',
  pickupLat: null,
  pickupLng: null,
  dropoffAddress: '',
  dropoffLat: null,
  dropoffLng: null,
  description: '',
  notes: '',
  employeeId: null,
  destinataireEmployeeId: null,
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirme", color: "bg-blue-100 text-blue-700" },
  assigned: { label: "Assigne", color: "bg-indigo-100 text-indigo-700" },
  picked_up: { label: "Recupere", color: "bg-purple-100 text-purple-700" },
  in_transit: { label: "En transit", color: "bg-cyan-100 text-cyan-700" },
  delivered: { label: "Livre", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annule", color: "bg-red-100 text-red-700" },
};

// ==================== MAIN COMPONENT ====================
export default function Deliveries() {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#E04A1F]">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Livraisons</h1>
          <p className="text-slate-500">Gestion des livraisons de votre entreprise</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new">Nouvelle livraison</TabsTrigger>
          <TabsTrigger value="list">Mes livraisons</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <NewDeliveryForm onSuccess={() => setActiveTab("list")} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <DeliveriesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== NEW DELIVERY FORM ====================
function NewDeliveryForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [destEmployeeSearch, setDestEmployeeSearch] = useState("");
  const [destEmployeePopoverOpen, setDestEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [deliveryCountry, setDeliveryCountry] = useState('sn');
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Fetch delivery types
  const { data: typesResponse } = useQuery({
    queryKey: ['delivery-types'],
    queryFn: () => api.deliveries.types(),
  });
  const deliveryTypes: DeliveryType[] = (() => {
    const raw = typesResponse?.data || typesResponse;
    if (Array.isArray(raw)) return raw;
    return [];
  })();

  // Pick a moto image for the Reseau Premium Subito promo card — prefer a type whose name contains "moto"
  const motoPromoImage: string | undefined = (() => {
    const motoType = deliveryTypes.find(t => /moto/i.test(t.nom || ''));
    return motoType?.image || deliveryTypes.find(t => !!t.image)?.image;
  })();

  // Fetch employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees.list({ limit: 100, actif: true }),
  });
  const employeesRaw = employeesResponse?.data;
  const employees: EmployeeResponse[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as any)?.items || (employeesRaw as any)?.list || [];

  // Fetch departments for employee form
  const { data: deptResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(1, 100),
  });
  const departments: DepartmentResponse[] = (() => {
    const raw = deptResponse?.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray((raw as any).items)) return (raw as any).items;
      if (Array.isArray((raw as any).list)) return (raw as any).list;
    }
    return [];
  })();

  const filteredEmployees = employees.filter(e =>
    `${e.nom || ''} ${e.prenom || ''}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const selectedEmployee = employees.find(e => e.id === formData.employeeId);

  const filteredDestEmployees = employees.filter(e =>
    `${e.nom || ''} ${e.prenom || ''}`.toLowerCase().includes(destEmployeeSearch.toLowerCase()) &&
    e.id !== formData.employeeId
  );
  const selectedDestEmployee = formData.destinataireEmployeeId
    ? employees.find(e => e.id === formData.destinataireEmployeeId)
    : null;

  const createMutation = useMutation({
    mutationFn: (data: CreateDeliveryDto) => api.deliveries.create(data),
    onSuccess: (res) => {
      const ref = (res as any)?.data?.reference || (res as any)?.reference || '';
      setBookingRef(ref);
      setBookingSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la creation de la livraison");
    },
  });

  const handleSubmit = () => {
    if (!formData.deliveryTypeId) return;
    const payload: CreateDeliveryDto = {
      deliveryTypeId: formData.deliveryTypeId,
      deliveryDate: formData.deliveryDate,
      deliveryTime: formData.deliveryTime,
      expediteurNom: formData.expediteurNom,
      expediteurTelephone: formData.expediteurTelephone,
      expediteurEmail: formData.expediteurEmail || undefined,
      expediteurEmployeeId: formData.employeeId || undefined,
      destinataireNom: formData.destinataireNom,
      destinataireTelephone: formData.destinataireTelephone,
      destinataireEmail: formData.destinataireEmail || undefined,
      destinataireEmployeeId: formData.destinataireEmployeeId || undefined,
      pickupAddress: formData.pickupAddress,
      pickupLat: formData.pickupLat ?? undefined,
      pickupLng: formData.pickupLng ?? undefined,
      dropoffAddress: formData.dropoffAddress,
      dropoffLat: formData.dropoffLat ?? undefined,
      dropoffLng: formData.dropoffLng ?? undefined,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
      employeeId: formData.employeeId || undefined,
    };
    createMutation.mutate(payload);
  };

  // Fetch estimate as soon as both addresses are geolocated (visible from step 2 onwards)
  useEffect(() => {
    if (currentStep >= 2 && formData.deliveryTypeId && formData.pickupLat && formData.pickupLng && formData.dropoffLat && formData.dropoffLng) {
      setEstimateLoading(true);
      api.deliveries.estimate({
        deliveryTypeId: formData.deliveryTypeId,
        pickupLat: formData.pickupLat,
        pickupLng: formData.pickupLng,
        dropoffLat: formData.dropoffLat,
        dropoffLng: formData.dropoffLng,
      }).then(res => {
        const data = (res as any)?.data || res;
        setEstimate(data);
      }).catch(() => {
        setEstimate(null);
      }).finally(() => {
        setEstimateLoading(false);
      });
    }
  }, [currentStep, formData.deliveryTypeId, formData.pickupLat, formData.pickupLng, formData.dropoffLat, formData.dropoffLng]);

  const handleNext = () => setCurrentStep(s => Math.min(s + 1, 6));
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  const canNext = (): boolean => {
    switch (currentStep) {
      case 1: return !!formData.deliveryTypeId && !!formData.deliveryDate && !!formData.deliveryTime;
      case 2: return !!formData.pickupAddress && !!formData.dropoffAddress && !!formData.pickupLat && !!formData.dropoffLat;
      case 3: return !!formData.expediteurNom && !!formData.expediteurTelephone;
      case 4: return !!formData.destinataireNom && !!formData.destinataireTelephone;
      case 5: return true;
      default: return true;
    }
  };

  if (bookingSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto space-y-12"
      >
        {/* Hero */}
        <section className="text-center py-10">
          <div className="mb-8 relative inline-block">
            <div className="w-24 h-24 rounded-full bg-[#E04A1F] flex items-center justify-center text-white shadow-2xl shadow-[#E04A1F]/30 relative z-10">
              <Check className="w-12 h-12" strokeWidth={3} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-orange-500/10 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-orange-500/5" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Commande confirmee !</h2>
          <p className="text-base text-slate-500 max-w-md mx-auto">
            Votre demande de livraison a ete enregistree avec succes.
          </p>
        </section>

        {/* Order info bento */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Numero de suivi</p>
              <h3 className="text-3xl font-extrabold text-[#E04A1F] tracking-tight">
                {bookingRef || '—'}
              </h3>
            </div>
            <div className="mt-8 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Enlevement estime</p>
                <p className="font-bold text-slate-900">
                  {formData.deliveryDate && format(new Date(formData.deliveryDate), 'dd MMM yyyy', { locale: fr })}
                  {formData.deliveryTime && `, ${formData.deliveryTime}`}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-50 rounded-[2rem] p-8 flex flex-col justify-center">
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Un transporteur sera affecte a votre course dans les prochaines minutes. Vous recevrez une notification des que le colis sera pris en charge.
            </p>
            <div className="space-y-3">
              <Button
                onClick={onSuccess}
                className="w-full bg-[#E04A1F] text-white border-0 py-5 rounded-xl font-bold text-sm shadow-lg shadow-[#E04A1F]/20 active:scale-95 transition-all gap-2"
              >
                Voir mes livraisons
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBookingSuccess(false); setFormData(initialFormData); setCurrentStep(1); }}
                className="w-full py-5 rounded-xl font-bold text-sm bg-slate-200 border-0 hover:bg-slate-300 transition-all gap-2"
              >
                Nouvelle livraison
              </Button>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h4 className="font-extrabold text-xl text-slate-900">Prochaines etapes</h4>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-extrabold text-sm">
                  1
                </div>
                <h5 className="font-bold text-slate-900 text-sm">Attribution</h5>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pl-14">
                Notre algorithme selectionne le meilleur coursier disponible pour votre trajet.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-sm">
                  2
                </div>
                <h5 className="font-bold text-slate-900 text-sm">Enlevement</h5>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pl-14">
                Le coursier se presente a l&apos;adresse de depart indiquee pour recuperer le colis.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-sm">
                  3
                </div>
                <h5 className="font-bold text-slate-900 text-sm">Livraison</h5>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pl-14">
                Suivez le trajet en temps reel jusqu&apos;a la remise en main propre a destination.
              </p>
            </div>
          </div>
        </section>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6">
      {/* Hero Header */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-8">
          <div>
            <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              <span>Livraisons</span>
              <span>/</span>
              <span className="text-[#E04A1F]">Nouvelle</span>
            </nav>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Nouvelle Commande
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {steps[currentStep - 1]?.title} — etape {currentStep} sur {steps.length}
            </p>
          </div>
          <span className="text-[#E04A1F] font-bold text-xs bg-[#ffdbd0] px-4 py-2 rounded-full whitespace-nowrap uppercase tracking-widest">
            Etape {currentStep}/{steps.length}
          </span>
        </div>

        {/* Editorial Stepper with connecting lines */}
        <div className="flex items-center w-full">
          {steps.map((step, idx) => {
            const isDone = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isLast = idx === steps.length - 1;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className={`rounded-full flex items-center justify-center transition-all font-bold ${
                      isActive
                        ? "w-12 h-12 bg-[#E04A1F] text-white ring-4 ring-[#ffdbd0] shadow-lg shadow-[#E04A1F]/20"
                        : isDone
                        ? "w-10 h-10 bg-[#E04A1F] text-white"
                        : "w-10 h-10 bg-[#dfe3e7] text-slate-500"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      <span className="text-sm">{step.id}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs hidden sm:block whitespace-nowrap ${
                      isActive
                        ? "font-bold text-[#E04A1F]"
                        : isDone
                        ? "font-semibold text-[#171c1f]"
                        : "font-medium text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {!isLast && (
                  <div className="flex-1 h-1 mx-2 sm:mx-4 -mt-6 rounded-full overflow-hidden bg-[#dfe3e7]">
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

      {/* Form content + Summary (8/4 editorial split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10">

      {/* Steps */}
      <AnimatePresence mode="wait">
        {/* Step 1: Type + Date */}
        {currentStep === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Type de livraison</h3>
              <p className="text-sm text-slate-500 mt-1">Choisissez la vitesse et le vehicule adaptes a votre colis.</p>
            </div>

            <div className="space-y-4">
              {deliveryTypes.length === 0 ? (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-50 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement des types...
                </div>
              ) : (
                deliveryTypes.map((t, idx) => {
                  const selected = formData.deliveryTypeId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, deliveryTypeId: t.id }))}
                      className={`group w-full text-left p-6 md:p-8 rounded-3xl transition-all duration-300 overflow-hidden relative ${
                        selected
                          ? 'bg-white shadow-xl shadow-orange-500/5 outline outline-2 outline-orange-600'
                          : 'bg-slate-50 hover:bg-white hover:shadow-lg'
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffdbd0]/400/5 rounded-bl-full translate-x-8 -translate-y-8" />
                      )}
                      <div className="flex items-start gap-6 relative z-10">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'bg-[#ffdbd0] text-[#E04A1F] group-hover:scale-110' : 'bg-slate-200 text-slate-500 group-hover:text-[#E04A1F]'
                        }`}>
                          {t.image ? (
                            <img src={t.image} alt={t.nom} className="w-10 h-10 object-contain rounded" />
                          ) : (
                            <Truck className="w-8 h-8" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1 gap-3">
                            <h4 className={`text-xl font-bold capitalize ${selected ? 'text-slate-900' : 'text-slate-800'}`}>
                              {t.nom}
                            </h4>
                            {idx === 0 && (
                              <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap">
                                Rapide
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-sm text-slate-500 leading-relaxed">{t.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 mb-4">Horaire de collecte</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-slate-50 border-0 py-5 rounded-xl">
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#E04A1F]" />
                        {formData.deliveryDate
                          ? format(new Date(formData.deliveryDate), 'dd MMM yyyy', { locale: fr })
                          : 'Choisir une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.deliveryDate ? new Date(formData.deliveryDate) : undefined}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, deliveryDate: format(date, 'yyyy-MM-dd') }))}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Heure *</Label>
                  <TimePicker
                    value={formData.deliveryTime}
                    onChange={(v) => setFormData(prev => ({ ...prev, deliveryTime: v }))}
                    selectedDate={formData.deliveryDate || null}
                  />
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* Step 2: Addresses */}
        {currentStep === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Informations d&apos;acheminement</h3>
              <p className="text-sm text-slate-500 mt-1">Renseignez les points de collecte et de destination.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Pickup */}
              <section className="bg-slate-50 p-6 md:p-8 rounded-[2rem] flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#E04A1F]">
                      <MapPin className="w-6 h-6" fill="currentColor" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Prise en charge</h4>
                  </div>
                  {formData.pickupLat && (
                    <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wider">
                      Validee
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600 px-1">Adresse complete</Label>
                  <AddressAutocomplete
                    value={formData.pickupAddress}
                    onChange={(val) => setFormData(prev => ({ ...prev, pickupAddress: val, pickupLat: null, pickupLng: null }))}
                    onSelect={(address, lat, lng) => setFormData(prev => ({ ...prev, pickupAddress: address, pickupLat: lat, pickupLng: lng }))}
                    placeholder="Ex: Ouakam, Dakar..."
                    iconColor="text-[#E04A1F]"
                    countryCode={deliveryCountry}
                    showCountrySelect={true}
                    onCountryChange={setDeliveryCountry}
                  />
                  {formData.pickupLat && (
                    <p className="text-xs text-teal-600 flex items-center gap-1 pt-1">
                      <Check className="w-3 h-3" /> Geolocalisee ({formData.pickupLat.toFixed(4)}, {formData.pickupLng?.toFixed(4)})
                    </p>
                  )}
                </div>
              </section>

              {/* Dropoff */}
              <section className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Livraison</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    formData.dropoffLat
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {formData.dropoffLat ? 'Validee' : 'A remplir'}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600 px-1">Adresse de destination</Label>
                  <AddressAutocomplete
                    value={formData.dropoffAddress}
                    onChange={(val) => setFormData(prev => ({ ...prev, dropoffAddress: val, dropoffLat: null, dropoffLng: null }))}
                    onSelect={(address, lat, lng) => setFormData(prev => ({ ...prev, dropoffAddress: address, dropoffLat: lat, dropoffLng: lng }))}
                    placeholder="Ex: Plateau, Dakar..."
                    iconColor="text-slate-500"
                    countryCode={deliveryCountry}
                  />
                  {formData.dropoffLat && (
                    <p className="text-xs text-teal-600 flex items-center gap-1 pt-1">
                      <Check className="w-3 h-3" /> Geolocalisee ({formData.dropoffLat.toFixed(4)}, {formData.dropoffLng?.toFixed(4)})
                    </p>
                  )}
                </div>

                <div className="bg-[#ffdbd0]/40 p-5 rounded-2xl flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#E04A1F]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-900">Optimisation du trajet</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Le prix final sera calcule automatiquement selon la distance Google Maps.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Estimation du prix — visible dès que les deux adresses sont geolocalisees */}
            {(formData.pickupLat && formData.dropoffLat) && (
              <section className="bg-gradient-to-br from-[#E04A1F]/5 via-white to-[#E04A1F]/5 p-6 md:p-8 rounded-[2rem] border-2 border-[#E04A1F]/20">
                {estimateLoading ? (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#E04A1F]" />
                    <span className="text-sm font-medium text-slate-600">Calcul de l&apos;estimation en cours...</span>
                  </div>
                ) : estimate ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#E04A1F]">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">Estimation du prix</h4>
                          <p className="text-xs text-slate-500">Calculee selon la distance Google Maps</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wider">
                        Pret
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Distance</p>
                        <p className="text-lg font-bold text-slate-900">{Number(estimate.distanceKm).toFixed(1)} km</p>
                      </div>
                      <div className="bg-white rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tarif au km</p>
                        <p className="text-lg font-bold text-slate-900">{Number(estimate.deliveryType.prixParKm).toLocaleString()} <span className="text-xs font-medium text-slate-500">FCFA</span></p>
                      </div>
                      <div className="bg-white rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Type de livraison</p>
                        <p className="text-lg font-bold text-slate-900 truncate">{estimate.deliveryType.nom || '—'}</p>
                      </div>
                    </div>
                    {estimate.isTva ? (
                      <div className="bg-white rounded-2xl p-5 border border-[#E04A1F]/20 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total HT</span>
                          <span className="font-medium text-slate-800">{Math.round(Number(estimate.totalHT)).toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">TVA</span>
                          <span className="font-medium text-slate-800">{Math.round(Number(estimate.tvaAmount)).toLocaleString()} FCFA</span>
                        </div>
                        <div className="h-px bg-slate-100 my-1" />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">Total TTC</span>
                          <span className="text-2xl font-extrabold text-[#E04A1F]">{Math.round(Number(estimate.totalTTC)).toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl p-5 border border-[#E04A1F]/20 flex justify-between items-center">
                        <span className="font-bold text-slate-900">Prix estime</span>
                        <span className="text-2xl font-extrabold text-[#E04A1F]">{Math.round(Number(estimate.originalPrice)).toLocaleString()} FCFA</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-3 py-2">
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-slate-600">Impossible de calculer l&apos;estimation pour le moment. Vous pouvez continuer, le prix sera calcule a l&apos;etape suivante.</p>
                  </div>
                )}
              </section>
            )}
          </motion.div>
        )}

        {/* Step 3: Expediteur */}
        {currentStep === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Informations expediteur</h3>

            <div className="space-y-2">
              <Label>Nom de l&apos;expediteur *</Label>
              <Input
                placeholder="Nom complet"
                value={formData.expediteurNom}
                onChange={(e) => setFormData(prev => ({ ...prev, expediteurNom: e.target.value, employeeId: null, expediteurTelephone: '', expediteurEmail: '' }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Telephone *</Label>
              <PhoneInput
                value={formData.expediteurTelephone}
                onChange={(val) => setFormData(prev => ({ ...prev, expediteurTelephone: val || '' }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Email (optionnel)</Label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={formData.expediteurEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, expediteurEmail: e.target.value }))}
              />
            </div>

            {/* Employee selector */}
            <div className="space-y-2">
              <Label>Employe (optionnel)</Label>
              <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <User className="mr-2 h-4 w-4" />
                    {selectedEmployee
                      ? `${selectedEmployee.prenom || ''} ${selectedEmployee.nom || ''}`.trim()
                      : 'Selectionner un employe'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher..."
                      value={employeeSearch}
                      onValueChange={setEmployeeSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-center">
                          <p className="text-sm text-slate-500 mb-2">Aucun employe trouve</p>
                          <Button size="sm" variant="outline" onClick={() => { setEmployeePopoverOpen(false); setShowAddEmployee(true); }}>
                            <UserPlus className="w-4 h-4 mr-1" /> Ajouter
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredEmployees.map(emp => (
                          <CommandItem
                            key={emp.id}
                            onSelect={() => {
                              setFormData(prev => ({
                                ...prev,
                                employeeId: emp.id,
                                expediteurNom: `${emp.prenom || ''} ${emp.nom || ''}`.trim(),
                                expediteurTelephone: emp.telephone || prev.expediteurTelephone,
                                expediteurEmail: emp.email || prev.expediteurEmail,
                                // Si le meme employe etait deja selectionne comme destinataire, on le retire
                                ...(prev.destinataireEmployeeId === emp.id ? {
                                  destinataireEmployeeId: null,
                                  destinataireNom: '',
                                  destinataireTelephone: '',
                                  destinataireEmail: '',
                                } : {}),
                              }));
                              setEmployeePopoverOpen(false);
                            }}
                          >
                            <div>
                              <p className="font-medium">{emp.prenom} {emp.nom}</p>
                              <p className="text-xs text-slate-500">{emp.email || emp.telephone}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
        )}

        {/* Step 4: Destinataire */}
        {currentStep === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Informations destinataire</h3>

            <div className="space-y-2">
              <Label>Nom du destinataire *</Label>
              <Input
                placeholder="Nom complet"
                value={formData.destinataireNom}
                onChange={(e) => setFormData(prev => ({ ...prev, destinataireNom: e.target.value, destinataireEmployeeId: null, destinataireTelephone: '', destinataireEmail: '' }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Telephone *</Label>
              <PhoneInput
                value={formData.destinataireTelephone}
                onChange={(val) => setFormData(prev => ({ ...prev, destinataireTelephone: val || '' }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Email (optionnel)</Label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={formData.destinataireEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, destinataireEmail: e.target.value }))}
              />
            </div>

            {/* Employee selector for destinataire */}
            <div className="space-y-2">
              <Label>Employe (optionnel)</Label>
              <Popover open={destEmployeePopoverOpen} onOpenChange={setDestEmployeePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <User className="mr-2 h-4 w-4" />
                    {selectedDestEmployee
                      ? `${selectedDestEmployee.prenom || ''} ${selectedDestEmployee.nom || ''}`.trim()
                      : 'Selectionner un employe'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher..."
                      value={destEmployeeSearch}
                      onValueChange={setDestEmployeeSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-center">
                          {(() => {
                            const isSearchingForSender = formData.employeeId && destEmployeeSearch.trim() && employees.some(e =>
                              e.id === formData.employeeId &&
                              `${e.nom || ''} ${e.prenom || ''}`.toLowerCase().includes(destEmployeeSearch.toLowerCase())
                            );
                            if (isSearchingForSender) {
                              return <p className="text-sm text-[#E04A1F]">Cet employe est deja selectionne comme expediteur</p>;
                            }
                            return (
                              <>
                                <p className="text-sm text-slate-500 mb-2">Aucun employe trouve</p>
                                <Button size="sm" variant="outline" onClick={() => { setDestEmployeePopoverOpen(false); setShowAddEmployee(true); }}>
                                  <UserPlus className="w-4 h-4 mr-1" /> Ajouter
                                </Button>
                              </>
                            );
                          })()}
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredDestEmployees.map(emp => (
                          <CommandItem
                            key={emp.id}
                            onSelect={() => {
                              setFormData(prev => ({
                                ...prev,
                                destinataireEmployeeId: emp.id,
                                destinataireNom: `${emp.prenom || ''} ${emp.nom || ''}`.trim(),
                                destinataireTelephone: emp.telephone || prev.destinataireTelephone,
                                destinataireEmail: emp.email || prev.destinataireEmail,
                              }));
                              setDestEmployeePopoverOpen(false);
                            }}
                          >
                            <div>
                              <p className="font-medium">{emp.prenom} {emp.nom}</p>
                              <p className="text-xs text-slate-500">{emp.email || emp.telephone}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
        )}

        {/* Step 5: Description & Notes */}
        {currentStep === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Details de la livraison</h3>

            <div className="space-y-2">
              <Label>Description du colis</Label>
              <Textarea
                placeholder="Decrivez le contenu de la livraison..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes / Instructions</Label>
              <Textarea
                placeholder="Instructions speciales pour le livreur..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Summary preview */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
              <h4 className="font-semibold text-slate-800">Resume</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="font-medium text-slate-800">
                    {formData.deliveryDate && format(new Date(formData.deliveryDate), 'dd MMM yyyy', { locale: fr })} a {formData.deliveryTime}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Expediteur</span>
                  <p className="font-medium text-slate-800">{formData.expediteurNom}</p>
                </div>
                <div>
                  <span className="text-slate-500">Destinataire</span>
                  <p className="font-medium text-slate-800">{formData.destinataireNom}</p>
                </div>
                <div>
                  <span className="text-slate-500">Prise en charge</span>
                  <p className="font-medium text-slate-800">{formData.pickupAddress}</p>
                </div>
                <div>
                  <span className="text-slate-500">Livraison</span>
                  <p className="font-medium text-slate-800">{formData.dropoffAddress}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 6: Confirmation */}
        {currentStep === 6 && (
          <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Recapitulatif de la livraison</h3>

            {/* Addresses */}
            <div className="p-6 rounded-xl bg-slate-50 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Prise en charge</p>
                  <p className="font-medium text-slate-800">{formData.pickupAddress}</p>
                </div>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-slate-300 h-4" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Livraison</p>
                  <p className="font-medium text-slate-800">{formData.dropoffAddress}</p>
                </div>
              </div>
            </div>

            {/* Date & Type */}
            <div className="p-6 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Date & Heure</p>
                  <p className="font-medium text-slate-800">
                    {formData.deliveryDate && format(new Date(formData.deliveryDate), 'dd MMM yyyy', { locale: fr })}
                    {' a '}{formData.deliveryTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="font-medium text-slate-800">{deliveryTypes.find(t => t.id === formData.deliveryTypeId)?.nom || `Type #${formData.deliveryTypeId}`}</p>
                </div>
              </div>
            </div>

            {/* Expediteur & Destinataire */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Expediteur</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E04A1F] flex items-center justify-center text-white font-semibold">
                    {formData.expediteurNom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{formData.expediteurNom}</p>
                    <p className="text-sm text-slate-500">{formData.expediteurTelephone}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Destinataire</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {formData.destinataireNom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{formData.destinataireNom}</p>
                    <p className="text-sm text-slate-500">{formData.destinataireTelephone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {formData.description && (
              <div className="p-6 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-800">{formData.description}</p>
              </div>
            )}

            {/* Estimation du prix */}
            {estimateLoading ? (
              <div className="p-6 rounded-xl bg-[#ffdbd0]/40 border border-orange-200 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-sm text-slate-600">Calcul du prix en cours...</span>
              </div>
            ) : estimate ? (
              <div className="p-6 rounded-xl bg-[#ffdbd0]/40 border border-orange-200 space-y-3">
                <h4 className="font-semibold text-slate-800">Estimation du prix</h4>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Distance (Google Maps)</span>
                  <span className="font-medium text-slate-800">{Number(estimate.distanceKm).toFixed(1)} km</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Tarif</span>
                  <span className="font-medium text-slate-800">{Number(estimate.deliveryType.prixParKm).toLocaleString()} FCFA/km</span>
                </div>
                {estimate.isTva ? (
                  <>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-orange-200">
                      <span className="text-slate-600">Total HT</span>
                      <span className="font-medium text-slate-800">{Math.round(Number(estimate.totalHT)).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">TVA (18%)</span>
                      <span className="font-medium text-slate-800">{Math.round(Number(estimate.tvaAmount)).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                      <span className="font-semibold text-slate-800">Total TTC</span>
                      <span className="text-2xl font-bold text-[#E04A1F]">{Math.round(Number(estimate.totalTTC)).toLocaleString()} FCFA</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className="text-2xl font-bold text-[#E04A1F]">{Math.round(Number(estimate.originalPrice)).toLocaleString()} FCFA</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">
                  Le prix sera calcule automatiquement en fonction de la distance.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      </div>

      {/* Right column: contextual side panel */}
      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
        {currentStep === 6 ? null : currentStep === 1 ? (
          <>
            {/* Delivery Schedule promo */}
            <div className="bg-[#ffdbd0] rounded-[2rem] p-6 relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#852300] bg-white/50 px-3 py-1 rounded-full">
                Avantage Business
              </span>
              <h4
                className="text-xl font-extrabold text-[#3a0a00] mt-4 mb-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Livraisons garanties.
              </h4>
              <p className="text-sm text-[#852300] mb-4 leading-relaxed">
                Selection du transporteur optimisee selon le type de colis pour des delais minimaux.
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-[#E04A1F]">
                <ArrowRight className="w-4 h-4" />
                <span>Suivi en temps reel</span>
              </div>
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#E04A1F]/10 rounded-full blur-2xl" />
            </div>

            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0">
                  <span className="font-black text-sm">?</span>
                </div>
                <div>
                  <p className="font-bold text-[#171c1f] text-sm">Besoin d&apos;aide ?</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Notre conciergerie business est disponible 24/7 pour vous assister.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-full py-2.5 bg-[#171c1f] text-white text-sm font-bold rounded-xl hover:bg-[#2c3134] transition-colors"
              >
                Contacter un gestionnaire
              </button>
            </div>

            <div className="rounded-[1.5rem] overflow-hidden relative h-44 group bg-gradient-to-br from-[#171c1f] to-[#2c3134]">
              {motoPromoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={motoPromoImage}
                  alt="Moto livraison"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Truck className="absolute -right-6 -top-6 w-32 h-32 text-white/10" strokeWidth={1.5} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-end p-5">
                <div>
                  <p
                    className="text-white font-bold text-lg leading-tight"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Reseau Premium Subito
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Transporteurs partenaires verifies, assurance incluse.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[#171c1f] text-white rounded-[2rem] shadow-2xl p-6 relative overflow-hidden">
            <h3
              className="text-lg font-bold mb-6 flex items-center gap-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              <Package className="w-5 h-5 text-[#E04A1F]" />
              Resume de la commande
            </h3>

            <div className="space-y-4 mb-6">
              {(() => {
                const sel = deliveryTypes.find(t => t.id === formData.deliveryTypeId);
                if (!sel) return null;
                return (
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-[#E04A1F]/20 flex items-center justify-center text-[#E04A1F] shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        Vehicule
                      </p>
                      <p className="text-sm font-bold truncate">{sel.nom}</p>
                    </div>
                  </div>
                );
              })()}

              {(formData.deliveryDate || formData.deliveryTime) && (
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-[#E04A1F]/20 flex items-center justify-center text-[#E04A1F] shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Date de ramassage
                    </p>
                    <p className="text-sm font-bold">
                      {formData.deliveryDate
                        ? format(new Date(formData.deliveryDate), "dd MMM yyyy", { locale: fr })
                        : "—"}
                      {formData.deliveryTime ? `, ${formData.deliveryTime}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {formData.pickupAddress && (
                <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-[#E04A1F]/20 flex items-center justify-center text-[#E04A1F] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Expediteur
                    </p>
                    <p className="text-sm font-bold truncate">
                      {formData.expediteurNom || "—"}
                    </p>
                    <p className="text-xs text-white/60 truncate">{formData.pickupAddress}</p>
                  </div>
                </div>
              )}

              {formData.dropoffAddress && (
                <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-[#E04A1F]/20 flex items-center justify-center text-[#E04A1F] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Destinataire
                    </p>
                    <p className="text-sm font-bold truncate">
                      {formData.destinataireNom || "—"}
                    </p>
                    <p className="text-xs text-white/60 truncate">{formData.dropoffAddress}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-end justify-between pb-4 border-b border-white/10">
              <span className="text-sm text-white/60">Frais de prise en charge</span>
              <span
                className="text-2xl font-black text-[#E04A1F]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {estimate
                  ? `${Math.round(Number(estimate.totalTTC ?? estimate.originalPrice ?? 0)).toLocaleString()} FCFA`
                  : "—"}
              </span>
            </div>

            <p className="text-[10px] text-center text-white/40 mt-4 uppercase tracking-widest font-bold">
              Etape {currentStep} sur {steps.length}
            </p>

            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E04A1F]/20 rounded-full blur-3xl" />
          </div>
        )}
      </aside>
      </div>
      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mt-8 bg-slate-50 p-4 md:p-6 rounded-2xl">
        {currentStep > 1 ? (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 text-slate-600 font-bold px-6 py-3 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        ) : <div />}

        {currentStep < 6 ? (
          <Button
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
            onClick={handleNext}
            disabled={!canNext()}
          >
            Suivant <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirmer la livraison
          </Button>
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un employe</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            departments={departments}
            isSubmitting={false}
            onSubmit={async (data: CreateEmployeeDto) => {
              try {
                await api.employees.create(data);
                queryClient.invalidateQueries({ queryKey: ['employees'] });
                setShowAddEmployee(false);
                toast.success("Employe ajoute");
              } catch {
                toast.error("Erreur lors de l'ajout");
              }
            }}
            onCancel={() => setShowAddEmployee(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== DELIVERIES LIST ====================
function DeliveriesList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryResponse | null>(null);
  const limit = 10;

  const { data: listResponse, isLoading } = useQuery({
    queryKey: ['deliveries', page, statusFilter],
    queryFn: () => api.deliveries.list({
      page,
      limit,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const rawData = listResponse?.data || listResponse;
  const deliveries: DeliveryResponse[] = (rawData as any)?.list || [];
  const total: number = (rawData as any)?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Detail fetch
  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['delivery-detail', selectedDelivery?.id],
    queryFn: () => api.deliveries.get(selectedDelivery!.id),
    enabled: !!selectedDelivery?.id && detailOpen,
  });
  const deliveryDetail: DeliveryResponse | null = (detailResponse?.data || detailResponse || null) as DeliveryResponse | null;

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.deliveries.cancel(id),
    onSuccess: () => {
      toast.success("Livraison annulee");
      setDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Impossible d'annuler cette livraison");
    },
  });

  const filtered = deliveries.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.reference?.toLowerCase().includes(term) ||
      d.expediteurNom?.toLowerCase().includes(term) ||
      d.destinataireNom?.toLowerCase().includes(term) ||
      d.pickupAddress?.toLowerCase().includes(term) ||
      d.dropoffAddress?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Rechercher par reference, client, adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune livraison trouvee</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expediteur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Destinataire</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trajet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prix</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const st = statusLabels[d.status || ''] || { label: d.status || '—', color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-subito">{d.reference || `#${d.id}`}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{d.expediteurNom || '—'}</p>
                        <p className="text-xs text-slate-500">{d.expediteurTelephone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{d.destinataireNom || '—'}</p>
                        <p className="text-xs text-slate-500">{d.destinataireTelephone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px]">
                        <p className="truncate">{d.pickupAddress}</p>
                        <p className="truncate text-xs text-slate-400">{d.dropoffAddress}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {d.deliveryDate ? format(new Date(d.deliveryDate), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {d.totalTTC ? `${Math.round(Number(d.totalTTC)).toLocaleString()} FCFA` : d.originalPrice ? `${Math.round(Number(d.originalPrice)).toLocaleString()} FCFA` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/deliveries/${d.id}`}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Détail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} livraison(s)</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0 bg-[#f6fafe]">
          <DialogHeader className="sr-only">
            <DialogTitle>Suivi de la livraison</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F]" />
            </div>
          ) : deliveryDetail ? (
            (() => {
              const statusKey = (deliveryDetail.status || "").toLowerCase();
              const trackSteps = [
                { id: "assigned", label: "Assigne", time: "Pris en charge" },
                { id: "picked_up", label: "Recupere", time: "En main" },
                { id: "in_transit", label: "En transit", time: "En route" },
                { id: "delivered", label: "Livre", time: "Termine" },
              ];
              const order = ["pending", "confirmed", "assigned", "picked_up", "in_transit", "delivered"];
              const currentIdx = order.indexOf(statusKey);
              const stepIdx = (() => {
                if (statusKey === "delivered") return 3;
                if (statusKey === "in_transit") return 2;
                if (statusKey === "picked_up") return 1;
                if (statusKey === "assigned" || statusKey === "confirmed") return 0;
                return -1;
              })();
              const isCancelled = statusKey === "cancelled";
              const totalAmount = Number(
                deliveryDetail.totalTTC || deliveryDetail.originalPrice || 0
              );

              return (
                <div className="p-6 md:p-8 space-y-6">
                  {/* Hero header */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E04A1F] mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E04A1F] animate-pulse" />
                        Live Tracking
                      </p>
                      <h2
                        className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f]"
                        style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                      >
                        Order {deliveryDetail.reference || `#${deliveryDetail.id}`}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-4 py-1.5 ${
                          (statusLabels[deliveryDetail.status || ""] || { color: "bg-slate-100 text-slate-700" }).color
                        } rounded-full text-xs font-bold flex items-center gap-2`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {(statusLabels[deliveryDetail.status || ""] || { label: deliveryDetail.status }).label}
                      </span>
                      {deliveryDetail.deliveryType?.name && (
                        <span className="px-4 py-1.5 bg-[#00acbb]/10 text-[#006972] rounded-full text-xs font-bold whitespace-nowrap">
                          {deliveryDetail.deliveryType.name}
                        </span>
                      )}
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
                                    isActive
                                      ? "text-[#E04A1F]"
                                      : isDone
                                      ? "text-[#171c1f]"
                                      : "text-slate-400"
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
                        {/* Grid texture */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                          }}
                        />
                        {/* Animated route line */}
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
                        {/* Pickup marker */}
                        <div className="absolute left-[8%] bottom-[18%] flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-[#00acbb] ring-4 ring-[#00acbb]/30" />
                          <div className="text-[10px] font-bold text-[#00acbb] mt-1 uppercase tracking-widest bg-white/10 backdrop-blur-md px-2 py-0.5 rounded">
                            Depart
                          </div>
                        </div>
                        {/* Courier marker */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="relative">
                            <div className="absolute inset-0 bg-[#E04A1F]/30 animate-ping rounded-full scale-150" />
                            <div className="w-12 h-12 rounded-full bg-[#E04A1F] flex items-center justify-center shadow-2xl shadow-[#E04A1F]/50 relative">
                              <Truck className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                        {/* Dropoff marker */}
                        <div className="absolute right-[8%] top-[15%] flex flex-col items-center">
                          <MapPin className="w-8 h-8 text-[#E04A1F] drop-shadow-lg" fill="#E04A1F" />
                          <div className="text-[10px] font-bold text-white mt-1 uppercase tracking-widest bg-[#E04A1F]/80 backdrop-blur-md px-2 py-0.5 rounded">
                            Arrivee
                          </div>
                        </div>
                        {/* Map controls */}
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
                                {deliveryDetail.deliveryType?.name || "—"}
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

                      {/* Delivery details */}
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                          Details de la livraison
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#00acbb]/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-[#00acbb]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Pick-up
                              </p>
                              <p className="text-sm font-bold text-[#171c1f] truncate">
                                {deliveryDetail.expediteurNom || "—"}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {deliveryDetail.pickupAddress}
                              </p>
                            </div>
                          </div>
                          <div className="ml-3 border-l-2 border-dashed border-slate-200 h-3" />
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#E04A1F]/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-[#E04A1F]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Delivery
                              </p>
                              <p className="text-sm font-bold text-[#171c1f] truncate">
                                {deliveryDetail.destinataireNom || "—"}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {deliveryDetail.dropoffAddress}
                              </p>
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

                      {deliveryDetail.status?.toLowerCase() === "pending" && (
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
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
