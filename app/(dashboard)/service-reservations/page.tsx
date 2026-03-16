'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Compass,
  MapPin,
  Hotel,
  Car,
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
  Package,
  CheckCircle2,
  Mail,
  Phone,
  FileText,
  Users,
  Star,
  Fuel,
  Settings2,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  api,
  Circuit,
  Activite,
  ActiviteCircuitItem,
  Logement,
  ChambreHotel,
  VehiculeLocation,
  CreateServiceReservationDto,
  CreateEmployeeDto,
  ServiceReservationResponse,
  EmployeeResponse,
  DepartmentResponse,
  PaymentOption,
  toBookingPaymentMethod,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import EmployeeForm from "@/components/employees/EmployeeForm";

// ==================== TYPES ====================
type ServiceType = 'ACTIVITE' | 'LOGEMENT' | 'FLOTTE';

interface StepDef {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepDef[] = [
  { id: 1, title: "Service", icon: Compass },
  { id: 2, title: "Selection", icon: Search },
  { id: 3, title: "Client", icon: User },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

type ActiviteFilterType = 'all' | 'circuit' | 'activite';
type LogementFilterType = 'all' | 'hotel' | 'appartement';

interface FormData {
  serviceType: ServiceType | '';
  circuitId: number | null;
  activiteId: number | null;
  selectedItemType: 'circuit' | 'activite' | null;
  logementId: number | null;
  chambreId: number | null;
  vehiculeLocationId: number | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  dateDebut: string;
  dateFin: string;
  notes: string;
  nombrePersonnes: number;
  adresseLivraison: string;
  employeeId: number | null;
  payment_method: string;
}

const initialFormData: FormData = {
  serviceType: '',
  circuitId: null,
  activiteId: null,
  selectedItemType: null,
  logementId: null,
  chambreId: null,
  vehiculeLocationId: null,
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  dateDebut: '',
  dateFin: '',
  notes: '',
  nombrePersonnes: 1,
  adresseLivraison: '',
  employeeId: null,
  payment_method: '',
};

const serviceTypeLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  ACTIVITE: { label: "Activite", icon: MapPin, color: "bg-emerald-100 text-emerald-700" },
  LOGEMENT: { label: "Logement", icon: Hotel, color: "bg-blue-100 text-blue-700" },
  FLOTTE: { label: "Location de vehicule", icon: Car, color: "bg-purple-100 text-purple-700" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirme", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En cours", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Termine", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annule", color: "bg-red-100 text-red-700" },
  paid: { label: "Paye", color: "bg-green-100 text-green-700" },
};

// ==================== MAIN COMPONENT ====================
const servicePageConfig: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVITE: { title: "Activite", subtitle: "Reservez une activite pour vos employes", icon: MapPin },
  LOGEMENT: { title: "Logement", subtitle: "Reservez un logement pour vos employes", icon: Hotel },
  FLOTTE: { title: "Location de vehicule", subtitle: "Louez un vehicule pour vos employes", icon: Car },
};

export default function ServiceReservations() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as ServiceType | null;
  const config = typeParam && servicePageConfig[typeParam] ? servicePageConfig[typeParam] : null;
  const HeaderIcon = config?.icon || Compass;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl gradient-subito">
          <HeaderIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{config?.title || 'Reservations Services'}</h1>
          <p className="text-slate-500">{config?.subtitle || 'Circuits, logements et vehicules de location'}</p>
        </div>
      </div>

      <NewReservationForm key={typeParam || 'all'} defaultServiceType={typeParam || undefined} onSuccess={() => {}} />
    </div>
  );
}

// ==================== NEW RESERVATION FORM ====================
function NewReservationForm({ onSuccess, defaultServiceType }: { onSuccess: () => void; defaultServiceType?: ServiceType }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(defaultServiceType ? 2 : 1);
  const [formData, setFormData] = useState<FormData>(() => {
    const logementIdParam = searchParams.get('logementId');
    const chambreIdParam = searchParams.get('chambreId');
    const vehiculeIdParam = searchParams.get('vehiculeLocationId');
    const circuitIdParam = searchParams.get('circuitId');
    const activiteIdParam = searchParams.get('activiteId');
    const selectedItemTypeParam = searchParams.get('selectedItemType') as 'circuit' | 'activite' | null;
    return {
      ...initialFormData,
      serviceType: defaultServiceType || '',
      logementId: logementIdParam ? Number(logementIdParam) : null,
      chambreId: chambreIdParam ? Number(chambreIdParam) : null,
      vehiculeLocationId: vehiculeIdParam ? Number(vehiculeIdParam) : null,
      circuitId: circuitIdParam ? Number(circuitIdParam) : null,
      activiteId: activiteIdParam ? Number(activiteIdParam) : null,
      selectedItemType: selectedItemTypeParam || null,
    };
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [activiteFilter, setActiviteFilter] = useState<ActiviteFilterType>('all');
  const [logementFilter, setLogementFilter] = useState<LogementFilterType>('all');
  const [logementChambresFilter, setLogementChambresFilter] = useState<number | null>(null);
  const [vehiculePlacesFilter, setVehiculePlacesFilter] = useState<number | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Fetch employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees.list({ limit: 100, actif: true }),
  });
  const employeesRaw = employeesResponse?.data;
  const employees: EmployeeResponse[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as any)?.items || (employeesRaw as any)?.list || [];

  // Fetch departments (for EmployeeForm)
  const { data: departmentsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(1, 100),
  });
  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];

  // Fetch circuits
  const { data: circuitsResponse, isLoading: circuitsLoading } = useQuery({
    queryKey: ['circuits-public'],
    queryFn: () => api.circuits.listPublic(1, 100),
    enabled: formData.serviceType === 'ACTIVITE',
  });
  const circuitsRaw = circuitsResponse?.data;
  const circuitsList: Circuit[] = Array.isArray(circuitsRaw)
    ? circuitsRaw
    : (circuitsRaw as any)?.items || (circuitsRaw as any)?.list || [];

  // Fetch activités
  const { data: activitesResponse, isLoading: activitesLoading } = useQuery({
    queryKey: ['activites-public'],
    queryFn: () => api.activites.listPublic(1, 100),
    enabled: formData.serviceType === 'ACTIVITE',
  });
  const activitesRaw = activitesResponse?.data;
  const activitesList: Activite[] = Array.isArray(activitesRaw)
    ? activitesRaw
    : (activitesRaw as any)?.items || (activitesRaw as any)?.list || [];

  // Combiner circuits et activités
  const allActivitesCircuits: ActiviteCircuitItem[] = [
    ...circuitsList.map(c => ({ ...c, type: 'circuit' as const })),
    ...activitesList.map(a => ({ ...a, type: 'activite' as const })),
  ];
  const activitesCircuitsLoading = circuitsLoading || activitesLoading;

  // Filtrer par type (circuit / activite / tous)
  const filteredActivitesCircuits = activiteFilter === 'all'
    ? allActivitesCircuits
    : allActivitesCircuits.filter(item => item.type === activiteFilter);

  // Fetch logements
  const { data: logementsResponse, isLoading: logementsLoading } = useQuery({
    queryKey: ['logements-public'],
    queryFn: () => api.logements.listPublic(1, 50),
    enabled: formData.serviceType === 'LOGEMENT',
  });
  const logementsRaw = logementsResponse?.data;
  const logements: Logement[] = Array.isArray(logementsRaw)
    ? logementsRaw
    : (logementsRaw as any)?.items || (logementsRaw as any)?.list || [];

  // Fetch vehicules
  const { data: vehiculesResponse, isLoading: vehiculesLoading } = useQuery({
    queryKey: ['vehicules-public'],
    queryFn: () => api.vehiculesLocation.listPublic(1, 50),
    enabled: formData.serviceType === 'FLOTTE',
  });
  const vehiculesRaw = vehiculesResponse?.data;
  const vehicules: VehiculeLocation[] = Array.isArray(vehiculesRaw)
    ? vehiculesRaw
    : (vehiculesRaw as any)?.items || (vehiculesRaw as any)?.list || [];

  // Fetch payment options
  const { data: payOptRes } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const apiMethods = (Array.isArray(payOptRes?.data) ? payOptRes.data : [])
    .filter((o: PaymentOption) => (o.slug || o.type) !== 'wallet' && o.name?.toLowerCase() !== 'portefeuille')
    .map((o: PaymentOption) => ({ id: o.slug || o.type || o.name?.toLowerCase() || '', label: o.name, desc: o.description || '', icon: o.icon || '' }));
  const paymentMethods = [
    ...apiMethods,
    { id: "company_account", label: "Compte entreprise", desc: "Facturation sur le compte", icon: "🏢" },
  ];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateServiceReservationDto) => api.serviceReservations.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['service-reservations'] });
      setBookingRef(response.data?.reference || `SRV-${Date.now()}`);
      setBookingSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de la reservation");
    },
  });

  // Create employee
  const createEmployee = useMutation({
    mutationFn: (data: CreateEmployeeDto) => api.employees.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      const emp = response.data;
      if (emp) {
        handleChange('employeeId', emp.id);
        handleChange('clientName', `${emp.prenom} ${emp.nom}`);
        if (emp.email) handleChange('clientEmail', emp.email);
        if (emp.telephone) handleChange('clientPhone', emp.telephone);
        if (emp.adresse) handleChange('adresseLivraison', emp.adresse);
      }
      setShowAddEmployee(false);
      toast.success("Employe ajoute avec succes");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'ajout de l'employe");
    },
  });

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedCircuit = allActivitesCircuits.find(c =>
    (formData.selectedItemType === 'activite' && c.type === 'activite' && c.id === formData.activiteId) ||
    (formData.selectedItemType === 'circuit' && c.type === 'circuit' && c.id === formData.circuitId)
  );
  const selectedLogement = logements.find(l => l.id === formData.logementId);
  const selectedChambre = selectedLogement?.chambresHotel?.find((ch: ChambreHotel) => ch.id === formData.chambreId);
  const isHotelType = selectedLogement && (selectedLogement.type || '').toLowerCase().includes('hotel');
  const selectedVehicule = vehicules.find(v => v.id === formData.vehiculeLocationId);

  const calculateTotal = (): number => {
    if (formData.serviceType === 'ACTIVITE' && selectedCircuit) {
      return (selectedCircuit.prix || 0) * formData.nombrePersonnes;
    }
    if (formData.serviceType === 'LOGEMENT' && selectedLogement) {
      // Pour un hôtel, utiliser le prix de la chambre sélectionnée
      const prixNuit = (isHotelType && selectedChambre) ? (selectedChambre.prixParNuit || 0) : (selectedLogement.prixParNuit || 0);
      if (formData.dateDebut && formData.dateFin) {
        const start = new Date(formData.dateDebut);
        const end = new Date(formData.dateFin);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return prixNuit * nights;
      }
      return prixNuit;
    }
    if (formData.serviceType === 'FLOTTE' && selectedVehicule) {
      if (formData.dateDebut && formData.dateFin) {
        const start = new Date(formData.dateDebut);
        const end = new Date(formData.dateFin);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return (selectedVehicule.prixParJour || 0) * days;
      }
      return selectedVehicule.prixParJour || 0;
    }
    return 0;
  };

  const cleanPhone = (phone: string): string => phone.replace(/[\s\-\.\(\)]/g, '');
  const isValidPhone = (phone: string): boolean => /^\+?\d{7,15}$/.test(cleanPhone(phone));

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.serviceType) { toast.error("Veuillez choisir un type de service"); return; }
    }
    if (currentStep === 2) {
      if (formData.serviceType === 'ACTIVITE' && !formData.circuitId && !formData.activiteId) { toast.error("Veuillez selectionner un circuit ou une activite"); return; }
      if (formData.serviceType === 'LOGEMENT' && !formData.logementId) { toast.error("Veuillez selectionner un logement"); return; }
      if (formData.serviceType === 'LOGEMENT' && formData.logementId) {
        const lg = logements.find(l => l.id === formData.logementId);
        if (lg && (lg.type || '').toLowerCase().includes('hotel') && lg.chambresHotel?.length && !formData.chambreId) {
          toast.error("Veuillez selectionner une chambre"); return;
        }
      }
      if (formData.serviceType === 'FLOTTE' && !formData.vehiculeLocationId) { toast.error("Veuillez selectionner un vehicule"); return; }
    }
    if (currentStep === 3) {
      if (!formData.clientName) { toast.error("Veuillez entrer le nom du client"); return; }
      if (!formData.clientPhone) { toast.error("Veuillez entrer le telephone"); return; }
      if (!isValidPhone(formData.clientPhone)) { toast.error("Numero de telephone invalide"); return; }
      if (!formData.dateDebut) { toast.error("Veuillez selectionner une date de debut"); return; }
      if (formData.serviceType === 'FLOTTE' && !formData.adresseLivraison) { toast.error("Veuillez entrer l'adresse de livraison"); return; }
    }
    if (currentStep === 4) {
      // Payment method is optional
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    const minStep = defaultServiceType ? 2 : 1;
    if (currentStep > minStep) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    const isCompanyPayment = formData.payment_method === 'company_account';

    const dto: CreateServiceReservationDto = {
      serviceType: formData.serviceType as ServiceType,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      clientEmail: formData.clientEmail || undefined,
      dateDebut: formData.dateDebut,
      dateFin: formData.dateFin || undefined,
      totalPrice: calculateTotal(),
      employeeId: formData.employeeId || undefined,
      notes: formData.notes || undefined,
      nombrePersonnes: formData.serviceType === 'ACTIVITE' ? formData.nombrePersonnes : undefined,
      adresseLivraison: formData.serviceType === 'FLOTTE' ? formData.adresseLivraison : undefined,
      paidBy: isCompanyPayment ? 'company' : 'client',
      paymentMethod: isCompanyPayment || !formData.payment_method ? undefined : toBookingPaymentMethod(formData.payment_method),
    };
    if (formData.serviceType === 'ACTIVITE') {
      if (formData.selectedItemType === 'activite') dto.activiteId = formData.activiteId!;
      else dto.circuitId = formData.circuitId!;
    }
    if (formData.serviceType === 'LOGEMENT') {
      dto.logementId = formData.logementId!;
      if (formData.chambreId) dto.chambreId = formData.chambreId;
    }
    if (formData.serviceType === 'FLOTTE') dto.vehiculeLocationId = formData.vehiculeLocationId!;

    createMutation.mutate(dto);
  };

  const handleReset = () => {
    setFormData({ ...initialFormData, serviceType: defaultServiceType || '' });
    setCurrentStep(defaultServiceType ? 2 : 1);
    setBookingSuccess(false);
    setBookingRef("");
  };

  // ==================== SUCCESS SCREEN ====================
  if (bookingSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-12"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Reservation confirmee !</h2>
        <p className="text-slate-500 mb-4">Votre reservation a ete enregistree avec succes.</p>
        <div className="bg-slate-50 rounded-xl p-4 mb-6 inline-block">
          <p className="text-sm text-slate-500">Reference</p>
          <p className="text-xl font-bold font-mono text-slate-800">{bookingRef}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleReset}>
            Nouvelle reservation
          </Button>
          <Button className="gradient-subito text-white border-0" onClick={() => router.push('/tracking')}>
            Voir mes reservations
          </Button>
        </div>
      </motion.div>
    );
  }

  // ==================== STEPPER ====================
  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center justify-between mb-8">
        {(() => {
          const displaySteps = defaultServiceType ? steps.filter(s => s.id !== 1) : steps;
          return displaySteps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'gradient-subito text-white shadow-lg' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-slate-100 text-slate-400' : ''}
                  `}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-orange-600' : 'text-slate-400'}`}>
                    {step.title}
                  </span>
                </div>
                {index < displaySteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step.id < currentStep ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          });
        })()}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* STEP 1: Service selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Choisissez un service</h2>
                <p className="text-slate-500">Selectionnez le type de service que vous souhaitez reserver</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  { type: 'ACTIVITE' as ServiceType, label: 'Activite', desc: 'Excursions et visites guidees', icon: MapPin, gradient: 'from-emerald-500 to-teal-500' },
                  { type: 'LOGEMENT' as ServiceType, label: 'Logement', desc: 'Hotels, riads et residences', icon: Hotel, gradient: 'from-blue-500 to-indigo-500' },
                  { type: 'FLOTTE' as ServiceType, label: 'Location vehicule', desc: 'Vehicules de location avec ou sans chauffeur', icon: Car, gradient: 'from-purple-500 to-pink-500' },
                ]).map((service) => {
                  const selected = formData.serviceType === service.type;
                  return (
                    <motion.div
                      key={service.type}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        handleChange('serviceType', service.type);
                        handleChange('circuitId', null);
                        handleChange('activiteId', null);
                        handleChange('selectedItemType', null);
                        handleChange('logementId', null);
                        handleChange('vehiculeLocationId', null);
                      }}
                      className={`
                        relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all border-2
                        ${selected ? 'border-orange-400 shadow-lg' : 'border-slate-200 hover:border-slate-300'}
                      `}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${service.gradient} flex items-center justify-center mb-4`}>
                        <service.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1">{service.label}</h3>
                      <p className="text-sm text-slate-500">{service.desc}</p>
                      {selected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Item selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  {formData.serviceType === 'ACTIVITE' && 'Choisissez une activite ou un circuit'}
                  {formData.serviceType === 'LOGEMENT' && 'Choisissez un logement'}
                  {formData.serviceType === 'FLOTTE' && 'Choisissez un vehicule'}
                </h2>
                <p className="text-slate-500">Selectionnez parmi les options disponibles</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={
                    formData.serviceType === 'ACTIVITE' ? 'Rechercher par nom, ville ou montant...' :
                    formData.serviceType === 'LOGEMENT' ? 'Rechercher par hotel, appartement, chambre, ville...' :
                    'Rechercher un vehicule...'
                  }
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Activités & Circuits */}
              {formData.serviceType === 'ACTIVITE' && (
                <>
                  {/* Filtre par type */}
                  <div className="flex gap-2">
                    {([
                      { value: 'all' as ActiviteFilterType, label: 'Tous' },
                      { value: 'circuit' as ActiviteFilterType, label: 'Circuits' },
                      { value: 'activite' as ActiviteFilterType, label: 'Activites' },
                    ]).map((filter) => (
                      <Button
                        key={filter.value}
                        variant={activiteFilter === filter.value ? 'default' : 'outline'}
                        size="sm"
                        className={activiteFilter === filter.value ? 'gradient-subito text-white border-0' : ''}
                        onClick={() => setActiviteFilter(filter.value)}
                      >
                        {filter.label}
                        {filter.value !== 'all' && (
                          <span className="ml-1.5 text-xs opacity-75">
                            ({allActivitesCircuits.filter(i => filter.value === 'all' || i.type === filter.value).length})
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>

                  {activitesCircuitsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  ) : filteredActivitesCircuits.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Aucune offre disponible</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredActivitesCircuits
                        .filter(c => {
                          if (!itemSearch) return true;
                          const search = itemSearch.toLowerCase();
                          return (c.titre || '').toLowerCase().includes(search)
                            || (c.ville || '').toLowerCase().includes(search)
                            || (c.descriptionCourte || '').toLowerCase().includes(search)
                            || (c.prix != null && c.prix.toString().includes(search));
                        })
                        .map((item) => {
                          const isCircuit = item.type === 'circuit';
                          const selected = isCircuit
                            ? (formData.circuitId === item.id && formData.selectedItemType === 'circuit')
                            : (formData.activiteId === item.id && formData.selectedItemType === 'activite');
                          return (
                            <motion.div
                              key={`${item.type}-${item.id}`}
                              whileHover={{ scale: 1.01 }}
                              onClick={() => {
                                router.push(`/service-reservations/activite/${item.id}?type=${item.type}&returnTo=${encodeURIComponent('/service-reservations?type=ACTIVITE')}`);
                              }}
                              className={`
                                relative rounded-xl border-2 p-4 cursor-pointer transition-all
                                ${selected ? 'border-orange-400 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}
                              `}
                            >
                              {item.images?.[0] && (
                                <img src={item.images[0]} alt={item.titre} className="w-full h-32 object-cover rounded-lg mb-3" />
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-800">{item.titre}</h3>
                                <Badge className={`text-xs border-0 ${isCircuit ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {isCircuit ? 'Circuit' : 'Activite'}
                                </Badge>
                              </div>
                              {item.ville && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{item.ville}</p>}
                              {item.descriptionCourte && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.descriptionCourte}</p>}
                              <div className="flex items-center justify-between mt-3">
                                {item.duree && <Badge className="bg-slate-100 text-slate-700 border-0"><Clock className="w-3 h-3 mr-1" />{item.duree}</Badge>}
                                <span className="font-bold text-orange-600">{item.prix?.toLocaleString()} FCFA</span>
                              </div>
                              {selected && (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}

              {/* Logements */}
              {formData.serviceType === 'LOGEMENT' && (
                <>
                  {/* Filtre par type de logement */}
                  <div className="flex gap-2">
                    {([
                      { value: 'all' as LogementFilterType, label: 'Tous' },
                      { value: 'hotel' as LogementFilterType, label: 'Hotels' },
                      { value: 'appartement' as LogementFilterType, label: 'Appartements' },
                    ]).map((filter) => (
                      <Button
                        key={filter.value}
                        variant={logementFilter === filter.value ? 'default' : 'outline'}
                        size="sm"
                        className={logementFilter === filter.value ? 'gradient-subito text-white border-0' : ''}
                        onClick={() => setLogementFilter(filter.value)}
                      >
                        {filter.label}
                        {filter.value !== 'all' && (
                          <span className="ml-1.5 text-xs opacity-75">
                            ({logements.filter(l => {
                              const t = (l.type || '').toLowerCase();
                              if (filter.value === 'hotel') return t.includes('hotel');
                              if (filter.value === 'appartement') return t.includes('appart') || t.includes('residence') || t.includes('villa');
                              return true;
                            }).length})
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>

                  {/* Filtre par nombre de chambres (appartements/villas) */}
                  {logementFilter !== 'hotel' && (() => {
                    const chambresValues = Array.from(new Set(
                      logements
                        .filter(l => !(l.type || '').toLowerCase().includes('hotel') || logementFilter === 'all')
                        .map(l => l.nbreChambres)
                        .filter((c): c is number => c != null && c > 0)
                    )).sort((a, b) => a - b);
                    return chambresValues.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-500 font-medium">Chambres :</span>
                        <Button
                          variant={logementChambresFilter === null ? 'default' : 'outline'}
                          size="sm"
                          className={logementChambresFilter === null ? 'gradient-subito text-white border-0 h-7 text-xs' : 'h-7 text-xs'}
                          onClick={() => setLogementChambresFilter(null)}
                        >
                          Toutes
                        </Button>
                        {chambresValues.map((nb) => (
                          <Button
                            key={nb}
                            variant={logementChambresFilter === nb ? 'default' : 'outline'}
                            size="sm"
                            className={logementChambresFilter === nb ? 'gradient-subito text-white border-0 h-7 text-xs' : 'h-7 text-xs'}
                            onClick={() => setLogementChambresFilter(nb)}
                          >
                            {nb} ch.
                          </Button>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {logementsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  ) : logements.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Hotel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Aucun logement disponible</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {logements
                        .filter(l => {
                          // Filtre par type
                          if (logementFilter !== 'all') {
                            const t = (l.type || '').toLowerCase();
                            if (logementFilter === 'hotel' && !t.includes('hotel')) return false;
                            if (logementFilter === 'appartement' && !t.includes('appart') && !t.includes('residence') && !t.includes('villa')) return false;
                          }
                          // Filtre par nombre de chambres
                          if (logementChambresFilter !== null) {
                            if (l.nbreChambres !== logementChambresFilter) return false;
                          }
                          // Recherche textuelle
                          if (!itemSearch) return true;
                          const search = itemSearch.toLowerCase();
                          return (l.nom || '').toLowerCase().includes(search)
                            || (l.ville || '').toLowerCase().includes(search)
                            || (l.type || '').toLowerCase().includes(search)
                            || (l.description || '').toLowerCase().includes(search)
                            || (l.nbreChambres != null && l.nbreChambres.toString().includes(search))
                            || (l.prixParNuit != null && l.prixParNuit.toString().includes(search))
                            || (l.chambresHotel || []).some((ch: ChambreHotel) =>
                              (ch.nom || '').toLowerCase().includes(search)
                              || (ch.typeChambre || '').toLowerCase().includes(search)
                              || (ch.prixParNuit != null && ch.prixParNuit.toString().includes(search))
                            );
                        })
                        .map((logement) => {
                          const selected = formData.logementId === logement.id;
                          const isHotel = (logement.type || '').toLowerCase().includes('hotel');
                          return (
                            <motion.div
                              key={logement.id}
                              whileHover={{ scale: 1.01 }}
                              onClick={() => {
                                if (isHotel && logement.chambresHotel && logement.chambresHotel.length > 0) {
                                  router.push(`/service-reservations/hotel/${logement.id}?returnTo=${encodeURIComponent('/service-reservations?type=LOGEMENT')}`);
                                } else {
                                  router.push(`/service-reservations/logement/${logement.id}?returnTo=${encodeURIComponent('/service-reservations?type=LOGEMENT')}`);
                                }
                              }}
                              className={`
                                relative rounded-xl border-2 p-4 cursor-pointer transition-all
                                ${selected ? 'border-orange-400 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}
                              `}
                            >
                              {logement.images?.[0] && (
                                <img src={logement.images[0]} alt={logement.nom} className="w-full h-32 object-cover rounded-lg mb-3" />
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-800">{logement.nom}</h3>
                                {logement.nbreEtoiles && (
                                  <div className="flex items-center">
                                    {Array.from({ length: logement.nbreEtoiles }).map((_, i) => (
                                      <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mb-1">
                                {logement.type && (
                                  <Badge className={`text-xs border-0 ${isHotel ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {logement.type}
                                  </Badge>
                                )}
                                {isHotel && logement.chambresHotel && logement.chambresHotel.length > 0 && (
                                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                                    {logement.chambresHotel.length} type{logement.chambresHotel.length > 1 ? 's' : ''} de chambre
                                  </Badge>
                                )}
                                {!isHotel && logement.nbreChambres && (
                                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                                    {logement.nbreChambres} chambre{logement.nbreChambres > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              {logement.ville && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{logement.ville}{logement.pays ? `, ${logement.pays}` : ''}</p>}
                              {logement.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{logement.description}</p>}
                              <div className="flex items-center justify-between mt-3">
                                {logement.capacite && <span className="text-xs text-slate-500"><Users className="w-3 h-3 inline mr-1" />{logement.capacite} pers.</span>}
                                {isHotel && logement.chambresHotel?.length ? (
                                  <span className="font-bold text-orange-600">
                                    A partir de {Math.min(...logement.chambresHotel.map(ch => ch.prixParNuit || 0)).toLocaleString()} FCFA/nuit
                                  </span>
                                ) : (
                                  <span className="font-bold text-orange-600">{logement.prixParNuit?.toLocaleString()} FCFA/nuit</span>
                                )}
                              </div>
                              {selected && (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  )}

                  {/* Indicateur chambre sélectionnée */}
                  {selectedLogement && isHotelType && selectedChambre && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <Check className="w-5 h-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {selectedLogement.nom} - {selectedChambre.nom || selectedChambre.typeChambre}
                        </p>
                        <p className="text-xs text-slate-500">{selectedChambre.prixParNuit?.toLocaleString()} FCFA/nuit</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/service-reservations/hotel/${selectedLogement.id}?returnTo=${encodeURIComponent('/service-reservations?type=LOGEMENT')}`)}>
                        Changer
                      </Button>
                    </div>
                  )}

                </>
              )}

              {/* Vehicules */}
              {formData.serviceType === 'FLOTTE' && (
                <>
                  {/* Filtre par nombre de places */}
                  {!vehiculesLoading && vehicules.length > 0 && (() => {
                    const placesValues = Array.from(new Set(
                      vehicules.map(v => v.places).filter((p): p is number => p != null && p > 0)
                    )).sort((a, b) => a - b);
                    return placesValues.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-500 font-medium">Places :</span>
                        <Button
                          variant={vehiculePlacesFilter === null ? 'default' : 'outline'}
                          size="sm"
                          className={vehiculePlacesFilter === null ? 'gradient-subito text-white border-0 h-7 text-xs' : 'h-7 text-xs'}
                          onClick={() => setVehiculePlacesFilter(null)}
                        >
                          Toutes
                        </Button>
                        {placesValues.map((nb) => (
                          <Button
                            key={nb}
                            variant={vehiculePlacesFilter === nb ? 'default' : 'outline'}
                            size="sm"
                            className={vehiculePlacesFilter === nb ? 'gradient-subito text-white border-0 h-7 text-xs' : 'h-7 text-xs'}
                            onClick={() => setVehiculePlacesFilter(nb)}
                          >
                            {nb} place{nb > 1 ? 's' : ''}
                            <span className="ml-1 opacity-75">({vehicules.filter(v => v.places === nb).length})</span>
                          </Button>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {vehiculesLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  ) : vehicules.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Aucun vehicule disponible</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicules.filter(v => {
                        // Filtre par places
                        if (vehiculePlacesFilter !== null && v.places !== vehiculePlacesFilter) return false;
                        // Recherche textuelle
                        if (!itemSearch) return true;
                        const s = itemSearch.toLowerCase();
                        return (v.marque || '').toLowerCase().includes(s)
                          || (v.modele || '').toLowerCase().includes(s)
                          || (v.type || '').toLowerCase().includes(s)
                          || (v.zoneOperations || '').toLowerCase().includes(s)
                          || (v.prixParJour != null && v.prixParJour.toString().includes(s));
                      }).map((vehicule) => {
                        const selected = formData.vehiculeLocationId === vehicule.id;
                        return (
                          <motion.div
                            key={vehicule.id}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => router.push(`/service-reservations/vehicule/${vehicule.id}?returnTo=${encodeURIComponent('/service-reservations?type=FLOTTE')}`)}
                            className={`
                              rounded-xl border-2 p-4 cursor-pointer transition-all
                              ${selected ? 'border-orange-400 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}
                            `}
                          >
                            {vehicule.images?.[0] && (
                              <img src={vehicule.images[0]} alt={`${vehicule.marque} ${vehicule.modele}`} className="w-full h-32 object-cover rounded-lg mb-3" />
                            )}
                            <h3 className="font-semibold text-slate-800">{vehicule.marque} {vehicule.modele}</h3>
                            {vehicule.annee && <span className="text-xs text-slate-500">{vehicule.annee}</span>}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {vehicule.type && <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{vehicule.type}</Badge>}
                              {vehicule.places && <Badge className="bg-slate-100 text-slate-700 border-0 text-xs"><Users className="w-3 h-3 mr-1" />{vehicule.places} places</Badge>}
                              {vehicule.transmission && <Badge className="bg-slate-100 text-slate-700 border-0 text-xs"><Settings2 className="w-3 h-3 mr-1" />{vehicule.transmission}</Badge>}
                              {vehicule.carburant && <Badge className="bg-slate-100 text-slate-700 border-0 text-xs"><Fuel className="w-3 h-3 mr-1" />{vehicule.carburant}</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                              {vehicule.climatisation && <span>Climatisation</span>}
                              {vehicule.chauffeur && <span>Chauffeur</span>}
                              {vehicule.gps && <span>GPS</span>}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              {vehicule.zoneOperations && <span className="text-xs text-slate-500"><MapPin className="w-3 h-3 inline mr-1" />{vehicule.zoneOperations}</span>}
                              <span className="font-bold text-orange-600">{vehicule.prixParJour?.toLocaleString()} FCFA/jour</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3: Client info */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Informations client</h2>
                <p className="text-slate-500">Renseignez les informations du client et les dates</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                {/* Nom complet with employee search */}
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        {formData.clientName || 'Rechercher ou saisir un nom...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Rechercher un employe..."
                          value={employeeSearch}
                          onValueChange={setEmployeeSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <p className="text-sm text-slate-500 mb-2">Aucun employe trouve</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setShowAddEmployee(true);
                                setEmployeePopoverOpen(false);
                              }}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Ajouter &quot;{employeeSearch}&quot;
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {employees.map(emp => {
                              const deptName = emp.departement
                                ? (typeof emp.departement === 'object' ? emp.departement.nom : emp.departement)
                                : '';
                              return (
                                <CommandItem
                                  key={emp.id}
                                  value={`${emp.prenom} ${emp.nom}`}
                                  onSelect={() => {
                                    handleChange('employeeId', emp.id);
                                    handleChange('clientName', `${emp.prenom} ${emp.nom}`);
                                    if (emp.email) handleChange('clientEmail', emp.email);
                                    if (emp.telephone) handleChange('clientPhone', emp.telephone);
                                    if (emp.adresse) handleChange('adresseLivraison', emp.adresse);
                                    setEmployeeSearch("");
                                    setEmployeePopoverOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                                    {emp.prenom?.[0]}{emp.nom?.[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{emp.prenom} {emp.nom}</p>
                                    {deptName && <p className="text-xs text-slate-500">{deptName}</p>}
                                  </div>
                                  {formData.employeeId === emp.id && (
                                    <Check className="w-4 h-4 text-orange-600 shrink-0" />
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Add employee dialog */}
                <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Ajouter un employe</DialogTitle>
                    </DialogHeader>
                    <EmployeeForm
                      departments={departments}
                      onSubmit={(data) => createEmployee.mutate(data)}
                      onCancel={() => setShowAddEmployee(false)}
                      isSubmitting={createEmployee.isPending}
                    />
                  </DialogContent>
                </Dialog>

                {/* Phone / Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Telephone *</Label>
                    <PhoneInput
                      value={formData.clientPhone}
                      onChange={(val) => handleChange('clientPhone', val || '')}
                      defaultCountryCode="+221"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="email@exemple.com"
                      value={formData.clientEmail}
                      onChange={(e) => handleChange('clientEmail', e.target.value)}
                    />
                  </div>
                </div>

                {/* Dates / Nombre de personnes */}
                {formData.serviceType === 'ACTIVITE' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {formData.dateDebut
                              ? format(new Date(formData.dateDebut), 'dd MMM yyyy', { locale: fr })
                              : 'Selectionner une date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateDebut ? new Date(formData.dateDebut) : undefined}
                            onSelect={(date) => handleChange('dateDebut', date ? date.toISOString() : '')}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nombrePersonnes">Nombre de personnes</Label>
                      <Input
                        id="nombrePersonnes"
                        type="number"
                        min={1}
                        max={selectedCircuit?.maxParticipants || 50}
                        value={formData.nombrePersonnes}
                        onChange={(e) => handleChange('nombrePersonnes', parseInt(e.target.value) || 1)}
                      />
                      {selectedCircuit?.maxParticipants && (
                        <p className="text-xs text-slate-500">Maximum {selectedCircuit.maxParticipants} participants</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de debut *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {formData.dateDebut
                              ? format(new Date(formData.dateDebut), 'dd MMM yyyy', { locale: fr })
                              : 'Selectionner une date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateDebut ? new Date(formData.dateDebut) : undefined}
                            onSelect={(date) => handleChange('dateDebut', date ? date.toISOString() : '')}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {formData.dateFin
                              ? format(new Date(formData.dateFin), 'dd MMM yyyy', { locale: fr })
                              : 'Selectionner une date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateFin ? new Date(formData.dateFin) : undefined}
                            onSelect={(date) => handleChange('dateFin', date ? date.toISOString() : '')}
                            disabled={(date) => date < new Date(formData.dateDebut || new Date())}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                {/* Adresse livraison (flotte only) */}
                {formData.serviceType === 'FLOTTE' && (
                  <div className="space-y-2">
                    <Label htmlFor="adresseLivraison">Adresse de livraison *</Label>
                    <Input
                      id="adresseLivraison"
                      placeholder="Adresse de livraison du vehicule"
                      value={formData.adresseLivraison}
                      onChange={(e) => handleChange('adresseLivraison', e.target.value)}
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / demandes speciales</Label>
                  <Textarea
                    id="notes"
                    placeholder="Instructions particulieres..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Payment */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Mode de paiement</h2>
                <p className="text-slate-500">Choisissez comment cette reservation sera payee</p>
              </div>

              <RadioGroup
                value={formData.payment_method}
                onValueChange={(v) => handleChange('payment_method', v)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {paymentMethods.map((option) => (
                  <Label
                    key={option.id}
                    htmlFor={`payment-${option.id}`}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${formData.payment_method === option.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <RadioGroupItem value={option.id} id={`payment-${option.id}`} className="sr-only" />
                    <span className="text-3xl">{option.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{option.label}</p>
                      <p className="text-sm text-slate-500">{option.desc}</p>
                    </div>
                    {formData.payment_method === option.id && (
                      <Check className="w-5 h-5 text-orange-600" />
                    )}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* STEP 5: Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmation</h2>
                <p className="text-slate-500">Verifiez les details de votre reservation</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                {/* Service type */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Service</span>
                  <Badge className={`${serviceTypeLabels[formData.serviceType || '']?.color || 'bg-slate-100 text-slate-700'} border-0`}>
                    {serviceTypeLabels[formData.serviceType || '']?.label || formData.serviceType}
                  </Badge>
                </div>

                {/* Selected item */}
                {formData.serviceType === 'ACTIVITE' && selectedCircuit && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="font-semibold text-slate-800">{selectedCircuit.titre}</p>
                    {selectedCircuit.ville && <p className="text-sm text-slate-500">{selectedCircuit.ville}</p>}
                    {selectedCircuit.duree && <p className="text-sm text-slate-500">Duree: {selectedCircuit.duree}</p>}
                    <p className="text-sm text-slate-500 mt-1">{formData.nombrePersonnes} personne{formData.nombrePersonnes > 1 ? 's' : ''}</p>
                  </div>
                )}
                {formData.serviceType === 'LOGEMENT' && selectedLogement && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="font-semibold text-slate-800">{selectedLogement.nom}</p>
                    {selectedLogement.ville && <p className="text-sm text-slate-500">{selectedLogement.ville}</p>}
                    {selectedLogement.type && <p className="text-sm text-slate-500">{selectedLogement.type}</p>}
                    {selectedChambre && (
                      <p className="text-sm text-slate-500">Chambre: {selectedChambre.nom || selectedChambre.typeChambre}</p>
                    )}
                  </div>
                )}
                {formData.serviceType === 'FLOTTE' && selectedVehicule && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <p className="font-semibold text-slate-800">{selectedVehicule.marque} {selectedVehicule.modele}</p>
                    {selectedVehicule.type && <p className="text-sm text-slate-500">{selectedVehicule.type}</p>}
                    {formData.adresseLivraison && <p className="text-sm text-slate-500">Livraison: {formData.adresseLivraison}</p>}
                  </div>
                )}

                {/* Client */}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Client</span>
                  <span className="text-sm font-medium text-slate-800">{formData.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Telephone</span>
                  <span className="text-sm font-medium text-slate-800">{formData.clientPhone}</span>
                </div>
                {formData.clientEmail && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Email</span>
                    <span className="text-sm font-medium text-slate-800">{formData.clientEmail}</span>
                  </div>
                )}

                {/* Dates */}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{formData.serviceType === 'ACTIVITE' ? 'Date' : 'Date de debut'}</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formData.dateDebut ? format(new Date(formData.dateDebut), 'dd MMM yyyy', { locale: fr }) : '-'}
                  </span>
                </div>
                {formData.serviceType !== 'ACTIVITE' && formData.dateFin && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Date de fin</span>
                    <span className="text-sm font-medium text-slate-800">
                      {format(new Date(formData.dateFin), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                )}

                {/* Payment */}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Paiement</span>
                  <span className="text-sm font-medium text-slate-800">
                    {paymentMethods.find((m: { id: string; label: string }) => m.id === formData.payment_method)?.label || 'Non selectionne'}
                  </span>
                </div>

                {formData.notes && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Notes</span>
                    <span className="text-sm text-slate-800 max-w-[60%] text-right">{formData.notes}</span>
                  </div>
                )}

                {/* Total */}
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-2">
                  {user?.isTva ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total HT</span>
                        <span className="text-lg font-semibold text-slate-800">{calculateTotal().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">TVA (18%)</span>
                        <span className="font-medium text-slate-800">{Math.round(calculateTotal() * 0.18).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                        <span className="font-semibold text-slate-800">Total TTC</span>
                        <span className="text-2xl font-bold text-orange-600">{Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">Total</span>
                      <span className="text-2xl font-bold text-orange-600">{calculateTotal().toLocaleString()} FCFA</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === (defaultServiceType ? 2 : 1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        {currentStep < 5 ? (
          <Button className="gradient-subito text-white border-0 gap-2" onClick={handleNext}>
            Suivant
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="gradient-subito text-white border-0 gap-2"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Confirmer la reservation
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== RESERVATIONS LIST ====================
function ReservationsList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState<ServiceReservationResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payReservationId, setPayReservationId] = useState<number | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('');
  const limit = 10;

  // Fetch reservations
  const { data: reservationsResponse, isLoading } = useQuery({
    queryKey: ['service-reservations', page],
    queryFn: () => api.serviceReservations.list(page, limit),
  });

  const rawData = reservationsResponse?.data as Record<string, unknown> | undefined;
  const payload = (rawData?.data ?? rawData) as Record<string, unknown> | undefined;
  const reservations: ServiceReservationResponse[] = (() => {
    if (Array.isArray(payload?.list)) return payload.list as ServiceReservationResponse[];
    if (Array.isArray(payload?.items)) return payload.items as ServiceReservationResponse[];
    if (Array.isArray(payload)) return payload as unknown as ServiceReservationResponse[];
    return [];
  })();
  const totalCount = Number(payload?.total ?? reservations.length);
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Fetch detail
  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['service-reservation-detail', selectedReservation?.id],
    queryFn: () => api.serviceReservations.get(selectedReservation!.id),
    enabled: !!selectedReservation?.id && detailOpen,
  });
  const reservationDetail = (detailResponse?.data || selectedReservation) as ServiceReservationResponse;

  // Fetch payment options
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentOptions = (Array.isArray(paymentOptionsResponse?.data) ? paymentOptionsResponse.data : [])
    .filter((o: PaymentOption) => o.type !== 'wallet' && o.name?.toLowerCase() !== 'portefeuille')
    .map((o: PaymentOption) => ({ id: (o.type || o.name || '').toLowerCase(), label: o.name, desc: o.description || '' }));

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: ({ id, method }: { id: number; method: string }) =>
      api.serviceReservations.pay(id, { paymentMethod: toBookingPaymentMethod(method) as any }),
    onSuccess: () => {
      toast.success('Reservation payee avec succes');
      setShowPayDialog(false);
      setDetailOpen(false);
      setSelectedReservation(null);
      setPayReservationId(null);
      queryClient.invalidateQueries({ queryKey: ['service-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['service-reservation-detail'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du paiement');
    },
  });

  // Filtering
  const filtered = reservations.filter(r => {
    const matchSearch = !searchTerm ||
      (r.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reference || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchService = filterService === 'all' || r.serviceType === filterService;
    const matchStatus = filterStatus === 'all' || (r.status || '').toLowerCase() === filterStatus;
    return matchSearch && matchService && matchStatus;
  });

  const getServiceInfo = (type?: string) => serviceTypeLabels[type || ''] || { label: type || 'Autre', icon: Package, color: "bg-slate-100 text-slate-700" };
  const getStatusInfo = (status?: string) => {
    const key = (status || '').toLowerCase();
    return statusLabels[key] || { label: status || 'Inconnu', color: "bg-slate-100 text-slate-700" };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, reference..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              <SelectItem value="ACTIVITE">Circuit</SelectItem>
              <SelectItem value="LOGEMENT">Logement</SelectItem>
              <SelectItem value="FLOTTE">Flotte</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirme</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Termine</SelectItem>
              <SelectItem value="paid">Paye</SelectItem>
              <SelectItem value="cancelled">Annule</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucune reservation trouvee</p>
            <p className="text-sm">Les reservations apparaitront ici</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Reference</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Service</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Client</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Montant</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Statut</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filtered.map((reservation, index) => {
                      const service = getServiceInfo(reservation.serviceType);
                      const status = getStatusInfo(reservation.status);
                      const isPaid = (reservation as any).paymentStatus?.toLowerCase() === 'paid';
                      const ServiceIcon = service.icon;

                      return (
                        <motion.tr
                          key={reservation.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => { setSelectedReservation(reservation); setDetailOpen(true); }}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-medium text-slate-800">
                              {reservation.reference || `#${reservation.id}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${service.color} border-0 gap-1`}>
                              <ServiceIcon className="w-3 h-3" />
                              {service.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{reservation.clientName || '-'}</p>
                              <p className="text-xs text-slate-500">{reservation.clientPhone || ''}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800">
                              {reservation.totalPrice ? Number(reservation.totalPrice).toLocaleString() + ' FCFA' : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isPaid
                              ? <Badge className="bg-green-100 text-green-700 border-0">Paye</Badge>
                              : <Badge className={`${status.color} border-0`}>{status.label}</Badge>
                            }
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {reservation.createdAt ? format(new Date(reservation.createdAt), 'dd MMM yyyy', { locale: fr }) : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedReservation(reservation); setDetailOpen(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Page {page} sur {totalPages} — {totalCount} resultat{totalCount > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      className={p === page ? 'gradient-subito text-white border-0' : ''}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detail de la reservation
              {reservationDetail && (
                <span className="font-mono text-sm text-slate-500">
                  {reservationDetail.reference || `#${reservationDetail.id}`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : reservationDetail ? (
            <div className="space-y-4">
              {/* Service & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const s = getServiceInfo(reservationDetail.serviceType);
                  return <Badge className={`${s.color} border-0 gap-1`}><s.icon className="w-3 h-3" />{s.label}</Badge>;
                })()}
                {(reservationDetail as any).paymentStatus?.toLowerCase() === 'paid'
                  ? <Badge className="bg-green-100 text-green-700 border-0">Paye</Badge>
                  : (() => {
                      const st = getStatusInfo(reservationDetail.status);
                      return <Badge className={`${st.color} border-0`}>{st.label}</Badge>;
                    })()
                }
              </div>

              {/* Service details */}
              {reservationDetail.circuit && (
                <div className="p-4 rounded-xl bg-emerald-50 space-y-1">
                  <p className="text-sm font-semibold text-emerald-800">Circuit</p>
                  <p className="font-medium text-slate-800">{reservationDetail.circuit.titre}</p>
                  {reservationDetail.circuit.ville && <p className="text-sm text-slate-500">{reservationDetail.circuit.ville}</p>}
                </div>
              )}
              {reservationDetail.logement && (
                <div className="p-4 rounded-xl bg-blue-50 space-y-1">
                  <p className="text-sm font-semibold text-blue-800">Logement</p>
                  <p className="font-medium text-slate-800">{reservationDetail.logement.nom}</p>
                  {reservationDetail.logement.ville && <p className="text-sm text-slate-500">{reservationDetail.logement.ville}</p>}
                </div>
              )}
              {reservationDetail.vehiculeLocation && (
                <div className="p-4 rounded-xl bg-purple-50 space-y-1">
                  <p className="text-sm font-semibold text-purple-800">Vehicule</p>
                  <p className="font-medium text-slate-800">{reservationDetail.vehiculeLocation.marque} {reservationDetail.vehiculeLocation.modele}</p>
                </div>
              )}

              {/* Client */}
              <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                <p className="text-sm font-semibold text-slate-600">Client</p>
                <p className="font-medium text-slate-800">{reservationDetail.clientName}</p>
                {reservationDetail.clientPhone && <p className="text-sm text-slate-500">{reservationDetail.clientPhone}</p>}
                {reservationDetail.clientEmail && <p className="text-sm text-slate-500">{reservationDetail.clientEmail}</p>}
              </div>

              {/* Dates */}
              {reservationDetail.dateDebut && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Date debut</span>
                  <span className="text-sm font-medium text-slate-800">
                    {format(new Date(reservationDetail.dateDebut), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
              {reservationDetail.dateFin && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Date fin</span>
                  <span className="text-sm font-medium text-slate-800">
                    {format(new Date(reservationDetail.dateFin), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
              {reservationDetail.nombrePersonnes && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Personnes</span>
                  <span className="text-sm font-medium text-slate-800">{reservationDetail.nombrePersonnes}</span>
                </div>
              )}
              {reservationDetail.adresseLivraison && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Adresse livraison</span>
                  <span className="text-sm font-medium text-slate-800">{reservationDetail.adresseLivraison}</span>
                </div>
              )}
              {reservationDetail.notes && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Notes</span>
                  <span className="text-sm text-slate-800 max-w-[60%] text-right">{reservationDetail.notes}</span>
                </div>
              )}
              {reservationDetail.createdAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Cree le</span>
                  <span className="text-sm font-medium text-slate-800">
                    {format(new Date(reservationDetail.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              )}

              {/* Total */}
              {reservationDetail.totalPrice && (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="text-2xl font-bold text-orange-600">{Number(reservationDetail.totalPrice).toLocaleString()} FCFA</span>
                </div>
              )}

              {/* Pay button — only if confirmed/completed AND not already paid */}
              {reservationDetail.status?.toLowerCase() === 'completed' &&
               (reservationDetail as any).paymentStatus?.toLowerCase() !== 'paid' && (
                <Button
                  className="w-full gradient-subito text-white border-0 gap-2"
                  onClick={() => {
                    const id = reservationDetail.id;
                    setDetailOpen(false);
                    setTimeout(() => {
                      setPayReservationId(id);
                      setSelectedPayMethod('');
                      setShowPayDialog(true);
                    }, 150);
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  Payer cette reservation
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-subito">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              Payer la reservation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">Choisissez un mode de paiement.</p>
            <div className="space-y-2">
              {paymentOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setSelectedPayMethod(option.id)}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${selectedPayMethod === option.id
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${selectedPayMethod === option.id ? 'gradient-subito' : 'bg-slate-100'}`}>
                    <CreditCard className={`w-5 h-5 ${selectedPayMethod === option.id ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{option.label}</p>
                    {option.desc && <p className="text-xs text-slate-500">{option.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Annuler
            </Button>
            <Button
              className="gradient-subito text-white border-0 gap-2"
              disabled={!selectedPayMethod || payMutation.isPending}
              onClick={() => {
                if (payReservationId && selectedPayMethod) {
                  payMutation.mutate({ id: payReservationId, method: selectedPayMethod });
                }
              }}
            >
              {payMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
