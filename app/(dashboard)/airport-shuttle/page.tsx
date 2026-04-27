'use client';

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  MapPin,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Baby,
  PawPrint,
  Plus,
  CreditCard,
  CheckCircle2,
  User,
  ArrowRightLeft,
  Mail,
  Search,
  UserPlus,
  Car,
  Calendar as CalendarIcon,
  Clock,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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
import { api, TrajetAeroport, Ville, CreateAirportShuttleBookingDto, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption, toBookingPaymentMethod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface StepDef {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

type PaymentChoice = string;

interface FormData {
  direction: string;
  trajetAeroportId: number | null;
  is_round_trip: boolean;
  departure_date: string;
  departure_time: string;
  return_date: string;
  return_time: string;
  passengers: number;
  flight_number: string;
  address: string;
  addressLat: number | null;
  addressLng: number | null;
  return_address: string;
  returnAddressLat: number | null;
  returnAddressLng: number | null;
  payment_method: PaymentChoice | '';
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  siegeBebes: number;
  animalDeCompagnie: boolean;
  adresseSupplement: number;
  specialRequests: string;
  employeeId: number | null;
  vehiculeId: number | null;
}

const initialFormData: FormData = {
  direction: "to_airport",
  trajetAeroportId: null,
  is_round_trip: false,
  departure_date: "",
  departure_time: "",
  return_date: "",
  return_time: "",
  passengers: 1,
  flight_number: "",
  address: "",
  addressLat: null,
  addressLng: null,
  return_address: "",
  returnAddressLat: null,
  returnAddressLng: null,
  payment_method: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  siegeBebes: 0,
  animalDeCompagnie: false,
  adresseSupplement: 0,
  specialRequests: "",
  employeeId: null,
  vehiculeId: null,
};

const steps: StepDef[] = [
  { id: 1, title: "Client", icon: User },
  { id: 2, title: "Trajet", icon: MapPin },
  { id: 3, title: "Vehicule", icon: Car },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

// Payment methods fetched from API (see useQuery inside component)

export default function AirportShuttle() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedPays, setSelectedPays] = useState<string>("");
  const [selectedDepartId, setSelectedDepartId] = useState<number | null>(null);
  const [selectedArriveeId, setSelectedArriveeId] = useState<number | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [departPopoverOpen, setDepartPopoverOpen] = useState(false);
  const [arriveePopoverOpen, setArriveePopoverOpen] = useState(false);

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentMethods = [
    { id: "company_account", label: "Compte entreprise", desc: "L'entreprise paie via Bictorys", icon: "🏢" },
    { id: "client", label: "Client / Employe", desc: "Le client ou l'employe paie lui-meme", icon: "👤" },
  ];

  // Fetch employees for company bookings
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

  // Fetch countries
  const { data: paysResponse } = useQuery({
    queryKey: ['pays'],
    queryFn: () => api.reference.getPays(),
  });
  const paysRaw = paysResponse?.data;
  const pays: string[] = Array.isArray(paysRaw)
    ? paysRaw.map((p: unknown) => typeof p === 'string' ? p : (p as Record<string, unknown>)?.nom as string || String(p)).filter(Boolean)
    : [];

  // Fetch airport routes (each trajet = 1 route + 1 vehicule + 1 prix)
  const { data: trajetsResponse } = useQuery({
    queryKey: ['trajet-aeroport'],
    queryFn: () => api.reference.getTrajetAeroport(),
  });
  const trajetsRaw = trajetsResponse?.data;
  const trajets: TrajetAeroport[] = Array.isArray(trajetsRaw)
    ? trajetsRaw
    : (trajetsRaw as any)?.list || (trajetsRaw as any)?.items || [];

  // Fetch villes for selected country (fallback)
  const { data: villesResponse } = useQuery({
    queryKey: ['villes', selectedPays],
    queryFn: () => api.reference.getVilles(selectedPays),
    enabled: !!selectedPays,
  });
  const villesRaw = villesResponse?.data;
  const villesFromApi: Ville[] = Array.isArray(villesRaw)
    ? villesRaw
    : (villesRaw as any)?.list || (villesRaw as any)?.items || [];

  // Extract unique villes from trajets (guaranteed matching IDs)
  const villesFromTrajets = React.useMemo(() => {
    const map = new Map<number, Ville>();
    trajets.forEach(t => {
      if (t.villeDepart) map.set(t.villeDepart.id, t.villeDepart);
      if (t.villeArrivee) map.set(t.villeArrivee.id, t.villeArrivee);
    });
    return Array.from(map.values());
  }, [trajets]);

  // Use villes from trajets if available, otherwise fall back to API
  const allVilles: Ville[] = villesFromTrajets.length > 0 ? villesFromTrajets : villesFromApi;

  // Filter by selected country if one is selected
  const filteredVilles = selectedPays
    ? allVilles.filter(v => v.pays?.toLowerCase() === selectedPays.toLowerCase())
    : allVilles;

  // Separate cities and airports based on isAeroport
  const villes = filteredVilles.filter(v => !v.isAeroport);
  const aeroports = filteredVilles.filter(v => v.isAeroport);

  // Based on direction: depart list and arrivee list
  const departOptions = formData.direction === 'from_airport' ? aeroports : villes;
  const arriveeOptions = formData.direction === 'from_airport' ? villes : aeroports;

  // Helper to get ville display name (API returns nom or name)
  const getVilleName = (v?: Ville | null): string => v?.nom || v?.name || '';

  // Find ALL matching trajets for a given depart+arrivee (each has a different vehicule)
  // API always stores: villeDepart = airport, villeArrivee = city
  const findMatchingTrajets = (departId: number, arriveeId: number): TrajetAeroport[] => {
    if (formData.direction === 'to_airport') {
      // User selected: depart=city, arrivee=airport → match API's villeArrivee=city, villeDepart=airport
      return trajets.filter(t => t.villeDepart?.id === arriveeId && t.villeArrivee?.id === departId);
    } else {
      // User selected: depart=airport, arrivee=city → matches API structure directly
      return trajets.filter(t => t.villeDepart?.id === departId && t.villeArrivee?.id === arriveeId);
    }
  };

  // Trajets matching current route selection (for vehicle step)
  const matchingTrajets: TrajetAeroport[] = (selectedDepartId && selectedArriveeId)
    ? findMatchingTrajets(selectedDepartId, selectedArriveeId)
    : [];

  // The trajet selected by the user (when they pick a vehicle)
  const selectedTrajet = trajets.find(t => t.id === formData.trajetAeroportId);

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: (data: CreateAirportShuttleBookingDto) => api.bookings.createAirportShuttle(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBookingRef(response.data?.reference || `SUB-${Date.now()}`);
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

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const calculateTotal = (): number => {
    if (!selectedTrajet) return 0;
    const basePrice = selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0;
    let total = formData.is_round_trip
      ? (selectedTrajet.prixAllerRetour || basePrice * 2)
      : basePrice;
    if (formData.siegeBebes > 0 && selectedTrajet.prixSiegeBebe) {
      total += selectedTrajet.prixSiegeBebe * formData.siegeBebes;
    }
    if (formData.animalDeCompagnie && selectedTrajet.prixAnimalCompagnie) {
      total += selectedTrajet.prixAnimalCompagnie;
    }
    if (formData.adresseSupplement > 0 && selectedTrajet.prixAdresseSupplementaire) {
      total += selectedTrajet.prixAdresseSupplementaire * formData.adresseSupplement;
    }
    return total;
  };

  const cleanPhone = (phone: string): string => phone.replace(/[\s\-\.\(\)]/g, '');
  const isValidPhone = (phone: string): boolean => /^\+?\d{7,15}$/.test(cleanPhone(phone));
  // Format phone for backend: +221 77 130 85 07
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

  const phoneError = formData.clientPhone && !isValidPhone(formData.clientPhone);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.employeeId) { toast.error("Veuillez selectionner un voyageur"); return; }
      if (!formData.clientName) { toast.error("Veuillez entrer le nom du client"); return; }
      if (!formData.clientPhone) { toast.error("Veuillez entrer le numero de telephone"); return; }
      if (!isValidPhone(formData.clientPhone)) { toast.error("Numero de telephone invalide"); return; }
    }

    if (currentStep === 2) {
      if (!selectedDepartId || !selectedArriveeId) { toast.error("Veuillez selectionner le depart et l'arrivee"); return; }
      if (!formData.departure_date) { toast.error("Veuillez selectionner une date de depart"); return; }
      if (!formData.departure_time) { toast.error("Veuillez selectionner une heure de depart"); return; }
      if (!formData.address) { toast.error("Veuillez entrer une adresse"); return; }
      if (formData.direction === 'from_airport' && !formData.flight_number) { toast.error("Veuillez entrer le numero de vol"); return; }
      if (formData.is_round_trip) {
        if (!formData.return_date) { toast.error("Veuillez selectionner une date de retour"); return; }
        if (!formData.return_time) { toast.error("Veuillez selectionner une heure de retour"); return; }
        if (!formData.return_address) { toast.error("Veuillez entrer une adresse de prise en charge retour"); return; }
      }
      if (matchingTrajets.length === 0) { toast.error("Aucun trajet disponible pour cette route"); return; }
    }

    if (currentStep === 3) {
      if (!formData.trajetAeroportId) { toast.error("Veuillez choisir un vehicule"); return; }
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
    if (!formData.trajetAeroportId) { toast.error("Veuillez selectionner un trajet"); return; }

    const isCompanyPayment = formData.payment_method === 'company_account';

    const bookingData: CreateAirportShuttleBookingDto = {
      serviceType: 'airport_shuttle',
      trajetAeroportId: formData.trajetAeroportId,
      direction: formData.direction === 'from_airport' ? 'from_airport' : 'to_airport',
      isOneWay: !formData.is_round_trip,
      pickupDateAller: formData.departure_date,
      pickupTimeAller: formData.departure_time,
      pickupDateRetour: formData.is_round_trip ? formData.return_date : undefined,
      pickupTimeRetour: formData.is_round_trip ? formData.return_time : undefined,
      passengers: formData.passengers,
      flightNumber: formData.flight_number || undefined,
      adressePriseEnChargeAller: formData.address,
      adressePriseEnChargeAllerLat: formData.addressLat || undefined,
      adressePriseEnChargeAllerLng: formData.addressLng || undefined,
      adressePriseEnChargeRetour: formData.is_round_trip ? formData.return_address : undefined,
      adressePriseEnChargeRetourLat: formData.is_round_trip ? formData.returnAddressLat || undefined : undefined,
      adressePriseEnChargeRetourLng: formData.is_round_trip ? formData.returnAddressLng || undefined : undefined,
      clientName: formData.clientName,
      clientPhone: formatPhoneForApi(formData.clientPhone),
      clientEmail: formData.clientEmail || undefined,
      clientAddress: formData.clientAddress,
      siegeBebes: formData.siegeBebes || undefined,
      animalDeCompagnie: formData.animalDeCompagnie || undefined,
      adresseSupplement: formData.adresseSupplement || undefined,
      specialRequests: formData.specialRequests || undefined,
      paidBy: isCompanyPayment ? 'company' : 'client',
      companyCode: user?.companyCode || undefined,
      employeeId: formData.employeeId || undefined,
    };

    console.log('[AIRPORT-SHUTTLE] Booking data:', JSON.stringify(bookingData, null, 2));
    createBooking.mutate(bookingData);
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.employeeId && formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone));
      case 2: {
        const baseValid = !!(selectedDepartId && selectedArriveeId && formData.departure_date && formData.departure_time && formData.address);
        const flightValid = formData.direction === 'from_airport' ? !!formData.flight_number : true;
        if (formData.is_round_trip) return baseValid && flightValid && !!(formData.return_date && formData.return_time && formData.return_address);
        return baseValid && flightValid;
      }
      case 3:
        return !!formData.trajetAeroportId;
      case 4:
        return true;
      default:
        return false;
    }
  };

  if (bookingSuccess) {
    const totalTtc = user?.isTva ? Math.round(calculateTotal() * 1.18) : calculateTotal();
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#FF6B35] p-10 md:p-14 text-white shadow-xl">
          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            <div className="bg-white/20 backdrop-blur-md rounded-full p-4 ring-8 ring-white/10">
              <CheckCircle2 className="w-14 h-14" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Reservation confirmee</h1>
              <p className="text-white/90 text-base md:text-lg font-medium">
                Votre navette est reservee et prete pour le depart.
              </p>
              <p className="text-white/80 text-sm mt-3">
                Reference : <span className="font-bold text-white">{bookingRef}</span>
              </p>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        </section>

        {/* Details bento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-[#ffdbd0] p-3 rounded-2xl text-[#FF6B35]">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Trajet</h3>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Depart</p>
                <p className="font-bold text-base text-slate-900">{getVilleName(selectedTrajet?.villeDepart)}</p>
              </div>
              <div className="flex-1 px-4">
                <div className="h-[2px] bg-slate-200 relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2">
                    <Plane className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arrivee</p>
                <p className="font-bold text-base text-slate-900">{getVilleName(selectedTrajet?.villeArrivee)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-teal-50 p-3 rounded-2xl text-teal-600">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Date &amp; Heure</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">
                  {formData.departure_date && format(new Date(formData.departure_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Heure</span>
                <span className="font-semibold text-[#FF6B35]">{formData.departure_time}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Voyageur</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FF6B35] text-white flex items-center justify-center font-bold">
                {formData.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900">{formData.clientName}</p>
                <p className="text-sm text-slate-500">
                  {formData.passengers} passager{formData.passengers > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-[#ffdbd0] p-3 rounded-2xl text-[#FF6B35]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Total</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{totalTtc.toLocaleString()}</span>
              <span className="text-xl font-bold text-[#FF6B35]">FCFA</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {paymentMethods.find(m => m.id === formData.payment_method)?.label || 'Paiement confirme'} &bull; {bookingRef}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => router.push("/tracking")}
            className="flex-1 bg-[#FF6B35] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98] gap-2"
          >
            <Search className="w-5 h-5" />
            Voir dans le suivi
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBookingSuccess(false);
              setCurrentStep(1);
              setFormData(initialFormData);
            }}
            className="flex-1 py-6 rounded-2xl font-bold text-base bg-slate-100 border-0 hover:bg-slate-200 active:scale-[0.98] transition-all gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle reservation
          </Button>
        </div>
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
              <span>Reservations</span>
              <span>/</span>
              <span className="text-[#FF6B35]">Navette</span>
            </nav>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Reservation de Navette
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {steps[currentStep - 1]?.title} — etape {currentStep} sur {steps.length}
            </p>
          </div>
          <span className="text-[#FF6B35] font-bold text-xs bg-[#ffdbd0] px-4 py-2 rounded-full uppercase tracking-widest">
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
                        ? "w-12 h-12 bg-[#FF6B35] text-white ring-4 ring-[#ffdbd0] shadow-lg shadow-[#FF6B35]/20"
                        : isDone
                        ? "w-10 h-10 bg-[#FF6B35] text-white"
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
                        ? "font-bold text-[#FF6B35]"
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
                        isDone ? "bg-[#FF6B35] w-full" : "bg-transparent w-0"
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
        <AnimatePresence mode="wait">
          {/* Step 1: Trip details */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Pays */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pays</Label>
                <Select
                  value={selectedPays}
                  onValueChange={(v) => {
                    setSelectedPays(v);
                    setSelectedDepartId(null);
                    setSelectedArriveeId(null);
                    handleChange('trajetAeroportId', null);
                  }}
                >
                  <SelectTrigger>
                    <MapPin className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Choisir un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {pays.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sens du trajet — editorial toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#FF6B35]">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <h4
                    className="text-lg font-bold text-[#171c1f]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Sens du trajet
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-[#f0f4f8] p-2 rounded-2xl">
                  {[
                    { value: "to_airport", label: "Vers l'aeroport", Icon: PlaneTakeoff },
                    { value: "from_airport", label: "Depuis l'aeroport", Icon: PlaneLanding },
                  ].map((option) => {
                    const active = formData.direction === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => {
                          handleChange('direction', option.value);
                          setSelectedDepartId(null);
                          setSelectedArriveeId(null);
                          handleChange('trajetAeroportId', null);
                        }}
                        className={`flex items-center justify-center gap-3 p-4 rounded-xl font-bold text-sm transition-all ${
                          active
                            ? "bg-[#ffdbd0] text-[#FF6B35] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <option.Icon className="w-5 h-5" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Depart */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Depart</Label>
                <Popover open={departPopoverOpen} onOpenChange={setDepartPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      disabled={!selectedPays}
                      className="w-full justify-between font-normal h-10"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {formData.direction === 'from_airport'
                          ? <Plane className="w-4 h-4 shrink-0" />
                          : <MapPin className="w-4 h-4 shrink-0" />
                        }
                        {selectedDepartId
                          ? getVilleName(departOptions.find(v => v.id === selectedDepartId))
                          : (!selectedPays ? "Selectionnez un pays" :
                             formData.direction === 'from_airport' ? "Choisir un aeroport" : "Choisir une ville")
                        }
                      </span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher..." />
                      <CommandList>
                        <CommandEmpty>Aucun resultat</CommandEmpty>
                        <CommandGroup>
                          {departOptions.map(v => (
                            <CommandItem
                              key={v.id}
                              value={getVilleName(v)}
                              onSelect={() => {
                                setSelectedDepartId(v.id);
                                handleChange('trajetAeroportId', null);
                                handleChange('vehiculeId', null);
                                setDepartPopoverOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              {formData.direction === 'from_airport'
                                ? <Plane className="w-4 h-4 mr-2 shrink-0" />
                                : <MapPin className="w-4 h-4 mr-2 shrink-0" />
                              }
                              {getVilleName(v)}
                              {selectedDepartId === v.id && (
                                <Check className="ml-auto w-4 h-4 text-[#FF6B35] shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Arrivee */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Arrivee</Label>
                <Popover open={arriveePopoverOpen} onOpenChange={setArriveePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      disabled={!selectedPays}
                      className="w-full justify-between font-normal h-10"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {formData.direction === 'to_airport'
                          ? <Plane className="w-4 h-4 shrink-0" />
                          : <MapPin className="w-4 h-4 shrink-0" />
                        }
                        {selectedArriveeId
                          ? getVilleName(arriveeOptions.find(v => v.id === selectedArriveeId))
                          : (!selectedPays ? "Selectionnez un pays" :
                             formData.direction === 'to_airport' ? "Choisir un aeroport" : "Choisir une ville")
                        }
                      </span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher..." />
                      <CommandList>
                        <CommandEmpty>Aucun resultat</CommandEmpty>
                        <CommandGroup>
                          {arriveeOptions.map(v => (
                            <CommandItem
                              key={v.id}
                              value={getVilleName(v)}
                              onSelect={() => {
                                setSelectedArriveeId(v.id);
                                handleChange('trajetAeroportId', null);
                                handleChange('vehiculeId', null);
                                setArriveePopoverOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              {formData.direction === 'to_airport'
                                ? <Plane className="w-4 h-4 mr-2 shrink-0" />
                                : <MapPin className="w-4 h-4 mr-2 shrink-0" />
                              }
                              {getVilleName(v)}
                              {selectedArriveeId === v.id && (
                                <Check className="ml-auto w-4 h-4 text-[#FF6B35] shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Round trip toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-800">Aller-retour</p>
                    <p className="text-sm text-slate-500">Reserver le retour en meme temps</p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_round_trip}
                  onCheckedChange={(v) => handleChange('is_round_trip', v)}
                />
              </div>

              {/* === ALLER === */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <PlaneTakeoff className="w-5 h-5 text-[#FF6B35]" />
                  <h4 className="font-semibold text-slate-800">Informations Aller</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <Label className="text-xs text-slate-500 mb-2 block">Date de depart</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start border-0 bg-transparent p-0 h-auto font-normal hover:bg-transparent"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2 text-[#FF6B35]" />
                          {formData.departure_date
                            ? format(new Date(formData.departure_date + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                            : "Selectionner une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.departure_date ? new Date(formData.departure_date + 'T00:00:00') : undefined}
                          onSelect={(date) => handleChange('departure_date', date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <Label className="text-xs text-slate-500 mb-2 block">Heure de depart</Label>
                    <TimePicker
                      value={formData.departure_time}
                      onChange={(v) => handleChange('departure_time', v)}
                      placeholder="Choisir une heure"
                      selectedDate={formData.departure_date}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Adresse de prise en charge / depose (aller) *</Label>
                  <AddressAutocomplete
                    placeholder="Ex: Residence Les Almadies, Villa 23, Rue AJ-42"
                    value={formData.address}
                    onChange={(val) => handleChange('address', val)}
                    onSelect={(address, lat, lng) => {
                      setFormData(prev => ({ ...prev, address, addressLat: lat, addressLng: lng }));
                    }}
                    iconColor="text-orange-500"
                    countryCode={countryNameToCode(selectedPays)}
                  />
                </div>
              </div>

              {/* === RETOUR === */}
              {formData.is_round_trip && (
                <div className="border border-blue-200 rounded-2xl p-5 space-y-4 bg-blue-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <PlaneLanding className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-slate-800">Informations Retour</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-4">
                      <Label className="text-xs text-slate-500 mb-2 block">Date de retour</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start border-0 bg-transparent p-0 h-auto font-normal hover:bg-transparent"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2 text-[#FF6B35]" />
                            {formData.return_date
                              ? format(new Date(formData.return_date + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                              : "Selectionner une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.return_date ? new Date(formData.return_date + 'T00:00:00') : undefined}
                            onSelect={(date) => handleChange('return_date', date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => {
                              const minDate = formData.departure_date ? new Date(formData.departure_date + 'T00:00:00') : new Date(new Date().setHours(0, 0, 0, 0));
                              return date < minDate;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="bg-white rounded-2xl p-4">
                      <Label className="text-xs text-slate-500 mb-2 block">Heure de retour</Label>
                      <TimePicker
                        value={formData.return_time}
                        onChange={(v) => handleChange('return_time', v)}
                        placeholder="Choisir une heure"
                        selectedDate={formData.return_date}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Adresse de prise en charge retour *</Label>
                    <AddressAutocomplete
                      placeholder="Ex: Aeroport Blaise Diagne, Terminal 1"
                      value={formData.return_address}
                      onChange={(val) => handleChange('return_address', val)}
                      onSelect={(address, lat, lng) => {
                        setFormData(prev => ({ ...prev, return_address: address, returnAddressLat: lat, returnAddressLng: lng }));
                      }}
                      iconColor="text-blue-500"
                      countryCode={countryNameToCode(selectedPays)}
                    />
                  </div>
                </div>
              )}

              {/* Passengers & Flight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de passagers</Label>
                  <Select
                    value={formData.passengers.toString()}
                    onValueChange={(v) => handleChange('passengers', parseInt(v))}
                  >
                    <SelectTrigger>
                      <Users className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} passager{n > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.direction === 'from_airport' && (
                  <div className="space-y-2">
                    <Label>Numero de vol *</Label>
                    <Input
                      placeholder="Ex: AF 718"
                      value={formData.flight_number}
                      onChange={(e) => handleChange('flight_number', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 1: Client Info */}
          {currentStep === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-l-4 border-[#FF6B35] pl-4 mb-2">
                <h3
                  className="text-xl font-bold text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Informations client
                </h3>
              </div>

              {/* Employee selector with search inside dropdown */}
              <div className="space-y-2">
                <Label>Voyageur (employe) *</Label>
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
                                  <Check className="w-4 h-4 text-[#FF6B35] shrink-0" />
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

              {/* Add employee dialog (same form as employees page) */}
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
                  <Label>Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Ex: Moussa Diop"
                      className="pl-10"
                      value={formData.clientName}
                      onChange={(e) => handleChange('clientName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Telephone *</Label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(v) => handleChange('clientPhone', v)}
                    error={!!phoneError}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-500">Numero de telephone invalide</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email (optionnel)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="Ex: moussa.diop@email.com"
                    className="pl-10"
                    value={formData.clientEmail}
                    onChange={(e) => handleChange('clientEmail', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Demandes speciales (optionnel)</Label>
                <Textarea
                  placeholder="Ex: Assistance PMR, bagages volumineux..."
                  value={formData.specialRequests}
                  onChange={(e) => handleChange('specialRequests', e.target.value)}
                  className="h-20"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Vehicle selection (each trajet = 1 vehicle + 1 price) */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3
                  className="text-3xl font-extrabold text-[#171c1f] tracking-tight"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Choisissez votre vehicule
                </h3>
                <p className="text-sm text-[#585e6c] mt-1 font-medium">
                  Selectionnez le transport adapte a votre equipe et vos bagages.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {matchingTrajets.map(trajet => {
                  const v = trajet.vehicule;
                  const vehiculeName = v?.categorie || v?.marque || `Vehicule`;
                  const vehiculeModel = `${v?.marque || ''} ${v?.modele || v?.model || ''}`.trim();
                  const price = trajet.prixAllerSimple ?? trajet.prix ?? 0;
                  const places = v?.places ?? v?.nombrePlace;
                  const imageUrl = Array.isArray(v?.image) ? v.image[0] : v?.image;
                  const isSelected = formData.trajetAeroportId === trajet.id;
                  return (
                    <div
                      key={trajet.id}
                      onClick={() => {
                        handleChange('trajetAeroportId', trajet.id);
                        handleChange('vehiculeId', v?.id || null);
                      }}
                      className={`
                        group flex flex-col md:flex-row items-center gap-6 p-5 rounded-2xl cursor-pointer shadow-xl shadow-black/[0.02] border-2 transition-all
                        ${isSelected
                          ? 'border-orange-400 bg-[#ffdbd0]/40/60'
                          : 'border-transparent bg-white hover:bg-slate-50'
                        }
                      `}
                    >
                      <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt={vehiculeName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="w-12 h-12 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0 w-full">
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <div>
                            <h3 className="font-extrabold text-xl text-slate-900 capitalize">{vehiculeName}</h3>
                            {vehiculeModel && <p className="text-sm text-slate-500">{vehiculeModel} ou equivalent</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-2xl text-[#FF6B35]">{Number(price).toLocaleString()}</span>
                            <span className="text-xs font-bold text-slate-500 ml-1">FCFA</span>
                          </div>
                        </div>
                        <div className="flex gap-4 flex-wrap text-slate-600">
                          {places != null && (
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              <span className="text-sm font-medium">{places} places</span>
                            </div>
                          )}
                          {v?.grandBagage != null && (
                            <div className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4" />
                              <span className="text-sm font-medium">{v.grandBagage} grand{Number(v.grandBagage) > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {v?.petitBagage != null && (
                            <div className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4" />
                              <span className="text-sm font-medium">{v.petitBagage} petit{Number(v.petitBagage) > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center w-10 shrink-0">
                        <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${isSelected ? 'border-orange-500 bg-[#ffdbd0]/400' : 'border-slate-300'}
                        `}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {matchingTrajets.length === 0 && (
                <div className="text-center py-16 bg-slate-50 rounded-3xl">
                  <Car className="w-14 h-14 mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun vehicule disponible</p>
                  <p className="text-sm mt-1 text-slate-500">Selectionnez un trajet valide pour voir les vehicules</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Options & Payment */}
          {currentStep === 4 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Options */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#FF6B35]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3
                    className="text-xl font-bold text-[#171c1f]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Options supplementaires
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Baby className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-800">Sieges bebe</p>
                        {selectedTrajet?.prixSiegeBebe && (
                          <p className="text-sm text-slate-500">+{selectedTrajet.prixSiegeBebe.toLocaleString()} FCFA/siege</p>
                        )}
                      </div>
                    </div>
                    <Select
                      value={formData.siegeBebes.toString()}
                      onValueChange={(v) => handleChange('siegeBebes', parseInt(v))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <PawPrint className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-800">Animal</p>
                        {selectedTrajet?.prixAnimalCompagnie && (
                          <p className="text-sm text-slate-500">+{selectedTrajet.prixAnimalCompagnie.toLocaleString()} FCFA</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={formData.animalDeCompagnie}
                      onCheckedChange={(v) => handleChange('animalDeCompagnie', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Plus className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-800">Adresse supp.</p>
                        {selectedTrajet?.prixAdresseSupplementaire && (
                          <p className="text-sm text-slate-500">+{selectedTrajet.prixAdresseSupplementaire.toLocaleString()} FCFA</p>
                        )}
                      </div>
                    </div>
                    <Select
                      value={formData.adresseSupplement.toString()}
                      onValueChange={(v) => handleChange('adresseSupplement', parseInt(v))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#FF6B35]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3
                    className="text-xl font-bold text-[#171c1f]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Mode de paiement
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((option) => {
                    const selected = formData.payment_method === option.id;
                    const isCompany = option.id === "company_account";
                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() =>
                          handleChange("payment_method", option.id as PaymentChoice)
                        }
                        className={`relative cursor-pointer p-6 rounded-3xl bg-white text-left transition-all ${
                          selected
                            ? "ring-2 ring-[#FF6B35] shadow-lg shadow-[#FF6B35]/10"
                            : "ring-1 ring-slate-200 hover:ring-slate-300 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              selected
                                ? "bg-[#ffdbd0] text-[#FF6B35]"
                                : "bg-[#dfe3e7] text-slate-500"
                            }`}
                          >
                            {isCompany ? <Users className="w-6 h-6" /> : <User className="w-6 h-6" />}
                          </div>
                          {selected && (
                            <div className="w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <p
                          className="font-bold text-lg text-[#171c1f]"
                          style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                        >
                          {option.label}
                        </p>
                        <p className="text-xs text-[#585e6c] mt-1">{option.desc}</p>
                        {isCompany && user?.companyCode && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-tighter bg-[#f0f4f8] text-[#585e6c] px-2 py-0.5 rounded">
                              ID: {user.companyCode}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Resume</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Trajet</span>
                    <span className="font-medium text-slate-800">{getVilleName(selectedTrajet?.villeDepart)} → {getVilleName(selectedTrajet?.villeArrivee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Type</span>
                    <span className="font-medium text-slate-800">{formData.is_round_trip ? 'Aller-retour' : 'Aller simple'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Client</span>
                    <span className="font-medium text-slate-800">{formData.clientName}</span>
                  </div>
                  {formData.siegeBebes > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Sieges bebe x{formData.siegeBebes}</span>
                      <span className="text-slate-800">+{((selectedTrajet?.prixSiegeBebe || 0) * formData.siegeBebes).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {formData.animalDeCompagnie && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Animal de compagnie</span>
                      <span className="text-slate-800">+{(selectedTrajet?.prixAnimalCompagnie || 0).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {formData.adresseSupplement > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Adresse supp. x{formData.adresseSupplement}</span>
                      <span className="text-slate-800">+{((selectedTrajet?.prixAdresseSupplementaire || 0) * formData.adresseSupplement).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-lg font-semibold text-slate-800">{user?.isTva ? 'Total HT' : 'Total'}</span>
                    <span className={`font-bold ${user?.isTva ? 'text-lg text-slate-800' : 'text-2xl text-[#FF6B35]'}`}>{calculateTotal().toLocaleString()} FCFA</span>
                  </div>
                  {user?.isTva && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">TVA (18%)</span>
                        <span className="font-medium text-slate-800">{Math.round(calculateTotal() * 0.18).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-lg font-semibold text-slate-800">Total TTC</span>
                        <span className="text-2xl font-bold text-[#FF6B35]">{Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recapitulatif de la reservation</h3>

              {/* Trip details */}
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-slate-500">Trajet</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#ffdbd0] text-orange-700 font-medium">{formData.is_round_trip ? 'Aller-retour' : 'Aller simple'}</span>
                  </div>
                  <p className="font-medium text-slate-800">{getVilleName(selectedTrajet?.villeDepart)} → {getVilleName(selectedTrajet?.villeArrivee)}</p>
                </div>

                {/* Aller info */}
                <div className="p-5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <PlaneTakeoff className="w-4 h-4 text-[#FF6B35]" />
                    <p className="text-sm font-semibold text-slate-700">Aller</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Date & Heure</p>
                      <p className="font-medium text-slate-800">
                        {formData.departure_date && format(new Date(formData.departure_date), 'dd MMM yyyy', { locale: fr })}
                        {' a '}{formData.departure_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Adresse</p>
                      <p className="text-sm text-slate-800">{formData.address}</p>
                    </div>
                  </div>
                </div>

                {/* Retour info */}
                {formData.is_round_trip && (
                  <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <PlaneLanding className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-semibold text-slate-700">Retour</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Date & Heure</p>
                        <p className="font-medium text-slate-800">
                          {formData.return_date && format(new Date(formData.return_date), 'dd MMM yyyy', { locale: fr })}
                          {' a '}{formData.return_time}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Adresse</p>
                        <p className="text-sm text-slate-800">{formData.return_address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5 rounded-xl bg-slate-50">
                  <div className={`grid gap-4 ${formData.direction === 'from_airport' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                      <p className="text-xs text-slate-500">Passagers</p>
                      <p className="font-medium text-slate-800">{formData.passengers}</p>
                    </div>
                    {formData.direction === 'from_airport' && (
                      <div>
                        <p className="text-xs text-slate-500">Numero de vol</p>
                        <p className="font-medium text-slate-800">{formData.flight_number || '—'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center text-white font-semibold">
                    {formData.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{formData.clientName}</p>
                    <p className="text-sm text-slate-500">{formData.clientPhone}</p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="p-6 rounded-xl bg-[#ffdbd0]/40 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Mode de paiement</span>
                  <span className="font-medium text-slate-800">
                    {paymentMethods.find((m: { id: string; label: string }) => m.id === formData.payment_method)?.label || 'Non selectionne'}
                  </span>
                </div>
                {user?.isTva ? (
                  <>
                    <div className="flex items-center justify-between pt-4 border-t border-orange-300">
                      <span className="text-slate-600">Total HT</span>
                      <span className="text-lg font-semibold text-slate-800">{calculateTotal().toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">TVA (18%)</span>
                      <span className="font-medium text-slate-800">{Math.round(calculateTotal() * 0.18).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-orange-300">
                      <span className="text-slate-800 font-semibold">Total TTC</span>
                      <span className="text-3xl font-bold text-subito">{Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between pt-4 border-t border-orange-300">
                    <span className="text-slate-800 font-semibold">Total</span>
                    <span className="text-3xl font-bold text-subito">{calculateTotal().toLocaleString()} FCFA</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right column: contextual side panel */}
      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
        {currentStep === 1 ? (
          <>
            {/* Avantage Business promo card */}
            <div className="bg-[#ffdbd0] rounded-[2rem] p-6 relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#852300] bg-white/50 px-3 py-1 rounded-full">
                Avantage Business
              </span>
              <h4
                className="text-xl font-extrabold text-[#3a0a00] mt-4 mb-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Voyages simplifies pour vos equipes.
              </h4>
              <p className="text-sm text-[#852300] mb-4 leading-relaxed">
                Enregistrez les informations de vos employes pour des reservations en un clic lors de leurs prochains trajets.
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-[#FF6B35]">
                <ArrowRight className="w-4 h-4" />
                <span>Reservations express</span>
              </div>
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#FF6B35]/10 rounded-full blur-2xl" />
            </div>

            {/* Besoin d'aide */}
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#FF6B35] shrink-0">
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

            {/* Premium Velocity image card */}
            <div className="rounded-[1.5rem] overflow-hidden relative h-44 group bg-gradient-to-br from-[#171c1f] to-[#2c3134]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-end p-5">
                <div>
                  <p
                    className="text-white font-bold text-lg leading-tight"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Experience Premium Velocity
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Notre selection de vehicules vous fait confiance.
                  </p>
                </div>
              </div>
              <Car className="absolute -right-6 -top-6 w-32 h-32 text-white/10" strokeWidth={1.5} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/5 p-6">
          <h3
            className="text-xl font-bold text-[#171c1f] mb-6"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Resume du trajet
          </h3>

          {/* Trajet départ → arrivée */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B35]" />
                <div className="w-0.5 h-10 bg-[#dfe3e7]" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[#FF6B35]" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Depart</p>
                  <p className="text-sm font-semibold text-[#171c1f] truncate">
                    {(() => {
                      const depart = departOptions.find(v => v.id === selectedDepartId);
                      return getVilleName(depart) || formData.address || "—";
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Arrivee</p>
                  <p className="text-sm font-semibold text-[#171c1f] truncate">
                    {(() => {
                      const arrivee = arriveeOptions.find(v => v.id === selectedArriveeId);
                      return getVilleName(arrivee) || "—";
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#f0f4f8] rounded-2xl space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Type</span>
                <span className="font-bold text-[#171c1f] text-right truncate">
                  {formData.is_round_trip ? "Aller-retour" : "Aller simple"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Voyageur</span>
                <span className="font-bold text-[#171c1f] text-right truncate">
                  {formData.clientName || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Date &amp; heure</span>
                <span className="font-bold text-[#171c1f] text-right">
                  {formData.departure_date
                    ? `${format(new Date(formData.departure_date), "dd MMM", { locale: fr })}, ${formData.departure_time || "—"}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Passagers</span>
                <span className="font-bold text-[#171c1f]">{formData.passengers}</span>
              </div>
              {selectedTrajet?.vehicule && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Vehicule</span>
                  <span className="font-bold text-[#171c1f] text-right truncate">
                    {[selectedTrajet.vehicule.marque, selectedTrajet.vehicule.modele || selectedTrajet.vehicule.model]
                      .filter(Boolean)
                      .join(" ") || selectedTrajet.vehicule.categorie || "—"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tarif breakdown */}
          <div className="space-y-3 border-t border-[#dfe3e7] pt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Tarif de base</span>
              <span className="text-sm font-medium text-[#171c1f]">
                {selectedTrajet
                  ? `${(selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0).toLocaleString()} FCFA`
                  : "—"}
              </span>
            </div>
            {formData.siegeBebes > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Sieges bebe (x{formData.siegeBebes})</span>
                <span className="text-sm font-medium text-[#171c1f]">
                  +{((selectedTrajet?.prixSiegeBebe || 0) * formData.siegeBebes).toLocaleString()} FCFA
                </span>
              </div>
            )}
            {formData.animalDeCompagnie && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Animal a bord</span>
                <span className="text-sm font-medium text-[#171c1f]">
                  +{(selectedTrajet?.prixAnimalCompagnie || 0).toLocaleString()} FCFA
                </span>
              </div>
            )}
            {formData.adresseSupplement > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Arrets sup. (x{formData.adresseSupplement})</span>
                <span className="text-sm font-medium text-[#171c1f]">
                  +{((selectedTrajet?.prixAdresseSupplementaire || 0) * formData.adresseSupplement).toLocaleString()} FCFA
                </span>
              </div>
            )}
            <div className="flex justify-between items-end pt-4 border-t border-[#dfe3e7]">
              <span className="font-bold text-lg text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Total</span>
              <div className="text-right">
                {formData.payment_method === "company_account" && (
                  <p className="text-[10px] text-[#FF6B35] font-bold uppercase tracking-widest">
                    Payable par l&apos;entreprise
                  </p>
                )}
                <p
                  className="text-2xl font-black text-[#FF6B35] tracking-tight"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  {calculateTotal().toLocaleString()} FCFA
                </p>
                {user?.isTva && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    TTC : {Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center opacity-40 mt-6 px-4 uppercase tracking-widest font-bold">
            Etape {currentStep} sur {steps.length}
          </p>
          </div>
        )}
      </aside>
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

        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canContinue()}
            className="bg-[#FF6B35] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg shadow-[#FF6B35]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createBooking.isPending}
            className="bg-[#FF6B35] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold text-base shadow-lg shadow-[#FF6B35]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            {createBooking.isPending ? 'Confirmation...' : `Confirmer - ${calculateTotal().toLocaleString()} FCFA`}
          </Button>
        )}
      </div>
    </div>
  );
}
