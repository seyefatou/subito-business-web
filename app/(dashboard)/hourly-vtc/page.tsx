'use client';

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, CreateVtcHourlyBookingDto, VtcPricingGrid, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption, toBookingPaymentMethod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
type VtcVehicleType = 'berline' | 'berline_premium' | 'suv' | 'monospace' | 'van';
type VtcPackageType = 'two_hours' | 'five_hours' | 'ten_hours';
type VtcCountry = 'senegal' | 'cotedivoire' | 'mali';
type VtcPaymentMethod = string;
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Clock,
  Car,
  MapPin,
  CreditCard,
  Check,
  CheckCircle2,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Info,
  ArrowLeft,
  User,
  Mail,
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
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhoneInput } from "@/components/ui/phone-input";
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

type VtcPricing = VtcPricingGrid;

interface VehicleTypeConfig {
  id: VtcVehicleType;
  name: string;
  description: string;
  capacity: number;
  prices: { [key: string]: number };
}

interface PackageConfig {
  id: VtcPackageType;
  label: string;
  hours: number;
  kmIncluded: number;
}

interface Country {
  code: VtcCountry;
  name: string;
  flag: string;
}

interface PaymentMethodConfig {
  id: string;
  label: string;
  desc?: string;
  icon?: string;
}

interface FormData {
  country: VtcCountry;
  vehicleType: VtcVehicleType | "";
  package: VtcPackageType | "";
  pickupDate: Date | null;
  pickupTime: string;
  pickupLocation: string;
  pickupLocationLat: number | null;
  pickupLocationLng: number | null;
  instructions: string;
  paymentMethod: VtcPaymentMethod | "";
  // Client info
  employeeId: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
}

const steps: Step[] = [
  { id: 1, title: "Vehicule", icon: Car },
  { id: 2, title: "Details", icon: MapPin },
  { id: 3, title: "Client", icon: User },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: CheckCircle2 },
];

const countries: Country[] = [
  { code: "senegal", name: "Senegal", flag: "🇸🇳" },
  { code: "cotedivoire", name: "Cote d'Ivoire", flag: "🇨🇮" },
];

const vehicleTypes: VehicleTypeConfig[] = [
  {
    id: "berline",
    name: "Berline",
    description: "Confortable pour 1-3 passagers",
    capacity: 3,
    prices: { "two_hours": 15000, "five_hours": 30000, "ten_hours": 55000 }
  },
  {
    id: "berline_premium",
    name: "Berline Premium",
    description: "Mercedes Classe E ou equivalent",
    capacity: 3,
    prices: { "two_hours": 18000, "five_hours": 35000, "ten_hours": 65000 }
  },
  {
    id: "suv",
    name: "SUV",
    description: "Spacieux, ideal pour 1-4 passagers",
    capacity: 4,
    prices: { "two_hours": 18000, "five_hours": 35000, "ten_hours": 65000 }
  },
  {
    id: "monospace",
    name: "Monospace",
    description: "Jusqu'a 6 passagers",
    capacity: 6,
    prices: { "two_hours": 18000, "five_hours": 35000, "ten_hours": 65000 }
  },
  {
    id: "van",
    name: "VAN",
    description: "Jusqu'a 8 passagers",
    capacity: 8,
    prices: { "two_hours": 16000, "five_hours": 70000, "ten_hours": 100000 }
  },
];

const packages: PackageConfig[] = [
  { id: "two_hours", label: "2 Heures", hours: 2, kmIncluded: 25 },
  { id: "five_hours", label: "5 Heures", hours: 5, kmIncluded: 50 },
  { id: "ten_hours", label: "10 Heures", hours: 10, kmIncluded: 100 },
];

// Payment methods fetched from API (see useQuery inside component)

export default function HourlyVTC() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingRef, setBookingRef] = useState<string>("");

  const [formData, setFormData] = useState<FormData>({
    country: "senegal",
    vehicleType: "",
    package: "",
    pickupDate: null,
    pickupTime: "",
    pickupLocation: "",
    pickupLocationLat: null,
    pickupLocationLng: null,
    instructions: "",
    paymentMethod: "",
    employeeId: null,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
  });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const apiMethods: PaymentMethodConfig[] = (Array.isArray(paymentOptionsResponse?.data) ? paymentOptionsResponse.data : [])
    .filter((o: PaymentOption) => (o.slug || o.type) !== 'wallet' && o.name?.toLowerCase() !== 'portefeuille')
    .map((o: PaymentOption) => ({ id: o.slug || o.type || o.name?.toLowerCase() || '', label: o.name, desc: o.description || '', icon: o.icon || '' }));
  const paymentMethods: PaymentMethodConfig[] = [
    ...apiMethods,
    { id: "company_account", label: "Compte entreprise", desc: "Facturation sur le compte", icon: "🏢" },
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

  // Fetch VTC pricing grid
  const { data: pricingResponse } = useQuery({
    queryKey: ['vtc-grid', formData.country],
    queryFn: () => api.reference.getVtcGrid(formData.country),
  });

  const pricing: VtcPricingGrid | undefined = pricingResponse?.data;

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: (data: CreateVtcHourlyBookingDto) => api.bookings.createVtcHourly(data),
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

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedVehicle = vehicleTypes.find(v => v.id === formData.vehicleType);
  const selectedPackage = packages.find(p => p.id === formData.package);

  // Get price from API pricing or fallback to local config
  const getPrice = (): number => {
    if (pricing && pricing.vehicleTypes && formData.vehicleType && formData.package) {
      const apiVehicle = pricing.vehicleTypes.find(v => v.id === formData.vehicleType);
      if (apiVehicle && formData.package in apiVehicle.prices) {
        return apiVehicle.prices[formData.package as keyof typeof apiVehicle.prices];
      }
    }
    // Fallback to local prices
    return selectedVehicle && selectedPackage && formData.package ? selectedVehicle.prices[formData.package] : 0;
  };

  const totalPrice = getPrice();

  // Validate and format phone number
  const cleanPhone = (phone: string): string => phone.replace(/[\s\-\.\(\)]/g, '');
  const isValidPhone = (phone: string): boolean => /^\+?\d{7,15}$/.test(cleanPhone(phone));
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

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.vehicleType && formData.package);
      case 2:
        return !!(formData.pickupDate && formData.pickupTime && formData.pickupLocation);
      case 3:
        return !!(formData.employeeId && formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone));
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.vehicleType) {
        toast.error("Veuillez selectionner un type de vehicule");
        return;
      }
      if (!formData.package) {
        toast.error("Veuillez selectionner un forfait");
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.pickupDate) {
        toast.error("Veuillez selectionner une date");
        return;
      }
      if (!formData.pickupTime) {
        toast.error("Veuillez selectionner une heure");
        return;
      }
      if (!formData.pickupLocation) {
        toast.error("Veuillez entrer l'adresse de prise en charge");
        return;
      }
    }

    if (currentStep === 3) {
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
        toast.error("Numero de telephone invalide (ex: +221 77 123 45 67)");
        return;
      }
    }

    if (currentStep === 4) {
      // Payment method is optional
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!formData.vehicleType || !formData.package || !formData.pickupDate) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    const isCompanyPayment = formData.paymentMethod === 'company_account';

    const bookingData: CreateVtcHourlyBookingDto = {
      clientName: formData.clientName,
      clientEmail: formData.clientEmail || undefined,
      clientPhone: formatPhoneForApi(formData.clientPhone),
      clientAddress: formData.clientAddress,
      country: formData.country,
      vehicleType: formData.vehicleType,
      package: formData.package,
      scheduledDatetime: `${format(formData.pickupDate, 'yyyy-MM-dd')}T${formData.pickupTime}:00`,
      pickupAddress: formData.pickupLocation,
      adressePriseEnCharge: formData.pickupLocation,
      adressePriseEnChargeLat: formData.pickupLocationLat || undefined,
      adressePriseEnChargeLng: formData.pickupLocationLng || undefined,
      notes: formData.instructions || undefined,
      paidBy: isCompanyPayment ? 'company' : 'client',
      paymentMethod: isCompanyPayment || !formData.paymentMethod ? undefined : toBookingPaymentMethod(formData.paymentMethod),
      companyCode: user?.companyCode || undefined,
      employeeId: formData.employeeId || undefined,
      customerId: formData.employeeId || undefined,
    };

    console.log('[VTC-HOURLY] Booking data:', JSON.stringify(bookingData, null, 2));
    createBooking.mutate(bookingData);
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
        <p className="text-slate-500 mb-2">
          Votre reference : <span className="font-bold text-slate-800">{bookingRef}</span>
        </p>
        <p className="text-slate-500 mb-2">
          VTC reserve pour {formData.clientName}
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Un chauffeur vous sera assigne sous peu et vous contactera
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
            onClick={() => router.push("/")}
          >
            Retour a l&apos;accueil
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
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">VTC a l&apos;Heure</h1>
          <p className="text-slate-500">Reservez un vehicule avec chauffeur pour vos deplacements</p>
        </div>
      </div>

      {/* Country Selector */}
      <div className="mb-6">
        <RadioGroup
          value={formData.country}
          onValueChange={(v) => handleChange('country', v as VtcCountry)}
          className="flex gap-3"
        >
          {countries.map(country => (
            <label
              key={country.code}
              className={`
                flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                ${formData.country === country.code
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <RadioGroupItem value={country.code} className="hidden" />
              <span className="text-2xl">{country.flag}</span>
              <span className="font-medium text-slate-800">{country.name}</span>
              {formData.country === country.code && (
                <Check className="w-5 h-5 text-orange-600 ml-auto" />
              )}
            </label>
          ))}
        </RadioGroup>
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
          {/* Step 1: Vehicle & Package */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Choisissez votre vehicule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicleTypes.map(vehicle => {
                    const isSelected = formData.vehicleType === vehicle.id;
                    return (
                      <motion.div
                        key={vehicle.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChange('vehicleType', vehicle.id)}
                        className={`
                          relative p-4 rounded-2xl border-2 cursor-pointer transition-all
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

                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                          <Car className="w-6 h-6 text-slate-400" />
                        </div>
                        <h4 className="font-semibold text-slate-800 mb-1">{vehicle.name}</h4>
                        <p className="text-xs text-slate-500 mb-2">{vehicle.description}</p>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Users className="w-3 h-3" />
                          <span className="text-xs">{vehicle.capacity} places</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {formData.vehicleType && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="font-semibold text-slate-800 mb-4">Choisissez votre forfait</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {packages.map(pkg => {
                      const isSelected = formData.package === pkg.id;
                      const price = selectedVehicle?.prices[pkg.id] || 0;
                      return (
                        <motion.div
                          key={pkg.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleChange('package', pkg.id)}
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

                          <div className="text-center">
                            <p className="text-2xl font-bold text-slate-800 mb-1">{pkg.label}</p>
                            <p className="text-sm text-slate-500 mb-3">{pkg.kmIncluded} km inclus</p>
                            <p className="text-xl font-bold text-orange-600">{price.toLocaleString()} FCFA</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Depassements :</p>
                        <p>- Kilometres supplementaires : +350 FCFA/km</p>
                        <p>- Heures supplementaires : Variable selon le vehicule</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 2: Date, Time & Location */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{selectedVehicle?.name} - {selectedPackage?.label}</p>
                    <p className="text-sm text-slate-600">{selectedPackage?.kmIncluded} km inclus</p>
                  </div>
                  <p className="text-lg font-bold text-orange-600">{totalPrice.toLocaleString()} F</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <Label className="text-xs text-slate-500 mb-2 block">Date de prise en charge</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start border-0 bg-transparent p-0 h-auto font-normal hover:bg-transparent"
                      >
                        <CalendarIcon className="w-4 h-4 mr-2 text-orange-600" />
                        {formData.pickupDate ? format(formData.pickupDate, "dd/MM/yyyy", { locale: fr }) : "Selectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.pickupDate || undefined}
                        onSelect={(date) => handleChange('pickupDate', date || null)}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4">
                  <Label className="text-xs text-slate-500 mb-2 block">Heure de prise en charge</Label>
                  <TimePicker
                    value={formData.pickupTime}
                    onChange={(v) => handleChange('pickupTime', v)}
                    placeholder="Choisir une heure"
                    selectedDate={formData.pickupDate}
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <Label className="text-xs text-slate-500 mb-2 block">Lieu de prise en charge</Label>
                <AddressAutocomplete
                  value={formData.pickupLocation}
                  onChange={(val) => handleChange('pickupLocation', val)}
                  onSelect={(address, lat, lng) => {
                    setFormData(prev => ({ ...prev, pickupLocation: address, pickupLocationLat: lat, pickupLocationLng: lng }));
                  }}
                  placeholder="Adresse complete"
                  iconColor="text-orange-600"
                  countryCode={countryNameToCode(formData.country)}
                />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <Label className="text-xs text-slate-500 mb-2 block">Instructions (optionnel)</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => handleChange('instructions', e.target.value)}
                  className="border-0 bg-transparent p-0 text-slate-800 min-h-[80px]"
                  placeholder="Ex: Plusieurs arrets prevus, passage a l'aeroport..."
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Client Info */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800">Informations client</h3>

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
                    <p className="text-sm text-red-500">Numero invalide</p>
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
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Resume</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Vehicule</span>
                    <span className="font-medium text-slate-800">{selectedVehicle?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Forfait</span>
                    <span className="font-medium text-slate-800">{selectedPackage?.label} ({selectedPackage?.kmIncluded} km)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Client</span>
                    <span className="font-medium text-slate-800">{formData.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-lg font-semibold text-slate-800">Total</span>
                    <span className="text-2xl font-bold text-orange-600">{totalPrice.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Mode de paiement</h3>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={(v) => handleChange('paymentMethod', v as VtcPaymentMethod)}
                  className="grid grid-cols-2 gap-3"
                >
                  {paymentMethods.map(method => (
                    <label
                      key={method.id}
                      className={`
                        block p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${formData.paymentMethod === method.id
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={method.id} />
                        <span className="font-medium text-slate-800">{method.label}</span>
                        {formData.paymentMethod === method.id && (
                          <Check className="w-5 h-5 text-orange-600 ml-auto" />
                        )}
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recapitulatif de la reservation</h3>

              {/* Vehicle & Package */}
              <div className="p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Car className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{selectedVehicle?.name}</p>
                    <p className="text-sm text-slate-500">{selectedVehicle?.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Forfait {selectedPackage?.label}</span>
                  <span className="font-semibold text-slate-800">{selectedPackage?.kmIncluded} km inclus</span>
                </div>
              </div>

              {/* Trip details */}
              <div className="p-6 rounded-xl bg-slate-50 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Date</p>
                    <p className="font-medium text-slate-800">
                      {formData.pickupDate && format(formData.pickupDate, 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Heure</p>
                    <p className="font-medium text-slate-800">{formData.pickupTime}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Lieu de prise en charge</p>
                  <p className="font-medium text-slate-800">{formData.pickupLocation}</p>
                </div>
                {formData.instructions && (
                  <div>
                    <p className="text-sm text-slate-500">Instructions</p>
                    <p className="font-medium text-slate-800">{formData.instructions}</p>
                  </div>
                )}
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
                    {formData.clientEmail && (
                      <p className="text-sm text-slate-400">{formData.clientEmail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment total */}
              <div className="p-6 rounded-xl bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Mode de paiement</span>
                  <span className="font-medium text-slate-800">
                    {paymentMethods.find(m => m.id === formData.paymentMethod)?.label}
                  </span>
                </div>
                {user?.isTva ? (
                  <>
                    <div className="flex items-center justify-between pt-4 border-t border-orange-300">
                      <span className="text-slate-600">Total HT</span>
                      <span className="text-lg font-semibold text-slate-800">{totalPrice.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">TVA (18%)</span>
                      <span className="font-medium text-slate-800">{Math.round(totalPrice * 0.18).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-orange-300">
                      <span className="text-slate-800 font-semibold">Total TTC</span>
                      <span className="text-3xl font-bold text-subito">{Math.round(totalPrice * 1.18).toLocaleString()} FCFA</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between pt-4 border-t border-orange-300">
                    <span className="text-slate-800 font-semibold">Total</span>
                    <span className="text-3xl font-bold text-subito">{totalPrice.toLocaleString()} FCFA</span>
                  </div>
                )}
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

        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canContinue()}
            className="gradient-subito text-white border-0 gap-2"
          >
            Continuer
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createBooking.isPending}
            className="gradient-subito text-white border-0 gap-2 text-lg px-8"
          >
            {createBooking.isPending ? 'Confirmation...' : `Confirmer - ${totalPrice.toLocaleString()} FCFA`}
          </Button>
        )}
      </div>
    </div>
  );
}
