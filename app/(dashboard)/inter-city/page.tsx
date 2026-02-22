'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, TrajetInterVille, CreateInterCityBookingDto, EmployeeResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
type InterCityPaymentMethod = 'cash' | 'mobile_money' | 'company_account';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin,
  ArrowRightLeft,
  Calendar,
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
  Home
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
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TripOption {
  id: string;
  label: string;
  price: number;
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
  paymentMethod: InterCityPaymentMethod;
}

const steps: Step[] = [
  { id: 1, title: "Trajet", icon: MapPin },
  { id: 2, title: "Client", icon: User },
  { id: 3, title: "Paiement", icon: CreditCard },
  { id: 4, title: "Confirmation", icon: Check },
];

const tripOptions: TripOption[] = [
  { id: "extra_stop", label: "Arret supplementaire", price: 5000, icon: Plus },
  { id: "baby_seat", label: "Siege bebe", price: 5000, icon: Baby },
  { id: "pet", label: "Animal de compagnie", price: 5000, icon: PawPrint },
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
    paymentMethod: "cash",
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

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

  // Get unique cities from routes
  const departureCities = [...new Set(trajets.map(t => t.villeDepart?.name).filter(Boolean))];
  const arrivalCities = formData.departureCity
    ? [...new Set(trajets.filter(t => t.villeDepart?.name === formData.departureCity).map(t => t.villeArrivee?.name).filter(Boolean))]
    : [];

  // Get selected route
  const selectedRoute = trajets.find(
    t => t.villeDepart?.name === formData.departureCity && t.villeArrivee?.name === formData.arrivalCity
  );

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

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSwapCities = () => {
    const newDepartureCity = formData.arrivalCity;
    const newArrivalCity = formData.departureCity;
    setFormData(prev => ({
      ...prev,
      departureCity: newDepartureCity,
      arrivalCity: newArrivalCity,
      trajetInterVilleId: null,
    }));
    // Find the new route
    const newRoute = trajets.find(
      t => t.villeDepart?.name === newDepartureCity && t.villeArrivee?.name === newArrivalCity
    );
    if (newRoute) {
      setFormData(prev => ({ ...prev, trajetInterVilleId: newRoute.id }));
    }
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
    let total = 0;

    if (selectedRoute) {
      total += selectedRoute.prixAllerSimple;
    }

    // Options
    if (formData.siegeBebes > 0) {
      total += formData.siegeBebes * 5000;
    }
    if (formData.animalDeCompagnie) {
      total += 5000;
    }

    // Return trip
    if (!formData.isOneWay && selectedRoute) {
      total += selectedRoute.prixAllerSimple;
      if (formData.siegeBebesRetour > 0) {
        total += formData.siegeBebesRetour * 5000;
      }
      if (formData.animalDeCompagnieRetour) {
        total += 5000;
      }
    }

    return total;
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.departureCity) {
        toast.error("Veuillez selectionner une ville de depart");
        return;
      }
      if (!formData.arrivalCity) {
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
      if (!formData.paymentMethod) {
        toast.error("Veuillez selectionner un mode de paiement");
        return;
      }
    }

    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!selectedRoute) {
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
      trajetInterVilleId: selectedRoute.id,
      departureCity: formData.departureCity,
      arrivalCity: formData.arrivalCity,
      isOneWay: formData.isOneWay,
      pickupDateAller: formData.pickupDateAller,
      pickupTimeAller: formData.pickupTimeAller,
      paidBy: isCompanyPayment ? 'company' : 'client',
      paymentMethod: isCompanyPayment ? undefined : formData.paymentMethod,
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
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1: {
        const baseValid = !!(formData.departureCity && formData.arrivalCity && formData.adressePriseEnChargeDepartAller && formData.adressePriseEnChargeArriveeAller && formData.pickupDateAller && formData.pickupTimeAller);
        if (!formData.isOneWay) return baseValid && !!(formData.pickupDateRetour && formData.pickupTimeRetour);
        return baseValid;
      }
      case 2:
        return !!(formData.employeeId && formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone) && formData.clientAddress);
      case 3:
        return !!formData.paymentMethod;
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
                {formData.departureCity} → {formData.arrivalCity}
              </p>
            </div>
            <p className="text-2xl font-bold text-subito">
              {calculateTotal().toLocaleString()} FCFA
            </p>
          </div>
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
                  {/* Cities with swap button */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Ville de depart</Label>
                      <Select
                        value={formData.departureCity}
                        onValueChange={(v) => {
                          handleChange('departureCity', v);
                          handleChange('arrivalCity', '');
                          handleChange('trajetInterVilleId', null);
                        }}
                      >
                        <SelectTrigger>
                          <MapPin className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Choisir une ville" />
                        </SelectTrigger>
                        <SelectContent>
                          {departureCities.map(city => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSwapCities}
                      disabled={!formData.departureCity || !formData.arrivalCity}
                      className="mb-1"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>

                    <div className="space-y-2">
                      <Label>Ville d&apos;arrivee</Label>
                      <Select
                        value={formData.arrivalCity}
                        onValueChange={(v) => {
                          handleChange('arrivalCity', v);
                          const route = trajets.find(t => t.villeDepart?.name === formData.departureCity && t.villeArrivee?.name === v);
                          if (route) {
                            handleChange('trajetInterVilleId', route.id);
                          }
                        }}
                        disabled={!formData.departureCity}
                      >
                        <SelectTrigger>
                          <MapPin className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Choisir une ville" />
                        </SelectTrigger>
                        <SelectContent>
                          {arrivalCities.map(city => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Route info */}
                  {selectedRoute && (
                    <div className="flex justify-center gap-4">
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-base px-4 py-2">
                        {selectedRoute.prixAllerSimple.toLocaleString()} FCFA
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-base px-4 py-2">
                        <Clock className="w-4 h-4 mr-1" />
                        ~{selectedRoute.duree} min
                      </Badge>
                    </div>
                  )}

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
                    <div className="space-y-2">
                      <Label>Date de depart</Label>
                      <Input
                        type="date"
                        value={formData.pickupDateAller}
                        onChange={(e) => handleChange('pickupDateAller', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure de depart</Label>
                      <Input
                        type="time"
                        value={formData.pickupTimeAller}
                        onChange={(e) => handleChange('pickupTimeAller', e.target.value)}
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
                        <div className="space-y-2">
                          <Label>Date de retour</Label>
                          <Input
                            type="date"
                            value={formData.pickupDateRetour}
                            onChange={(e) => handleChange('pickupDateRetour', e.target.value)}
                            min={formData.pickupDateAller || new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Heure de retour</Label>
                          <Input
                            type="time"
                            value={formData.pickupTimeRetour}
                            onChange={(e) => handleChange('pickupTimeRetour', e.target.value)}
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

              {/* Employee selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Voyageur (employe) *
                </Label>
                <Select
                  value={formData.employeeId?.toString() || ""}
                  onValueChange={(v) => {
                    const empId = parseInt(v);
                    handleChange('employeeId', empId);
                    const emp = employees.find(e => e.id === empId);
                    if (emp) {
                      handleChange('clientName', `${emp.prenom} ${emp.nom}`);
                      if (emp.email) handleChange('clientEmail', emp.email);
                      if (emp.telephone) handleChange('clientPhone', emp.telephone);
                    }
                  }}
                >
                  <SelectTrigger>
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Selectionner un employe" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.prenom} {emp.nom} {emp.departement ? `- ${emp.departement.nom}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {employees.length === 0 && (
                  <p className="text-sm text-amber-600">Aucun employe trouve. Ajoutez des employes dans la section Employes.</p>
                )}
              </div>

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
                  <span className="font-semibold">{formData.departureCity}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-semibold">{formData.arrivalCity}</span>
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

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800">Mode de paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: "cash" as const, label: "Especes", icon: "💵", desc: "Paiement au chauffeur" },
                  { value: "mobile_money" as const, label: "Mobile Money", icon: "📱", desc: "Orange Money, Wave, Free Money" },
                  { value: "company_account" as const, label: "Compte entreprise", icon: "🏢", desc: "Facturation sur le compte" },
                ].map((option) => (
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
                  {selectedRoute && (
                    <div className="flex justify-between">
                      <span>Trajet aller ({selectedRoute.villeDepart?.name} → {selectedRoute.villeArrivee?.name})</span>
                      <span className="font-medium">{selectedRoute.prixAllerSimple.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {formData.siegeBebes > 0 && (
                    <div className="flex justify-between">
                      <span>Sieges bebe (x{formData.siegeBebes})</span>
                      <span className="font-medium">{(formData.siegeBebes * 5000).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {formData.animalDeCompagnie && (
                    <div className="flex justify-between">
                      <span>Animal de compagnie</span>
                      <span className="font-medium">5 000 FCFA</span>
                    </div>
                  )}
                  {!formData.isOneWay && selectedRoute && (
                    <>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span>Trajet retour</span>
                        <span className="font-medium">{selectedRoute.prixAllerSimple.toLocaleString()} FCFA</span>
                      </div>
                      {formData.siegeBebesRetour > 0 && (
                        <div className="flex justify-between">
                          <span>Sieges bebe retour (x{formData.siegeBebesRetour})</span>
                          <span className="font-medium">{(formData.siegeBebesRetour * 5000).toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {formData.animalDeCompagnieRetour && (
                        <div className="flex justify-between">
                          <span>Animal retour</span>
                          <span className="font-medium">5 000 FCFA</span>
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

          {/* Step 4: Summary */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
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
                    <span className="font-bold text-slate-800">{formData.departureCity}</span>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-800">{formData.arrivalCity}</span>
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
                  {selectedRoute && (
                    <span className="font-semibold text-slate-800">
                      {selectedRoute.prixAllerSimple.toLocaleString()} FCFA
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
                    {selectedRoute && (
                      <span className="font-semibold text-slate-800">
                        {selectedRoute.prixAllerSimple.toLocaleString()} FCFA
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
                    <span>{selectedRoute?.prixAllerSimple.toLocaleString()} FCFA</span>
                  </div>
                  {!formData.isOneWay && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Trajet retour</span>
                      <span>{selectedRoute?.prixAllerSimple.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {(formData.siegeBebes > 0 || formData.animalDeCompagnie || formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour) && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Options</span>
                      <span>
                        {(
                          (formData.siegeBebes * 5000) +
                          (formData.animalDeCompagnie ? 5000 : 0) +
                          (formData.siegeBebesRetour * 5000) +
                          (formData.animalDeCompagnieRetour ? 5000 : 0)
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

        {currentStep < 4 ? (
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
