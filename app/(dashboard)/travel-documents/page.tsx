'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, CreateTravelDocumentDto, TravelDocumentTarif, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption, toBookingPaymentMethod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
type TravelDocumentPaymentMethod = string;
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Globe,
  User,
  Plane,
  FileText,
  Check,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Sparkles,
  ArrowLeft,
  CreditCard,
  Phone,
  Mail,
  Loader2,
  Users,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Service {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  cities: string[];
}

interface FormData {
  selectedServices: string[];
  firstName: string;
  lastName: string;
  passport: string;
  nationality: string;
  birthDate: Date | null;
  phone: string;
  email: string;
  departureCountry: string;
  departureCity: string;
  country: string;
  city: string;
  departureDate: Date | null;
  returnDate: Date | null;
  reason: string;
  category: string;
  persons: string;
  roomType: string;
  notes: string;
  paymentMethod: TravelDocumentPaymentMethod;
  employeeId: number | null;
}

const steps: Step[] = [
  { id: 1, title: "Services", icon: Globe },
  { id: 2, title: "Informations", icon: User },
  { id: 3, title: "Voyage", icon: Plane },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Recapitulatif", icon: FileText },
];

const services: Service[] = [
  { id: "flight", label: "Reservation Vol", icon: "plane", description: "Attestation de vol" },
  { id: "hotel", label: "Reservation Hotel", icon: "hotel", description: "Attestation d'hebergement" },
  { id: "insurance", label: "Assurance Voyage", icon: "insurance", description: "Assurance pour votre voyage" },
];

const departureCountries: Country[] = [
  { code: "SN", name: "Senegal", flag: "SN", cities: ["Dakar", "Thies", "Saint-Louis", "Ziguinchor", "Kaolack", "Touba"] },
  { code: "CI", name: "Cote d'Ivoire", flag: "CI", cities: ["Abidjan", "Yamoussoukro", "Bouake", "San-Pedro"] },
  { code: "ML", name: "Mali", flag: "ML", cities: ["Bamako", "Sikasso", "Segou", "Mopti", "Kayes"] },
  { code: "GN", name: "Guinee", flag: "GN", cities: ["Conakry", "Kankan", "Labe", "Nzerekore"] },
  { code: "BF", name: "Burkina Faso", flag: "BF", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"] },
  { code: "TG", name: "Togo", flag: "TG", cities: ["Lome", "Kara", "Sokode", "Atakpame"] },
  { code: "BJ", name: "Benin", flag: "BJ", cities: ["Cotonou", "Porto-Novo", "Parakou", "Abomey"] },
  { code: "GM", name: "Gambie", flag: "GM", cities: ["Banjul", "Serekunda", "Brikama"] },
  { code: "MR", name: "Mauritanie", flag: "MR", cities: ["Nouakchott", "Nouadhibou", "Kiffa"] },
  { code: "NE", name: "Niger", flag: "NE", cities: ["Niamey", "Zinder", "Maradi", "Agadez"] },
  { code: "CM", name: "Cameroun", flag: "CM", cities: ["Douala", "Yaounde", "Garoua", "Bamenda"] },
  { code: "GA", name: "Gabon", flag: "GA", cities: ["Libreville", "Port-Gentil", "Franceville"] },
];

const countries: Country[] = [
  { code: "FR", name: "France", flag: "FR", cities: ["Paris", "Lyon", "Marseille", "Nice", "Toulouse", "Bordeaux"] },
  { code: "ES", name: "Espagne", flag: "ES", cities: ["Madrid", "Barcelone", "Seville", "Valence", "Bilbao"] },
  { code: "IT", name: "Italie", flag: "IT", cities: ["Rome", "Milan", "Florence", "Venise", "Naples"] },
  { code: "DE", name: "Allemagne", flag: "DE", cities: ["Berlin", "Munich", "Francfort", "Hambourg", "Cologne"] },
  { code: "BE", name: "Belgique", flag: "BE", cities: ["Bruxelles", "Anvers", "Gand", "Bruges", "Liege"] },
  { code: "PT", name: "Portugal", flag: "PT", cities: ["Lisbonne", "Porto", "Faro", "Coimbra", "Braga"] },
  { code: "MA", name: "Maroc", flag: "MA", cities: ["Casablanca", "Marrakech", "Rabat", "Fes", "Tanger"] },
  { code: "TN", name: "Tunisie", flag: "TN", cities: ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte"] },
  { code: "CI", name: "Cote d'Ivoire", flag: "CI", cities: ["Abidjan", "Yamoussoukro", "Bouake", "San-Pedro"] },
  { code: "ML", name: "Mali", flag: "ML", cities: ["Bamako", "Sikasso", "Segou", "Mopti", "Kayes"] },
  { code: "SN", name: "Senegal", flag: "SN", cities: ["Dakar", "Thies", "Saint-Louis", "Ziguinchor", "Kaolack", "Touba"] },
  { code: "US", name: "Etats-Unis", flag: "US", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"] },
  { code: "CA", name: "Canada", flag: "CA", cities: ["Montreal", "Toronto", "Ottawa", "Vancouver", "Quebec"] },
  { code: "GB", name: "Royaume-Uni", flag: "GB", cities: ["Londres", "Manchester", "Birmingham", "Liverpool"] },
  { code: "TR", name: "Turquie", flag: "TR", cities: ["Istanbul", "Ankara", "Izmir", "Antalya"] },
];

const travelReasons: { value: string; label: string }[] = [
  { value: "tourisme", label: "Tourisme" },
  { value: "affaires", label: "Affaires" },
  { value: "etudes", label: "Etudes" },
  { value: "visite", label: "Visite familiale" },
  { value: "autre", label: "Autre" },
];
const categories: { value: string; label: string }[] = [
  { value: "economique", label: "Economique" },
  { value: "standard", label: "Standard" },
  { value: "haut-gamme", label: "Haut de gamme" },
];
const roomTypes: { value: string; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "twin", label: "Twin" },
  { value: "suite", label: "Suite" },
];

export default function TravelDocuments() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [success, setSuccess] = useState<boolean>(false);
  const [bookingReference, setBookingReference] = useState<string>("");

  const [formData, setFormData] = useState<FormData>({
    selectedServices: [],
    firstName: "",
    lastName: "",
    passport: "",
    nationality: "Sénégalaise",
    birthDate: null,
    phone: "",
    email: "",
    departureCountry: "SN",
    departureCity: "Dakar",
    country: "",
    city: "",
    departureDate: null,
    returnDate: null,
    reason: "",
    category: "",
    persons: "",
    roomType: "",
    notes: "",
    paymentMethod: "mobile_money",
    employeeId: null,
  });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const apiMethods = (Array.isArray(paymentOptionsResponse?.data) ? paymentOptionsResponse.data : [])
    .filter((o: PaymentOption) => (o.slug || o.type) !== 'wallet' && o.name?.toLowerCase() !== 'portefeuille')
    .map((o: PaymentOption) => ({ value: o.slug || o.type || o.name?.toLowerCase() || '', label: o.name, desc: o.description || '', icon: o.icon || '' }));
  const paymentMethods = [
    ...apiMethods,
    { value: "company_account", label: "Compte entreprise", desc: "Facturation sur le compte", icon: "🏢" },
  ];

  // Fetch tarifs
  const { data: tarifsResponse } = useQuery({
    queryKey: ['travel-document-tarifs'],
    queryFn: () => api.reference.getTravelDocumentTarifs(),
  });

  const tarifs: TravelDocumentTarif[] = Array.isArray(tarifsResponse?.data)
    ? tarifsResponse.data
    : [];

  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees.list({ limit: 100, actif: true }),
  });
  const employeesRaw = employeesResponse?.data;
  const employees: EmployeeResponse[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as any)?.items || (employeesRaw as any)?.list || (employeesRaw as any)?.data || [];

  // Fetch departments (for EmployeeForm)
  const { data: departmentsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(1, 100),
  });
  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];

  // Create travel document mutation
  const createBooking = useMutation({
    mutationFn: (data: CreateTravelDocumentDto) => api.travelDocuments.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['travel-documents'] });
      setBookingReference(response.data?.reference || `SUB-${Date.now()}`);
      setSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'envoi");
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
        handleChange('firstName', emp.prenom);
        handleChange('lastName', emp.nom);
        if (emp.email) handleChange('email', emp.email);
        if (emp.telephone) handleChange('phone', emp.telephone);
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

  const cleanPhone = (phone: string): string => phone.replace(/[\s\-\.\(\)]/g, '');
  const formatPhoneForApi = (phone: string): string => {
    const digits = cleanPhone(phone);
    const match = digits.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      const [, code, num] = match;
      const formatted = num.replace(/(\d{2})(?=\d)/g, '$1 ');
      return `${code} ${formatted}`;
    }
    return phone;
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const selectedDepartureCountry = departureCountries.find(c => c.code === formData.departureCountry);
  const selectedCountry = countries.find(c => c.code === formData.country);
  const hasHotel = formData.selectedServices.includes('hotel');
  const hasFlight = formData.selectedServices.includes('flight');
  const hasInsurance = formData.selectedServices.includes('insurance');

  // Calculate total price from tarifs
  const calculateTotal = (): number => {
    let total = 0;
    if (hasFlight) {
      const flightTarif = tarifs.find(t => t.serviceType === 'flight' && t.isActive);
      if (flightTarif) total += flightTarif.price;
    }
    if (hasHotel) {
      const hotelTarif = tarifs.find(t => t.serviceType === 'hotel' && t.isActive);
      if (hotelTarif) total += hotelTarif.price;
    }
    if (hasInsurance) {
      const insuranceTarif = tarifs.find(t => t.serviceType === 'insurance' && t.isActive);
      if (insuranceTarif) total += insuranceTarif.price;
    }
    return total || 50000; // Default price if no tarifs
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.selectedServices.length > 0;
      case 2:
        return !!(formData.firstName && formData.lastName && formData.passport &&
               formData.nationality && formData.birthDate && formData.phone && formData.email);
      case 3:
        const baseValid = !!(formData.departureCountry && formData.departureCity &&
                         formData.country && formData.city && formData.departureDate && formData.reason);
        if (hasHotel) {
          return baseValid && !!(formData.category && formData.persons && formData.roomType);
        }
        return baseValid;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    const isCompanyPayment = formData.paymentMethod === 'company_account';

    const selectedDepartureCountry = departureCountries.find(c => c.code === formData.departureCountry);

    const bookingData: CreateTravelDocumentDto = {
      flightReservation: hasFlight,
      hotelReservation: hasHotel,
      travelInsurance: hasInsurance,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone ? formatPhoneForApi(formData.phone) : '',
      passportNumber: formData.passport,
      nationality: formData.nationality,
      birthDate: formData.birthDate ? formData.birthDate.toISOString() : '',
      departureCountry: selectedDepartureCountry?.name || formData.departureCountry,
      departureCity: formData.departureCity,
      destinationCountry: selectedCountry?.name || formData.country,
      destinationCity: formData.city,
      departureDate: formData.departureDate ? formData.departureDate.toISOString() : '',
      returnDate: formData.returnDate ? formData.returnDate.toISOString() : undefined,
      travelReason: formData.reason as CreateTravelDocumentDto['travelReason'],
      paidBy: isCompanyPayment ? 'company' : 'client',
      paymentMethod: isCompanyPayment || !formData.paymentMethod ? undefined : toBookingPaymentMethod(formData.paymentMethod),
      companyCode: user?.companyCode || undefined,
      employeeId: formData.employeeId || undefined,
      hotelCategory: hasHotel ? formData.category : undefined,
      numberOfPeople: hasHotel ? (parseInt(formData.persons) || 1) : undefined,
      roomType: hasHotel ? formData.roomType : undefined,
      hotelDetails: hasHotel ? formData.notes : undefined,
    };

    console.log('[TRAVEL-DOCS] Booking data:', JSON.stringify(bookingData, null, 2));

    createBooking.mutate(bookingData);
  };

  const resetForm = () => {
    setSuccess(false);
    setCurrentStep(1);
    setFormData({
      selectedServices: [],
      firstName: "",
      lastName: "",
      passport: "",
      nationality: "Sénégalaise",
      birthDate: null,
      phone: "",
      email: "",
      departureCountry: "SN",
      departureCity: "Dakar",
      country: "",
      city: "",
      departureDate: null,
      returnDate: null,
      reason: "",
      category: "",
      persons: "",
      roomType: "",
      notes: "",
      paymentMethod: "mobile_money",
      employeeId: null,
    });
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-16"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </motion.div>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Demande envoyee !
        </h1>
        <p className="text-slate-500 mb-8">
          Notre equipe vous contactera sous <strong>2h ouvrees</strong> via WhatsApp
        </p>

        <div className="inline-block mb-8">
          <Badge className="text-lg px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white border-0">
            Reference : {bookingReference}
          </Badge>
        </div>

        <div className="bg-slate-100 rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 mb-1">Services demandes</p>
              <p className="font-bold text-slate-800">
                {formData.selectedServices.map(id =>
                  services.find(s => s.id === id)?.label
                ).join(', ')}
              </p>
            </div>
            <p className="text-2xl font-bold text-subito">
              {calculateTotal().toLocaleString()} FCFA
            </p>
          </div>
          <p className="text-slate-600">
            Destination : {selectedCountry?.name}, {formData.city}
          </p>
          <p className="text-slate-600 mt-2">
            Client : {formData.firstName} {formData.lastName}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/tracking")}
          >
            Voir dans le suivi
          </Button>
          <Button
            className="gradient-subito text-white border-0"
            onClick={resetForm}
          >
            Nouvelle demande
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl gradient-subito">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents de Voyage</h1>
          <p className="text-slate-500">Attestations necessaires pour un dossier de demande de visa</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all
                ${currentStep >= step.id
                  ? 'gradient-subito text-white'
                  : 'bg-slate-200 text-slate-400'
                }
              `}>
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span className={`font-medium text-sm hidden sm:block ${
                currentStep >= step.id ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${
                currentStep > step.id ? 'bg-orange-400' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Services */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {formData.selectedServices.length > 0 && (
                <div className="flex justify-center mb-4">
                  <div className="px-4 py-2 rounded-full text-white font-medium flex items-center gap-2 gradient-subito">
                    <Sparkles className="w-4 h-4" />
                    {formData.selectedServices.length} service(s) selectionne(s)
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {services.map((service) => {
                  const isSelected = formData.selectedServices.includes(service.id);
                  const tarif = tarifs.find(t => t.serviceType === service.id && t.isActive);
                  return (
                    <motion.div
                      key={service.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleService(service.id)}
                      className={`
                        relative p-6 rounded-2xl border-2 cursor-pointer transition-all
                        ${isSelected
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className="text-4xl mb-3">
                        {service.id === 'flight' ? <Plane className="w-10 h-10 text-blue-500" /> :
                         service.id === 'insurance' ? <FileText className="w-10 h-10 text-purple-500" /> :
                         <Globe className="w-10 h-10 text-green-500" />}
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1">{service.label}</h3>
                      <p className="text-sm text-slate-500 mb-2">{service.description}</p>
                      {tarif && (
                        <p className="text-lg font-bold text-subito">{tarif.price.toLocaleString()} FCFA</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Information */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Employee selector with search */}
              <div className="space-y-2">
                <Label>Voyageur (employe)</Label>
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeePopoverOpen}
                      className="w-full justify-between font-normal h-10"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Users className="w-4 h-4 shrink-0" />
                        {formData.employeeId
                          ? (() => {
                              const emp = employees.find(e => e.id === formData.employeeId);
                              return emp ? `${emp.prenom} ${emp.nom}` : 'Selectionner un employe';
                            })()
                          : 'Selectionner un employe'}
                      </span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                  handleChange('firstName', emp.prenom);
                                  handleChange('lastName', emp.nom);
                                  if (emp.email) handleChange('email', emp.email);
                                  if (emp.telephone) handleChange('phone', emp.telephone);
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prenom(s) *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Prenom(s)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>N Passeport *</Label>
                <Input
                  value={formData.passport}
                  onChange={(e) => handleChange('passport', e.target.value)}
                  placeholder="N de passeport"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Nationalité *</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(v) => handleChange('nationality', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Sénégalaise", "Ivoirienne", "Malienne", "Guinéenne", "Burkinabè",
                      "Béninoise", "Togolaise", "Nigérienne", "Camerounaise", "Gabonaise",
                      "Congolaise", "Tchadienne", "Mauritanienne", "Gambienne", "Bissau-Guinéenne",
                      "Cap-Verdienne", "Libérienne", "Sierra-Léonaise", "Ghanéenne", "Nigériane",
                      "Centrafricaine", "Équato-Guinéenne", "Comorienne", "Malgache", "Djiboutienne",
                      "Française", "Américaine", "Canadienne", "Autre",
                    ].map((nat) => (
                      <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date de naissance *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={formData.birthDate ? String(formData.birthDate.getDate()) : ""}
                    onValueChange={(day) => {
                      const current = formData.birthDate || new Date(2000, 0, 1);
                      handleChange('birthDate', new Date(current.getFullYear(), current.getMonth(), Number(day)));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Jour" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.birthDate ? String(formData.birthDate.getMonth()) : ""}
                    onValueChange={(month) => {
                      const current = formData.birthDate || new Date(2000, 0, 1);
                      handleChange('birthDate', new Date(current.getFullYear(), Number(month), current.getDate()));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                    <SelectContent>
                      {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
                        <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.birthDate ? String(formData.birthDate.getFullYear()) : ""}
                    onValueChange={(year) => {
                      const current = formData.birthDate || new Date(2000, 0, 1);
                      handleChange('birthDate', new Date(Number(year), current.getMonth(), current.getDate()));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telephone *
                  </Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(v) => handleChange('phone', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email *
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Travel Details */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Depart</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays de depart *</Label>
                  <Select value={formData.departureCountry} onValueChange={(v) => {
                    handleChange('departureCountry', v);
                    handleChange('departureCity', '');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {departureCountries.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ville de depart *</Label>
                  <Select
                    value={formData.departureCity}
                    onValueChange={(v) => handleChange('departureCity', v)}
                    disabled={!formData.departureCountry}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.departureCountry ? "Ville" : "D'abord pays"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDepartureCountry?.cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide pt-2">Destination</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays de destination *</Label>
                  <Select value={formData.country} onValueChange={(v) => {
                    handleChange('country', v);
                    handleChange('city', '');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ville de destination *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(v) => handleChange('city', v)}
                    disabled={!formData.country}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.country ? "Ville" : "D'abord pays"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry?.cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de depart *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formData.departureDate ? format(formData.departureDate, "dd/MM/yy") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.departureDate || undefined}
                        onSelect={(date) => handleChange('departureDate', date || null)}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Date de retour *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formData.returnDate ? format(formData.returnDate, "dd/MM/yy") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.returnDate || undefined}
                        onSelect={(date) => handleChange('returnDate', date || null)}
                        disabled={(date) => {
                          const minDate = formData.departureDate || new Date(new Date().setHours(0, 0, 0, 0));
                          return date < minDate;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motif du voyage *</Label>
                <Select value={formData.reason} onValueChange={(v) => handleChange('reason', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {travelReasons.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hotel section - conditional */}
              {hasHotel && (
                <div className="pt-6 border-t border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-4">Details Hebergement</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Categorie *</Label>
                        <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Personnes *</Label>
                        <Select value={formData.persons} onValueChange={(v) => handleChange('persons', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Nombre" />
                          </SelectTrigger>
                          <SelectContent>
                            {["1", "2", "3", "4", "5"].map(n => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Type de chambre *</Label>
                        <Select value={formData.roomType} onValueChange={(v) => handleChange('roomType', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {roomTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Precisions (optionnel)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Regime, accessibilite..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Payment */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800">Mode de paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleChange('paymentMethod', option.value)}
                    className={`
                      flex items-center gap-4 p-6 rounded-xl border-2 cursor-pointer transition-all
                      ${formData.paymentMethod === option.value
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="text-3xl">
                      {option.icon === 'phone' ? <Phone className="w-8 h-8 text-orange-500" /> : <Globe className="w-8 h-8 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{option.label}</p>
                      <p className="text-sm text-slate-500">{option.desc}</p>
                    </div>
                    {formData.paymentMethod === option.value && (
                      <Check className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Price summary */}
              <div className="p-6 rounded-xl bg-slate-50">
                <h4 className="font-medium text-slate-800 mb-4">Resume</h4>
                <div className="space-y-2 text-sm">
                  {formData.selectedServices.map(id => {
                    const service = services.find(s => s.id === id);
                    const tarif = tarifs.find(t => t.serviceType === id && t.isActive);
                    return service && (
                      <div key={id} className="flex justify-between">
                        <span>{service.label}</span>
                        <span className="font-medium">{tarif?.price.toLocaleString() || '25 000'} FCFA</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 mt-3 border-t border-slate-300 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-subito text-xl">{calculateTotal().toLocaleString()} FCFA</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Summary */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Services */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Services demandes</h3>
                <div className="space-y-2">
                  {formData.selectedServices.map(serviceId => {
                    const service = services.find(s => s.id === serviceId);
                    return service && (
                      <div key={serviceId} className="flex items-center gap-2 text-slate-700">
                        {service.id === 'flight' ? <Plane className="w-5 h-5" /> :
                         service.id === 'insurance' ? <FileText className="w-5 h-5" /> :
                         <Globe className="w-5 h-5" />}
                        {service.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Personal Info */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-slate-500">Nom :</span>
                  <span className="text-slate-800 font-medium">{formData.firstName} {formData.lastName}</span>

                  <span className="text-slate-500">Passeport :</span>
                  <span className="text-slate-800 font-mono">{formData.passport}</span>

                  <span className="text-slate-500">Telephone :</span>
                  <span className="text-slate-800">{formData.phone}</span>

                  <span className="text-slate-500">Email :</span>
                  <span className="text-slate-800">{formData.email}</span>
                </div>
              </div>

              {/* Travel Details */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Details du voyage</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Depart</p>
                      <p className="font-bold text-slate-800">{selectedDepartureCountry?.name}</p>
                      <p className="text-sm text-slate-500">{formData.departureCity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Destination</p>
                      <p className="font-bold text-slate-800">{selectedCountry?.name}</p>
                      <p className="text-sm text-slate-500">{formData.city}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Date de depart</p>
                      <p className="font-medium text-slate-800">
                        {formData.departureDate && format(formData.departureDate, "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Date de retour</p>
                      <p className="font-medium text-slate-800">
                        {formData.returnDate ? format(formData.returnDate, "dd MMM yyyy", { locale: fr }) : "Non definie"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Motif : {travelReasons.find(r => r.value === formData.reason)?.label}</p>
                </div>
              </div>

              {/* Hotel Summary */}
              {hasHotel && (
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Hebergement</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-slate-500">Categorie :</span>
                    <span className="text-slate-800 font-medium">{categories.find(c => c.value === formData.category)?.label}</span>

                    <span className="text-slate-500">Chambre :</span>
                    <span className="text-slate-800">{roomTypes.find(r => r.value === formData.roomType)?.label}</span>

                    <span className="text-slate-500">Personnes :</span>
                    <span className="text-slate-800">{formData.persons}</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total a payer</span>
                  <span className="text-3xl font-bold text-red-400">
                    {calculateTotal().toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {currentStep > 1 ? (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Annuler
          </Button>
        )}

        <Button
          onClick={handleNext}
          disabled={!canContinue() || createBooking.isPending}
          className="gradient-subito text-white border-0 gap-2"
        >
          {createBooking.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Envoi...
            </>
          ) : currentStep === 5 ? (
            `Envoyer la demande - ${calculateTotal().toLocaleString()} FCFA`
          ) : (
            <>
              Continuer
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
