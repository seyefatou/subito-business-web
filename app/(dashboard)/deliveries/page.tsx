'use client';

import React, { useState, useRef, useEffect } from "react";
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
        <div className="p-3 rounded-xl gradient-subito">
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
    `${e.nom || ''} ${e.prenom || ''}`.toLowerCase().includes(destEmployeeSearch.toLowerCase())
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

  // Fetch estimate when reaching confirmation step
  useEffect(() => {
    if (currentStep === 6 && formData.deliveryTypeId && formData.pickupLat && formData.pickupLng && formData.dropoffLat && formData.dropoffLng) {
      setEstimateLoading(true);
      setEstimate(null);
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        <div className="w-20 h-20 rounded-full gradient-subito flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Livraison creee !</h2>
        {bookingRef && (
          <p className="text-slate-500 mb-6">Reference : <span className="font-mono font-semibold text-subito">{bookingRef}</span></p>
        )}
        <p className="text-sm text-slate-400 mb-8">L&apos;admin doit confirmer la livraison avant d&apos;assigner un livreur.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setBookingSuccess(false); setFormData(initialFormData); setCurrentStep(1); }}>
            Nouvelle livraison
          </Button>
          <Button className="gradient-subito text-white border-0" onClick={onSuccess}>
            Voir mes livraisons
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'gradient-subito text-white shadow-lg scale-110' :
                  isDone ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-subito' : 'text-slate-400'}`}>{step.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded ${isDone ? 'bg-green-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {/* Step 1: Type + Date */}
        {currentStep === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Type et horaire de livraison</h3>

            <div className="space-y-2">
              <Label>Type de livraison *</Label>
              {deliveryTypes.length === 0 ? (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-50 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement des types...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {deliveryTypes.map(t => {
                    const selected = formData.deliveryTypeId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setFormData(prev => ({ ...prev, deliveryTypeId: t.id }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {t.image && (
                          <img src={t.image} alt={t.nom} className="w-12 h-12 object-contain mb-2 rounded" />
                        )}
                        <p className={`font-medium ${selected ? 'text-orange-700' : 'text-slate-700'}`}>{t.nom}</p>
                        {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de livraison *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                <Label>Heure *</Label>
                <TimePicker
                  value={formData.deliveryTime}
                  onChange={(v) => setFormData(prev => ({ ...prev, deliveryTime: v }))}
                  selectedDate={formData.deliveryDate || null}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Addresses */}
        {currentStep === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Adresses</h3>

            {/* Pickup */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-slate-700">Prise en charge</span>
              </div>
              <AddressAutocomplete
                value={formData.pickupAddress}
                onChange={(val) => setFormData(prev => ({ ...prev, pickupAddress: val, pickupLat: null, pickupLng: null }))}
                onSelect={(address, lat, lng) => setFormData(prev => ({ ...prev, pickupAddress: address, pickupLat: lat, pickupLng: lng }))}
                placeholder="Tapez une adresse (ex: Ouakam, Dakar)"
                iconColor="text-green-500"
              />
              {formData.pickupLat && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Adresse confirmee ({formData.pickupLat.toFixed(4)}, {formData.pickupLng?.toFixed(4)})
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
              </div>
            </div>

            {/* Dropoff */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-medium text-slate-700">Livraison</span>
              </div>
              <AddressAutocomplete
                value={formData.dropoffAddress}
                onChange={(val) => setFormData(prev => ({ ...prev, dropoffAddress: val, dropoffLat: null, dropoffLng: null }))}
                onSelect={(address, lat, lng) => setFormData(prev => ({ ...prev, dropoffAddress: address, dropoffLat: lat, dropoffLng: lng }))}
                placeholder="Tapez une adresse (ex: Plateau, Dakar)"
                iconColor="text-red-500"
              />
              {formData.dropoffLat && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Adresse confirmee ({formData.dropoffLat.toFixed(4)}, {formData.dropoffLng?.toFixed(4)})
                </p>
              )}
            </div>
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
                onChange={(e) => setFormData(prev => ({ ...prev, expediteurNom: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, destinataireNom: e.target.value }))}
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
                          <p className="text-sm text-slate-500 mb-2">Aucun employe trouve</p>
                          <Button size="sm" variant="outline" onClick={() => { setDestEmployeePopoverOpen(false); setShowAddEmployee(true); }}>
                            <UserPlus className="w-4 h-4 mr-1" /> Ajouter
                          </Button>
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
                  <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-semibold">
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
              <div className="p-6 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-sm text-slate-600">Calcul du prix en cours...</span>
              </div>
            ) : estimate ? (
              <div className="p-6 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
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
                      <span className="text-2xl font-bold text-orange-600">{Math.round(Number(estimate.totalTTC)).toLocaleString()} FCFA</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className="text-2xl font-bold text-orange-600">{Math.round(Number(estimate.originalPrice)).toLocaleString()} FCFA</span>
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

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        {currentStep > 1 ? (
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        ) : <div />}

        {currentStep < 6 ? (
          <Button
            className="gradient-subito text-white border-0 gap-2"
            onClick={handleNext}
            disabled={!canNext()}
          >
            Suivant <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="gradient-subito text-white border-0 gap-2"
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
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedDelivery(d); setDetailOpen(true); }}>
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
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedDelivery(d); setDetailOpen(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-subito">
                <Package className="w-5 h-5 text-white" />
              </div>
              Detail de la livraison
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : deliveryDetail ? (
            <div className="space-y-4">
              {/* Reference & Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-subito">{deliveryDetail.reference || `#${deliveryDetail.id}`}</span>
                <Badge className={`${(statusLabels[deliveryDetail.status || ''] || { color: 'bg-slate-100 text-slate-700' }).color} border-0`}>
                  {(statusLabels[deliveryDetail.status || ''] || { label: deliveryDetail.status }).label}
                </Badge>
              </div>

              {/* Addresses */}
              <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Prise en charge</p>
                    <p className="font-medium text-slate-800 text-sm">{deliveryDetail.pickupAddress}</p>
                  </div>
                </div>
                <div className="ml-1.5 border-l-2 border-dashed border-slate-300 h-3" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Livraison</p>
                    <p className="font-medium text-slate-800 text-sm">{deliveryDetail.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">Date & Heure</p>
                  <p className="text-sm font-medium text-slate-800">
                    {deliveryDetail.deliveryDate ? format(new Date(deliveryDetail.deliveryDate), 'dd MMM yyyy', { locale: fr }) : '—'}
                    {deliveryDetail.deliveryTime ? ` a ${deliveryDetail.deliveryTime}` : ''}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="text-sm font-medium text-slate-800">{deliveryDetail.deliveryType?.name || '—'}</p>
                </div>
              </div>

              {/* Expediteur */}
              <div className="p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Expediteur</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-semibold text-sm">
                    {deliveryDetail.expediteurNom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{deliveryDetail.expediteurNom}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {deliveryDetail.expediteurTelephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{deliveryDetail.expediteurTelephone}</span>}
                      {deliveryDetail.expediteurEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{deliveryDetail.expediteurEmail}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Destinataire */}
              <div className="p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Destinataire</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {deliveryDetail.destinataireNom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{deliveryDetail.destinataireNom}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {deliveryDetail.destinataireTelephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{deliveryDetail.destinataireTelephone}</span>}
                      {deliveryDetail.destinataireEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{deliveryDetail.destinataireEmail}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Livreur */}
              {deliveryDetail.livreur && (
                <div className="p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">Livreur assigne</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{deliveryDetail.livreur.prenom} {deliveryDetail.livreur.nom}</p>
                      {deliveryDetail.livreur.telephone && (
                        <p className="text-xs text-slate-500">{deliveryDetail.livreur.telephone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description & Notes */}
              {(deliveryDetail.description || deliveryDetail.notes) && (
                <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                  {deliveryDetail.description && (
                    <div>
                      <p className="text-xs text-slate-500">Description</p>
                      <p className="text-sm text-slate-800">{deliveryDetail.description}</p>
                    </div>
                  )}
                  {deliveryDetail.notes && (
                    <div>
                      <p className="text-xs text-slate-500">Notes</p>
                      <p className="text-sm text-slate-800">{deliveryDetail.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Distance & Price */}
              {(deliveryDetail.totalTTC || deliveryDetail.originalPrice) && (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-2">
                  {(deliveryDetail.distanceKm || deliveryDetail.distance) && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Distance</span>
                      <span className="font-medium text-slate-800">{Number(deliveryDetail.distanceKm || deliveryDetail.distance).toFixed(1)} km</span>
                    </div>
                  )}
                  {deliveryDetail.isTva && deliveryDetail.totalHT ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total HT</span>
                        <span className="text-lg font-semibold text-slate-800">{Math.round(Number(deliveryDetail.totalHT)).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">TVA (18%)</span>
                        <span className="font-medium text-slate-800">{Math.round(Number(deliveryDetail.tvaAmount || 0)).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                        <span className="font-semibold text-slate-800">Total TTC</span>
                        <span className="text-2xl font-bold text-orange-600">{Math.round(Number(deliveryDetail.totalTTC)).toLocaleString()} FCFA</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">Total</span>
                      <span className="text-2xl font-bold text-orange-600">{Math.round(Number(deliveryDetail.originalPrice || deliveryDetail.totalTTC)).toLocaleString()} FCFA</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tracking History */}
              {deliveryDetail.trackingHistory && deliveryDetail.trackingHistory.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 mb-3">Historique de suivi</p>
                  <div className="space-y-3">
                    {deliveryDetail.trackingHistory.map((t, i) => {
                      const st = statusLabels[t.status] || { label: t.status, color: 'bg-slate-100 text-slate-700' };
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                              <span className="text-xs text-slate-400">
                                {t.timestamp && format(new Date(t.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            </div>
                            {t.comment && <p className="text-xs text-slate-600 mt-1">{t.comment}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cancel button — only for pending */}
              {deliveryDetail.status?.toLowerCase() === 'pending' && (
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => cancelMutation.mutate(deliveryDetail.id)}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Annuler cette livraison
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
