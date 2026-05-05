'use client';

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, CreateVtcHourlyBookingDto, VtcPricingGrid, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption, toBookingPaymentMethod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BookingResponse } from "@/lib/api";

export interface HourlyVtcBookingWizardProps {
  mode?: 'create' | 'edit';
  bookingId?: number;
  initialData?: BookingResponse;
}

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
import { VehicleIllustration } from "@/components/ui/vehicle-illustration";
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

export default function HourlyVtcBookingWizard({
  mode = 'create',
  bookingId,
  initialData,
}: HourlyVtcBookingWizardProps = {}) {
  const isEdit = mode === 'edit';

  const bookingResponseToFormData = (b: BookingResponse): Partial<FormData> => {
    const get = (k: string) => (b as Record<string, unknown>)[k];
    const str = (k: string) => { const v = get(k); return typeof v === 'string' ? v : ''; };
    const num = (k: string) => { const v = get(k); return typeof v === 'number' ? v : null; };

    // Parse scheduledDatetime (ISO string) into pickupDate (Date) + pickupTime (HH:MM)
    let pickupDate: Date | null = null;
    let pickupTime = '';
    const scheduled = str('scheduledDatetime');
    if (scheduled) {
      const d = new Date(scheduled);
      if (!isNaN(d.getTime())) {
        pickupDate = d;
        pickupTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    }

    // Address: prefer pickupAddress, fall back to adressePriseEnCharge
    const pickupLocation = str('pickupAddress') || str('adressePriseEnCharge');

    return {
      country: (str('country') as FormData['country']) || 'senegal',
      vehicleType: (str('vehicleType') as FormData['vehicleType']) || '',
      package: (str('package') as FormData['package']) || '',
      pickupDate,
      pickupTime,
      pickupLocation,
      pickupLocationLat: num('adressePriseEnChargeLat'),
      pickupLocationLng: num('adressePriseEnChargeLng'),
      instructions: str('notes'),
      paymentMethod: (str('paidBy') === 'company' ? 'company_account' : (str('paidBy') === 'client' ? 'client' : '')) as FormData['paymentMethod'],
      employeeId: num('employeeId'),
      clientName: str('clientName'),
      clientEmail: str('clientEmail'),
      clientPhone: str('clientPhone'),
      clientAddress: str('clientAddress'),
    };
  };

  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingRef, setBookingRef] = useState<string>("");
  const packagesRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (isEdit && initialData) {
      const mapped = bookingResponseToFormData(initialData);
      setFormData(prev => ({ ...prev, ...mapped }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialData?.id]);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Fetch payment options from API
  const { data: paymentOptionsResponse } = useQuery({
    queryKey: ['payment-options'],
    queryFn: () => api.reference.getPaymentOptions(),
  });
  const paymentMethods: PaymentMethodConfig[] = [
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

  const updateBooking = useMutation({
    mutationFn: (data: Partial<CreateVtcHourlyBookingDto>) => {
      if (!bookingId) throw new Error('bookingId requis en mode edit');
      return api.bookings.vtcHourly.update(bookingId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-detail-page'] });
      queryClient.invalidateQueries({ queryKey: ['booking-edit'] });
      toast.success('Reservation mise a jour');
      if (bookingId) router.push(`/tracking/${bookingId}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la modification');
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

  // Quand l'utilisateur choisit un véhicule, on défile vers les forfaits pour bien lui montrer
  // qu'il faut maintenant choisir une durée.
  useEffect(() => {
    if (formData.vehicleType && packagesRef.current) {
      const t = window.setTimeout(() => {
        packagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => window.clearTimeout(t);
    }
  }, [formData.vehicleType]);

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
      companyCode: user?.companyCode || undefined,
      employeeId: formData.employeeId || undefined,
      customerId: formData.employeeId || undefined,
    };

    console.log('[VTC-HOURLY] Booking data:', JSON.stringify(bookingData, null, 2));
    if (isEdit) {
      updateBooking.mutate(bookingData);
    } else {
      createBooking.mutate(bookingData);
    }
  };

  if (bookingSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-6xl mx-auto space-y-10"
      >
        {/* Hero */}
        <section className="flex flex-col items-center text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-[#E04A1F] rounded-full flex items-center justify-center mb-6 shadow-xl shadow-[#E04A1F]/30"
          >
            <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Reservation confirmee !
          </h1>
          <p className="text-slate-500 font-medium text-base md:text-lg">
            Votre chauffeur est reserve. Preparez-vous pour un trajet d&apos;exception.
          </p>
          <div className="mt-4 px-4 py-2 bg-slate-200 rounded-full">
            <span className="text-sm font-bold text-slate-700 tracking-wider">REF: {bookingRef}</span>
          </div>
        </section>

        {/* Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
              <Info className="w-5 h-5 text-[#E04A1F]" />
              Details du service
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Type de service</span>
                <p className="text-lg font-semibold text-slate-900">VTC a l&apos;heure</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duree</span>
                <p className="text-lg font-semibold text-slate-900">
                  {packages.find(p => p.id === formData.package)?.label || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicule</span>
                <p className="text-lg font-semibold text-slate-900 capitalize">
                  {vehicleTypes.find(v => v.id === formData.vehicleType)?.name || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Statut</span>
                <div className="inline-flex items-center px-3 py-1 bg-[#ffdbd0] rounded-full">
                  <span className="text-xs font-bold text-orange-700">Confirme</span>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#E04A1F] shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Date</p>
                  <p className="font-semibold text-slate-900">
                    {formData.pickupDate && format(formData.pickupDate, 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#E04A1F] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Heure</p>
                  <p className="font-semibold text-slate-900">{formData.pickupTime}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#E04A1F]" />
            <h2 className="text-xl font-bold mb-6 text-slate-900">Recapitulatif financier</h2>
            <div className="py-6 border-t-2 border-dashed border-slate-100 mt-4">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total paye</span>
                  <p className="text-3xl font-extrabold text-[#E04A1F]">{totalPrice.toLocaleString()} FCFA</p>
                </div>
                <CreditCard className="w-10 h-10 text-teal-500" />
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => router.push("/tracking")}
                className="bg-[#E04A1F] text-white py-6 rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-all gap-2 border-0"
              >
                Voir dans le suivi
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="bg-slate-100 text-slate-900 py-6 rounded-xl font-bold border-0 hover:bg-slate-200 transition-all gap-2"
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50">
            <Check className="w-5 h-5 text-[#E04A1F] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-900">Assurance incluse</h4>
              <p className="text-xs text-slate-500 mt-1">Tous vos trajets sont couverts par notre assurance premium partenaire.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50">
            <Users className="w-5 h-5 text-[#E04A1F] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-900">Support 24/7</h4>
              <p className="text-xs text-slate-500 mt-1">Une assistance dediee pour vos besoins professionnels a tout moment.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50">
            <Info className="w-5 h-5 text-[#E04A1F] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-900">Gestion simplifiee</h4>
              <p className="text-xs text-slate-500 mt-1">Retrouvez toutes vos factures dans votre espace client Business.</p>
            </div>
          </div>
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
              <span className="text-[#E04A1F]">{isEdit ? "Modifier" : "VTC a l'heure"}</span>
            </nav>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {isEdit ? 'Modifier la reservation' : 'Reservation VTC'}
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {steps[currentStep - 1]?.title} — etape {currentStep} sur {steps.length}
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

      {/* Content (full width — chaque etape gere sa propre grille interne) */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10 mb-6">
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
              {/* Vehicle bento grid — replié en carte compacte une fois la sélection faite */}
              {formData.vehicleType && selectedVehicle ? (
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#ffdbd0]/40 border border-orange-200">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                      <VehicleIllustration variant={selectedVehicle.id} className="w-full h-auto max-h-12" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F]">Vehicule choisi</p>
                      <p className="text-base font-extrabold text-slate-900 truncate">{selectedVehicle.name}</p>
                      <p className="text-xs text-slate-500 truncate">Jusqu&apos;a {selectedVehicle.capacity} passagers</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('vehicleType', '');
                      handleChange('package', '');
                    }}
                    className="px-4 py-2 rounded-xl bg-white text-slate-700 text-sm font-bold border border-slate-200 hover:border-orange-300 hover:text-[#E04A1F] transition shrink-0"
                  >
                    Changer
                  </button>
                </div>
              ) : (
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Selectionnez votre vehicule</h3>
                  <p className="text-sm text-slate-500 mt-1">Choisissez la categorie adaptee a votre trajet et au nombre de passagers.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {vehicleTypes.map(vehicle => {
                    const isSelected = formData.vehicleType === vehicle.id;
                    const isFeatured = vehicle.id === 'berline_premium';
                    const isPopular = vehicle.id === 'berline';
                    const colSpan = isFeatured ? 'md:col-span-8' : 'md:col-span-4';
                    return (
                      <motion.div
                        key={vehicle.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChange('vehicleType', vehicle.id)}
                        className={`
                          ${colSpan} group relative rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden
                          ${isSelected
                            ? 'bg-[#ffdbd0]/40 ring-2 ring-orange-500 shadow-xl shadow-orange-500/10'
                            : 'bg-white shadow-sm hover:shadow-xl ring-1 ring-slate-100'
                          }
                        `}
                      >
                        {isFeatured ? (
                          <div className="flex flex-col md:flex-row h-full">
                            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                              {isSelected && (
                                <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center shadow-lg">
                                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                </div>
                              )}
                              <div className="absolute top-4 right-4 z-10">
                                {!isSelected && (
                                  <div className="bg-teal-100 text-teal-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    Premium
                                  </div>
                                )}
                              </div>
                              <h4 className="text-2xl font-extrabold text-slate-900 mb-2">{vehicle.name}</h4>
                              <p className="text-sm text-slate-500 leading-relaxed mb-6">{vehicle.description}</p>
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                  <Users className="w-4 h-4 text-[#E04A1F]" />
                                  <span className="text-sm">{vehicle.capacity} passagers</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#ffdbd0] text-[#E04A1F]">VIP</span>
                                </div>
                              </div>
                            </div>
                            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-100 to-orange-200 relative items-center justify-center p-6">
                              <VehicleIllustration variant={vehicle.id} className="w-full max-w-[260px] h-auto drop-shadow-md" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col p-6 h-full">
                            <div className="flex justify-end items-start mb-2 min-h-[24px]">
                              {isPopular && !isSelected && (
                                <span className="bg-[#ffdbd0] text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                  Populaire
                                </span>
                              )}
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <div className="bg-slate-50 rounded-2xl h-32 flex items-center justify-center mb-4 overflow-hidden">
                              <VehicleIllustration variant={vehicle.id} className="w-full max-w-[180px] h-auto group-hover:scale-105 transition-transform" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">{vehicle.name}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-grow">{vehicle.description}</p>
                            <div className="flex items-center gap-4 py-4 border-t border-slate-100 mt-auto">
                              <div className="flex items-center gap-1.5 text-slate-600 font-medium text-sm">
                                <Users className="w-4 h-4" />
                                <span>{vehicle.capacity} Max</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Package cards */}
              {formData.vehicleType && (
                <motion.div
                  ref={packagesRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 scroll-mt-24"
                >
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Choisissez votre forfait</h3>
                    <p className="text-sm text-slate-500 mt-1">Selectionnez la duree de mise a disposition.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {packages.map((pkg, idx) => {
                      const isSelected = formData.package === pkg.id;
                      const isRecommended = idx === 1;
                      const price = selectedVehicle?.prices[pkg.id] || 0;
                      const iconComp = idx === 0 ? Clock : idx === 1 ? CalendarIcon : Info;
                      const Icon = iconComp;
                      return (
                        <motion.div
                          key={pkg.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleChange('package', pkg.id)}
                          className={`
                            group relative flex flex-col p-8 rounded-3xl transition-all duration-300 cursor-pointer
                            ${isSelected
                              ? 'bg-white ring-2 ring-orange-600 shadow-xl shadow-orange-500/10'
                              : isRecommended
                              ? 'bg-white ring-2 ring-orange-300 shadow-xl'
                              : 'bg-white ring-1 ring-slate-100 hover:ring-orange-200 hover:shadow-xl'
                            }
                          `}
                        >
                          {isRecommended && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#E04A1F] text-white text-[10px] font-bold uppercase tracking-widest rounded-full whitespace-nowrap">
                              Recommande
                            </div>
                          )}
                          <div className="absolute top-4 right-4">
                            {isSelected ? (
                              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-orange-600 transition-colors" />
                            )}
                          </div>
                          <div className="mb-6">
                            <div className="w-14 h-14 text-3xl text-[#E04A1F] mb-4 p-3 bg-[#ffdbd0] rounded-2xl flex items-center justify-center">
                              <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{pkg.label}</h3>
                            <p className="text-slate-500 text-sm mt-1">{pkg.kmIncluded} km inclus</p>
                          </div>
                          <div className="mt-auto">
                            <div className="text-3xl font-black text-slate-900 mb-2">
                              {price.toLocaleString()} <span className="text-sm font-medium text-slate-400">FCFA</span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {idx === 0 && 'Ideal pour vos rendez-vous rapides en centre-ville.'}
                              {idx === 1 && 'Parfait pour une demi-journee de prospection intensive.'}
                              {idx === 2 && 'Concu pour une journee complete de delegation sans contraintes.'}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Depassements info card */}
                  <div className="p-6 md:p-8 bg-teal-50 rounded-3xl flex items-start gap-6 border border-teal-100">
                    <div className="bg-teal-500 p-3 rounded-2xl shadow-lg shadow-teal-500/30 shrink-0">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-teal-900 text-lg mb-2">Informations sur les depassements</h4>
                      <div className="space-y-3 text-teal-800/90 text-sm leading-relaxed">
                        <p>En cas de depassement du forfait choisi, les frais supplementaires s&apos;appliquent comme suit :</p>
                        <div className="flex flex-wrap gap-6">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <span><strong>Heure supplementaire :</strong> Variable</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-teal-600" />
                            <span><strong>Km supplementaire :</strong> 350 FCFA / km</span>
                          </div>
                        </div>
                        <p className="italic text-xs pt-2">Note : Le depassement est calcule a la fin de la mission et facture sur votre compte entreprise.</p>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left: Summary */}
              <aside className="lg:col-span-5 space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Details du trajet</h3>
                  <p className="text-sm text-slate-500 mt-1">Finalisez votre reservation en precisant les modalites de prise en charge.</p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-black/5 border border-slate-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Recapitulatif</span>
                    <span className="px-3 py-1 bg-[#ffdbd0] text-orange-700 text-xs font-bold rounded-full">En cours</span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden aspect-video group bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="absolute inset-0 flex items-center justify-center text-7xl">
                      <Car className="w-20 h-20 text-white/80" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                      <p className="text-white font-extrabold text-xl">{selectedVehicle?.name}</p>
                      <p className="text-white/80 text-sm font-medium">{selectedVehicle?.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Duree</p>
                      <p className="text-slate-900 font-bold text-lg">{selectedPackage?.label || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Passagers</p>
                      <p className="text-slate-900 font-bold text-lg">Jusqu&apos;a {selectedVehicle?.capacity || 0}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Tarif estime</p>
                      <p className="text-2xl font-black text-[#E04A1F]">{totalPrice.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-2">
                  <div className="h-1 flex-1 rounded-full bg-[#ffdbd0]/400" />
                  <div className="h-1 flex-1 rounded-full bg-[#ffdbd0]/400" />
                  <div className="h-1 flex-1 rounded-full bg-slate-200" />
                  <div className="h-1 flex-1 rounded-full bg-slate-200" />
                  <div className="h-1 flex-1 rounded-full bg-slate-200" />
                </div>
              </aside>

              {/* Right: Form */}
              <div className="lg:col-span-7">
                <div className="bg-slate-50 rounded-[2rem] p-6 md:p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date de prise en charge</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start bg-white hover:bg-white rounded-xl h-12 px-4 font-normal"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {formData.pickupDate ? format(formData.pickupDate, "dd/MM/yyyy", { locale: fr }) : <span className="text-slate-500">Selectionner une date</span>}
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

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure de prise en charge</Label>
                      <div className="bg-white rounded-xl px-4 h-12 flex items-center">
                        <TimePicker
                          value={formData.pickupTime}
                          onChange={(v) => handleChange('pickupTime', v)}
                          placeholder="Choisir une heure"
                          selectedDate={formData.pickupDate}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#E04A1F]" />
                      Lieu de prise en charge
                    </Label>
                    <div className="bg-white rounded-2xl p-1">
                      <AddressAutocomplete
                        value={formData.pickupLocation}
                        onChange={(val) => handleChange('pickupLocation', val)}
                        onSelect={(address, lat, lng) => {
                          setFormData(prev => ({ ...prev, pickupLocation: address, pickupLocationLat: lat, pickupLocationLng: lng }));
                        }}
                        placeholder="Entrez l'adresse de depart..."
                        iconColor="text-[#E04A1F]"
                        countryCode={countryNameToCode(formData.country)}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap pt-1">
                      {['Aeroport', 'Centre-ville', 'Zone industrielle'].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleChange('pickupLocation', chip)}
                          className="px-4 py-2 bg-slate-200 text-xs font-bold rounded-full text-slate-600 hover:bg-[#ffdbd0] hover:text-orange-700 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Map placeholder */}
                  <div className="rounded-2xl overflow-hidden h-48 relative bg-gradient-to-br from-slate-100 to-slate-200">
                    <div className="absolute inset-0 opacity-40" style={{
                      backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(172,53,9,0.1), transparent 50%), radial-gradient(circle at 70% 60%, rgba(0,105,114,0.1), transparent 50%)'
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#E04A1F] shadow-xl flex items-center justify-center animate-pulse">
                        <MapPin className="w-6 h-6 text-white" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-600" />
                      <span className="text-xs font-bold text-slate-800">{formData.country}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#E04A1F]" />
                      Instructions (optionnel)
                    </Label>
                    <Textarea
                      value={formData.instructions}
                      onChange={(e) => handleChange('instructions', e.target.value)}
                      className="bg-white border-0 rounded-2xl p-4 text-slate-900 min-h-[100px] font-medium"
                      placeholder="Numero de vol, code porte, preferences particulieres..."
                    />
                  </div>
                </div>
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
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Informations client</h3>
                <p className="text-sm text-slate-500 mt-1">Renseignez les details du voyageur pour cette reservation.</p>
              </div>

              {/* Employee selector with search */}
              <div className="space-y-3">
                <Label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Voyageur (employe) *</Label>
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
                <div className="space-y-3">
                  <Label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Nom complet</Label>
                  <div className="relative group">
                    <Input
                      placeholder="Ex: Moussa Diop"
                      className="w-full bg-slate-50 border-0 rounded-2xl py-6 px-6 pr-12 text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20"
                      value={formData.clientName}
                      onChange={(e) => handleChange('clientName', e.target.value)}
                    />
                    <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#E04A1F] transition-colors" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Telephone</Label>
                  <div className="bg-slate-50 rounded-2xl p-1">
                    <PhoneInput
                      value={formData.clientPhone}
                      onChange={(v) => handleChange('clientPhone', v)}
                      error={!!phoneError}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-sm text-red-500">Numero invalide</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Email professionnel</Label>
                <div className="relative group">
                  <Input
                    type="email"
                    placeholder="Ex: moussa.diop@enterprise.sn"
                    className="w-full bg-slate-50 border-0 rounded-2xl py-6 px-6 pr-12 text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20"
                    value={formData.clientEmail}
                    onChange={(e) => handleChange('clientEmail', e.target.value)}
                  />
                  <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#E04A1F] transition-colors" />
                </div>
              </div>

              {/* Info tiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="p-6 rounded-[2rem] bg-slate-100 flex flex-col justify-between h-36">
                  <Check className="w-6 h-6 text-slate-600" strokeWidth={2.5} />
                  <p className="text-sm font-semibold text-slate-700">Vos donnees sont securisees et cryptees.</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-teal-50 flex flex-col justify-between h-36">
                  <Info className="w-6 h-6 text-teal-600" />
                  <p className="text-sm font-semibold text-teal-800">Confirmation instantanee apres paiement.</p>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left: Payment selection */}
              <div className="lg:col-span-7 space-y-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Paiement &amp; confirmation</h3>
                  <p className="text-sm text-slate-500 mt-1">Verification finale de votre trajet professionnel.</p>
                </div>

                <section className="bg-slate-50 rounded-[2rem] p-8 space-y-6">
                  <h4 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    <CreditCard className="w-5 h-5 text-[#E04A1F]" />
                    Mode de paiement
                  </h4>
                  {isEdit ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Mode de paiement</p>
                      <p className="font-semibold text-slate-800">
                        {paymentMethods.find(m => m.id === formData.paymentMethod)?.label || 'Non defini'}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Le mode de paiement n&apos;est pas modifiable apres la creation de la reservation.
                      </p>
                    </div>
                  ) : (
                    <RadioGroup
                      value={formData.paymentMethod}
                      onValueChange={(v) => handleChange('paymentMethod', v as VtcPaymentMethod)}
                      className="flex flex-col md:flex-row gap-4"
                    >
                      {paymentMethods.map(method => {
                        const isSelected = formData.paymentMethod === method.id;
                        return (
                          <label key={method.id} className="flex-1 cursor-pointer">
                            <RadioGroupItem value={method.id} className="hidden" />
                            <div className={`
                              p-6 rounded-2xl bg-white border-2 transition-all
                              ${isSelected ? 'border-orange-600 bg-[#ffdbd0]/30 shadow-lg shadow-orange-500/5' : 'border-transparent hover:border-slate-200'}
                            `}>
                              <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  isSelected ? 'bg-[#ffdbd0] text-[#E04A1F]' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {method.id === 'company_account' ? (
                                    <Users className="w-6 h-6" />
                                  ) : (
                                    <User className="w-6 h-6" />
                                  )}
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-orange-600 bg-orange-600' : 'border-slate-300'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </div>
                              <p className="font-bold text-lg text-slate-900">{method.label}</p>
                              <p className="text-sm text-slate-500 mt-1">
                                {method.id === 'company_account' ? 'Facturation centralisee' : 'Paiement direct par l\'employe'}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}
                </section>
              </div>

              {/* Right: Final summary */}
              <aside className="lg:col-span-5">
                <div className="sticky top-6 bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-black/5 border border-slate-100">
                  <div className="h-32 relative bg-[#E04A1F]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                      <span className="bg-white px-3 py-1 rounded-full text-[#E04A1F] text-[10px] font-bold uppercase tracking-widest mb-2 inline-block w-fit">
                        Recap de la course
                      </span>
                      <h3 className="text-white text-2xl font-extrabold">{selectedVehicle?.name}</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Type</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-teal-600" />
                          <span className="text-sm font-bold">{selectedPackage?.label || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Client</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-5 h-5 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[10px] font-bold text-orange-700">
                            {formData.clientName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-bold truncate">{formData.clientName || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-500">Prix forfait</span>
                        <span className="text-sm font-semibold text-slate-900">{totalPrice.toLocaleString()} FCFA</span>
                      </div>
                      <div className="h-px bg-slate-200 my-3" />
                      <div className="flex justify-between items-end">
                        <span className="text-lg font-black">Total</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-[#E04A1F]">{totalPrice.toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-center text-xs text-slate-500 leading-relaxed">
                      En confirmant, vous acceptez les conditions generales de vente et la politique de confidentialite de Subito.
                    </p>
                  </div>
                </div>
              </aside>
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
                  <div className="w-10 h-10 rounded-xl bg-[#E04A1F] flex items-center justify-center text-white font-semibold">
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
              <div className="p-6 rounded-xl bg-[#ffdbd0]/40 border-2 border-orange-200">
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
      <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 md:p-6 rounded-2xl">
        {currentStep > 1 ? (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 text-slate-600 font-bold px-6 py-3 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="gap-2 text-slate-600 font-bold px-6 py-3 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Annuler
          </Button>
        )}

        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canContinue()}
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            Continuer
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isEdit ? updateBooking.isPending : createBooking.isPending}
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold text-base shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            {isEdit
              ? (updateBooking.isPending ? 'Enregistrement...' : 'Enregistrer les modifications')
              : (createBooking.isPending ? 'Confirmation...' : `Confirmer - ${totalPrice.toLocaleString()} FCFA`)}
          </Button>
        )}
      </div>
    </div>
  );
}
