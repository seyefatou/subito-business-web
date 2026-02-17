'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, CreateAirportShuttleBookingDto, AirportPaymentMethod } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plane,
  MapPin,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Car,
  Briefcase,
  Baby,
  PawPrint,
  Plus,
  CreditCard,
  CheckCircle2,
  User,
  Clock,
  ArrowRightLeft,
  Phone,
  Mail
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
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Vehicle {
  id: string;
  name: string;
  passengers: number;
  luggage: number;
  price: number;
  duration: number;
  amenities: string[];
  icon: string;
}

interface Option {
  id: string;
  label: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface Ville {
  id: number;
  name: string;
}

interface TrajetAeroport {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  prixAllerSimple?: number;
  prixAllerRetour?: number;
  prixAdresseSupplementaire?: number;
  prixSiegeBebe?: number;
  prixAnimalCompagnie?: number;
}

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
  vehicle_id: string;
  outbound_options: string[];
  return_options: string[];
  payment_method: AirportPaymentMethod;
  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  // Options
  siegeBebes: number;
  animalDeCompagnie: boolean;
  adresseSupplement: number;
  specialRequests: string;
}

const steps: Step[] = [
  { id: 1, title: "Trajet", icon: MapPin },
  { id: 2, title: "Client", icon: User },
  { id: 3, title: "Vehicule", icon: Car },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

const vehicles: Vehicle[] = [
  {
    id: "berline",
    name: "Berline Confort",
    passengers: 3,
    luggage: 2,
    price: 15000,
    duration: 45,
    amenities: ["Wifi", "Climatisation", "Eau"],
    icon: "🚗"
  },
  {
    id: "minibus",
    name: "Minibus Premium",
    passengers: 6,
    luggage: 4,
    price: 35000,
    duration: 50,
    amenities: ["Wifi", "Climatisation", "Eau", "Snacks"],
    icon: "🚐"
  },
  {
    id: "van",
    name: "Van Luxe",
    passengers: 8,
    luggage: 6,
    price: 50000,
    duration: 50,
    amenities: ["Wifi", "Climatisation", "Eau", "Snacks", "Premium"],
    icon: "🚙"
  }
];

const options: Option[] = [
  { id: "baby_seat", label: "Siege bebe", price: 2000, icon: Baby },
  { id: "extra_stop", label: "Arret supplementaire", price: 3000, icon: Plus },
  { id: "pet", label: "Animal de compagnie", price: 2000, icon: PawPrint },
];

const paymentMethods: { id: AirportPaymentMethod; label: string; icon: string; desc: string }[] = [
  { id: "cash", label: "Especes", icon: "💵", desc: "Paiement au chauffeur" },
  { id: "mobile_money", label: "Mobile Money", icon: "📱", desc: "Orange Money, Wave, Free Money" },
  { id: "company_account", label: "Compte entreprise", icon: "🏢", desc: "Facturation sur le compte" },
];

export default function AirportShuttle() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingRef, setBookingRef] = useState<string>("");

  const [formData, setFormData] = useState<FormData>({
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
    vehicle_id: "",
    outbound_options: [],
    return_options: [],
    payment_method: "cash",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    siegeBebes: 0,
    animalDeCompagnie: false,
    adresseSupplement: 0,
    specialRequests: "",
  });

  // Fetch trajets from API
  const { data: trajetsData } = useQuery({
    queryKey: ['trajets-aeroport'],
    queryFn: () => api.trajetsAeroport.getAll(),
  });

  // API returns { data: { list: [...], total, page, pageSize } }
  const trajets: TrajetAeroport[] = trajetsData?.data?.list || [];

  const createBooking = useMutation({
    mutationFn: (data: CreateAirportShuttleBookingDto) => api.airportShuttle.createByAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airport-bookings'] });
      const ref = "NAV" + Date.now().toString().slice(-8);
      setBookingRef(ref);
      setBookingSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la reservation");
    }
  });

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.trajetAeroportId) {
        toast.error("Veuillez selectionner un trajet");
        return;
      }
      if (!formData.departure_date) {
        toast.error("Veuillez selectionner une date de depart");
        return;
      }
      if (!formData.departure_time) {
        toast.error("Veuillez selectionner une heure de depart");
        return;
      }
      if (!formData.address) {
        toast.error("Veuillez entrer une adresse");
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.clientName) {
        toast.error("Veuillez entrer le nom du client");
        return;
      }
      if (!formData.clientPhone) {
        toast.error("Veuillez entrer le numero de telephone");
        return;
      }
      if (!isValidPhone(formData.clientPhone)) {
        toast.error("Numero de telephone invalide (ex: +221 77 123 45 67)");
        return;
      }
      if (!formData.clientAddress) {
        toast.error("Veuillez entrer l'adresse du client");
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.vehicle_id) {
        toast.error("Veuillez selectionner un vehicule");
        return;
      }
    }

    if (currentStep === 4) {
      if (!formData.payment_method) {
        toast.error("Veuillez selectionner un mode de paiement");
        return;
      }
    }

    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!formData.trajetAeroportId) {
      toast.error("Veuillez selectionner un trajet");
      return;
    }

    const bookingData: CreateAirportShuttleBookingDto = {
      clientName: formData.clientName,
      clientEmail: formData.clientEmail || undefined,
      clientPhone: formData.clientPhone,
      clientAddress: formData.clientAddress,
      isOneWay: !formData.is_round_trip,
      pickupDateAller: formData.departure_date,
      pickupTimeAller: formData.departure_time,
      paymentMethod: formData.payment_method,
      serviceType: "airport_shuttle",
      flightNumber: formData.flight_number || undefined,
      siegeBebes: formData.siegeBebes,
      animalDeCompagnie: formData.animalDeCompagnie,
      adresseSupplement: formData.adresseSupplement,
      specialRequests: formData.specialRequests || undefined,
      trajetAeroportId: formData.trajetAeroportId,
      passengers: formData.passengers,
      pickupDateRetour: formData.is_round_trip ? formData.return_date : undefined,
      pickupTimeRetour: formData.is_round_trip ? formData.return_time : undefined,
    };

    createBooking.mutate(bookingData);
  };

  const calculateTotal = (): number => {
    const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
    if (!vehicle) return 0;

    let total = vehicle.price;
    if (formData.is_round_trip) total *= 2;

    formData.outbound_options.forEach(optId => {
      const opt = options.find(o => o.id === optId);
      if (opt) total += opt.price;
    });

    if (formData.is_round_trip) {
      formData.return_options.forEach(optId => {
        const opt = options.find(o => o.id === optId);
        if (opt) total += opt.price;
      });
    }

    return total;
  };

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
  const selectedTrajet = trajets.find(t => t.id === formData.trajetAeroportId);

  // Validate phone number (accepts formats like +221771234567, 221771234567, 771234567, 77 123 45 67)
  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
    return /^\+\d{1,3}\d{7,12}$/.test(cleaned);
  };

  const phoneError = formData.clientPhone && !isValidPhone(formData.clientPhone);

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.trajetAeroportId && formData.departure_date && formData.departure_time && formData.address);
      case 2:
        return !!(formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone) && formData.clientAddress);
      case 3:
        return !!formData.vehicle_id;
      case 4:
        return !!formData.payment_method;
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
        <div className="w-24 h-24 rounded-full gradient-subito flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-3">
          Reservation confirmee !
        </h1>
        <p className="text-slate-500 mb-2">
          Reference : <span className="font-bold text-slate-800">{bookingRef}</span>
        </p>
        <p className="text-slate-500 mb-2">
          La navette aeroport a ete reservee avec succes pour {formData.clientName}
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Un email de confirmation a ete envoye
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/tracking")}
          >
            Voir dans le suivi
          </Button>
          <Button
            className="gradient-subito text-white border-0"
            onClick={() => {
              setBookingSuccess(false);
              setCurrentStep(1);
              setFormData({
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
                vehicle_id: "",
                outbound_options: [],
                return_options: [],
                payment_method: "cash",
                clientName: "",
                clientEmail: "",
                clientPhone: "",
                clientAddress: "",
                siegeBebes: 0,
                animalDeCompagnie: false,
                adresseSupplement: 0,
                specialRequests: "",
              });
            }}
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl gradient-subito">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Navette Aeroport</h1>
            <p className="text-slate-500">Reservez un transfert aeroport</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between">
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
              {/* Direction */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Direction du voyage</Label>
                <RadioGroup
                  value={formData.direction}
                  onValueChange={(v) => handleChange('direction', v)}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: "to_airport", label: "Vers l'aeroport", icon: "✈️→" },
                    { value: "from_airport", label: "Depuis l'aeroport", icon: "←✈️" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={`
                        flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${formData.direction === option.value
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                      <span className="text-xl">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Trajet Selection */}
              <div className="space-y-2">
                <Label>Trajet</Label>
                <Select
                  value={formData.trajetAeroportId?.toString() || ""}
                  onValueChange={(v) => handleChange('trajetAeroportId', parseInt(v))}
                >
                  <SelectTrigger>
                    <Plane className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Choisir un trajet" />
                  </SelectTrigger>
                  <SelectContent>
                    {trajets.map(trajet => (
                      <SelectItem key={trajet.id} value={trajet.id.toString()}>
                        {trajet.villeDepart?.name} → {trajet.villeArrivee?.name} {trajet.prixAllerSimple && `- ${trajet.prixAllerSimple.toLocaleString()} FCFA`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Adresse complete de prise en charge / depose</Label>
                <Textarea
                  placeholder="Ex: Residence Les Almadies, Villa 23, Rue AJ-42"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="h-20"
                />
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

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de depart</Label>
                  <Input
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => handleChange('departure_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heure de depart</Label>
                  <Input
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => handleChange('departure_time', e.target.value)}
                  />
                </div>
              </div>

              {formData.is_round_trip && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de retour</Label>
                    <Input
                      type="date"
                      value={formData.return_date}
                      onChange={(e) => handleChange('return_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure de retour</Label>
                    <Input
                      type="time"
                      value={formData.return_time}
                      onChange={(e) => handleChange('return_time', e.target.value)}
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
                <div className="space-y-2">
                  <Label>Numero de vol (optionnel)</Label>
                  <Input
                    placeholder="Ex: AF 718"
                    value={formData.flight_number}
                    onChange={(e) => handleChange('flight_number', e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Client Info */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800">Informations client</h3>

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
                <Label>Adresse du client *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Textarea
                    placeholder="Ex: Cite Keur Gorgui, Villa 123, Dakar"
                    className="pl-10 min-h-[80px]"
                    value={formData.clientAddress}
                    onChange={(e) => handleChange('clientAddress', e.target.value)}
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

          {/* Step 3: Vehicle selection */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Choisissez votre vehicule</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => handleChange('vehicle_id', vehicle.id)}
                      className={`
                        p-6 rounded-2xl border-2 cursor-pointer transition-all
                        ${formData.vehicle_id === vehicle.id
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="text-4xl mb-3">{vehicle.icon}</div>
                      <h4 className="font-semibold text-slate-800 mb-2">{vehicle.name}</h4>
                      <div className="space-y-2 mb-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {vehicle.passengers} passagers
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {vehicle.luggage} bagages
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {vehicle.duration} min
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {vehicle.amenities.map(amenity => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xl font-bold text-subito">
                        {vehicle.price.toLocaleString()} FCFA
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options for outbound */}
              {formData.vehicle_id && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Options supplementaires {formData.is_round_trip && '(Aller)'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {options.map((option) => {
                      const isSelected = formData.outbound_options.includes(option.id);
                      return (
                        <div
                          key={option.id}
                          onClick={() => {
                            const current = formData.outbound_options;
                            handleChange(
                              'outbound_options',
                              isSelected
                                ? current.filter(id => id !== option.id)
                                : [...current, option.id]
                            );
                          }}
                          className={`
                            p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${isSelected
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <option.icon className="w-5 h-5 text-slate-600" />
                              <div>
                                <p className="font-medium text-slate-800">{option.label}</p>
                                <p className="text-sm text-subito">+{option.price.toLocaleString()} FCFA</p>
                              </div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-orange-600" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options for return if round trip */}
              {formData.vehicle_id && formData.is_round_trip && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Options supplementaires (Retour)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {options.map((option) => {
                      const isSelected = formData.return_options.includes(option.id);
                      return (
                        <div
                          key={option.id}
                          onClick={() => {
                            const current = formData.return_options;
                            handleChange(
                              'return_options',
                              isSelected
                                ? current.filter(id => id !== option.id)
                                : [...current, option.id]
                            );
                          }}
                          className={`
                            p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${isSelected
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <option.icon className="w-5 h-5 text-slate-600" />
                              <div>
                                <p className="font-medium text-slate-800">{option.label}</p>
                                <p className="text-sm text-subito">+{option.price.toLocaleString()} FCFA</p>
                              </div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-orange-600" />}
                          </div>
                        </div>
                      );
                    })}
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
              <RadioGroup
                value={formData.payment_method}
                onValueChange={(v) => handleChange('payment_method', v as AirportPaymentMethod)}
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

              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Resume</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Trajet</span>
                    <span className="font-medium text-slate-800">{selectedTrajet?.villeDepart?.name} → {selectedTrajet?.villeArrivee?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Vehicule</span>
                    <span className="font-medium text-slate-800">{selectedVehicle?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Client</span>
                    <span className="font-medium text-slate-800">{formData.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-lg font-semibold text-slate-800">Total</span>
                    <span className="text-2xl font-bold text-orange-600">{calculateTotal().toLocaleString()} FCFA</span>
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
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recapitulatif de la reservation</h3>

              {/* Trip details */}
              <div className="p-6 rounded-xl bg-slate-50 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Trajet</p>
                  <p className="font-medium text-slate-800">{selectedTrajet?.villeDepart?.name} → {selectedTrajet?.villeArrivee?.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{formData.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Date & Heure aller</p>
                    <p className="font-medium text-slate-800">
                      {formData.departure_date && format(new Date(formData.departure_date), 'dd MMM yyyy', { locale: fr })}
                      {' a '}
                      {formData.departure_time}
                    </p>
                  </div>
                  {formData.is_round_trip && (
                    <div>
                      <p className="text-sm text-slate-500">Date & Heure retour</p>
                      <p className="font-medium text-slate-800">
                        {formData.return_date && format(new Date(formData.return_date), 'dd MMM yyyy', { locale: fr })}
                        {' a '}
                        {formData.return_time}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Passagers</p>
                    <p className="font-medium text-slate-800">{formData.passengers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Numero de vol</p>
                    <p className="font-medium text-slate-800">{formData.flight_number || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-semibold">
                    {formData.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{formData.clientName}</p>
                    <p className="text-sm text-slate-500">{formData.clientPhone}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle & Options */}
              {selectedVehicle && (
                <div className="p-6 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedVehicle.icon}</span>
                      <div>
                        <p className="font-medium text-slate-800">{selectedVehicle.name}</p>
                        <p className="text-sm text-slate-500">
                          {selectedVehicle.passengers} passagers - {selectedVehicle.luggage} bagages
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-800">
                      {selectedVehicle.price.toLocaleString()} FCFA
                      {formData.is_round_trip && ' x 2'}
                    </p>
                  </div>

                  {formData.outbound_options.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-sm text-slate-500 mb-2">Options aller</p>
                      {formData.outbound_options.map(optId => {
                        const opt = options.find(o => o.id === optId);
                        return opt && (
                          <div key={optId} className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600">{opt.label}</span>
                            <span className="text-slate-800">+{opt.price.toLocaleString()} FCFA</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {formData.is_round_trip && formData.return_options.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-sm text-slate-500 mb-2">Options retour</p>
                      {formData.return_options.map(optId => {
                        const opt = options.find(o => o.id === optId);
                        return opt && (
                          <div key={optId} className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600">{opt.label}</span>
                            <span className="text-slate-800">+{opt.price.toLocaleString()} FCFA</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Payment */}
              <div className="p-6 rounded-xl bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Mode de paiement</span>
                  <span className="font-medium text-slate-800">
                    {paymentMethods.find(m => m.id === formData.payment_method)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-orange-300">
                  <span className="text-slate-800 font-semibold">Total</span>
                  <span className="text-3xl font-bold text-subito">
                    {calculateTotal().toLocaleString()} FCFA
                  </span>
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
