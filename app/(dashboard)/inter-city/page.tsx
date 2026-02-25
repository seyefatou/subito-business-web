'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Ville, TrajetInterVille, CreateInterCityBookingDto, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
type InterCityPaymentMethod = string;
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin,
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
  adressePriseEnChargeArriveeAller: string;
  adressePriseEnChargeDepartRetour: string;
  adressePriseEnChargeArriveeRetour: string;
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
  { id: 1, title: "Trajet", icon: MapPin },
  { id: 2, title: "Client", icon: User },
  { id: 3, title: "Vehicule", icon: Car },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

export default function InterCity() {
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
    adressePriseEnChargeArriveeAller: "",
    adressePriseEnChargeDepartRetour: "",
    adressePriseEnChargeArriveeRetour: "",
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

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const apiMethods = (Array.isArray(paymentOptionsResponse?.data) ? paymentOptionsResponse.data : [])
    .filter((o: PaymentOption) => o.type !== 'wallet' && o.name?.toLowerCase() !== 'portefeuille')
    .map((o: PaymentOption) => ({ value: (o.type || o.name || '').toLowerCase(), label: o.name, desc: o.description || '', icon: o.icon || '' }));
  const paymentMethods = [
    ...apiMethods,
    { value: "company_account", label: "Compte entreprise", desc: "Facturation sur le compte", icon: "🏢" },
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

    if (currentStep === 2) {
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
      if (!formData.clientAddress) {
        toast.error("Veuillez entrer l'adresse du client");
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
      adressePriseEnChargeArriveeAller: formData.adressePriseEnChargeArriveeAller,
      serviceType: formData.isOneWay ? 'one_way' : 'round_trip',
      trajetInterVilleId: selectedTrajet.id,
      vehiculeId: formData.vehiculeId || undefined,
      departureCity: getVilleName(selectedTrajet.villeDepart),
      arrivalCity: getVilleName(selectedTrajet.villeArrivee),
      isOneWay: formData.isOneWay,
      pickupDateAller: formData.pickupDateAller,
      pickupTimeAller: formData.pickupTimeAller,
      paidBy: isCompanyPayment ? 'company' : 'client',
      paymentMethod: isCompanyPayment || !formData.paymentMethod ? undefined : formData.paymentMethod,
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
      (bookingData as any).adressePriseEnChargeArriveeRetour = formData.adressePriseEnChargeArriveeRetour || undefined;
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
      case 1: {
        const baseValid = !!(selectedPays && selectedDepartId && selectedArriveeId && formData.adressePriseEnChargeDepartAller && formData.adressePriseEnChargeArriveeAller && formData.pickupDateAller && formData.pickupTimeAller);
        if (!formData.isOneWay) return baseValid && !!(formData.pickupDateRetour && formData.pickupTimeRetour);
        return baseValid;
      }
      case 2:
        return !!(formData.employeeId && formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone) && formData.clientAddress);
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
          Reservation confirmee !
        </h1>
        <p className="text-slate-500 mb-8">
          Votre trajet inter-villes est reserve avec succes
        </p>

        <div className="inline-block mb-8">
          <Badge className="text-lg px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white border-0">
            Reference : {bookingReference}
          </Badge>
        </div>

        <div className="bg-slate-100 rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 mb-1">Trajet</p>
              <p className="font-bold text-slate-800 text-lg">
                {getVilleName(selectedTrajet?.villeDepart)} → {getVilleName(selectedTrajet?.villeArrivee)}
              </p>
            </div>
            <p className="text-2xl font-bold text-subito">
              {calculateTotal().toLocaleString()} FCFA
            </p>
          </div>
          {selectedTrajet?.vehicule && (
            <p className="text-slate-600 mb-1">
              Vehicule : {selectedTrajet.vehicule.categorie || selectedTrajet.vehicule.marque} {selectedTrajet.vehicule.modele || selectedTrajet.vehicule.model || ''}
            </p>
          )}
          <p className="text-slate-600">
            {formData.pickupDateAller && format(new Date(formData.pickupDateAller), "EEEE d MMMM yyyy", { locale: fr })}
            {' a '}
            {formData.pickupTimeAller}
          </p>
          <p className="text-slate-600 mt-2">
            Client : {formData.clientName} - {formData.clientPhone}
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
            Nouvelle reservation
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reservation Inter-villes</h1>
            <p className="text-slate-500">Voyages entre villes</p>
          </div>
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

      {/* Form content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Trip details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {trajetsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <>
                  {/* Pays */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Pays</Label>
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

                  {/* Cities with swap button */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Ville de depart</Label>
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
                              <MapPin className="w-4 h-4 shrink-0" />
                              {selectedDepartId
                                ? getVilleName(villes.find(v => v.id === selectedDepartId))
                                : (!selectedPays ? "Selectionnez un pays" : "Choisir une ville")
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
                                      // Reset arrival if same city was selected
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
                                      <Check className="ml-auto w-4 h-4 text-orange-600 shrink-0" />
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
                      className="mb-1"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>

                    <div className="space-y-2">
                      <Label>Ville d&apos;arrivee</Label>
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
                              <MapPin className="w-4 h-4 shrink-0" />
                              {selectedArriveeId
                                ? getVilleName(villes.find(v => v.id === selectedArriveeId))
                                : (!selectedPays ? "Selectionnez un pays" : "Choisir une ville")
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
                                      <Check className="ml-auto w-4 h-4 text-orange-600 shrink-0" />
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
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Adresse de prise en charge (depart) *
                      </Label>
                      <Input
                        placeholder="Ex: Hotel Terrou-Bi, Corniche, Dakar"
                        value={formData.adressePriseEnChargeDepartAller}
                        onChange={(e) => handleChange('adressePriseEnChargeDepartAller', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Adresse de depose (arrivee) *
                      </Label>
                      <Input
                        placeholder="Ex: Gare routiere, Thies"
                        value={formData.adressePriseEnChargeArriveeAller}
                        onChange={(e) => handleChange('adressePriseEnChargeArriveeAller', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Date and time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <Label className="text-xs text-slate-500 mb-2 block">Date de depart</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start border-0 bg-transparent p-0 h-auto font-normal hover:bg-transparent"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2 text-orange-600" />
                            {formData.pickupDateAller
                              ? format(new Date(formData.pickupDateAller + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                              : "Selectionner une date"}
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
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <Label className="text-xs text-slate-500 mb-2 block">Heure de depart</Label>
                      <TimePicker
                        value={formData.pickupTimeAller}
                        onChange={(v) => handleChange('pickupTimeAller', v)}
                        placeholder="Choisir une heure"
                      />
                    </div>
                  </div>

                  {/* Baggage */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Petits bagages</Label>
                      <Select
                        value={formData.smallBags.toString()}
                        onValueChange={(v) => handleChange('smallBags', parseInt(v))}
                      >
                        <SelectTrigger>
                          <Briefcase className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Grands bagages</Label>
                      <Select
                        value={formData.largeBags.toString()}
                        onValueChange={(v) => handleChange('largeBags', parseInt(v))}
                      >
                        <SelectTrigger>
                          <Briefcase className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Baby className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-800">Sieges bebe</p>
                          <p className="text-sm text-slate-500">+5 000 FCFA/siege</p>
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
                          <p className="font-medium text-slate-800">Animal de compagnie</p>
                          <p className="text-sm text-slate-500">+5 000 FCFA</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.animalDeCompagnie}
                        onCheckedChange={(v) => handleChange('animalDeCompagnie', v)}
                      />
                    </div>
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
                      checked={!formData.isOneWay}
                      onCheckedChange={(v) => handleChange('isOneWay', !v)}
                    />
                  </div>

                  {/* Return trip fields */}
                  {!formData.isOneWay && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 pt-4 border-t border-slate-200"
                    >
                      <h3 className="font-semibold text-slate-800">Trajet retour</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Adresse de prise en charge (retour)
                          </Label>
                          <Input
                            placeholder="Ex: Gare routiere, Thies"
                            value={formData.adressePriseEnChargeDepartRetour}
                            onChange={(e) => handleChange('adressePriseEnChargeDepartRetour', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Adresse de depose (retour)
                          </Label>
                          <Input
                            placeholder="Ex: Hotel Terrou-Bi, Corniche, Dakar"
                            value={formData.adressePriseEnChargeArriveeRetour}
                            onChange={(e) => handleChange('adressePriseEnChargeArriveeRetour', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4">
                          <Label className="text-xs text-slate-500 mb-2 block">Date de retour</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-start border-0 bg-transparent p-0 h-auto font-normal hover:bg-transparent"
                              >
                                <CalendarIcon className="w-4 h-4 mr-2 text-orange-600" />
                                {formData.pickupDateRetour
                                  ? format(new Date(formData.pickupDateRetour + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                                  : "Selectionner une date"}
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
                        <div className="bg-slate-50 rounded-2xl p-4">
                          <Label className="text-xs text-slate-500 mb-2 block">Heure de retour</Label>
                          <TimePicker
                            value={formData.pickupTimeRetour}
                            onChange={(v) => handleChange('pickupTimeRetour', v)}
                            placeholder="Choisir une heure"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3">
                            <Baby className="w-5 h-5 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-800">Sieges bebe (retour)</p>
                              <p className="text-sm text-slate-500">+5 000 FCFA/siege</p>
                            </div>
                          </div>
                          <Select
                            value={formData.siegeBebesRetour.toString()}
                            onValueChange={(v) => handleChange('siegeBebesRetour', parseInt(v))}
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
                              <p className="font-medium text-slate-800">Animal (retour)</p>
                              <p className="text-sm text-slate-500">+5 000 FCFA</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.animalDeCompagnieRetour}
                            onCheckedChange={(v) => handleChange('animalDeCompagnieRetour', v)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Special requests */}
                  <div className="space-y-2">
                    <Label>Demandes speciales (optionnel)</Label>
                    <Textarea
                      placeholder="Instructions particulieres pour le chauffeur..."
                      value={formData.specialRequests}
                      onChange={(e) => handleChange('specialRequests', e.target.value)}
                      className="h-20"
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step 2: Client info */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800">Informations du client</h3>

              {/* Employee selector with search */}
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
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nom complet *
                  </Label>
                  <Input
                    placeholder="Nom et prenom du client"
                    value={formData.clientName}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telephone *
                  </Label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(v) => handleChange('clientPhone', v)}
                    error={!!phoneError}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-500">Numero invalide</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email (optionnel)
                  </Label>
                  <Input
                    type="email"
                    placeholder="client@email.com"
                    value={formData.clientEmail}
                    onChange={(e) => handleChange('clientEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Adresse *
                  </Label>
                  <Input
                    placeholder="Adresse du client"
                    value={formData.clientAddress}
                    onChange={(e) => handleChange('clientAddress', e.target.value)}
                  />
                </div>
              </div>

              {/* Trip summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-2">Resume du trajet</h4>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="font-semibold">{getVilleName(villes.find(v => v.id === selectedDepartId))}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-semibold">{getVilleName(villes.find(v => v.id === selectedArriveeId))}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formData.pickupDateAller && format(new Date(formData.pickupDateAller), "EEEE d MMMM yyyy", { locale: fr })}
                  {' a '}
                  {formData.pickupTimeAller}
                  {!formData.isOneWay && ' (Aller-retour)'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 3: Vehicle selection */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800">Choisissez votre vehicule</h3>

              <div className="space-y-3">
                {matchingTrajets.map(trajet => {
                  const v = trajet.vehicule;
                  const vehiculeName = v?.categorie || v?.marque || `Vehicule`;
                  const vehiculeModel = `${v?.marque || ''} ${v?.modele || v?.model || ''}`.trim();
                  const price = trajet.prixAllerSimple ?? trajet.prix ?? 0;
                  const places = v?.places ?? v?.nombrePlace;
                  const imageUrl = Array.isArray(v?.image) ? v.image[0] : v?.image;
                  const isSelected = formData.trajetInterVilleId === trajet.id;
                  return (
                    <div
                      key={trajet.id}
                      onClick={() => {
                        handleChange('trajetInterVilleId', trajet.id);
                        handleChange('vehiculeId', v?.id || null);
                      }}
                      className={`
                        flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${isSelected
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt={vehiculeName} className="w-10 h-10 object-contain rounded" />
                        ) : (
                          <Car className="w-7 h-7 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 capitalize">{vehiculeName}</p>
                        {vehiculeModel && <p className="text-sm text-slate-500">{vehiculeModel}</p>}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          {places != null && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {places} places
                            </span>
                          )}
                          {v?.petitBagage != null && (
                            <span>{v.petitBagage} petit{Number(v.petitBagage) > 1 ? 's' : ''} bagage{Number(v.petitBagage) > 1 ? 's' : ''}</span>
                          )}
                          {v?.grandBagage != null && (
                            <span>{v.grandBagage} grand{Number(v.grandBagage) > 1 ? 's' : ''} bagage{Number(v.grandBagage) > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800 text-lg">{Number(price).toLocaleString()} FCFA</p>
                      </div>
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                        ${isSelected
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-slate-300'
                        }
                      `}>
                        {isSelected && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {matchingTrajets.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun vehicule disponible</p>
                  <p className="text-sm mt-1">Selectionnez un trajet valide pour voir les vehicules</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleChange('paymentMethod', option.value)}
                    className={`
                      flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all
                      ${formData.paymentMethod === option.value
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <span className="text-4xl">{option.icon}</span>
                    <div className="text-center">
                      <p className="font-medium text-slate-800">{option.label}</p>
                      <p className="text-sm text-slate-500">{option.desc}</p>
                    </div>
                    {formData.paymentMethod === option.value && (
                      <Check className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="p-6 rounded-xl bg-slate-50 space-y-3">
                <h4 className="font-medium text-slate-800">Detail du prix</h4>
                <div className="space-y-2 text-sm">
                  {selectedTrajet && (
                    <div className="flex justify-between">
                      <span>Trajet aller ({getVilleName(selectedTrajet.villeDepart)} → {getVilleName(selectedTrajet.villeArrivee)})</span>
                      <span className="font-medium">{(selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {formData.siegeBebes > 0 && (
                    <div className="flex justify-between">
                      <span>Sieges bebe (x{formData.siegeBebes})</span>
                      <span className="font-medium">{(formData.siegeBebes * (selectedTrajet?.prixSiegeBebe ?? 5000)).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {formData.animalDeCompagnie && (
                    <div className="flex justify-between">
                      <span>Animal de compagnie</span>
                      <span className="font-medium">{(selectedTrajet?.prixAnimalCompagnie ?? 5000).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {!formData.isOneWay && selectedTrajet && (
                    <>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span>Trajet retour</span>
                        <span className="font-medium">{(selectedTrajet.prixAllerRetour || (selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0)).toLocaleString()} FCFA</span>
                      </div>
                      {formData.siegeBebesRetour > 0 && (
                        <div className="flex justify-between">
                          <span>Sieges bebe retour (x{formData.siegeBebesRetour})</span>
                          <span className="font-medium">{(formData.siegeBebesRetour * (selectedTrajet?.prixSiegeBebe ?? 5000)).toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {formData.animalDeCompagnieRetour && (
                        <div className="flex justify-between">
                          <span>Animal retour</span>
                          <span className="font-medium">{(selectedTrajet?.prixAnimalCompagnie ?? 5000).toLocaleString()} FCFA</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-300 flex justify-between">
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
              <h3 className="text-lg font-semibold text-slate-800">Recapitulatif de la reservation</h3>

              {/* Itinerary */}
              <div className="p-6 rounded-xl bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{getVilleName(selectedTrajet?.villeDepart)}</span>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-800">{getVilleName(selectedTrajet?.villeArrivee)}</span>
                  </div>
                  {!formData.isOneWay && (
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      Aller-retour
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                  <p><span className="text-slate-500">Prise en charge:</span> {formData.adressePriseEnChargeDepartAller}</p>
                  <p><span className="text-slate-500">Depose:</span> {formData.adressePriseEnChargeArriveeAller}</p>
                </div>
              </div>

              {/* Vehicle info */}
              {selectedTrajet?.vehicule && (
                <div className="p-6 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-sm text-slate-500">Vehicule</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      {Array.isArray(selectedTrajet.vehicule.image) && selectedTrajet.vehicule.image[0] ? (
                        <img src={selectedTrajet.vehicule.image[0]} alt="" className="w-8 h-8 object-contain rounded" />
                      ) : (
                        <Car className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {selectedTrajet.vehicule.categorie || selectedTrajet.vehicule.marque}
                      </p>
                      <p className="text-sm text-slate-500">
                        {`${selectedTrajet.vehicule.marque || ''} ${selectedTrajet.vehicule.modele || selectedTrajet.vehicule.model || ''}`.trim()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trip details */}
              <div className="p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Trajet aller</p>
                    <p className="text-sm text-slate-500">
                      {formData.pickupDateAller && format(new Date(formData.pickupDateAller), "EEEE d MMMM yyyy", { locale: fr })}
                      {' a '}
                      {formData.pickupTimeAller}
                    </p>
                  </div>
                  {selectedTrajet && (
                    <span className="font-semibold text-slate-800">
                      {(selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0).toLocaleString()} FCFA
                    </span>
                  )}
                </div>

                {(formData.siegeBebes > 0 || formData.animalDeCompagnie) && (
                  <div className="pt-2 space-y-1">
                    {formData.siegeBebes > 0 && (
                      <Badge className="mr-2 bg-blue-100 text-blue-700 border-0">
                        {formData.siegeBebes} siege(s) bebe
                      </Badge>
                    )}
                    {formData.animalDeCompagnie && (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        Animal de compagnie
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Return trip */}
              {!formData.isOneWay && (
                <div className="p-6 rounded-xl border-2 border-red-200 bg-red-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="bg-red-500 text-white border-0 mb-2">TRAJET RETOUR</Badge>
                      <p className="text-sm text-slate-600">
                        {formData.pickupDateRetour && format(new Date(formData.pickupDateRetour), "EEEE d MMMM yyyy", { locale: fr })}
                        {' a '}
                        {formData.pickupTimeRetour}
                      </p>
                    </div>
                    {selectedTrajet && (
                      <span className="font-semibold text-slate-800">
                        {(selectedTrajet.prixAllerRetour || (selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0)).toLocaleString()} FCFA
                      </span>
                    )}
                  </div>

                  {(formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour) && (
                    <div className="pt-2 space-y-1">
                      {formData.siegeBebesRetour > 0 && (
                        <Badge className="mr-2 bg-gray-200 text-gray-700 border-0">
                          {formData.siegeBebesRetour} siege(s) bebe
                        </Badge>
                      )}
                      {formData.animalDeCompagnieRetour && (
                        <Badge className="bg-gray-200 text-gray-700 border-0">
                          Animal de compagnie
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Client info */}
              <div className="p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-semibold">
                    {formData.clientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{formData.clientName}</p>
                    <p className="text-sm text-slate-500">{formData.clientPhone}</p>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Trajet aller</span>
                    <span>{(selectedTrajet?.prixAllerSimple ?? selectedTrajet?.prix ?? 0).toLocaleString()} FCFA</span>
                  </div>
                  {!formData.isOneWay && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Trajet retour</span>
                      <span>{(selectedTrajet?.prixAllerRetour || (selectedTrajet?.prixAllerSimple ?? selectedTrajet?.prix ?? 0)).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {(formData.siegeBebes > 0 || formData.animalDeCompagnie || formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour) && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Options</span>
                      <span>
                        {(
                          (formData.siegeBebes * (selectedTrajet?.prixSiegeBebe ?? 5000)) +
                          (formData.animalDeCompagnie ? (selectedTrajet?.prixAnimalCompagnie ?? 5000) : 0) +
                          (formData.siegeBebesRetour * (selectedTrajet?.prixSiegeBebe ?? 5000)) +
                          (formData.animalDeCompagnieRetour ? (selectedTrajet?.prixAnimalCompagnie ?? 5000) : 0)
                        ).toLocaleString()} FCFA
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/20 pt-3 flex items-center justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-3xl font-bold text-red-400">
                      {calculateTotal().toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={currentStep === 1 ? () => router.push("/") : handleBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === 1 ? 'Annuler' : 'Retour'}
        </Button>

        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canContinue()}
            className="gradient-subito text-white border-0 gap-2"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createBooking.isPending}
            className="gradient-subito text-white border-0 gap-2 text-lg px-8"
          >
            {createBooking.isPending ? 'Confirmation...' : `Confirmer - ${calculateTotal().toLocaleString()} FCFA`}
          </Button>
        )}
      </div>
    </div>
  );
}
