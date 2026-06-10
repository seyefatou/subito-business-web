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
  PlaneTakeoff,
  PlaneLanding,
  Hotel,
  FileText,
  Check,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
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
  ShieldCheck,
  Lightbulb,
  Send,
  Building2,
  Headphones,
  Lock,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  MoreHorizontal,
  Info,
  BadgeCheck,
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentMethods = [
    { value: "company_account", label: "Compte entreprise", desc: "L'entreprise paie via Bictorys", icon: "🏢" },
    { value: "client", label: "Client / Employe", desc: "Le client ou l'employe paie lui-meme", icon: "👤" },
  ];

  // Fetch tarifs
  const { data: tarifsResponse } = useQuery({
    queryKey: ['travel-document-tarifs'],
    queryFn: () => api.reference.getTravelDocumentTarifs(),
  });

  const tarifs: TravelDocumentTarif[] = Array.isArray(tarifsResponse?.data)
    ? tarifsResponse.data
    : Array.isArray(tarifsResponse) ? tarifsResponse : [];

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

  const selectBundle = () => {
    setFormData(prev => ({
      ...prev,
      selectedServices: services.map(s => s.id),
    }));
  };

  const selectedDepartureCountry = departureCountries.find(c => c.code === formData.departureCountry);
  const selectedCountry = countries.find(c => c.code === formData.country);
  const hasHotel = formData.selectedServices.includes('hotel');
  const hasFlight = formData.selectedServices.includes('flight');
  // Map form service ids to API serviceType values
  const serviceTypeMap: Record<string, string> = {
    flight: 'flight_reservation',
    hotel: 'hotel_reservation',
  };

  const findTarif = (serviceId: string) =>
    tarifs.find(t => (t.serviceType === serviceTypeMap[serviceId] || t.serviceType === serviceId) && t.isActive);

  // Calculate total price from tarifs
  const calculateTotal = (): number => {
    let total = 0;
    if (hasFlight) {
      const flightTarif = findTarif('flight');
      if (flightTarif) total += Number(flightTarif.price);
    }
    if (hasHotel) {
      const hotelTarif = findTarif('hotel');
      if (hotelTarif) total += Number(hotelTarif.price);
    }
    return total;
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
        return !!formData.paymentMethod;
      case 5:
        return termsAccepted;
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
    <div className="max-w-6xl mx-auto">
      {/* Editorial header */}
      <div className="mb-8">
        <p className="text-orange-600 font-bold tracking-widest text-xs uppercase mb-2">
          Etape {currentStep} sur {steps.length}
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          {currentStep === 1 && 'Choisissez vos services'}
          {currentStep === 2 && 'Informations personnelles'}
          {currentStep === 3 && 'Details du voyage'}
          {currentStep === 4 && 'Mode de paiement'}
          {currentStep === 5 && 'Verifiez votre demande'}
        </h1>
        <p className="text-slate-500 text-base max-w-2xl">
          {currentStep === 1 && 'Selectionnez les attestations necessaires pour votre demande de visa ou voyage business.'}
          {currentStep === 2 && 'Renseignez les informations du voyageur conformes a son passeport.'}
          {currentStep === 3 && 'Indiquez les details de votre prochain voyage. Des informations exactes accelerent le traitement.'}
          {currentStep === 4 && 'Choisissez votre mode de facturation pour cette demande.'}
          {currentStep === 5 && 'Verifiez tous les details avant d&apos;envoyer votre demande.'}
        </p>
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-5 gap-4 mb-12">
        {steps.map((step) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <div key={step.id} className="relative">
              {isActive && (
                <div className="absolute -top-6 left-0 text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                  En cours
                </div>
              )}
              <div className={`h-1.5 rounded-full ${
                isDone ? 'bg-orange-600' : isActive ? 'bg-orange-600' : 'bg-slate-200'
              }`}>
                {isActive && !isDone && (
                  <div className="h-full w-1/2 bg-orange-600 rounded-full" />
                )}
              </div>
              <div className={`mt-3 text-xs font-bold uppercase tracking-wider ${
                isActive ? 'text-orange-600' : isDone ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {step.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form content */}
      <div>
        <AnimatePresence mode="wait">
          {/* Step 1: Services */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {services.map((service) => {
                const isSelected = formData.selectedServices.includes(service.id);
                const tarif = findTarif(service.id);
                const isFlight = service.id === 'flight';
                const accent = isFlight ? 'orange' : 'teal';
                return (
                  <motion.div
                    key={service.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleService(service.id)}
                    className={`group relative flex flex-col bg-white p-8 rounded-3xl transition-all duration-300 cursor-pointer ring-1 ${
                      isSelected
                        ? 'ring-2 ring-orange-600 shadow-[0_24px_48px_-12px_rgba(172,53,9,0.15)]'
                        : 'ring-black/5 hover:shadow-[0_24px_48px_-12px_rgba(172,53,9,0.08)]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                        isFlight ? 'bg-orange-100 text-orange-600' : 'bg-teal-50 text-teal-600'
                      }`}>
                        {isFlight ? <PlaneTakeoff className="w-7 h-7" /> : <Hotel className="w-7 h-7" />}
                      </div>
                      <div className="text-right">
                        <span className={`block text-2xl font-extrabold ${isFlight ? 'text-orange-600' : 'text-teal-600'}`}>
                          {tarif ? `${Number(tarif.price).toLocaleString()} FCFA` : '—'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Par voyageur</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-extrabold mb-3 text-slate-900">
                      {service.label}
                    </h3>
                    <p className="text-slate-500 mb-8 line-clamp-3">
                      {isFlight
                        ? 'Une attestation de reservation de vol certifiee pour votre dossier visa, valide pour toutes les compagnies aeriennes et consulats.'
                        : 'Confirmation de reservation hoteliere ou justificatif de logement requis pour les visas Schengen et internationaux.'}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <ul className="space-y-2 text-sm text-slate-500">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          {isFlight ? 'Livraison PDF instantanee' : 'Verification 24h'}
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          {isFlight ? 'Verifie par les consulats' : 'Couverture mondiale'}
                        </li>
                      </ul>
                      <button
                        type="button"
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all group-active:scale-95 shrink-0 ${
                          isSelected
                            ? isFlight
                              ? 'bg-orange-600 border-orange-600 text-white'
                              : 'bg-teal-600 border-teal-600 text-white'
                            : isFlight
                              ? 'border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white'
                              : 'border-teal-200 text-teal-600 hover:bg-teal-600 hover:text-white'
                        }`}
                        aria-label={isSelected ? 'Retirer' : 'Ajouter'}
                      >
                        {isSelected ? <Check className="w-5 h-5" /> : <span className="text-2xl leading-none">+</span>}
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Bundle card spanning 2 columns */}
              <motion.div
                whileTap={{ scale: 0.99 }}
                onClick={selectBundle}
                className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-orange-600 to-orange-400 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-10 shadow-xl cursor-pointer"
              >
                <div className="flex-1 z-10 text-white">
                  <div className="inline-block px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                    Choix populaire
                  </div>
                  <h3 className="text-3xl font-extrabold mb-4">Pack Voyage Complet</h3>
                  <p className="text-white/80 text-lg mb-6 max-w-xl">
                    Obtenez les attestations vol et hotel ensemble pour un traitement prioritaire. Ideal pour les demandes de visa urgentes.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-black">
                      {(() => {
                        const total = services.reduce((sum, s) => {
                          const t = findTarif(s.id);
                          return sum + (t ? Number(t.price) : 0);
                        }, 0);
                        return `${total.toLocaleString()} FCFA`;
                      })()}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 z-10">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); selectBundle(); }}
                    className="bg-white text-orange-600 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-extrabold text-base md:text-lg hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-3"
                  >
                    Selectionner le pack
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Information */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* LEFT col-4: Instructional editorial card */}
              <aside className="lg:col-span-4">
                <div className="bg-slate-50 p-8 rounded-3xl space-y-4 sticky top-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold leading-tight text-slate-900">L&apos;integrite des donnees est essentielle</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Assurez-vous que toutes les informations correspondent exactement a votre passeport.
                    Les divergences peuvent entrainer un rejet du dossier ou des retards de voyage.
                  </p>
                  <div className="pt-4 relative overflow-hidden rounded-2xl aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-900">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <BadgeCheck className="w-32 h-32 text-white" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6 flex flex-col justify-end">
                      <span className="bg-orange-600 text-[10px] font-bold text-white px-3 py-1 rounded-full w-fit mb-2 uppercase tracking-wider">
                        Securite
                      </span>
                      <p className="text-white text-sm font-bold leading-tight">Vos donnees sont chiffrees et confidentielles.</p>
                    </div>
                  </div>
                </div>
              </aside>

              {/* RIGHT col-8: Form */}
              <div className="lg:col-span-8">
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                  {/* Employee selector */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Voyageur (employe)</Label>
                    <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={employeePopoverOpen}
                          className="w-full justify-between font-normal h-12 bg-slate-50 border-0 rounded-xl px-4"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Users className="w-4 h-4 shrink-0 text-slate-400" />
                            {formData.employeeId
                              ? (() => {
                                  const emp = employees.find(e => e.id === formData.employeeId);
                                  return emp ? `${emp.prenom} ${emp.nom}` : 'Selectionner un employe';
                                })()
                              : <span className="text-slate-500">Selectionner un employe</span>}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* First name */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Prenom(s)</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        placeholder="Prenom(s)"
                        className="bg-slate-50 border-0 rounded-xl h-12 px-4"
                      />
                    </div>
                    {/* Last name */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nom</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        placeholder="Nom"
                        className="bg-slate-50 border-0 rounded-xl h-12 px-4"
                      />
                    </div>

                    {/* Passport */}
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Numero de passeport</Label>
                      <Input
                        value={formData.passport}
                        onChange={(e) => handleChange('passport', e.target.value)}
                        placeholder="ex: L89012345"
                        className="bg-slate-50 border-0 rounded-xl h-12 px-4 font-mono uppercase"
                      />
                    </div>

                    {/* Nationality */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nationalite</Label>
                      <Select
                        value={formData.nationality}
                        onValueChange={(v) => handleChange('nationality', v)}
                      >
                        <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
                          <SelectValue placeholder="Selectionner" />
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

                    {/* Birthdate (3-select) */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date de naissance</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={formData.birthDate ? String(formData.birthDate.getDate()) : ""}
                          onValueChange={(day) => {
                            const current = formData.birthDate || new Date(2000, 0, 1);
                            handleChange('birthDate', new Date(current.getFullYear(), current.getMonth(), Number(day)));
                          }}
                        >
                          <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-3"><SelectValue placeholder="Jour" /></SelectTrigger>
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
                          <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-3"><SelectValue placeholder="Mois" /></SelectTrigger>
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
                          <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-3"><SelectValue placeholder="Annee" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Telephone</Label>
                      <div className="bg-slate-50 rounded-xl h-12 flex items-center px-2">
                        <PhoneInput
                          value={formData.phone}
                          onChange={(v) => handleChange('phone', v)}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="votre@email.com"
                        className="bg-slate-50 border-0 rounded-xl h-12 px-4"
                      />
                    </div>
                  </div>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* LEFT col-8: Form */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 space-y-10">
                {/* Route */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Pays de depart</Label>
                    <Select value={formData.departureCountry} onValueChange={(v) => {
                      handleChange('departureCountry', v);
                      handleChange('departureCity', '');
                    }}>
                      <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
                        <SelectValue placeholder="Choisir un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {departureCountries.map(country => (
                          <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Ville de depart</Label>
                    <Select
                      value={formData.departureCity}
                      onValueChange={(v) => handleChange('departureCity', v)}
                      disabled={!formData.departureCountry}
                    >
                      <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Pays de destination</Label>
                    <Select value={formData.country} onValueChange={(v) => {
                      handleChange('country', v);
                      handleChange('city', '');
                    }}>
                      <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
                        <SelectValue placeholder="Choisir un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Ville de destination</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(v) => handleChange('city', v)}
                      disabled={!formData.country}
                    >
                      <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
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

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date de depart</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-slate-50 border-0 rounded-xl h-12 px-4 justify-start font-normal hover:bg-slate-100">
                          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                          {formData.departureDate
                            ? format(formData.departureDate, "dd MMM yyyy", { locale: fr })
                            : <span className="text-slate-500">Selectionner</span>}
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
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date de retour</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-slate-50 border-0 rounded-xl h-12 px-4 justify-start font-normal hover:bg-slate-100">
                          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                          {formData.returnDate
                            ? format(formData.returnDate, "dd MMM yyyy", { locale: fr })
                            : <span className="text-slate-500">Optionnel</span>}
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

                {/* Purpose - visual buttons */}
                <div className="space-y-4">
                  <Label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Motif du voyage</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: 'tourisme', label: 'Tourisme', icon: Globe },
                      { value: 'affaires', label: 'Affaires', icon: Briefcase },
                      { value: 'etudes', label: 'Etudes', icon: GraduationCap },
                      { value: 'autre', label: 'Autre', icon: MoreHorizontal },
                    ].map((purpose) => {
                      const Icon = purpose.icon;
                      const isSelected = formData.reason === purpose.value;
                      return (
                        <button
                          key={purpose.value}
                          type="button"
                          onClick={() => handleChange('reason', purpose.value)}
                          className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all ring-2 ${
                            isSelected
                              ? 'bg-orange-50 ring-orange-600 scale-[1.02]'
                              : 'bg-slate-50 ring-transparent hover:bg-slate-100 hover:scale-[1.02]'
                          }`}
                        >
                          <Icon className={`w-7 h-7 mb-3 ${isSelected ? 'text-orange-600' : 'text-slate-600'}`} />
                          <span className={`text-sm font-semibold ${isSelected ? 'text-orange-600' : 'text-slate-800'}`}>
                            {purpose.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hotel section - conditional */}
                {hasHotel && (
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <Label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Details hebergement</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categorie</Label>
                        <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                          <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Personnes</Label>
                        <Select value={formData.persons} onValueChange={(v) => handleChange('persons', v)}>
                          <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
                            <SelectValue placeholder="Nombre" />
                          </SelectTrigger>
                          <SelectContent>
                            {["1", "2", "3", "4", "5"].map(n => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chambre</Label>
                        <Select value={formData.roomType} onValueChange={(v) => handleChange('roomType', v)}>
                          <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
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
                    <div className="flex flex-col gap-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Precisions (optionnel)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Regime, accessibilite..."
                        className="bg-slate-50 border-0 rounded-xl px-4 py-3 min-h-[80px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT col-4: Sidebar */}
              <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <h3 className="font-extrabold text-lg mb-6 text-slate-900">Resume de la demande</h3>
                  <div className="space-y-5">
                    {(() => {
                      const emp = formData.employeeId ? employees.find(e => e.id === formData.employeeId) : null;
                      const travelerName = emp ? `${emp.prenom} ${emp.nom}` : (formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : '—');
                      return (
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                            <User className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Voyageur</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{travelerName}</p>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Services</p>
                        <p className="text-sm font-bold text-slate-900">
                          {formData.selectedServices
                            .map(id => services.find(s => s.id === id)?.label)
                            .filter(Boolean)
                            .join(' + ') || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                        <Sparkles className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Traitement</p>
                        <p className="text-sm font-bold text-slate-900">Express (24-48h)</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
                    <p className="text-sm font-semibold text-slate-500">Sous-total</p>
                    <p className="text-xl font-extrabold text-orange-600">
                      {calculateTotal().toLocaleString()} FCFA
                    </p>
                  </div>
                </div>

                <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100">
                  <div className="flex items-start gap-4">
                    <Lightbulb className="w-5 h-5 text-teal-700 mt-1 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-teal-900 mb-2">Conseil expert</h4>
                      <p className="text-xs text-teal-800/80 leading-relaxed">
                        Indiquez des dates precises et un motif clair. Cela accelere le traitement de vos attestations par les consulats.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {/* Step 4: Payment */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* LEFT col-7: Payment options */}
              <div className="lg:col-span-7 space-y-6">
                {paymentMethods.map((option) => {
                  const isSelected = formData.paymentMethod === option.value;
                  const isCompany = option.value === 'company_account';
                  return (
                    <div
                      key={option.value}
                      onClick={() => handleChange('paymentMethod', option.value)}
                      className={`p-8 rounded-3xl transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'bg-white shadow-[0_12px_32px_rgba(23,28,31,0.08)] ring-1 ring-black/5'
                          : 'bg-slate-50 hover:bg-white hover:shadow-[0_8px_24px_rgba(23,28,31,0.04)]'
                      }`}
                    >
                      <div className="flex items-start gap-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isCompany ? 'bg-orange-100 text-orange-600' : 'bg-teal-50 text-teal-600'
                        }`}>
                          {isCompany ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-3">
                            <h3 className="text-lg font-extrabold text-slate-900">{option.label}</h3>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? isCompany ? 'border-orange-600 bg-orange-600' : 'border-teal-600 bg-teal-600'
                                : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <p className="text-slate-500 text-sm leading-relaxed">{option.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-center gap-3 py-4 text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Chiffrement SSL 256 bits actif</span>
                </div>
              </div>

              {/* RIGHT col-5: Order summary - dark card */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
                <div className="relative bg-slate-900 text-white rounded-3xl p-8 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/30 blur-[60px] rounded-full -mr-16 -mt-16" />
                  <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Resume de la commande
                  </h3>
                  <div className="space-y-4 mb-8">
                    {formData.selectedServices.map(id => {
                      const service = services.find(s => s.id === id);
                      const tarif = findTarif(id);
                      return service ? (
                        <div key={id} className="flex justify-between items-center text-white/60 text-sm">
                          <span>{service.label}</span>
                          <span className="font-mono text-white">{tarif ? Number(tarif.price).toLocaleString() : '—'} FCFA</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="pt-6 border-t border-white/10">
                    <div className="flex justify-between items-end gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Total a payer</p>
                        <p className="text-3xl font-extrabold">
                          {calculateTotal().toLocaleString()}
                          <span className="text-base font-bold text-white/60 ml-2">FCFA</span>
                        </p>
                      </div>
                      {user?.isTva && (
                        <span className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">TVA 18% non incluse</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Traveler card */}
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Voyageur</h4>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-4 font-bold">
                      {(formData.firstName?.[0] || '?')}{(formData.lastName?.[0] || '')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {formData.firstName} {formData.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Passeport : {formData.passport ? `****${formData.passport.slice(-4).toUpperCase()}` : '—'}
                      </p>
                    </div>
                  </div>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* LEFT col-8: Data groups */}
              <div className="lg:col-span-8 space-y-6">
                {/* Applicant Details */}
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Voyageur</h3>
                        <p className="text-xs text-slate-400">Informations principales</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-orange-600 font-semibold text-sm hover:underline"
                    >
                      Modifier
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Nom complet</p>
                      <p className="text-sm font-bold text-slate-900">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Passeport</p>
                      <p className="text-sm font-bold text-slate-900 font-mono uppercase">{formData.passport}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Nationalite</p>
                      <p className="text-sm font-bold text-slate-900">{formData.nationality}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Email</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{formData.email}</p>
                    </div>
                  </div>
                </section>

                {/* Trip Configuration */}
                <section className="bg-slate-50 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-bl-[100px]" />
                  <div className="flex items-center justify-between mb-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                        <PlaneTakeoff className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Configuration du voyage</h3>
                        <p className="text-xs text-slate-400">Trajet et periode</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-orange-600 font-semibold text-sm hover:underline relative"
                    >
                      Modifier
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                    <div className="bg-white p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{selectedCountry?.name || '—'}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1 ml-5">{formData.city}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date de depart</p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {formData.departureDate ? format(formData.departureDate, "dd MMM yyyy", { locale: fr }) : '—'}
                        </span>
                      </p>
                      {formData.returnDate && (
                        <p className="text-xs text-slate-500 mt-1 ml-5">
                          retour {format(formData.returnDate, "dd MMM", { locale: fr })}
                        </p>
                      )}
                    </div>
                    <div className="bg-white p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Motif</p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{travelReasons.find(r => r.value === formData.reason)?.label || '—'}</span>
                      </p>
                    </div>
                  </div>
                </section>

                {/* Service Breakdown */}
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-extrabold text-slate-900">Detail des services</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-orange-600 font-semibold text-sm hover:underline"
                    >
                      Modifier
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.selectedServices.map(id => {
                      const service = services.find(s => s.id === id);
                      const tarif = findTarif(id);
                      const isFlight = id === 'flight';
                      return service ? (
                        <div key={id} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            {isFlight
                              ? <PlaneTakeoff className="w-5 h-5 text-teal-600 shrink-0" />
                              : <Hotel className="w-5 h-5 text-teal-600 shrink-0" />}
                            <div>
                              <p className="font-bold text-slate-900">{service.label}</p>
                              <p className="text-xs text-slate-500">
                                {isFlight ? 'Attestation PDF livree sous 24h' : 'Confirmation hoteliere certifiee'}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-slate-900 shrink-0 ml-4">
                            {tarif ? Number(tarif.price).toLocaleString() : '—'} FCFA
                          </p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </section>

                {/* Hotel preferences if applicable */}
                {hasHotel && (
                  <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                          <Hotel className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900">Hebergement</h3>
                          <p className="text-xs text-slate-400">Preferences</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-orange-600 font-semibold text-sm hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Categorie</p>
                        <p className="text-sm font-bold text-slate-900">
                          {categories.find(c => c.value === formData.category)?.label || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Chambre</p>
                        <p className="text-sm font-bold text-slate-900">
                          {roomTypes.find(r => r.value === formData.roomType)?.label || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Personnes</p>
                        <p className="text-sm font-bold text-slate-900">{formData.persons || '—'}</p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* RIGHT col-4: Payment & Action */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
                {/* Payment Preview */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-6">Paiement</h3>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-xl mb-6 shadow-sm">
                    <div className="w-12 h-8 bg-slate-900 rounded flex items-center justify-center shrink-0">
                      {formData.paymentMethod === 'company_account'
                        ? <Building2 className="w-4 h-4 text-white" />
                        : <User className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {paymentMethods.find(p => p.value === formData.paymentMethod)?.label || '—'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {paymentMethods.find(p => p.value === formData.paymentMethod)?.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-orange-600 shrink-0"
                      aria-label="Modifier le paiement"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 px-2">
                    {user?.isTva ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Sous-total HT</span>
                          <span className="font-medium text-slate-900">{calculateTotal().toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">TVA (18%)</span>
                          <span className="font-medium text-slate-900">
                            {Math.round(calculateTotal() * 0.18).toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-end">
                          <span className="text-slate-900 font-bold">Total TTC</span>
                          <span className="text-xl font-extrabold text-orange-600">
                            {Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-end">
                        <span className="text-slate-900 font-bold">Total a payer</span>
                        <span className="text-xl font-extrabold text-orange-600">
                          {calculateTotal().toLocaleString()} FCFA
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual confirmation */}
                <div className="relative h-40 rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600">
                  <div className="absolute inset-0 opacity-20 flex items-center justify-center">
                    <PlaneTakeoff className="w-32 h-32 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <p className="text-white text-xs font-medium leading-snug">
                      Pret au decollage. Vos documents seront traites des reception.
                    </p>
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded-md border-slate-300 text-orange-600 focus:ring-orange-200 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed group-hover:text-slate-900">
                    Je certifie que toutes les informations sont exactes et j&apos;accepte les{' '}
                    <a className="text-orange-600 underline" href="#">conditions generales</a> et les delais de traitement.
                  </span>
                </label>
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
