'use client';

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Ville, TrajetInterVille, CreateInterCityBookingDto, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption, toBookingPaymentMethod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
type InterCityPaymentMethod = string;
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin,
  Route,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Car,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Plus,
  Baby,
  PawPrint,
  Users,
  Briefcase,
  Clock,
  User,
  Phone,
  Mail,
  Home,
  Search,
  UserPlus,
  Info,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import EmployeeForm from "@/components/employees/EmployeeForm";
import { AddressAutocomplete, countryNameToCode } from "@/components/ui/address-autocomplete";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FormData {
  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  employeeId: number | null;
  // Trip info
  trajetInterVilleId: number | null;
  vehiculeId: number | null;
  departureCity: string;
  arrivalCity: string;
  pickupDateAller: string;
  pickupTimeAller: string;
  isOneWay: boolean;
  // Addresses
  adressePriseEnChargeDepartAller: string;
  adressePriseEnChargeDepartAllerLat: number | null;
  adressePriseEnChargeDepartAllerLng: number | null;
  adressePriseEnChargeArriveeAller: string;
  adressePriseEnChargeArriveeAllerLat: number | null;
  adressePriseEnChargeArriveeAllerLng: number | null;
  adressePriseEnChargeDepartRetour: string;
  adressePriseEnChargeDepartRetourLat: number | null;
  adressePriseEnChargeDepartRetourLng: number | null;
  adressePriseEnChargeArriveeRetour: string;
  adressePriseEnChargeArriveeRetourLat: number | null;
  adressePriseEnChargeArriveeRetourLng: number | null;
  // Options
  siegeBebes: number;
  animalDeCompagnie: boolean;
  smallBags: number;
  largeBags: number;
  specialRequests: string;
  // Return trip
  pickupDateRetour: string;
  pickupTimeRetour: string;
  siegeBebesRetour: number;
  animalDeCompagnieRetour: boolean;
  // Payment
  paymentMethod: InterCityPaymentMethod | '';
}

const steps: Step[] = [
  { id: 1, title: "Client", icon: User },
  { id: 2, title: "Trajet", icon: MapPin },
  { id: 3, title: "Vehicule", icon: Car },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

export default function InterCityBookingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingReference, setBookingReference] = useState<string>("");

  const initialFormData: FormData = {
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    employeeId: null,
    trajetInterVilleId: null,
    vehiculeId: null,
    departureCity: "",
    arrivalCity: "",
    pickupDateAller: "",
    pickupTimeAller: "",
    isOneWay: true,
    adressePriseEnChargeDepartAller: "",
    adressePriseEnChargeDepartAllerLat: null,
    adressePriseEnChargeDepartAllerLng: null,
    adressePriseEnChargeArriveeAller: "",
    adressePriseEnChargeArriveeAllerLat: null,
    adressePriseEnChargeArriveeAllerLng: null,
    adressePriseEnChargeDepartRetour: "",
    adressePriseEnChargeDepartRetourLat: null,
    adressePriseEnChargeDepartRetourLng: null,
    adressePriseEnChargeArriveeRetour: "",
    adressePriseEnChargeArriveeRetourLat: null,
    adressePriseEnChargeArriveeRetourLng: null,
    siegeBebes: 0,
    animalDeCompagnie: false,
    smallBags: 0,
    largeBags: 0,
    specialRequests: "",
    pickupDateRetour: "",
    pickupTimeRetour: "",
    siegeBebesRetour: 0,
    animalDeCompagnieRetour: false,
    paymentMethod: "",
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedPays, setSelectedPays] = useState<string>("");
  const [selectedDepartId, setSelectedDepartId] = useState<number | null>(null);
  const [selectedArriveeId, setSelectedArriveeId] = useState<number | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [departPopoverOpen, setDepartPopoverOpen] = useState(false);
  const [arriveePopoverOpen, setArriveePopoverOpen] = useState(false);
  const [vehiclePage, setVehiclePage] = useState(0);
  const VEHICLES_PER_PAGE = 4;

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentMethods = [
    { value: "company_account", label: "Compte entreprise", desc: "L'entreprise paie via Bictorys", icon: "🏢" },
    { value: "client", label: "Client / Employe", desc: "Le client ou l'employe paie lui-meme", icon: "👤" },
  ];

  // Fetch countries
  const { data: paysResponse } = useQuery({
    queryKey: ['pays'],
    queryFn: () => api.reference.getPays(),
  });
  const paysRaw = paysResponse?.data;
  const pays: string[] = Array.isArray(paysRaw)
    ? paysRaw.map((p: unknown) => typeof p === 'string' ? p : (p as Record<string, unknown>)?.nom as string || String(p)).filter(Boolean)
    : [];

  // Fetch villes for selected country (only non-airport cities)
  const { data: villesResponse } = useQuery({
    queryKey: ['villes', selectedPays],
    queryFn: () => api.reference.getVilles(selectedPays),
    enabled: !!selectedPays,
  });
  const villesRaw = villesResponse?.data;
  const allVilles: Ville[] = Array.isArray(villesRaw)
    ? villesRaw
    : (villesRaw as any)?.list || (villesRaw as any)?.items || [];
  const villes = allVilles.filter(v => !v.isAeroport);

  // Fetch inter-city routes
  const { data: trajetsResponse, isLoading: trajetsLoading } = useQuery({
    queryKey: ['trajet-inter-ville'],
    queryFn: () => api.reference.getTrajetInterVille(),
  });
  const trajets: TrajetInterVille[] = trajetsResponse?.data?.list || [];

  // Fetch employees for company bookings
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

  // Helper to get ville display name (API returns nom or name)
  const getVilleName = (v?: Ville | null): string => v?.nom || v?.name || '';

  // Find ALL matching trajets for a given depart+arrivee (each has a different vehicule)
  const findMatchingTrajets = (departId: number, arriveeId: number): TrajetInterVille[] => {
    return trajets.filter(t => t.villeDepart?.id === departId && t.villeArrivee?.id === arriveeId);
  };

  // Trajets matching current route selection (for vehicle step)
  const matchingTrajets: TrajetInterVille[] = (selectedDepartId && selectedArriveeId)
    ? findMatchingTrajets(selectedDepartId, selectedArriveeId)
    : [];

  // The trajet selected by the user (when they pick a vehicle)
  const selectedTrajet = trajets.find(t => t.id === formData.trajetInterVilleId);

  // First available vehicle image — used as background for the "Privilegiez le silence" card
  const featuredVehicleImage: string | undefined = trajets
    .map(t => (Array.isArray(t.vehicule?.image) ? t.vehicule?.image?.[0] : t.vehicule?.image))
    .find((img): img is string => typeof img === 'string' && img.length > 0);

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: (data: CreateInterCityBookingDto) => api.bookings.createInterCity(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBookingReference(response.data?.reference || `SUB-${Date.now()}`);
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
        if (emp.adresse) handleChange('clientAddress', emp.adresse);
      }
      setShowAddEmployee(false);
      toast.success("Employe ajoute avec succes");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'ajout de l'employe");
    },
  });

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset vehicle pagination when the route (and therefore the list) changes
  useEffect(() => {
    setVehiclePage(0);
  }, [selectedDepartId, selectedArriveeId]);

  const handleSwapCities = () => {
    const newDepartId = selectedArriveeId;
    const newArriveeId = selectedDepartId;
    setSelectedDepartId(newDepartId);
    setSelectedArriveeId(newArriveeId);
    setFormData(prev => ({
      ...prev,
      trajetInterVilleId: null,
      vehiculeId: null,
    }));
  };

  // Validate & format phone number
  const cleanPhone = (phone: string): string => phone.replace(/[\s\-\.\(\)]/g, '');
  const isValidPhone = (phone: string): boolean => /^\+?\d{7,15}$/.test(cleanPhone(phone));
  // Format phone for backend: +221 77 130 85 07
  const formatPhoneForApi = (phone: string): string => {
    const digits = cleanPhone(phone);
    // Match country code (1-3 digits after +) then format the rest in pairs
    const match = digits.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      const [, code, num] = match;
      const formatted = num.replace(/(\d{2})(?=\d)/g, '$1 ');
      return `${code} ${formatted}`;
    }
    return phone;
  };

  const phoneError = formData.clientPhone && !isValidPhone(formData.clientPhone);

  const calculateTotal = (): number => {
    if (!selectedTrajet) return 0;
    const basePrice = selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0;
    let total = basePrice;

    // Options
    if (formData.siegeBebes > 0) {
      total += formData.siegeBebes * (selectedTrajet.prixSiegeBebe ?? 5000);
    }
    if (formData.animalDeCompagnie) {
      total += selectedTrajet.prixAnimalCompagnie ?? 5000;
    }

    // Return trip
    if (!formData.isOneWay) {
      total += selectedTrajet.prixAllerRetour || basePrice;
      if (formData.siegeBebesRetour > 0) {
        total += formData.siegeBebesRetour * (selectedTrajet.prixSiegeBebe ?? 5000);
      }
      if (formData.animalDeCompagnieRetour) {
        total += selectedTrajet.prixAnimalCompagnie ?? 5000;
      }
    }

    return total;
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.employeeId) {
        toast.error("Veuillez selectionner un voyageur");
        return;
      }
      if (!formData.clientName) {
        toast.error("Veuillez entrer le nom du client");
        return;
      }
      if (!formData.clientPhone) {
        toast.error("Veuillez entrer le numero de telephone");
        return;
      }
      if (!isValidPhone(formData.clientPhone)) {
        toast.error("Numero de telephone invalide");
        return;
      }
    }

    if (currentStep === 2) {
      if (!selectedPays) {
        toast.error("Veuillez selectionner un pays");
        return;
      }
      if (!selectedDepartId) {
        toast.error("Veuillez selectionner une ville de depart");
        return;
      }
      if (!selectedArriveeId) {
        toast.error("Veuillez selectionner une ville d'arrivee");
        return;
      }
      if (!formData.adressePriseEnChargeDepartAller) {
        toast.error("Veuillez entrer l'adresse de prise en charge au depart");
        return;
      }
      if (!formData.adressePriseEnChargeArriveeAller) {
        toast.error("Veuillez entrer l'adresse de depose a l'arrivee");
        return;
      }
      if (!formData.pickupDateAller) {
        toast.error("Veuillez selectionner une date de depart");
        return;
      }
      if (!formData.pickupTimeAller) {
        toast.error("Veuillez selectionner une heure de depart");
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.trajetInterVilleId) {
        toast.error("Veuillez selectionner un vehicule");
        return;
      }
    }

    if (currentStep === 4) {
      // Payment method is optional
    }

    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!selectedTrajet) {
      toast.error("Veuillez selectionner un trajet valide");
      return;
    }

    const isCompanyPayment = formData.paymentMethod === 'company_account';

    const bookingData: CreateInterCityBookingDto = {
      clientName: formData.clientName,
      clientEmail: formData.clientEmail || undefined,
      clientPhone: formatPhoneForApi(formData.clientPhone),
      clientAddress: formData.clientAddress,
      adressePriseEnChargeDepartAller: formData.adressePriseEnChargeDepartAller,
      adressePriseEnChargeDepartAllerLat: formData.adressePriseEnChargeDepartAllerLat || undefined,
      adressePriseEnChargeDepartAllerLng: formData.adressePriseEnChargeDepartAllerLng || undefined,
      adressePriseEnChargeArriveeAller: formData.adressePriseEnChargeArriveeAller,
      adressePriseEnChargeArriveeAllerLat: formData.adressePriseEnChargeArriveeAllerLat || undefined,
      adressePriseEnChargeArriveeAllerLng: formData.adressePriseEnChargeArriveeAllerLng || undefined,
      serviceType: formData.isOneWay ? 'one_way' : 'round_trip',
      trajetInterVilleId: selectedTrajet.id,
      vehiculeId: formData.vehiculeId || undefined,
      departureCity: getVilleName(selectedTrajet.villeDepart),
      arrivalCity: getVilleName(selectedTrajet.villeArrivee),
      isOneWay: formData.isOneWay,
      pickupDateAller: formData.pickupDateAller,
      pickupTimeAller: formData.pickupTimeAller,
      paidBy: isCompanyPayment ? 'company' : 'client',
      companyCode: user?.companyCode || undefined,
      employeeId: formData.employeeId || undefined,
      customerId: formData.employeeId || undefined,
      siegeBebes: formData.siegeBebes || undefined,
      animalDeCompagnie: formData.animalDeCompagnie || undefined,
      smallBags: formData.smallBags || undefined,
      largeBags: formData.largeBags || undefined,
      specialRequests: formData.specialRequests || undefined,
    };

    // Add return trip info if round trip
    if (!formData.isOneWay) {
      bookingData.pickupDateRetour = formData.pickupDateRetour;
      bookingData.pickupTimeRetour = formData.pickupTimeRetour;
      bookingData.siegeBebesRetour = formData.siegeBebesRetour;
      bookingData.animalDeCompagnieRetour = formData.animalDeCompagnieRetour;
      (bookingData as any).adressePriseEnChargeDepartRetour = formData.adressePriseEnChargeDepartRetour || undefined;
      (bookingData as any).adressePriseEnChargeDepartRetourLat = formData.adressePriseEnChargeDepartRetourLat || undefined;
      (bookingData as any).adressePriseEnChargeDepartRetourLng = formData.adressePriseEnChargeDepartRetourLng || undefined;
      (bookingData as any).adressePriseEnChargeArriveeRetour = formData.adressePriseEnChargeArriveeRetour || undefined;
      (bookingData as any).adressePriseEnChargeArriveeRetourLat = formData.adressePriseEnChargeArriveeRetourLat || undefined;
      (bookingData as any).adressePriseEnChargeArriveeRetourLng = formData.adressePriseEnChargeArriveeRetourLng || undefined;
    }

    console.log('[INTER-CITY] Booking data:', JSON.stringify(bookingData, null, 2));
    createBooking.mutate(bookingData);
  };

  const resetForm = () => {
    setBookingSuccess(false);
    setCurrentStep(1);
    setFormData(initialFormData);
    setSelectedPays("");
    setSelectedDepartId(null);
    setSelectedArriveeId(null);
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.employeeId && formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone));
      case 2: {
        const baseValid = !!(selectedPays && selectedDepartId && selectedArriveeId && formData.adressePriseEnChargeDepartAller && formData.adressePriseEnChargeArriveeAller && formData.pickupDateAller && formData.pickupTimeAller);
        if (!formData.isOneWay) return baseValid && !!(formData.pickupDateRetour && formData.pickupTimeRetour);
        return baseValid;
      }
      case 3:
        return !!formData.trajetInterVilleId;
      case 4:
        return true;
      default:
        return false;
    }
  };

  if (bookingSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-6xl mx-auto space-y-10"
      >
        {/* Editorial header */}
        <section className="mb-4">
          <p className="text-[#E04A1F] font-bold tracking-widest text-xs uppercase mb-2">Derniere etape</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight leading-tight">
            Recapitulatif de votre reservation
          </h1>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            Votre trajet inter-urbain a ete enregistre. Une fois valide, votre demande sera traitee par notre equipe logistique.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#ffdbd0] rounded-full">
            <CheckCircle2 className="w-4 h-4 text-[#E04A1F]" />
            <span className="text-sm font-bold text-orange-700 tracking-wider">REF: {bookingReference}</span>
          </div>
        </section>

        {/* Bento recap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left col */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <MapPin className="w-5 h-5 text-[#E04A1F]" />
                  Details du trajet
                </h2>
              </div>
              <div className="flex items-start gap-8">
                <div className="relative flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full border-4 border-orange-600 bg-white z-10" />
                  <div className="w-[2px] h-24 border-l-2 border-dashed border-slate-200 my-1" />
                  <div className="w-4 h-4 rounded-full bg-slate-900 z-10" />
                </div>
                <div className="flex-1 space-y-12">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Point de depart</p>
                    <p className="text-lg font-bold text-slate-900">{getVilleName(selectedTrajet?.villeDepart) || '—'}</p>
                    {formData.adressePriseEnChargeDepartAller && (
                      <p className="text-sm text-slate-500">{formData.adressePriseEnChargeDepartAller}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Point d&apos;arrivee</p>
                    <p className="text-lg font-bold text-slate-900">{getVilleName(selectedTrajet?.villeArrivee) || '—'}</p>
                    {formData.adressePriseEnChargeArriveeAller && (
                      <p className="text-sm text-slate-500">{formData.adressePriseEnChargeArriveeAller}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Passager &amp; Client</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#E04A1F] font-bold shadow-sm">
                    {formData.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{formData.clientName}</p>
                    <p className="text-sm text-slate-500 truncate">{formData.clientPhone}</p>
                    {formData.clientEmail && <p className="text-sm text-slate-500 truncate">{formData.clientEmail}</p>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Date &amp; Heure</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F]">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {formData.pickupDateAller && format(new Date(formData.pickupDateAller), 'EEE d MMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-sm text-slate-500">Depart prevu a {formData.pickupTimeAller}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right col */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Vehicule selectionne</h3>
              <div className="mb-4 h-28 bg-slate-50 rounded-2xl flex items-center justify-center">
                <Car className="w-16 h-16 text-slate-400" />
              </div>
              <div className="flex justify-between items-end">
                <div className="min-w-0">
                  <p className="text-xl font-bold text-slate-900 capitalize truncate">
                    {selectedTrajet?.vehicule?.categorie || selectedTrajet?.vehicule?.marque || 'Vehicule'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedTrajet?.vehicule?.modele || selectedTrajet?.vehicule?.model || 'Ou similaire'}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-[#E04A1F] shrink-0" fill="currentColor" strokeWidth={0} />
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Detail du paiement</h3>
              <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                <span className="font-bold text-lg">Total</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-400">{calculateTotal().toLocaleString()} FCFA</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">TVA incluse</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 my-6 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white/60">Mode de paiement</p>
                  <p className="text-sm font-semibold truncate">
                    {formData.paymentMethod || 'Compte entreprise'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => router.push("/tracking")}
                  className="w-full bg-[#E04A1F] text-white py-5 rounded-2xl font-extrabold text-base border-0 hover:shadow-[0_0_32px_rgba(172,53,9,0.4)] active:scale-[0.98] transition-all gap-2"
                >
                  Voir dans le suivi
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full py-5 rounded-2xl font-bold text-sm bg-white/10 text-white border-0 hover:bg-white/20 transition-all"
                >
                  Nouvelle reservation
                </Button>
              </div>
            </div>

            <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100">
              <div className="flex gap-4">
                <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-teal-900 mb-1">Besoin d&apos;aide ?</p>
                  <p className="text-xs text-teal-800/80 leading-relaxed">
                    Notre support business est disponible 24/7 pour toute demande specifique.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6">
      {/* Hero Header */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
          <div>
            <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              <span>Reservations</span>
              <span>/</span>
              <span className="text-[#E04A1F]">Inter-villes</span>
            </nav>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {currentStep === 1 && "Informations du client"}
              {currentStep === 2 && "Configuration du trajet"}
              {currentStep === 3 && "Selectionnez votre vehicule"}
              {currentStep === 4 && "Paiement"}
              {currentStep === 5 && "Recapitulatif de votre reservation"}
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {currentStep === 1 && "Renseignez les details du voyageur pour cette reservation."}
              {currentStep === 2 && "Etape 2 sur 5 — Definissez les details de votre voyage inter-villes."}
              {currentStep === 3 && "Choisissez la categorie de vehicule la mieux adaptee a votre trajet."}
              {currentStep === 4 && "Choisissez votre mode de facturation pour cette reservation."}
              {currentStep === 5 && "Verifiez les details avant de confirmer votre reservation."}
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

      {/* Form content (full width — chaque etape gere sa propre grille interne) */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10">
        <AnimatePresence mode="wait">
          {/* Step 2: Trip details */}
          {currentStep === 2 && (
            <motion.div
              key="step2-trip"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {trajetsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT col-8: form sections */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* Itineraire card */}
                      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                          <Route className="w-5 h-5 text-[#E04A1F]" />
                          Itineraire
                        </h2>
                        <div className="space-y-5">
                          {/* Pays + Date */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pays</Label>
                              <Select
                                value={selectedPays}
                                onValueChange={(v) => {
                                  setSelectedPays(v);
                                  setSelectedDepartId(null);
                                  setSelectedArriveeId(null);
                                  handleChange('trajetInterVilleId', null);
                                  handleChange('vehiculeId', null);
                                }}
                              >
                                <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4">
                                  <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                  <SelectValue placeholder="Choisir un pays" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pays.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date de depart</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start bg-slate-50 hover:bg-slate-100 rounded-xl h-12 px-4 font-normal"
                                  >
                                    <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                                    {formData.pickupDateAller
                                      ? format(new Date(formData.pickupDateAller + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                                      : <span className="text-slate-500">Selectionner une date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={formData.pickupDateAller ? new Date(formData.pickupDateAller + 'T00:00:00') : undefined}
                                    onSelect={(date) => handleChange('pickupDateAller', date ? format(date, 'yyyy-MM-dd') : '')}
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure de depart</Label>
                            <div className="bg-slate-50 rounded-xl px-4 h-12 flex items-center">
                              <TimePicker
                                value={formData.pickupTimeAller}
                                onChange={(v) => handleChange('pickupTimeAller', v)}
                                placeholder="Choisir une heure"
                                selectedDate={formData.pickupDateAller}
                              />
                            </div>
                          </div>

                          {/* Cities with swap button */}
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ville de depart</Label>
                              <Popover open={departPopoverOpen} onOpenChange={setDepartPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    role="combobox"
                                    disabled={!selectedPays}
                                    className="w-full justify-between font-normal h-12 bg-slate-50 hover:bg-slate-100 rounded-xl px-4"
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                                      {selectedDepartId
                                        ? getVilleName(villes.find(v => v.id === selectedDepartId))
                                        : (!selectedPays ? <span className="text-slate-500">Selectionnez un pays</span> : <span className="text-slate-500">Choisir une ville</span>)
                                      }
                                    </span>
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Rechercher une ville..." />
                                    <CommandList>
                                      <CommandEmpty>Aucune ville trouvee</CommandEmpty>
                                      <CommandGroup>
                                        {villes.map(v => (
                                          <CommandItem
                                            key={v.id}
                                            value={getVilleName(v)}
                                            onSelect={() => {
                                              setSelectedDepartId(v.id);
                                              if (selectedArriveeId === v.id) setSelectedArriveeId(null);
                                              handleChange('trajetInterVilleId', null);
                                              handleChange('vehiculeId', null);
                                              setDepartPopoverOpen(false);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <MapPin className="w-4 h-4 mr-2 shrink-0" />
                                            {getVilleName(v)}
                                            {selectedDepartId === v.id && (
                                              <Check className="ml-auto w-4 h-4 text-[#E04A1F] shrink-0" />
                                            )}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleSwapCities}
                              disabled={!selectedDepartId || !selectedArriveeId}
                              className="h-12 w-12 rounded-xl bg-[#ffdbd0]/40 hover:bg-[#ffdbd0] border-0 text-[#E04A1F]"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </Button>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ville d&apos;arrivee</Label>
                              <Popover open={arriveePopoverOpen} onOpenChange={setArriveePopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    role="combobox"
                                    disabled={!selectedPays}
                                    className="w-full justify-between font-normal h-12 bg-slate-50 hover:bg-slate-100 rounded-xl px-4"
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                                      {selectedArriveeId
                                        ? getVilleName(villes.find(v => v.id === selectedArriveeId))
                                        : (!selectedPays ? <span className="text-slate-500">Selectionnez un pays</span> : <span className="text-slate-500">Choisir une ville</span>)
                                      }
                                    </span>
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Rechercher une ville..." />
                                    <CommandList>
                                      <CommandEmpty>Aucune ville trouvee</CommandEmpty>
                                      <CommandGroup>
                                        {villes.filter(v => v.id !== selectedDepartId).map(v => (
                                          <CommandItem
                                            key={v.id}
                                            value={getVilleName(v)}
                                            onSelect={() => {
                                              setSelectedArriveeId(v.id);
                                              handleChange('trajetInterVilleId', null);
                                              handleChange('vehiculeId', null);
                                              setArriveePopoverOpen(false);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <MapPin className="w-4 h-4 mr-2 shrink-0" />
                                            {getVilleName(v)}
                                            {selectedArriveeId === v.id && (
                                              <Check className="ml-auto w-4 h-4 text-[#E04A1F] shrink-0" />
                                            )}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Pickup addresses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Adresse de prise en charge *</Label>
                              <AddressAutocomplete
                                placeholder="Ex: Hotel Terrou-Bi, Corniche, Dakar"
                                value={formData.adressePriseEnChargeDepartAller}
                                onChange={(val) => handleChange('adressePriseEnChargeDepartAller', val)}
                                onSelect={(address, lat, lng) => {
                                  setFormData(prev => ({ ...prev, adressePriseEnChargeDepartAller: address, adressePriseEnChargeDepartAllerLat: lat, adressePriseEnChargeDepartAllerLng: lng }));
                                }}
                                iconColor="text-green-500"
                                countryCode={countryNameToCode(selectedPays)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Adresse de depose *</Label>
                              <AddressAutocomplete
                                placeholder="Ex: Gare routiere, Thies"
                                value={formData.adressePriseEnChargeArriveeAller}
                                onChange={(val) => handleChange('adressePriseEnChargeArriveeAller', val)}
                                onSelect={(address, lat, lng) => {
                                  setFormData(prev => ({ ...prev, adressePriseEnChargeArriveeAller: address, adressePriseEnChargeArriveeAllerLat: lat, adressePriseEnChargeArriveeAllerLng: lng }));
                                }}
                                iconColor="text-red-500"
                                countryCode={countryNameToCode(selectedPays)}
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Trajet retour card (conditional) */}
                      {!formData.isOneWay && (
                        <motion.section
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-orange-100"
                        >
                          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                            <ArrowRightLeft className="w-5 h-5 text-[#E04A1F]" />
                            Trajet retour
                          </h2>
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Adresse de prise en charge</Label>
                                <AddressAutocomplete
                                  placeholder="Ex: Gare routiere, Thies"
                                  value={formData.adressePriseEnChargeDepartRetour}
                                  onChange={(val) => handleChange('adressePriseEnChargeDepartRetour', val)}
                                  onSelect={(address, lat, lng) => {
                                    setFormData(prev => ({ ...prev, adressePriseEnChargeDepartRetour: address, adressePriseEnChargeDepartRetourLat: lat, adressePriseEnChargeDepartRetourLng: lng }));
                                  }}
                                  iconColor="text-green-500"
                                  countryCode={countryNameToCode(selectedPays)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Adresse de depose</Label>
                                <AddressAutocomplete
                                  placeholder="Ex: Hotel Terrou-Bi, Corniche, Dakar"
                                  value={formData.adressePriseEnChargeArriveeRetour}
                                  onChange={(val) => handleChange('adressePriseEnChargeArriveeRetour', val)}
                                  onSelect={(address, lat, lng) => {
                                    setFormData(prev => ({ ...prev, adressePriseEnChargeArriveeRetour: address, adressePriseEnChargeArriveeRetourLat: lat, adressePriseEnChargeArriveeRetourLng: lng }));
                                  }}
                                  iconColor="text-red-500"
                                  countryCode={countryNameToCode(selectedPays)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date de retour</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-start bg-slate-50 hover:bg-slate-100 rounded-xl h-12 px-4 font-normal"
                                    >
                                      <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                                      {formData.pickupDateRetour
                                        ? format(new Date(formData.pickupDateRetour + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                                        : <span className="text-slate-500">Selectionner une date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={formData.pickupDateRetour ? new Date(formData.pickupDateRetour + 'T00:00:00') : undefined}
                                      onSelect={(date) => handleChange('pickupDateRetour', date ? format(date, 'yyyy-MM-dd') : '')}
                                      disabled={(date) => {
                                        const minDate = formData.pickupDateAller ? new Date(formData.pickupDateAller + 'T00:00:00') : new Date(new Date().setHours(0, 0, 0, 0));
                                        return date < minDate;
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure de retour</Label>
                                <div className="bg-slate-50 rounded-xl px-4 h-12 flex items-center">
                                  <TimePicker
                                    value={formData.pickupTimeRetour}
                                    onChange={(v) => handleChange('pickupTimeRetour', v)}
                                    placeholder="Choisir une heure"
                                    selectedDate={formData.pickupDateRetour}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Baby className="w-5 h-5 text-slate-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">Sieges bebe (retour)</p>
                                    <p className="text-xs text-slate-500">+5 000 FCFA/siege</p>
                                  </div>
                                </div>
                                <Select
                                  value={formData.siegeBebesRetour.toString()}
                                  onValueChange={(v) => handleChange('siegeBebesRetour', parseInt(v))}
                                >
                                  <SelectTrigger className="w-20 bg-white border-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 1, 2, 3].map(n => (
                                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3 min-w-0">
                                  <PawPrint className="w-5 h-5 text-slate-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">Animal (retour)</p>
                                    <p className="text-xs text-slate-500">+5 000 FCFA</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={formData.animalDeCompagnieRetour}
                                  onCheckedChange={(v) => handleChange('animalDeCompagnieRetour', v)}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.section>
                      )}

                      {/* Notes card */}
                      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-3 block">Demandes speciales (optionnel)</Label>
                        <Textarea
                          placeholder="Instructions particulieres pour le chauffeur..."
                          value={formData.specialRequests}
                          onChange={(e) => handleChange('specialRequests', e.target.value)}
                          className="bg-slate-50 border-0 rounded-xl resize-none min-h-[80px]"
                        />
                      </section>
                    </div>

                    {/* RIGHT col-4: sticky options */}
                    <aside className="lg:col-span-4">
                      <div className="sticky top-6 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
                        <h2 className="text-xl font-bold text-slate-900">Options</h2>

                        {/* Sieges bebe with count */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                              <Baby className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">Sieges bebe</p>
                              <p className="text-xs text-slate-500">+5 000 FCFA/siege</p>
                            </div>
                          </div>
                          <Select
                            value={formData.siegeBebes.toString()}
                            onValueChange={(v) => handleChange('siegeBebes', parseInt(v))}
                          >
                            <SelectTrigger className="w-16 h-9 bg-slate-50 border-0 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Animal */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                              <PawPrint className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">Animal de compagnie</p>
                              <p className="text-xs text-slate-500">+5 000 FCFA</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.animalDeCompagnie}
                            onCheckedChange={(v) => handleChange('animalDeCompagnie', v)}
                          />
                        </div>

                        {/* Aller-retour (highlighted) */}
                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0">
                              <ArrowRightLeft className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#E04A1F] truncate">Aller-retour</p>
                              <p className="text-xs text-slate-500">Reserver le retour</p>
                            </div>
                          </div>
                          <Switch
                            checked={!formData.isOneWay}
                            onCheckedChange={(v) => handleChange('isOneWay', !v)}
                          />
                        </div>

                        {/* Price preview */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center">
                          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Estimation</p>
                          <p className="text-2xl font-extrabold text-[#E04A1F]">
                            {selectedTrajet
                              ? `${calculateTotal().toLocaleString()} FCFA`
                              : <span className="text-base text-slate-400 font-bold">A l&apos;etape suivante</span>}
                          </p>
                        </div>

                        {/* Privacy note */}
                        <p className="text-center text-xs text-slate-400 leading-relaxed">
                          Vos donnees sont securisees et traitees selon notre politique de confidentialite.
                        </p>
                      </div>
                    </aside>
                  </div>

                  {/* Editorial bottom image */}
                  <div className="mt-12 rounded-[2rem] overflow-hidden h-56 relative bg-gradient-to-br from-slate-800 to-slate-900 group">
                    {featuredVehicleImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featuredVehicleImage}
                        alt="Vehicule premium"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-end opacity-10 pr-12">
                        <Car className="w-72 h-72 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-end p-10">
                      <h3 className="text-white font-extrabold text-2xl tracking-tight">Le confort Subito Business</h3>
                      <p className="text-white/70 max-w-md mt-2 text-sm">
                        Flotte de vehicules premium avec Wi-Fi embarque et chauffeurs multilingues certifies.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step 1: Client info */}
          {currentStep === 1 && (
            <motion.div
              key="step1-client"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* LEFT col-8 : Form bento */}
              <div className="lg:col-span-8">
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Informations du client</h3>

              {/* Employee selector with search */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-slate-600 ml-1">Sélectionner l&apos;employé (voyageur)</Label>
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
                                  handleChange('clientName', `${emp.prenom} ${emp.nom}`);
                                  if (emp.email) handleChange('clientEmail', emp.email);
                                  if (emp.telephone) handleChange('clientPhone', emp.telephone);
                                  if (emp.adresse) handleChange('clientAddress', emp.adresse);
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
                                  <Check className="w-4 h-4 text-[#E04A1F] shrink-0" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold text-slate-600 ml-1">Nom complet</Label>
                  <Input
                    placeholder="Nom et prenom du client"
                    className="w-full h-14 px-4 bg-slate-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/40 font-medium text-slate-900"
                    value={formData.clientName}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold text-slate-600 ml-1">Téléphone</Label>
                  <div className="bg-slate-50 rounded-xl h-14 flex items-center px-2">
                    <PhoneInput
                      value={formData.clientPhone}
                      onChange={(v) => handleChange('clientPhone', v)}
                      error={!!phoneError}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-sm text-red-500 ml-1">Numero invalide</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-slate-600 ml-1">Adresse e-mail (optionnel)</Label>
                <Input
                  type="email"
                  placeholder="client@email.com"
                  className="w-full h-14 px-4 bg-slate-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/40 font-medium text-slate-900"
                  value={formData.clientEmail}
                  onChange={(e) => handleChange('clientEmail', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Label className="text-sm font-semibold text-slate-600 ml-1">Notes particulieres pour le chauffeur</Label>
                <Textarea
                  rows={3}
                  placeholder="Ex: Accueil avec pancarte, bagages volumineux..."
                  className="w-full p-4 bg-slate-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/40 font-medium text-slate-900 resize-none"
                  value={formData.specialRequests || ''}
                  onChange={(e) => handleChange('specialRequests', e.target.value)}
                />
              </div>
                </div>
              </div>

              {/* RIGHT col-4 : Trip recap + editorial */}
              <aside className="lg:col-span-4 space-y-6">
                {/* Recap Card */}
                <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                  <h3 className="text-lg font-bold mb-6 text-slate-900">Resume du trajet</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center py-1">
                        <div className="w-3 h-3 rounded-full border-2 border-orange-600 bg-white shrink-0" />
                        <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[32px]" />
                        <div className="w-3 h-3 rounded-full bg-orange-600 shrink-0" />
                      </div>
                      <div className="space-y-4 min-w-0">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Depart</p>
                          <p className="text-sm font-semibold leading-tight mt-1 truncate">
                            {getVilleName(villes.find(v => v.id === selectedDepartId)) || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Arrivee</p>
                          <p className="text-sm font-semibold leading-tight mt-1 truncate">
                            {getVilleName(villes.find(v => v.id === selectedArriveeId)) || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Date</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <CalendarIcon className="w-3 h-3 text-[#E04A1F]" />
                          <span className="text-sm font-bold">
                            {formData.pickupDateAller ? format(new Date(formData.pickupDateAller), 'dd MMM', { locale: fr }) : '—'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Heure</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-[#E04A1F]" />
                          <span className="text-sm font-bold">{formData.pickupTimeAller || '—'}</span>
                        </div>
                      </div>
                    </div>
                    {!formData.isOneWay && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffdbd0] text-orange-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <ArrowRightLeft className="w-3 h-3" />
                        Aller-retour
                      </div>
                    )}
                  </div>
                </div>

                {/* Editorial image card */}
                <div className="relative overflow-hidden rounded-3xl aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 group">
                  {featuredVehicleImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredVehicleImage}
                      alt="Vehicule premium"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <Car className="w-40 h-40 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                    <span className="bg-orange-600 text-[10px] font-bold text-white px-3 py-1 rounded-full w-fit mb-3 uppercase tracking-wider">
                      Conseil voyage
                    </span>
                    <h4 className="text-white font-bold text-lg leading-tight">Privilegiez le silence pour vos appels</h4>
                    <p className="text-white/70 text-xs mt-2">
                      Tous nos vehicules Business sont equipes de vitres acoustiques.
                    </p>
                  </div>
                </div>

                {/* Help alert */}
                <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 flex gap-4">
                  <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-teal-900">Besoin d&apos;aide ?</p>
                    <p className="text-xs text-teal-800/80 mt-1 leading-relaxed">
                      Notre support client est disponible 24/7 pour vos reservations complexes.
                    </p>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {/* Step 3: Vehicle selection */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Selectionnez votre vehicule</h3>
                <p className="text-slate-500 max-w-xl mx-auto">Choisissez la categorie la mieux adaptee a votre trajet interurbain et a vos bagages.</p>
              </div>

              {matchingTrajets.length > 0 ? (() => {
                const totalPages = Math.max(1, Math.ceil(matchingTrajets.length / VEHICLES_PER_PAGE));
                const safePage = Math.min(vehiclePage, totalPages - 1);
                const start = safePage * VEHICLES_PER_PAGE;
                const pageTrajets = matchingTrajets.slice(start, start + VEHICLES_PER_PAGE);
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {pageTrajets.map(trajet => {
                    const v = trajet.vehicule;
                    const vehiculeName = v?.categorie || v?.marque || 'Vehicule';
                    const vehiculeModel = `${v?.marque || ''} ${v?.modele || v?.model || ''}`.trim();
                    const price = trajet.prixAllerSimple ?? trajet.prix ?? 0;
                    const places = v?.places ?? v?.nombrePlace;
                    const imageUrl = Array.isArray(v?.image) ? v.image[0] : v?.image;
                    const isSelected = formData.trajetInterVilleId === trajet.id;
                    return (
                      <button
                        key={trajet.id}
                        type="button"
                        onClick={() => {
                          handleChange('trajetInterVilleId', trajet.id);
                          handleChange('vehiculeId', v?.id || null);
                        }}
                        className={`relative text-left bg-white rounded-3xl p-6 transition-all overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-orange-600 shadow-lg shadow-orange-500/10'
                            : 'ring-1 ring-slate-100 hover:ring-orange-200 hover:shadow-md'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center shadow">
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </div>
                        )}

                        <div className="bg-slate-50 rounded-2xl h-40 flex items-center justify-center mb-4 overflow-hidden">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={vehiculeName}
                              className="max-w-full max-h-32 object-contain drop-shadow-md"
                            />
                          ) : (
                            <Car className="w-20 h-20 text-slate-300" />
                          )}
                        </div>

                        <div className="mb-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] block mb-1">
                            Categorie
                          </span>
                          <h3 className="text-lg font-extrabold capitalize text-slate-900 leading-tight">
                            {vehiculeName}
                          </h3>
                          {vehiculeModel && (
                            <p className="text-xs text-slate-500 italic mt-0.5">{vehiculeModel} ou similaire</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-5">
                          {places != null && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700">
                              <Users className="w-3.5 h-3.5 text-[#E04A1F]" />
                              {places} places
                            </span>
                          )}
                          {v?.grandBagage != null && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700">
                              <Briefcase className="w-3.5 h-3.5 text-[#E04A1F]" />
                              {v.grandBagage} grand{Number(v.grandBagage) > 1 ? 's' : ''}
                            </span>
                          )}
                          {v?.petitBagage != null && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700">
                              <Briefcase className="w-3.5 h-3.5 text-[#E04A1F]" />
                              {v.petitBagage} petit{Number(v.petitBagage) > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700">
                            <Shield className="w-3.5 h-3.5 text-[#E04A1F]" />
                            Climatise
                          </span>
                        </div>

                        <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Prix du trajet
                          </p>
                          {price > 0 ? (
                            <p className="text-xl font-extrabold text-slate-900">
                              {Number(price).toLocaleString()}
                              <span className="text-xs font-bold text-slate-500 ml-1">FCFA</span>
                            </p>
                          ) : (
                            <p className="text-xs font-bold uppercase tracking-wider text-[#E04A1F]">
                              Prix sur demande
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-8">
                        <button
                          type="button"
                          onClick={() => setVehiclePage(p => Math.max(0, p - 1))}
                          disabled={safePage === 0}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Precedent
                        </button>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Page {safePage + 1} / {totalPages} <span className="text-slate-400 normal-case">({matchingTrajets.length} vehicules)</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setVehiclePage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={safePage >= totalPages - 1}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E04A1F] text-white text-sm font-bold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition"
                        >
                          Suivant
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="text-center py-16 bg-slate-50 rounded-3xl">
                  <Car className="w-14 h-14 mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun vehicule disponible</p>
                  <p className="text-sm mt-1 text-slate-500">Selectionnez un trajet valide pour voir les vehicules</p>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left: Payment options */}
              <div className="lg:col-span-7 space-y-8">
                <h3 className="text-xl font-bold text-slate-900">Selectionnez le mode de paiement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paymentMethods.map((option, idx) => {
                    const isSelected = formData.paymentMethod === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => handleChange('paymentMethod', option.value)}
                        className={`group relative p-8 rounded-2xl cursor-pointer hover:shadow-xl transition-all duration-300 ${
                          isSelected
                            ? 'bg-white border-2 border-orange-600 shadow-lg shadow-orange-500/5'
                            : 'bg-slate-50 border-2 border-transparent hover:bg-white'
                        }`}
                      >
                        <div className="absolute top-4 right-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-orange-600' : 'border-2 border-slate-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 text-3xl ${
                          isSelected ? 'bg-[#ffdbd0] text-[#E04A1F]' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-100'
                        }`}>
                          {option.icon || (idx === 0 ? '🏢' : '👤')}
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-slate-900">{option.label}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{option.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Moyens de paiement */}
                <div className="pt-8 border-t border-slate-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Moyens de paiement acceptes
                  </p>
                  <div className="flex gap-3 items-center flex-wrap">
                    {['VISA', 'MC', 'OM', 'MOMO', 'WAVE'].map(label => (
                      <div key={label} className="h-10 px-4 bg-slate-100 rounded flex items-center justify-center font-bold text-xs text-slate-500">
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Sticky summary */}
              <aside className="lg:col-span-5">
                <div className="sticky top-6 bg-slate-50 rounded-3xl p-8 space-y-6">
                  <h2 className="text-xl font-bold text-slate-900">Detail du prix</h2>

                  {/* Trip summary */}
                  {selectedTrajet && (
                    <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
                      <div className="bg-white p-3 rounded-lg shadow-sm shrink-0">
                        <MapPin className="w-5 h-5 text-[#E04A1F]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">Itineraire</p>
                        <p className="font-bold text-slate-900 truncate">
                          {getVilleName(selectedTrajet.villeDepart)} <span className="text-[#E04A1F]">→</span> {getVilleName(selectedTrajet.villeArrivee)}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {selectedTrajet.vehicule?.categorie || selectedTrajet.vehicule?.marque || 'Vehicule'}
                          {!formData.isOneWay && ' • Aller-retour'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Breakdown */}
                  <div className="space-y-3 pt-2">
                    {selectedTrajet && (() => {
                      const allerPrice = selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0;
                      return (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Trajet aller</span>
                          <span className="font-semibold">
                            {allerPrice > 0 ? `${allerPrice.toLocaleString()} FCFA` : 'Sur demande'}
                          </span>
                        </div>
                      );
                    })()}
                    {formData.siegeBebes > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Sieges bebe (x{formData.siegeBebes})</span>
                        <span className="font-semibold">{(formData.siegeBebes * (selectedTrajet?.prixSiegeBebe ?? 5000)).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    {formData.animalDeCompagnie && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Animal</span>
                        <span className="font-semibold">{(selectedTrajet?.prixAnimalCompagnie ?? 5000).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    {!formData.isOneWay && selectedTrajet && (
                      <>
                        {(() => {
                          const retourPrice = selectedTrajet.prixAllerRetour || (selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0);
                          return (
                            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                              <span className="text-slate-500">Trajet retour</span>
                              <span className="font-semibold">
                                {retourPrice > 0 ? `${retourPrice.toLocaleString()} FCFA` : 'Sur demande'}
                              </span>
                            </div>
                          );
                        })()}
                        {formData.siegeBebesRetour > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Sieges bebe retour (x{formData.siegeBebesRetour})</span>
                            <span className="font-semibold">{(formData.siegeBebesRetour * (selectedTrajet?.prixSiegeBebe ?? 5000)).toLocaleString()} FCFA</span>
                          </div>
                        )}
                        {formData.animalDeCompagnieRetour && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Animal retour</span>
                            <span className="font-semibold">{(selectedTrajet?.prixAnimalCompagnie ?? 5000).toLocaleString()} FCFA</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Total dashed */}
                  <div className="pt-6 mt-6 border-t-2 border-dashed border-slate-300">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {user?.isTva ? 'Total HT' : 'Total a regler'}
                        </p>
                        <p className="text-3xl font-extrabold text-slate-900">
                          {calculateTotal().toLocaleString()} <span className="text-base">FCFA</span>
                        </p>
                      </div>
                      <div className="bg-[#ffdbd0] text-[#E04A1F] text-[10px] px-2 py-1 rounded font-bold uppercase">
                        {user?.isTva ? 'HT' : 'TVA Incluse'}
                      </div>
                    </div>
                    {user?.isTva && (
                      <>
                        <div className="flex justify-between text-sm mt-3">
                          <span className="text-slate-500">TVA (18%)</span>
                          <span className="font-medium">{Math.round(calculateTotal() * 0.18).toLocaleString()} FCFA</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-end">
                          <span className="font-bold text-slate-900">Total TTC</span>
                          <span className="text-xl font-extrabold text-[#E04A1F]">
                            {Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Trust badge */}
                  <div className="flex items-center justify-center gap-3 text-slate-400 pt-2">
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Paiement 100% securise
                    </span>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {/* Step 5: Summary (pre-confirmation) */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT col-8: trip + client + date */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Trip details card */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                        <Route className="w-5 h-5 text-[#E04A1F]" />
                        Details du trajet
                      </h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-sm font-semibold text-[#E04A1F] hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div className="flex items-start gap-6 md:gap-8">
                      <div className="relative flex flex-col items-center pt-1">
                        <div className="w-4 h-4 rounded-full border-4 border-orange-600 bg-white z-10 shrink-0" />
                        <div className="w-[2px] flex-1 min-h-[80px] border-l-2 border-dashed border-slate-200 my-1" />
                        <div className="w-4 h-4 rounded-full bg-slate-900 z-10 shrink-0" />
                      </div>
                      <div className="flex-1 space-y-8 min-w-0">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Point de depart</p>
                          <p className="text-base md:text-lg font-bold text-slate-900 truncate">
                            {getVilleName(selectedTrajet?.villeDepart) || '—'}
                          </p>
                          {formData.adressePriseEnChargeDepartAller && (
                            <p className="text-sm text-slate-500 truncate">{formData.adressePriseEnChargeDepartAller}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Point d&apos;arrivee</p>
                          <p className="text-base md:text-lg font-bold text-slate-900 truncate">
                            {getVilleName(selectedTrajet?.villeArrivee) || '—'}
                          </p>
                          {formData.adressePriseEnChargeArriveeAller && (
                            <p className="text-sm text-slate-500 truncate">{formData.adressePriseEnChargeArriveeAller}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {!formData.isOneWay && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffdbd0] text-orange-700 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                          <ArrowRightLeft className="w-3 h-3" />
                          Trajet retour
                        </div>
                        <div className="text-sm text-slate-600">
                          {formData.pickupDateRetour && format(new Date(formData.pickupDateRetour), "EEEE d MMMM yyyy", { locale: fr })}
                          {formData.pickupTimeRetour && ` a ${formData.pickupTimeRetour}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Client + Date split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Passager &amp; Client</h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-semibold text-[#E04A1F] hover:underline"
                        >
                          Modifier
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#E04A1F] font-bold shadow-sm shrink-0">
                          {formData.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{formData.clientName}</p>
                          <p className="text-sm text-slate-500 truncate">{formData.clientPhone}</p>
                          {formData.clientEmail && <p className="text-sm text-slate-500 truncate">{formData.clientEmail}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date &amp; Heure</h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs font-semibold text-[#E04A1F] hover:underline"
                        >
                          Modifier
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {formData.pickupDateAller && format(new Date(formData.pickupDateAller), 'EEEE d MMMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-sm text-slate-500">Depart prevu a {formData.pickupTimeAller}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT col-4: vehicle + payment + help */}
                <aside className="lg:col-span-4 space-y-6">
                  {/* Vehicle card */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicule selectionne</h3>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-semibold text-[#E04A1F] hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div className="mb-4 h-28 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden">
                      {(() => {
                        const v = selectedTrajet?.vehicule;
                        const imageUrl = Array.isArray(v?.image) ? v.image[0] : v?.image;
                        return imageUrl ? (
                          <img src={imageUrl} alt="" className="max-w-full max-h-24 object-contain" />
                        ) : (
                          <Car className="w-16 h-16 text-slate-400" />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="min-w-0">
                        <p className="text-xl font-bold text-slate-900 capitalize truncate">
                          {selectedTrajet?.vehicule?.categorie || selectedTrajet?.vehicule?.marque || 'Vehicule'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {(selectedTrajet?.vehicule?.places ?? selectedTrajet?.vehicule?.nombrePlace) != null && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Users className="w-3 h-3" />
                              {selectedTrajet?.vehicule?.places ?? selectedTrajet?.vehicule?.nombrePlace} places
                            </span>
                          )}
                          {selectedTrajet?.vehicule?.grandBagage != null && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Briefcase className="w-3 h-3" />
                                {selectedTrajet.vehicule.grandBagage} bagages
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <CheckCircle2 className="w-7 h-7 text-[#E04A1F] shrink-0" fill="currentColor" strokeWidth={0} />
                    </div>
                  </div>

                  {/* Dark payment card */}
                  <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Detail du paiement</h3>
                    <div className="space-y-3 mb-6">
                      {selectedTrajet && (() => {
                        const allerPrice = selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0;
                        return (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70">Trajet aller</span>
                            <span className="font-semibold">
                              {allerPrice > 0 ? `${allerPrice.toLocaleString()} FCFA` : 'Sur demande'}
                            </span>
                          </div>
                        );
                      })()}
                      {!formData.isOneWay && selectedTrajet && (() => {
                        const retourPrice = selectedTrajet.prixAllerRetour || (selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0);
                        return (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70">Trajet retour</span>
                            <span className="font-semibold">
                              {retourPrice > 0 ? `${retourPrice.toLocaleString()} FCFA` : 'Sur demande'}
                            </span>
                          </div>
                        );
                      })()}
                      {(formData.siegeBebes > 0 || formData.animalDeCompagnie || formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour) && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70">Options</span>
                          <span className="font-semibold">
                            {(
                              (formData.siegeBebes * (selectedTrajet?.prixSiegeBebe ?? 5000)) +
                              (formData.animalDeCompagnie ? (selectedTrajet?.prixAnimalCompagnie ?? 5000) : 0) +
                              (formData.siegeBebesRetour * (selectedTrajet?.prixSiegeBebe ?? 5000)) +
                              (formData.animalDeCompagnieRetour ? (selectedTrajet?.prixAnimalCompagnie ?? 5000) : 0)
                            ).toLocaleString()} FCFA
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-between items-end mb-6">
                      <div>
                        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                          {user?.isTva ? 'Total TTC' : 'Total'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-orange-400">
                          {(user?.isTva ? Math.round(calculateTotal() * 1.18) : calculateTotal()).toLocaleString()} FCFA
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">
                          {user?.isTva ? 'TVA 18% incluse' : 'TVA incluse'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-orange-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white/60">Mode de paiement</p>
                        <p className="text-sm font-semibold truncate">
                          {paymentMethods.find(m => m.value === formData.paymentMethod)?.label || 'Compte entreprise'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="text-xs font-semibold text-orange-400 hover:underline shrink-0"
                      >
                        Modifier
                      </button>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={createBooking.isPending}
                      className="w-full bg-[#E04A1F] text-white py-5 rounded-2xl font-extrabold text-base border-0 hover:shadow-[0_0_32px_rgba(172,53,9,0.4)] active:scale-[0.98] transition-all"
                    >
                      {createBooking.isPending ? 'Confirmation...' : 'Confirmer la reservation'}
                    </Button>
                    <p className="text-center text-[10px] text-white/40 mt-4 leading-tight">
                      En confirmant, vous acceptez nos conditions generales de vente et notre politique d&apos;annulation.
                    </p>
                  </div>

                  {/* Help alert */}
                  <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100">
                    <div className="flex gap-4">
                      <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-teal-900 mb-1">Besoin d&apos;aide ?</p>
                        <p className="text-xs text-teal-800/80 leading-relaxed">
                          Notre support business est disponible 24/7 pour toute demande specifique.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mt-8 bg-slate-50 p-4 md:p-6 rounded-2xl">
        <Button
          variant="ghost"
          onClick={currentStep === 1 ? () => router.push("/") : handleBack}
          className="gap-2 text-slate-600 font-bold px-6 py-3 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === 1 ? 'Annuler' : 'Retour'}
        </Button>

        {currentStep < 5 && (
          <Button
            onClick={handleNext}
            disabled={!canContinue()}
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
