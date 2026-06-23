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
  X,
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
import { api, TrajetAeroport, Ville, CreateAirportShuttleBookingDto, EmployeeResponse, CreateEmployeeDto, DepartmentResponse, PaymentOption, toBookingPaymentMethod, NavetteCICategory, NavetteCIQuoteResponse, NavetteCIQuoteOption, CreateNavetteCIBookingDto, NavetteCIOption, NavetteCIOptionAdresse } from "@/lib/api";
import type { BookingResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractBookingSub } from "@/lib/bookingResponse";

export interface AirportShuttleBookingWizardProps {
  mode?: 'create' | 'edit';
  bookingId?: number;
  initialData?: BookingResponse;
}

interface StepDef {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

type PaymentChoice = string;

interface AdresseSupplementItem {
  adresse: string;
  lat: number | null;
  lng: number | null;
}

interface CIAdresseItem {
  adresse: string;
  lat: number | null;
  lng: number | null;
  instructions: string;
  contactNom: string;
  contactTelephone: string;
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
  adressesSupplementAller: AdresseSupplementItem[];
  siegeBebesRetour: number;
  animalDeCompagnieRetour: boolean;
  adressesSupplementRetour: AdresseSupplementItem[];
  specialRequests: string;
  employeeId: number | null;
  vehiculeId: number | null;
  terminalDepartId: number | null;
  terminalRetourId: number | null;
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
  adressesSupplementAller: [],
  siegeBebesRetour: 0,
  animalDeCompagnieRetour: false,
  adressesSupplementRetour: [],
  specialRequests: "",
  employeeId: null,
  vehiculeId: null,
  terminalDepartId: null,
  terminalRetourId: null,
};

const steps: StepDef[] = [
  { id: 1, title: "Client", icon: User },
  { id: 2, title: "Trajet", icon: MapPin },
  { id: 3, title: "Vehicule", icon: Car },
  { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

// Payment methods fetched from API (see useQuery inside component)

export default function AirportShuttleBookingWizard({
  mode = 'create',
  bookingId,
  initialData,
}: AirportShuttleBookingWizardProps = {}) {
  const isEdit = mode === 'edit';

  const bookingResponseToFormData = (b: BookingResponse): Partial<FormData> => {
    const top = b as Record<string, unknown>;
    const nested = extractBookingSub(top);
    // Prefer nested type-specific value, fall back to top-level (client info lives at top, type-specific in nested)
    const pick = (key: string): unknown => {
      const fromNested = nested[key];
      if (fromNested !== null && fromNested !== undefined && fromNested !== '') return fromNested;
      return top[key];
    };
    const str = (k: string) => { const v = pick(k); return typeof v === 'string' ? v : ''; };
    const num = (k: string) => { const v = pick(k); return typeof v === 'number' ? v : null; };
    const bool = (k: string) => { const v = pick(k); return typeof v === 'boolean' ? v : false; };
    const numOr = (k: string, fallback: number) => { const v = pick(k); return typeof v === 'number' ? v : fallback; };

    // Date helpers — backend returns ISO timestamps; the wizard stores YYYY-MM-DD + HH:MM separately.
    const isoToDate = (iso: string): string => {
      if (!iso) return '';
      // If the string already looks like YYYY-MM-DD (no T), keep first 10 chars.
      if (!iso.includes('T')) return iso.slice(0, 10);
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Date Aller: use top-level pickupDate first (cleaner), fall back to nested pickupDateAller.
    const rawDateAller = (typeof top.pickupDate === 'string' ? top.pickupDate : '')
      || (typeof nested.pickupDateAller === 'string' ? nested.pickupDateAller : '');
    const departure_date = isoToDate(rawDateAller);
    // Time Aller: top-level pickupTime is "HH:MM"; nested pickupTimeAller often empty.
    const departure_time = (typeof top.pickupTime === 'string' && top.pickupTime)
      || (typeof nested.pickupTimeAller === 'string' ? nested.pickupTimeAller : '')
      || '';
    const return_date = isoToDate(typeof nested.pickupDateRetour === 'string' ? nested.pickupDateRetour : '');
    const return_time = typeof nested.pickupTimeRetour === 'string' ? nested.pickupTimeRetour : '';

    // Direction: derive from the trajet's villeDepart.isAeroport.
    // If the API's villeDepart is an airport, then user's direction was "from_airport" (airport → city).
    // Otherwise it was "to_airport" (city → airport, the API stores it inverted relative to user view).
    const trajet = nested.trajetAeroport as Record<string, unknown> | undefined;
    const villeDepart = trajet?.villeDepart as Record<string, unknown> | undefined;
    const direction: 'to_airport' | 'from_airport' = villeDepart?.isAeroport === true ? 'from_airport' : 'to_airport';
    const vehiculeId = (typeof trajet?.vehiculeId === 'number' ? trajet.vehiculeId : null);

    const paidByValue = typeof top.paidBy === 'string' ? top.paidBy : '';
    const payment_method: PaymentChoice | '' =
      paidByValue === 'company' ? 'company_account' : (paidByValue === 'client' ? 'client' : '');

    return {
      direction,
      trajetAeroportId: num('trajetAeroportId'),
      is_round_trip: !bool('isOneWay'),
      departure_date,
      departure_time,
      return_date,
      return_time,
      passengers: numOr('passengers', 1),
      flight_number: str('flightNumber'),
      address: str('adressePriseEnChargeAller'),
      addressLat: num('adressePriseEnChargeAllerLat'),
      addressLng: num('adressePriseEnChargeAllerLng'),
      return_address: str('adressePriseEnChargeRetour'),
      returnAddressLat: num('adressePriseEnChargeRetourLat'),
      returnAddressLng: num('adressePriseEnChargeRetourLng'),
      payment_method,
      clientName: typeof top.clientName === 'string' ? top.clientName : '',
      clientEmail: typeof top.clientEmail === 'string' ? top.clientEmail : '',
      clientPhone: typeof top.clientPhone === 'string' ? top.clientPhone : '',
      clientAddress: typeof top.clientAddress === 'string' ? top.clientAddress : '',
      siegeBebes: numOr('siegeBebes', 0),
      animalDeCompagnie: bool('animalDeCompagnie'),
      adressesSupplementAller: [],
      siegeBebesRetour: numOr('siegeBebesRetour', 0),
      animalDeCompagnieRetour: bool('animalDeCompagnieRetour'),
      adressesSupplementRetour: [],
      specialRequests: str('specialRequests'),
      employeeId: typeof top.employeeId === 'number' ? top.employeeId : null,
      vehiculeId,
    };
  };

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

  const isCIBooking = selectedPays.toLowerCase().includes('ivoire') || selectedPays.toLowerCase() === 'cote_ivoire';

  // CI-specific state
  const [ciSens, setCiSens] = useState<'airport_to_city' | 'city_to_airport'>('airport_to_city');
  const [ciBagages23, setCiBagages23] = useState(0);
  const [ciBagages10, setCiBagages10] = useState(0);
  const [ciCategoryCode, setCiCategoryCode] = useState('');
  const [ciCategoryPrice, setCiCategoryPrice] = useState(0);
  const [ciDistanceKm, setCiDistanceKm] = useState(0);
  // optionId → quantité (pour les options SIMPLE)
  const [ciSimpleOptions, setCiSimpleOptions] = useState<Record<number, number>>({});
  // optionId → liste d'adresses (pour les options ADDRESS)
  const [ciAddressOptions, setCiAddressOptions] = useState<Record<number, CIAdresseItem[]>>({});
  // Options supplémentaires du RETOUR - indépendantes de l'aller
  const [ciReturnSimpleOptions, setCiReturnSimpleOptions] = useState<Record<number, number>>({});
  const [ciReturnAddressOptions, setCiReturnAddressOptions] = useState<Record<number, CIAdresseItem[]>>({});
  // Adresses CI confirmées (set uniquement via onSelect, non écrasées par onChange)
  const [ciDepartAddressDisplay, setCiDepartAddressDisplay] = useState('');
  const [ciArriveeAddressDisplay, setCiArriveeAddressDisplay] = useState('');
  // Adresses du retour - indépendantes de l'aller
  const [ciReturnDepartAddress, setCiReturnDepartAddress] = useState('');
  const [ciReturnDepartAddressLat, setCiReturnDepartAddressLat] = useState<number | null>(null);
  const [ciReturnDepartAddressLng, setCiReturnDepartAddressLng] = useState<number | null>(null);
  const [ciReturnArriveAddress, setCiReturnArriveAddress] = useState('');
  const [ciReturnArriveAddressLat, setCiReturnArriveAddressLat] = useState<number | null>(null);
  const [ciReturnArriveAddressLng, setCiReturnArriveAddressLng] = useState<number | null>(null);

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
  const paysArr: unknown[] = Array.isArray(paysResponse)
    ? paysResponse
    : Array.isArray((paysResponse as any)?.data) ? (paysResponse as any).data : [];
  const pays: string[] = paysArr
    .map((p: unknown) => {
      if (typeof p === 'string') return p;
      if (p && typeof p === 'object') {
        const nom = (p as Record<string, unknown>)?.nom;
        return typeof nom === 'string' ? nom : null;
      }
      return null;
    })
    .filter((p): p is string => p !== null);

  // Search trajets dynamically when both villes are selected
  const { data: trajetsResponse, isFetching: trajetsLoading } = useQuery({
    queryKey: ['airport-shuttle-search', selectedDepartId, selectedArriveeId],
    queryFn: () => api.reference.searchAirportShuttles(selectedDepartId!, selectedArriveeId!),
    enabled: !!(selectedDepartId && selectedArriveeId),
  });
  const trajets: TrajetAeroport[] = Array.isArray(trajetsResponse)
    ? trajetsResponse
    : Array.isArray((trajetsResponse as any)?.data) ? (trajetsResponse as any).data
    : (trajetsResponse as any)?.list || (trajetsResponse as any)?.items || [];

  // Edit mode: pré-remplir pays/villes depuis les données brutes de la réservation
  useEffect(() => {
    if (!isEdit || !initialData) return;
    const raw = initialData as any;
    const nested = raw?.airportShuttle || raw?.service || raw;
    const pays = nested?.pays || nested?.country;
    if (pays) setSelectedPays(pays);
    const deptId = nested?.villeDepartId || nested?.departureVilleId;
    const arvId = nested?.villeArriveeId || nested?.arrivalVilleId;
    if (deptId) setSelectedDepartId(Number(deptId));
    if (arvId) setSelectedArriveeId(Number(arvId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialData?.id]);

  // Fetch villes for selected country (fallback)
  const { data: villesResponse } = useQuery({
    queryKey: ['villes', selectedPays],
    queryFn: () => api.reference.getVilles(selectedPays),
    enabled: !!selectedPays,
  });
  const villesFromApi: Ville[] = Array.isArray(villesResponse)
    ? villesResponse
    : Array.isArray((villesResponse as any)?.data) ? (villesResponse as any).data
    : (villesResponse as any)?.list || (villesResponse as any)?.items || [];

  // Extract unique villes from trajets (guaranteed matching IDs)
  const villesFromTrajets = React.useMemo(() => {
    const map = new Map<number, Ville>();
    trajets.forEach(t => {
      if (t.villeDepart) map.set(t.villeDepart.id, t.villeDepart);
      if (t.villeArrivee) map.set(t.villeArrivee.id, t.villeArrivee);
    });
    return Array.from(map.values());
  }, [trajets]);

  // Always use API data for complete terminal info, supplement with trajet data
  const allVilles: Ville[] = React.useMemo(() => {
    if (villesFromApi.length === 0 && villesFromTrajets.length === 0) return [];

    // Prioritize API data (has complete terminal info), fallback to trajet data
    const combined = [...villesFromApi];

    // Add trajet-only villes that aren't in API
    const apiIds = new Set(villesFromApi.map(v => v.id));
    villesFromTrajets.forEach(tv => {
      if (!apiIds.has(tv.id)) {
        combined.push(tv);
      }
    });

    return combined;
  }, [villesFromTrajets, villesFromApi]);

  // CI: categories (public, no auth)
  const { data: ciCategoriesRaw } = useQuery({
    queryKey: ['navette-ci-categories'],
    queryFn: () => api.bookings.navetteCI.getCategories(),
    enabled: isCIBooking,
  });
  const ciCategories: NavetteCICategory[] = Array.isArray(ciCategoriesRaw)
    ? ciCategoriesRaw
    : Array.isArray((ciCategoriesRaw as any)?.data) ? (ciCategoriesRaw as any).data : [];

  // CI: options supplémentaires (public, no auth)
  const { data: ciOptionsRaw } = useQuery({
    queryKey: ['navette-ci-options'],
    queryFn: () => api.bookings.navetteCI.getOptions(),
    enabled: isCIBooking,
  });
  const ciOptions: NavetteCIOption[] = Array.isArray(ciOptionsRaw)
    ? ciOptionsRaw
    : Array.isArray((ciOptionsRaw as any)?.data) ? (ciOptionsRaw as any).data : [];

  // CI: quote — fires automatically when coords are filled
  // For round-trip, include return coordinates; API calculates both aller and retour prices
  const canFetchCIQuote = isCIBooking
    && formData.addressLat != null && formData.addressLng != null
    && formData.returnAddressLat != null && formData.returnAddressLng != null
    && (!formData.is_round_trip || (ciReturnArriveAddressLat != null && ciReturnArriveAddressLng != null));

  const { data: ciQuoteRaw, isLoading: ciQuoteLoading, isError: ciQuoteError } = useQuery({
    queryKey: ['navette-ci-quote', formData.addressLat, formData.addressLng, formData.returnAddressLat, formData.returnAddressLng, ciReturnArriveAddressLat, ciReturnArriveAddressLng, formData.passengers, ciBagages23, ciBagages10, formData.is_round_trip],
    queryFn: () => api.bookings.navetteCI.getQuote({
      departLat: formData.addressLat!,
      departLng: formData.addressLng!,
      arriveeLat: formData.returnAddressLat!,
      arriveeLng: formData.returnAddressLng!,
      pax: formData.passengers,
      bagages23: ciBagages23,
      bagages10: ciBagages10,
      isOneWay: !formData.is_round_trip,
      ...(formData.is_round_trip && ciReturnArriveAddressLat != null && ciReturnArriveAddressLng != null && {
        departRetourLat: ciReturnDepartAddressLat!,
        departRetourLng: ciReturnDepartAddressLng!,
        arriveeRetourLat: ciReturnArriveAddressLat!,
        arriveeRetourLng: ciReturnArriveAddressLng!,
      }),
    }),
    enabled: canFetchCIQuote,
  });
  const ciQuote: NavetteCIQuoteResponse | null = (ciQuoteRaw as any)?.data ?? ciQuoteRaw ?? null;

  // CI: detect if options are selected
  const hasOptions = (formData.siegeBebes > 0) || (formData.adressesSupplementAller?.length > 0) ||
    (formData.is_round_trip && (formData.siegeBebesRetour > 0 || formData.adressesSupplementRetour?.length > 0));

  // CI: price with options — only fetch if options are selected AND quote is ready
  const canFetchCIPrice = canFetchCIQuote && hasOptions && ciQuote && !!ciCategoryCode;

  // DEBUG
  React.useEffect(() => {
    if (isCIBooking && (formData.siegeBebes > 0 || formData.adressesSupplementAller?.length > 0)) {
      console.log('[CI PRICE DEBUG]', {
        canFetchCIQuote,
        hasOptions,
        ciQuote: !!ciQuote,
        ciCategoryCode,
        canFetchCIPrice,
        siegeBebes: formData.siegeBebes,
        adressesSupplementAller: formData.adressesSupplementAller?.length,
      });
    }
  }, [isCIBooking, formData.siegeBebes, formData.adressesSupplementAller, canFetchCIQuote, hasOptions, ciQuote, ciCategoryCode, canFetchCIPrice]);

  const { data: ciPriceRaw, isLoading: ciPriceLoading } = useQuery({
    queryKey: ['navette-ci-price', formData.addressLat, formData.addressLng, formData.returnAddressLat, formData.returnAddressLng, formData.passengers, ciBagages23, ciBagages10, formData.is_round_trip, formData.siegeBebes, formData.siegeBebesRetour, formData.adressesSupplementAller, formData.adressesSupplementRetour, ciCategoryCode],
    queryFn: () => {
      // Build options array
      const options: any[] = [];
      if (formData.siegeBebes > 0) {
        options.push({ code: 'SIEGE_BEBE', quantite: formData.siegeBebes });
      }
      if (formData.adressesSupplementAller?.length > 0) {
        options.push({
          code: 'ADRESSE_SUPP',
          adresses: formData.adressesSupplementAller.map(a => ({
            adresse: a.adresse,
            lat: a.lat,
            lng: a.lng,
          })),
        });
      }

      const optionsRetour: any[] = [];
      if (formData.is_round_trip) {
        if (formData.siegeBebesRetour > 0) {
          optionsRetour.push({ code: 'SIEGE_BEBE', quantite: formData.siegeBebesRetour });
        }
        if (formData.adressesSupplementRetour?.length > 0) {
          optionsRetour.push({
            code: 'ADRESSE_SUPP',
            adresses: formData.adressesSupplementRetour.map(a => ({
              adresse: a.adresse,
              lat: a.lat,
              lng: a.lng,
            })),
          });
        }
      }

      return api.bookings.navetteCI.getPrice({
        categoryCode: ciCategoryCode,
        departLat: formData.addressLat!,
        departLng: formData.addressLng!,
        arriveeLat: formData.returnAddressLat!,
        arriveeLng: formData.returnAddressLng!,
        pax: formData.passengers,
        bagages23: ciBagages23,
        bagages10: ciBagages10,
        isOneWay: !formData.is_round_trip,
        sens: formData.direction === 'from_airport' ? 'airport_to_city' : 'city_to_airport',
        options: options.length > 0 ? options : undefined,
        optionsRetour: formData.is_round_trip && optionsRetour.length > 0 ? optionsRetour : undefined,
        ...(formData.is_round_trip && ciReturnDepartAddressLat != null && ciReturnDepartAddressLng != null && {
          departRetourLat: ciReturnDepartAddressLat!,
          departRetourLng: ciReturnDepartAddressLng!,
          arriveeRetourLat: ciReturnArriveAddressLat!,
          arriveeRetourLng: ciReturnArriveAddressLng!,
        }),
      });
    },
    enabled: canFetchCIPrice,
  });
  const ciPrice = (ciPriceRaw as any)?.data ?? ciPriceRaw ?? null;

  // Update price when ciPrice changes (options added)
  React.useEffect(() => {
    if (ciPrice && ciPrice.total) {
      setCiCategoryPrice(ciPrice.total);
    }
  }, [ciPrice]);

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

  // Trajets triés du moins cher au plus cher (viennent de la recherche dynamique)
  const matchingTrajets: TrajetAeroport[] = [...trajets].sort((a, b) => {
    const pa = a.prixAllerSimple ?? a.prix ?? Number.POSITIVE_INFINITY;
    const pb = b.prixAllerSimple ?? b.prix ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

  // The trajet selected by the user (when they pick a vehicle)
  const selectedTrajet = trajets.find(t => t.id === formData.trajetAeroportId);

  const premiumVehicleImage: string | undefined = undefined;

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

  const updateBooking = useMutation({
    mutationFn: (data: Partial<CreateAirportShuttleBookingDto>) => {
      if (!bookingId) throw new Error('bookingId requis en mode edit');
      return api.bookings.airportShuttle.update(bookingId, data);
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

  // CI booking mutation
  const createCIBooking = useMutation({
    mutationFn: (data: CreateNavetteCIBookingDto) => api.bookings.navetteCI.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBookingRef((response as any)?.data?.bookingCode || (response as any)?.bookingCode || `SUB-${Date.now()}`);
      setBookingSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la réservation CI');
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


  const ROUND_TRIP_DISCOUNT_RATE = 0.10;
  const ROUND_TRIP_SHORT_HOURS = 3;

  const getRoundTripDurationHours = (): number | null => {
    if (!formData.departure_date || !formData.departure_time) return null;
    if (!formData.return_date || !formData.return_time) return null;
    const dep = new Date(`${formData.departure_date}T${formData.departure_time}`);
    const ret = new Date(`${formData.return_date}T${formData.return_time}`);
    if (Number.isNaN(dep.getTime()) || Number.isNaN(ret.getTime())) return null;
    const diff = (ret.getTime() - dep.getTime()) / (1000 * 60 * 60);
    return diff > 0 ? diff : null;
  };

  const getTrajetBase = (): number => {
    if (!selectedTrajet) return 0;
    const basePrice = selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0;
    if (!formData.is_round_trip) return basePrice;
    const duration = getRoundTripDurationHours();
    // < 3h : prix aller-retour du backend (avec fallback). >= 3h : 2x aller simple.
    if (duration !== null && duration >= ROUND_TRIP_SHORT_HOURS) {
      return basePrice * 2;
    }
    return selectedTrajet.prixAllerRetour || basePrice * 2;
  };

  const getRoundTripDiscount = (): number => {
    if (!formData.is_round_trip) return 0;
    return Math.round(getTrajetBase() * ROUND_TRIP_DISCOUNT_RATE);
  };

  const calculateCIPriceTotal = (): number => {
    // For round-trip, use the single quote that includes both aller and retour prices
    if (formData.is_round_trip && ciQuote) {
      // Find the selected category in the quote and use its total price
      const selectedOption = ciQuote.options.find(opt => opt.code === ciCategoryCode);
      if (selectedOption) {
        // prix field already includes aller + retour with discount applied
        return selectedOption.prix;
      }
    }
    // For one-way, just use ciCategoryPrice
    return ciCategoryPrice;
  };

  const calculateTotal = (): number => {
    if (isCIBooking) return calculateCIPriceTotal();
    if (!selectedTrajet) return 0;
    let total = getTrajetBase() - getRoundTripDiscount();
    if (formData.siegeBebes > 0 && selectedTrajet.prixSiegeBebe) {
      total += selectedTrajet.prixSiegeBebe * formData.siegeBebes;
    }
    if (formData.animalDeCompagnie && selectedTrajet.prixAnimalCompagnie) {
      total += selectedTrajet.prixAnimalCompagnie;
    }
    if (formData.adressesSupplementAller.length > 0 && selectedTrajet.prixAdresseSupplementaire) {
      total += selectedTrajet.prixAdresseSupplementaire * formData.adressesSupplementAller.length;
    }
    if (formData.is_round_trip) {
      if (formData.siegeBebesRetour > 0 && selectedTrajet.prixSiegeBebe) {
        total += selectedTrajet.prixSiegeBebe * formData.siegeBebesRetour;
      }
      if (formData.animalDeCompagnieRetour && selectedTrajet.prixAnimalCompagnie) {
        total += selectedTrajet.prixAnimalCompagnie;
      }
      if (formData.adressesSupplementRetour.length > 0 && selectedTrajet.prixAdresseSupplementaire) {
        total += selectedTrajet.prixAdresseSupplementaire * formData.adressesSupplementRetour.length;
      }
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
      if (isCIBooking) {
        if (!formData.address || !formData.addressLat) { toast.error("Veuillez saisir l'adresse de départ"); return; }
        if (!formData.return_address || !formData.returnAddressLat) { toast.error("Veuillez saisir l'adresse d'arrivée"); return; }
        if (!formData.departure_date) { toast.error("Veuillez sélectionner une date"); return; }
        if (!formData.departure_time) { toast.error("Veuillez sélectionner une heure"); return; }
        if (formData.passengers < 1) { toast.error("Minimum 1 passager"); return; }
        if (ciSens === 'airport_to_city' && !formData.flight_number) { toast.error("Le numéro de vol est obligatoire depuis l'aéroport"); return; }
        setCurrentStep(3);
        return;
      }
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
    }

    if (currentStep === 3) {
      if (isCIBooking) {
        if (!ciCategoryCode) { toast.error("Veuillez choisir une catégorie de véhicule"); return; }
        setCurrentStep(4);
        return;
      }
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
    if (isCIBooking) {
      if (!ciCategoryCode) { toast.error("Veuillez choisir un véhicule"); return; }
      const ciData: CreateNavetteCIBookingDto = {
        categoryCode: ciCategoryCode,
        departLat: formData.addressLat!,
        departLng: formData.addressLng!,
        arriveeLat: formData.returnAddressLat!,
        arriveeLng: formData.returnAddressLng!,
        departAddress: formData.address,
        arriveeAddress: formData.return_address,
        pax: formData.passengers,
        bagages23: ciBagages23,
        bagages10: ciBagages10,
        sens: ciSens,
        isOneWay: !formData.is_round_trip,
        scheduledDate: new Date(formData.departure_date + 'T00:00:00.000Z').toISOString(),
        scheduledTime: formData.departure_time,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail || undefined,
        clientPhone: formatPhoneForApi(formData.clientPhone),
        flightNumber: formData.flight_number || undefined,
        notes: formData.specialRequests || undefined,
        employeeId: formData.employeeId || undefined,
        // Return trip information (if round-trip)
        ...(formData.is_round_trip && {
          scheduledDateRetour: formData.return_date ? new Date(formData.return_date + 'T00:00:00.000Z').toISOString() : undefined,
          scheduledTimeRetour: formData.return_time || undefined,
          departRetourLat: ciReturnDepartAddressLat ?? undefined,
          departRetourLng: ciReturnDepartAddressLng ?? undefined,
          arriveeRetourLat: ciReturnArriveAddressLat ?? undefined,
          arriveeRetourLng: ciReturnArriveAddressLng ?? undefined,
          departRetourAddress: ciReturnDepartAddress || undefined,
          arriveeRetourAddress: ciReturnArriveAddress || undefined,
        }),
        optionsSelectionnees: [
          ...Object.entries(ciSimpleOptions)
            .filter(([, qty]) => qty > 0)
            .map(([id, quantite]) => ({ optionId: Number(id), quantite })),
          ...Object.entries(ciAddressOptions)
            .filter(([, adrs]) => adrs.length > 0)
            .map(([id, adresses]) => ({
              optionId: Number(id),
              adresses: adresses.map((a): NavetteCIOptionAdresse => ({
                adresse: a.adresse,
                lat: a.lat ?? 0,
                lng: a.lng ?? 0,
                ...(a.instructions && { instructions: a.instructions }),
                ...(a.contactNom && { contactNom: a.contactNom }),
                ...(a.contactTelephone && { contactTelephone: a.contactTelephone }),
              })),
            })),
          ...(formData.is_round_trip &&
            Object.entries(ciReturnSimpleOptions)
              .filter(([, qty]) => qty > 0)
              .map(([id, quantite]) => ({ optionId: Number(id), quantite, forReturn: true }))),
          ...(formData.is_round_trip &&
            Object.entries(ciReturnAddressOptions)
              .filter(([, adrs]) => adrs.length > 0)
              .map(([id, adresses]) => ({
                optionId: Number(id),
                forReturn: true,
                adresses: adresses.map((a): NavetteCIOptionAdresse => ({
                  adresse: a.adresse,
                  lat: a.lat ?? 0,
                  lng: a.lng ?? 0,
                  ...(a.instructions && { instructions: a.instructions }),
                  ...(a.contactNom && { contactNom: a.contactNom }),
                  ...(a.contactTelephone && { contactTelephone: a.contactTelephone }),
                })),
              }))),
        ].filter(o => (o as any).quantite > 0 || ((o as any).adresses?.length ?? 0) > 0),
      };
      createCIBooking.mutate(ciData);
      return;
    }

    if (!formData.trajetAeroportId) { toast.error("Veuillez selectionner un trajet"); return; }

    const isCompanyPayment = formData.payment_method === 'company_account';

    const bookingData: CreateAirportShuttleBookingDto = {
      trajetAeroportId: formData.trajetAeroportId!,
      isOneWay: !formData.is_round_trip,
      clientName: formData.clientName,
      clientPhone: formatPhoneForApi(formData.clientPhone),
      clientEmail: formData.clientEmail || undefined,
      clientAddress: formData.clientAddress || undefined,
      flightNumber: formData.flight_number || undefined,
      pickupDateAller: formData.departure_date,
      pickupTimeAller: formData.departure_time,
      pickupDateRetour: formData.is_round_trip ? formData.return_date : undefined,
      pickupTimeRetour: formData.is_round_trip ? formData.return_time : undefined,
      adressePriseEnChargeAller: formData.address,
      adressePriseEnChargeAllerLat: formData.addressLat || undefined,
      adressePriseEnChargeAllerLng: formData.addressLng || undefined,
      adressePriseEnChargeRetour: formData.is_round_trip ? formData.return_address : undefined,
      adressePriseEnChargeRetourLat: formData.is_round_trip ? formData.returnAddressLat || undefined : undefined,
      adressePriseEnChargeRetourLng: formData.is_round_trip ? formData.returnAddressLng || undefined : undefined,
      terminalDepartId: formData.terminalDepartId || undefined,
      terminalRetourId: formData.is_round_trip ? formData.terminalRetourId || undefined : undefined,
      adresseSupplementAller: formData.adressesSupplementAller.length > 0
        ? formData.adressesSupplementAller.map(a => ({ adresse: a.adresse, lat: a.lat ?? 0, lng: a.lng ?? 0 }))
        : undefined,
      adresseSupplementRetour: formData.is_round_trip && formData.adressesSupplementRetour.length > 0
        ? formData.adressesSupplementRetour.map(a => ({ adresse: a.adresse, lat: a.lat ?? 0, lng: a.lng ?? 0 }))
        : undefined,
      siegeBebes: formData.siegeBebes || undefined,
      siegeBebesRetour: formData.is_round_trip ? formData.siegeBebesRetour || undefined : undefined,
      animalDeCompagnie: formData.animalDeCompagnie || undefined,
      animalDeCompagnieRetour: formData.is_round_trip ? formData.animalDeCompagnieRetour || undefined : undefined,
      specialRequests: formData.specialRequests || undefined,
      canal: 'web',
      employeeId: formData.employeeId || undefined,
    };

    console.log('[AIRPORT-SHUTTLE] Booking data:', JSON.stringify(bookingData, null, 2));
    if (isEdit) {
      updateBooking.mutate(bookingData);
    } else {
      createBooking.mutate(bookingData);
    }
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.employeeId && formData.clientName && formData.clientPhone && isValidPhone(formData.clientPhone));
      case 2: {
        if (isCIBooking) {
          const ciBase = !!(formData.address && formData.addressLat && formData.return_address && formData.returnAddressLat && formData.departure_date && formData.departure_time);
          const ciFlightValid = ciSens === 'airport_to_city' ? !!formData.flight_number : true;
          return ciBase && ciFlightValid;
        }
        const baseValid = !!(selectedDepartId && selectedArriveeId && formData.departure_date && formData.departure_time && formData.address);
        const flightValid = formData.direction === 'from_airport' ? !!formData.flight_number : true;
        if (formData.is_round_trip) return baseValid && flightValid && !!(formData.return_date && formData.return_time && formData.return_address);
        return baseValid && flightValid;
      }
      case 3:
        if (isCIBooking) return !!ciCategoryCode;
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
        <section className="relative overflow-hidden rounded-[2rem] bg-[#E04A1F] p-10 md:p-14 text-white shadow-xl">
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
              <div className="bg-[#ffdbd0] p-3 rounded-2xl text-[#E04A1F]">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Trajet</h3>
            </div>
            {isCIBooking ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E04A1F] mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Départ</p>
                    <p className="font-bold text-sm text-slate-900 break-words">{ciDepartAddressDisplay || formData.address || '—'}</p>
                  </div>
                </div>
                <div className="ml-[5px] w-[2px] h-4 bg-slate-200 ml-1" />
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Arrivée</p>
                    <p className="font-bold text-sm text-slate-900 break-words">{ciArriveeAddressDisplay || formData.return_address || '—'}</p>
                  </div>
                </div>
                {ciDistanceKm > 0 && (
                  <p className="text-xs text-slate-400 mt-2 text-center">{ciDistanceKm} km estimés</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Depart</p>
                  <p className="font-bold text-base text-slate-900">{getVilleName(selectedTrajet?.villeDepart)}</p>
                </div>
                <div className="flex-1 px-4">
                  <div className="h-[2px] bg-slate-200 relative">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2">
                      <Plane className="w-4 h-4 text-[#E04A1F]" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arrivee</p>
                  <p className="font-bold text-base text-slate-900">{getVilleName(selectedTrajet?.villeArrivee)}</p>
                </div>
              </div>
            )}
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
                <span className="font-semibold text-[#E04A1F]">{formData.departure_time}</span>
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
              <div className="w-12 h-12 rounded-full bg-[#E04A1F] text-white flex items-center justify-center font-bold">
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
              <div className="bg-[#ffdbd0] p-3 rounded-2xl text-[#E04A1F]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Total</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{totalTtc.toLocaleString()}</span>
              <span className="text-xl font-bold text-[#E04A1F]">FCFA</span>
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
            className="flex-1 bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98] gap-2"
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
              <span className="text-[#E04A1F]">{isEdit ? 'Modifier' : 'Navette'}</span>
            </nav>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {isEdit ? 'Modifier la reservation' : 'Reservation de Navette'}
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {steps[currentStep - 1]?.title} — etape {currentStep} sur {steps.length}
            </p>
          </div>
          <span className="text-[#E04A1F] font-bold text-xs bg-[#ffdbd0] px-4 py-2 rounded-full uppercase tracking-widest">
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

      {/* Form content + Summary (8/4 editorial split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10">
        <AnimatePresence mode="wait">
          {/* Step 2 CI: GPS-based booking for Côte d'Ivoire */}
          {currentStep === 2 && isCIBooking && (
            <motion.div
              key="step2-ci"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-l-4 border-[#E04A1F] pl-4 mb-2">
                <h3 className="text-xl font-bold text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  Trajet — Côte d&apos;Ivoire
                </h3>
              </div>

              {/* Sens du trajet */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Sens du trajet</Label>
                <div className="grid grid-cols-2 gap-3 bg-[#f0f4f8] p-2 rounded-2xl">
                  {[
                    { value: 'airport_to_city' as const, label: 'Aéroport → Ville', Icon: PlaneLanding },
                    { value: 'city_to_airport' as const, label: 'Ville → Aéroport', Icon: PlaneTakeoff },
                  ].map((option) => {
                    const active = ciSens === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => {
                          setCiSens(option.value);
                          setCiDepartAddressDisplay('');
                          setCiArriveeAddressDisplay('');
                          setFormData(prev => ({
                            ...prev,
                            address: '', addressLat: null, addressLng: null,
                            return_address: '', returnAddressLat: null, returnAddressLng: null,
                            flight_number: '',
                          }));
                          // Réinitialiser aussi les coordonnées du retour
                          setCiReturnDepartAddress('');
                          setCiReturnDepartAddressLat(null);
                          setCiReturnDepartAddressLng(null);
                          setCiReturnArriveAddress('');
                          setCiReturnArriveAddressLat(null);
                          setCiReturnArriveAddressLng(null);
                        }}
                        className={`flex items-center justify-center gap-3 p-4 rounded-xl font-bold text-sm transition-all ${
                          active ? 'bg-[#ffdbd0] text-[#E04A1F] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <option.Icon className="w-5 h-5" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Round trip toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">Aller-retour</p>
                      {formData.is_round_trip && (
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#E04A1F] text-white">
                          -10%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">Reservez le retour et beneficiez de 10% de reduction</p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_round_trip}
                  onCheckedChange={(v) => handleChange('is_round_trip', v)}
                />
              </div>

              {/* SECTION ALLER - COMPLETE */}
              <div className="border border-orange-200 rounded-2xl p-5 space-y-4 bg-orange-50/20">
                <div className="flex items-center gap-2 mb-2">
                  <PlaneTakeoff className="w-5 h-5 text-[#E04A1F]" />
                  <h4 className="font-semibold text-slate-800">Informations Aller</h4>
                </div>

                {/* Départ (Aéroport ou Adresse selon le sens) */}
                <div className="space-y-2">
                  <Label>
                    {ciSens === 'airport_to_city' ? 'Aéroport de départ *' : 'Adresse de départ (ville) *'}
                  </Label>
                  {ciSens === 'airport_to_city' ? (
                    <Select
                      value={formData.address}
                      onValueChange={(val) => {
                        const airport = aeroports.find(a => (a.nom || a.name) === val);
                        const lat = airport?.latitude ?? null;
                        const lng = airport?.longitude ?? null;
                        setCiDepartAddressDisplay(val);
                        setFormData(prev => ({ ...prev, address: val, addressLat: lat, addressLng: lng }));
                      }}
                    >
                      <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                        <SelectValue placeholder="Choisir un aéroport" />
                      </SelectTrigger>
                      <SelectContent>
                        {aeroports.map(a => (
                          <SelectItem key={a.id} value={a.nom || a.name || ''}>
                            {a.nom || a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <AddressAutocomplete
                      placeholder="Ex: Plateau, Abidjan"
                      value={formData.address}
                      onChange={(val) => handleChange('address', val)}
                      onSelect={(address, lat, lng) => {
                        setCiDepartAddressDisplay(address);
                        setFormData(prev => ({ ...prev, address, addressLat: lat, addressLng: lng }));
                      }}
                      iconColor="text-orange-500"
                      countryCode="CI"
                    />
                  )}
                </div>

                {/* Terminal Départ */}
                {ciSens === 'airport_to_city' && (() => {
                  const selectedAirport = aeroports.find(a => (a.nom || a.name) === formData.address);
                  const terminals = selectedAirport?.terminals ? Array.isArray(selectedAirport.terminals) ? selectedAirport.terminals : [] : [];
                  if (!terminals || terminals.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <Label>Terminal de l'aéroport de départ</Label>
                      <Select
                        value={formData.terminalDepartId?.toString() || 'none'}
                        onValueChange={(v) => handleChange('terminalDepartId', v === 'none' ? null : parseInt(v))}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                          <SelectValue placeholder="Sélectionner un terminal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Sans terminal --</SelectItem>
                          {terminals.map((term: any) => (
                            <SelectItem key={term.id} value={term.id.toString()}>
                              {term.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

                {/* Arrivée (Aéroport ou Adresse selon le sens) */}
                <div className="space-y-2">
                  <Label>
                    {ciSens === 'airport_to_city' ? 'Adresse d\'arrivée (ville) *' : 'Aéroport d\'arrivée *'}
                  </Label>
                  {ciSens === 'city_to_airport' ? (
                    <Select
                      value={formData.return_address}
                      onValueChange={(val) => {
                        const airport = aeroports.find(a => (a.nom || a.name) === val);
                        const lat = airport?.latitude ?? null;
                        const lng = airport?.longitude ?? null;
                        setCiArriveeAddressDisplay(val);
                        setFormData(prev => ({ ...prev, return_address: val, returnAddressLat: lat, returnAddressLng: lng }));
                        // Auto-remplir l'aéroport de départ du retour
                        setCiReturnDepartAddress(val);
                        setCiReturnDepartAddressLat(lat);
                        setCiReturnDepartAddressLng(lng);
                      }}
                    >
                      <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                        <SelectValue placeholder="Choisir un aéroport" />
                      </SelectTrigger>
                      <SelectContent>
                        {aeroports.map(a => (
                          <SelectItem key={a.id} value={a.nom || a.name || ''}>
                            {a.nom || a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <AddressAutocomplete
                      placeholder="Ex: Cocody, Abidjan"
                      value={formData.return_address}
                      onChange={(val) => handleChange('return_address', val)}
                      onSelect={(address, lat, lng) => {
                        setCiArriveeAddressDisplay(address);
                        setFormData(prev => ({ ...prev, return_address: address, returnAddressLat: lat, returnAddressLng: lng }));
                      }}
                      iconColor="text-blue-500"
                      countryCode="CI"
                    />
                  )}
                </div>

                {/* Terminal Arrivée */}
                {ciSens === 'city_to_airport' && (() => {
                  const selectedAirport = aeroports.find(a => (a.nom || a.name) === formData.return_address);
                  const terminals = selectedAirport?.terminals ? Array.isArray(selectedAirport.terminals) ? selectedAirport.terminals : [] : [];
                  if (!terminals || terminals.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <Label>Terminal de l'aéroport d'arrivée</Label>
                      <Select
                        value={formData.terminalRetourId?.toString() || 'none'}
                        onValueChange={(v) => handleChange('terminalRetourId', v === 'none' ? null : parseInt(v))}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                          <SelectValue placeholder="Sélectionner un terminal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Sans terminal --</SelectItem>
                          {terminals.map((term: any) => (
                            <SelectItem key={term.id} value={term.id.toString()}>
                              {term.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

                {/* Date et Heure Aller */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date départ *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start bg-white hover:bg-slate-50 rounded-xl h-12 px-4 font-normal"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {formData.departure_date
                            ? format(new Date(formData.departure_date + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                            : <span className="text-slate-500">Sélectionner</span>}
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
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure départ *</Label>
                    <div className="bg-white rounded-xl px-4 h-12 flex items-center">
                      <TimePicker
                        value={formData.departure_time}
                        onChange={(v) => handleChange('departure_time', v)}
                        placeholder="Choisir une heure"
                        selectedDate={formData.departure_date}
                      />
                    </div>
                  </div>
                </div>

                {/* Numéro de vol (si airport_to_city) */}
                {ciSens === 'airport_to_city' && (
                  <div className="space-y-2">
                    <Label>Numéro de vol *</Label>
                    <Input
                      placeholder="Ex: SN204"
                      value={formData.flight_number}
                      onChange={(e) => handleChange('flight_number', e.target.value)}
                    />
                  </div>
                )}

                {/* Passagers et Bagages - ALLER */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Passagers & Bagages</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Passagers</Label>
                      <Select
                        value={formData.passengers.toString()}
                        onValueChange={(v) => handleChange('passengers', parseInt(v))}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl">
                          <Users className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} passager{n > 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bagages 23 kg</Label>
                      <Select
                        value={ciBagages23.toString()}
                        onValueChange={(v) => setCiBagages23(parseInt(v))}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 11 }, (_, i) => i).map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bagages 10 kg</Label>
                      <Select
                        value={ciBagages10.toString()}
                        onValueChange={(v) => setCiBagages10(parseInt(v))}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 11 }, (_, i) => i).map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Options supplémentaires Aller (Simple + Address) */}
                {ciOptions.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">Options supplémentaires Aller</p>
                    <div className="space-y-3">
                      {ciOptions.map((opt) => {
                        if (opt.type === 'SIMPLE') {
                          const qty = ciSimpleOptions[opt.id] ?? 0;
                          return (
                            <div key={opt.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 text-sm">{opt.label}</p>
                                {opt.description && <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>}
                                <p className="text-xs font-bold text-[#E04A1F] mt-1">{opt.prix.toLocaleString()} FCFA / unité</p>
                              </div>
                              <Select
                                value={qty.toString()}
                                onValueChange={(v) => setCiSimpleOptions(prev => ({ ...prev, [opt.id]: parseInt(v) }))}
                              >
                                <SelectTrigger className="w-20 shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: opt.maxQuantite + 1 }, (_, i) => i).map(n => (
                                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        if (opt.type === 'ADDRESS') {
                          const adresses = ciAddressOptions[opt.id] ?? [];
                          return (
                            <div key={opt.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm">{opt.label}</p>
                                  {opt.description && <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>}
                                  <p className="text-xs font-bold text-[#E04A1F] mt-1">{opt.prix.toLocaleString()} FCFA / arrêt</p>
                                </div>
                                {adresses.length < opt.maxQuantite && (
                                  <button
                                    type="button"
                                    onClick={() => setCiAddressOptions(prev => ({
                                      ...prev,
                                      [opt.id]: [...(prev[opt.id] ?? []), { adresse: '', lat: null, lng: null, instructions: '', contactNom: '', contactTelephone: '' }],
                                    }))}
                                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#E04A1F] hover:underline"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Ajouter un arrêt
                                  </button>
                                )}
                              </div>
                              {adresses.map((adr, idx) => (
                                <div key={idx} className="space-y-2 border-t border-slate-200 pt-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arrêt {idx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => setCiAddressOptions(prev => ({
                                        ...prev,
                                        [opt.id]: (prev[opt.id] ?? []).filter((_, i) => i !== idx),
                                      }))}
                                      className="text-slate-400 hover:text-red-500"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <AddressAutocomplete
                                    placeholder="Adresse de l'arrêt"
                                    value={adr.adresse}
                                    onChange={(val) => setCiAddressOptions(prev => {
                                      const list = [...(prev[opt.id] ?? [])];
                                      list[idx] = { ...list[idx], adresse: val, lat: null, lng: null };
                                      return { ...prev, [opt.id]: list };
                                    })}
                                    onSelect={(address, lat, lng) => setCiAddressOptions(prev => {
                                      const list = [...(prev[opt.id] ?? [])];
                                      list[idx] = { ...list[idx], adresse: address, lat, lng };
                                      return { ...prev, [opt.id]: list };
                                    })}
                                    countryCode="CI"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder="Nom du contact (optionnel)"
                                      value={adr.contactNom}
                                      onChange={(e) => setCiAddressOptions(prev => {
                                        const list = [...(prev[opt.id] ?? [])];
                                        list[idx] = { ...list[idx], contactNom: e.target.value };
                                        return { ...prev, [opt.id]: list };
                                      })}
                                      className="text-sm"
                                    />
                                    <Input
                                      placeholder="Téléphone contact (optionnel)"
                                      value={adr.contactTelephone}
                                      onChange={(e) => setCiAddressOptions(prev => {
                                        const list = [...(prev[opt.id] ?? [])];
                                        list[idx] = { ...list[idx], contactTelephone: e.target.value };
                                        return { ...prev, [opt.id]: list };
                                      })}
                                      className="text-sm"
                                    />
                                  </div>
                                  <Input
                                    placeholder="Instructions (optionnel)"
                                    value={adr.instructions}
                                    onChange={(e) => setCiAddressOptions(prev => {
                                      const list = [...(prev[opt.id] ?? [])];
                                      list[idx] = { ...list[idx], instructions: e.target.value };
                                      return { ...prev, [opt.id]: list };
                                    })}
                                    className="text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION RETOUR - COMPLETE (visible seulement si aller-retour) */}
              {formData.is_round_trip && (
                <div className="border border-blue-200 rounded-2xl p-5 space-y-4 bg-blue-50/20">
                  <div className="flex items-center gap-2 mb-2">
                    <PlaneLanding className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-slate-800">Informations Retour</h4>
                  </div>

                  {/* Départ Retour (inverse de l'aller) - VIDE PAR DÉFAUT */}
                  <div className="space-y-2">
                    <Label>
                      {ciSens === 'airport_to_city' ? 'Adresse de départ retour (ville) *' : 'Aéroport de départ retour *'}
                    </Label>
                    {ciSens === 'airport_to_city' ? (
                      <AddressAutocomplete
                        placeholder="Ex: Cocody, Abidjan"
                        value={ciReturnDepartAddress}
                        onChange={(val) => setCiReturnDepartAddress(val)}
                        onSelect={(address, lat, lng) => {
                          setCiReturnDepartAddress(address);
                          setCiReturnDepartAddressLat(lat);
                          setCiReturnDepartAddressLng(lng);
                        }}
                        iconColor="text-blue-500"
                        countryCode="CI"
                      />
                    ) : (
                      <Select
                        value={ciReturnDepartAddress}
                        onValueChange={(val) => {
                          const airport = aeroports.find(a => (a.nom || a.name) === val);
                          const lat = airport?.latitude ?? null;
                          const lng = airport?.longitude ?? null;
                          setCiReturnDepartAddress(val);
                          setCiReturnDepartAddressLat(lat);
                          setCiReturnDepartAddressLng(lng);
                        }}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                          <SelectValue placeholder="Choisir un aéroport" />
                        </SelectTrigger>
                        <SelectContent>
                          {aeroports.map(a => (
                            <SelectItem key={a.id} value={a.nom || a.name || ''}>
                              {a.nom || a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Terminal Départ Retour */}
                  {ciSens === 'city_to_airport' && ciReturnDepartAddress && (() => {
                    const selectedAirport = aeroports.find(a => (a.nom || a.name) === ciReturnDepartAddress);
                    const terminals = selectedAirport?.terminals ? Array.isArray(selectedAirport.terminals) ? selectedAirport.terminals : [] : [];
                    if (!terminals || terminals.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <Label>Terminal de départ retour</Label>
                        <Select
                          value={formData.terminalRetourId?.toString() || 'none'}
                          onValueChange={(v) => handleChange('terminalRetourId', v === 'none' ? null : parseInt(v))}
                        >
                          <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                            <SelectValue placeholder="Sélectionner un terminal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Sans terminal --</SelectItem>
                            {terminals.map((term: any) => (
                              <SelectItem key={term.id} value={term.id.toString()}>
                                {term.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Arrivée Retour (l'inverse du départ retour) - VIDE PAR DÉFAUT */}
                  <div className="space-y-2">
                    <Label>
                      {ciSens === 'airport_to_city' ? 'Aéroport d\'arrivée retour *' : 'Adresse d\'arrivée retour (ville) *'}
                    </Label>
                    {ciSens === 'airport_to_city' ? (
                      <Select
                        value={ciReturnArriveAddress}
                        onValueChange={(val) => {
                          const airport = aeroports.find(a => (a.nom || a.name) === val);
                          const lat = airport?.latitude ?? null;
                          const lng = airport?.longitude ?? null;
                          setCiReturnArriveAddress(val);
                          setCiReturnArriveAddressLat(lat);
                          setCiReturnArriveAddressLng(lng);
                        }}
                      >
                        <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                          <SelectValue placeholder="Choisir un aéroport" />
                        </SelectTrigger>
                        <SelectContent>
                          {aeroports.map(a => (
                            <SelectItem key={a.id} value={a.nom || a.name || ''}>
                              {a.nom || a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <AddressAutocomplete
                        placeholder="Ex: Plateau, Abidjan"
                        value={ciReturnArriveAddress}
                        onChange={(val) => setCiReturnArriveAddress(val)}
                        onSelect={(address, lat, lng) => {
                          setCiReturnArriveAddress(address);
                          setCiReturnArriveAddressLat(lat);
                          setCiReturnArriveAddressLng(lng);
                        }}
                        iconColor="text-orange-500"
                        countryCode="CI"
                      />
                    )}
                  </div>

                  {/* Terminal Arrivée Retour */}
                  {ciSens === 'airport_to_city' && ciReturnArriveAddress && (() => {
                    const selectedAirport = aeroports.find(a => (a.nom || a.name) === ciReturnArriveAddress);
                    const terminals = selectedAirport?.terminals ? Array.isArray(selectedAirport.terminals) ? selectedAirport.terminals : [] : [];
                    if (!terminals || terminals.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <Label>Terminal d'arrivée retour</Label>
                        <Select
                          value={formData.terminalDepartId?.toString() || 'none'}
                          onValueChange={(v) => handleChange('terminalDepartId', v === 'none' ? null : parseInt(v))}
                        >
                          <SelectTrigger className="bg-white border-0 rounded-xl h-12 px-4">
                            <SelectValue placeholder="Sélectionner un terminal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Sans terminal --</SelectItem>
                            {terminals.map((term: any) => (
                              <SelectItem key={term.id} value={term.id.toString()}>
                                {term.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Date et Heure Retour */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date retour *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start bg-white hover:bg-blue-50 rounded-xl h-12 px-4 font-normal"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {formData.return_date
                              ? format(new Date(formData.return_date + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                              : <span className="text-slate-500">Sélectionner</span>}
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
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure retour *</Label>
                      <div className="bg-white rounded-xl px-4 h-12 flex items-center">
                        <TimePicker
                          value={formData.return_time}
                          onChange={(v) => handleChange('return_time', v)}
                          placeholder="Choisir une heure"
                          selectedDate={formData.return_date}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passagers et Bagages - RETOUR */}
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Passagers & Bagages</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Passagers</Label>
                        <Select
                          value={formData.passengers.toString()}
                          onValueChange={(v) => handleChange('passengers', parseInt(v))}
                        >
                          <SelectTrigger className="bg-white border-0 rounded-xl">
                            <Users className="w-4 h-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                              <SelectItem key={n} value={n.toString()}>
                                {n} passager{n > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bagages 23 kg</Label>
                        <Select
                          value={ciBagages23.toString()}
                          onValueChange={(v) => setCiBagages23(parseInt(v))}
                        >
                          <SelectTrigger className="bg-white border-0 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 11 }, (_, i) => i).map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bagages 10 kg</Label>
                        <Select
                          value={ciBagages10.toString()}
                          onValueChange={(v) => setCiBagages10(parseInt(v))}
                        >
                          <SelectTrigger className="bg-white border-0 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 11 }, (_, i) => i).map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Options supplémentaires Retour (Simple + Address) - INDÉPENDANTES */}
                  {ciOptions.length > 0 && (
                    <div className="border-t border-slate-200 pt-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-800">Options supplémentaires Retour</p>
                      <div className="space-y-3">
                        {ciOptions.map((opt) => {
                          if (opt.type === 'SIMPLE') {
                            const qty = ciReturnSimpleOptions[opt.id] ?? 0;
                            return (
                              <div key={opt.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm">{opt.label}</p>
                                  {opt.description && <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>}
                                  <p className="text-xs font-bold text-[#E04A1F] mt-1">{opt.prix.toLocaleString()} FCFA / unité</p>
                                </div>
                                <Select
                                  value={qty.toString()}
                                  onValueChange={(v) => setCiReturnSimpleOptions(prev => ({ ...prev, [opt.id]: parseInt(v) }))}
                                >
                                  <SelectTrigger className="w-20 shrink-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: opt.maxQuantite + 1 }, (_, i) => i).map(n => (
                                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          }

                          if (opt.type === 'ADDRESS') {
                            const adresses = ciReturnAddressOptions[opt.id] ?? [];
                            return (
                              <div key={opt.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 text-sm">{opt.label}</p>
                                    {opt.description && <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>}
                                    <p className="text-xs font-bold text-[#E04A1F] mt-1">{opt.prix.toLocaleString()} FCFA / arrêt</p>
                                  </div>
                                  {adresses.length < opt.maxQuantite && (
                                    <button
                                      type="button"
                                      onClick={() => setCiReturnAddressOptions(prev => ({
                                        ...prev,
                                        [opt.id]: [...(prev[opt.id] ?? []), { adresse: '', lat: null, lng: null, instructions: '', contactNom: '', contactTelephone: '' }],
                                      }))}
                                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#E04A1F] hover:underline"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Ajouter un arrêt
                                    </button>
                                  )}
                                </div>
                                {adresses.map((adr, idx) => (
                                  <div key={idx} className="space-y-2 border-t border-slate-200 pt-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arrêt {idx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => setCiReturnAddressOptions(prev => ({
                                          ...prev,
                                          [opt.id]: (prev[opt.id] ?? []).filter((_, i) => i !== idx),
                                        }))}
                                        className="text-slate-400 hover:text-red-500"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <AddressAutocomplete
                                      placeholder="Adresse de l'arrêt"
                                      value={adr.adresse}
                                      onChange={(val) => setCiReturnAddressOptions(prev => {
                                        const list = [...(prev[opt.id] ?? [])];
                                        list[idx] = { ...list[idx], adresse: val, lat: null, lng: null };
                                        return { ...prev, [opt.id]: list };
                                      })}
                                      onSelect={(address, lat, lng) => setCiReturnAddressOptions(prev => {
                                        const list = [...(prev[opt.id] ?? [])];
                                        list[idx] = { ...list[idx], adresse: address, lat, lng };
                                        return { ...prev, [opt.id]: list };
                                      })}
                                      countryCode="CI"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="Nom du contact (optionnel)"
                                        value={adr.contactNom}
                                        onChange={(e) => setCiReturnAddressOptions(prev => {
                                          const list = [...(prev[opt.id] ?? [])];
                                          list[idx] = { ...list[idx], contactNom: e.target.value };
                                          return { ...prev, [opt.id]: list };
                                        })}
                                        className="text-sm"
                                      />
                                      <Input
                                        placeholder="Téléphone contact (optionnel)"
                                        value={adr.contactTelephone}
                                        onChange={(e) => setCiReturnAddressOptions(prev => {
                                          const list = [...(prev[opt.id] ?? [])];
                                          list[idx] = { ...list[idx], contactTelephone: e.target.value };
                                          return { ...prev, [opt.id]: list };
                                        })}
                                        className="text-sm"
                                      />
                                    </div>
                                    <Input
                                      placeholder="Instructions (optionnel)"
                                      value={adr.instructions}
                                      onChange={(e) => setCiReturnAddressOptions(prev => {
                                        const list = [...(prev[opt.id] ?? [])];
                                        list[idx] = { ...list[idx], instructions: e.target.value };
                                        return { ...prev, [opt.id]: list };
                                      })}
                                      className="text-sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <Label>Notes (optionnel)</Label>
                <Textarea
                  placeholder="Informations complémentaires..."
                  value={formData.specialRequests}
                  onChange={(e) => handleChange('specialRequests', e.target.value)}
                  className="h-20"
                />
              </div>
            </motion.div>
          )}

          {/* Step 1: Trip details (SN) */}
          {currentStep === 2 && !isCIBooking && (
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
                  <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F]">
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
                            ? "bg-[#ffdbd0] text-[#E04A1F] shadow-sm"
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
                                if (v.pays) setSelectedPays(v.pays);
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
                                if (v.pays) setSelectedPays(v.pays);
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

              {/* Round trip toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">Aller-retour</p>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#E04A1F] text-white">
                        -10%
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Reservez le retour et beneficiez de 10% de reduction</p>
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
                  <PlaneTakeoff className="w-5 h-5 text-[#E04A1F]" />
                  <h4 className="font-semibold text-slate-800">Informations Aller</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date de depart</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start bg-slate-50 hover:bg-slate-100 rounded-xl h-12 px-4 font-normal"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {formData.departure_date
                            ? format(new Date(formData.departure_date + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                            : <span className="text-slate-500">Selectionner une date</span>}
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
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure de depart</Label>
                    <div className="bg-slate-50 rounded-xl px-4 h-12 flex items-center">
                      <TimePicker
                        value={formData.departure_time}
                        onChange={(v) => handleChange('departure_time', v)}
                        placeholder="Choisir une heure"
                        selectedDate={formData.departure_date}
                      />
                    </div>
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

                {/* Terminal Selector for Departure */}
                {(() => {
                  // Determine which airport to check based on direction
                  const airportId = formData.direction === 'to_airport' ? selectedArriveeId : selectedDepartId;
                  const airportVille = airportId ? allVilles.find(v => v.id === airportId) : null;
                  const terminals = airportVille?.terminals ? Array.isArray(airportVille.terminals) ? airportVille.terminals : [] : [];

                  if (!terminals || terminals.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <Label>Terminal {formData.direction === 'to_airport' ? 'de destination' : 'de départ'}</Label>
                      <Select
                        value={formData.terminalDepartId?.toString() || 'none'}
                        onValueChange={(v) => handleChange('terminalDepartId', v === 'none' ? null : parseInt(v))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Sélectionner un terminal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Sans terminal --</SelectItem>
                          {terminals.map((term: any) => (
                            <SelectItem key={term.id} value={term.id.toString()}>
                              {term.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>

              {/* === RETOUR === */}
              {formData.is_round_trip && (
                <div className="border border-blue-200 rounded-2xl p-5 space-y-4 bg-blue-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <PlaneLanding className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-slate-800">Informations Retour</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date de retour</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start bg-white hover:bg-blue-50 rounded-xl h-12 px-4 font-normal"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {formData.return_date
                              ? format(new Date(formData.return_date + 'T00:00:00'), "dd/MM/yyyy", { locale: fr })
                              : <span className="text-slate-500">Selectionner une date</span>}
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
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Heure de retour</Label>
                      <div className="bg-white rounded-xl px-4 h-12 flex items-center">
                        <TimePicker
                          value={formData.return_time}
                          onChange={(v) => handleChange('return_time', v)}
                          placeholder="Choisir une heure"
                          selectedDate={formData.return_date}
                        />
                      </div>
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

                  {/* Terminal Selector for Return */}
                  {(() => {
                    // For return trip, we're going back to the original departure point
                    // So if direction was 'to_airport', we return from the airport
                    const returnAirportId = formData.direction === 'to_airport' ? selectedArriveeId : selectedDepartId;
                    const returnAirportVille = returnAirportId ? allVilles.find(v => v.id === returnAirportId) : null;
                    const returnTerminals = returnAirportVille?.terminals ? Array.isArray(returnAirportVille.terminals) ? returnAirportVille.terminals : [] : [];

                    if (!returnTerminals || returnTerminals.length === 0) return null;

                    return (
                      <div className="space-y-2">
                        <Label>Terminal de retour</Label>
                        <Select
                          value={formData.terminalRetourId?.toString() || 'none'}
                          onValueChange={(v) => handleChange('terminalRetourId', v === 'none' ? null : parseInt(v))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Sélectionner un terminal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Sans terminal --</SelectItem>
                            {returnTerminals.map((term: any) => (
                              <SelectItem key={term.id} value={term.id.toString()}>
                                {term.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
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
              <div className="flex items-center gap-3 border-l-4 border-[#E04A1F] pl-4 mb-2">
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

          {/* Step 3 CI: Vehicle category selection via quote */}
          {currentStep === 3 && isCIBooking && (
            <motion.div
              key="step3-ci"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-3xl font-extrabold text-[#171c1f] tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  Choisissez votre véhicule
                </h3>
                <p className="text-sm text-[#585e6c] mt-1 font-medium">
                  Sélectionnez le transport adapté à votre trajet en Côte d&apos;Ivoire.
                </p>
              </div>

              {ciQuoteLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#E04A1F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Calcul du devis en cours...</p>
                  </div>
                </div>
              )}

              {!ciQuoteLoading && (ciQuoteError || !ciQuote) && canFetchCIQuote && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Car className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700">Impossible de calculer le devis</p>
                  <p className="text-sm text-slate-400 mt-1">Vérifiez les adresses saisies et réessayez.</p>
                </div>
              )}

              {!ciQuoteLoading && !canFetchCIQuote && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700">Adresses manquantes</p>
                  <p className="text-sm text-slate-400 mt-1">Revenez à l&apos;étape précédente et saisissez les adresses.</p>
                </div>
              )}

              {ciQuote && !ciQuoteLoading && (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-[#E04A1F] shrink-0" />
                    <span>Distance estimée : <strong>{ciQuote.distanceKm} km</strong></span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {ciQuote.options.map((option: NavetteCIQuoteOption) => {
                      const isSelected = ciCategoryCode === option.code;
                      return (
                        <div
                          key={option.categoryId}
                          onClick={() => {
                            setCiCategoryCode(option.code);
                            setCiCategoryPrice(option.prix);
                            setCiDistanceKm(ciQuote.distanceKm);
                          }}
                          className={`group flex flex-col md:flex-row items-center gap-6 p-5 rounded-2xl cursor-pointer shadow-xl shadow-black/[0.02] border-2 transition-all ${
                            isSelected ? 'border-orange-400 bg-[#ffdbd0]/40' : 'border-transparent bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {option.image ? (
                              <img src={option.image} alt={option.label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Car className="w-12 h-12 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0 w-full">
                            <div className="flex justify-between items-start mb-3 gap-3">
                              <div>
                                <h3 className="font-extrabold text-xl text-slate-900">{option.label}</h3>
                                <p className="text-sm text-slate-500">{option.code}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-2xl text-[#E04A1F]">{Number(option.prix).toLocaleString()}</span>
                                <span className="text-xs font-bold text-slate-500 ml-1">FCFA</span>
                                {option.minimumApplique && (
                                  <p className="text-xs text-slate-400">Tarif minimum appliqué</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4 flex-wrap text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">{option.maxPax} passagers max</span>
                              </div>
                              {option.maxBagages23kg > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Plus className="w-4 h-4" />
                                  <span className="text-sm font-medium">{option.maxBagages23kg} bagage{option.maxBagages23kg > 1 ? 's' : ''} <span className="text-slate-400 font-normal">(23kg)</span></span>
                                </div>
                              )}
                              {option.maxBagages10kg > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Plus className="w-4 h-4" />
                                  <span className="text-sm font-medium">{option.maxBagages10kg} bagage{option.maxBagages10kg > 1 ? 's' : ''} <span className="text-slate-400 font-normal">(10kg)</span></span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-center w-10 shrink-0">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-orange-500 bg-[#ffdbd0]' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#E04A1F]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step 3: Vehicle selection (each trajet = 1 vehicle + 1 price) */}
          {currentStep === 3 && !isCIBooking && (
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

              {trajetsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#E04A1F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Recherche des véhicules disponibles...</p>
                  </div>
                </div>
              )}

              {!trajetsLoading && trajets.length === 0 && selectedDepartId && selectedArriveeId && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Car className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700">Aucun véhicule disponible</p>
                  <p className="text-sm text-slate-400 mt-1">Aucun trajet configuré pour cette route.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {trajets.map(trajet => {
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
                            <span className="font-extrabold text-2xl text-[#E04A1F]">{Number(price).toLocaleString()}</span>
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
                              <span className="text-sm font-medium">{v.grandBagage} grand{Number(v.grandBagage) > 1 ? 's' : ''} <span className="text-slate-400 font-normal">(23kg)</span></span>
                            </div>
                          )}
                          {v?.petitBagage != null && (
                            <div className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4" />
                              <span className="text-sm font-medium">{v.petitBagage} petit{Number(v.petitBagage) > 1 ? 's' : ''} <span className="text-slate-400 font-normal">(10kg)</span></span>
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
              {/* Options — non-CI uniquement (pour CI les options sont sur step 2) */}
              {!isCIBooking && <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3
                    className="text-xl font-bold text-[#171c1f]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Options supplementaires
                  </h3>
                </div>

                {/* Aller */}
                <div className="space-y-3">
                  {formData.is_round_trip && (
                    <p className="text-xs font-extrabold text-[#585e6c] uppercase tracking-widest">Aller</p>
                  )}
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
                          {[0, 1].map(n => (
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

                    {/* Adresses supp. aller */}
                    <div className="md:col-span-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <p className="font-medium text-slate-800">Adresses supplémentaires</p>
                          {selectedTrajet?.prixAdresseSupplementaire && (
                            <span className="text-sm text-slate-500">+{selectedTrajet.prixAdresseSupplementaire.toLocaleString()} FCFA/adresse</span>
                          )}
                        </div>
                        {formData.adressesSupplementAller.length < 3 && (
                          <button
                            type="button"
                            onClick={() => handleChange('adressesSupplementAller', [...formData.adressesSupplementAller, { adresse: '', lat: null, lng: null }])}
                            className="text-xs font-bold text-[#E04A1F] hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter
                          </button>
                        )}
                      </div>
                      {formData.adressesSupplementAller.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1">
                            <AddressAutocomplete
                              placeholder={`Adresse supplémentaire ${i + 1}`}
                              value={item.adresse}
                              onChange={(val) => {
                                const updated = [...formData.adressesSupplementAller];
                                updated[i] = { ...updated[i], adresse: val };
                                handleChange('adressesSupplementAller', updated);
                              }}
                              onSelect={(adresse, lat, lng) => {
                                const updated = [...formData.adressesSupplementAller];
                                updated[i] = { adresse, lat, lng };
                                handleChange('adressesSupplementAller', updated);
                              }}
                              countryCode={countryNameToCode(selectedPays)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChange('adressesSupplementAller', formData.adressesSupplementAller.filter((_, idx) => idx !== i))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Retour — uniquement si aller-retour */}
                {formData.is_round_trip && (
                  <div className="space-y-3 mt-5">
                    <p className="text-xs font-extrabold text-[#585e6c] uppercase tracking-widest">Retour</p>
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
                            <p className="font-medium text-slate-800">Animal</p>
                            {selectedTrajet?.prixAnimalCompagnie && (
                              <p className="text-sm text-slate-500">+{selectedTrajet.prixAnimalCompagnie.toLocaleString()} FCFA</p>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={formData.animalDeCompagnieRetour}
                          onCheckedChange={(v) => handleChange('animalDeCompagnieRetour', v)}
                        />
                      </div>

                      {/* Adresses supp. retour */}
                      <div className="md:col-span-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <p className="font-medium text-slate-800">Adresses supplémentaires</p>
                            {selectedTrajet?.prixAdresseSupplementaire && (
                              <span className="text-sm text-slate-500">+{selectedTrajet.prixAdresseSupplementaire.toLocaleString()} FCFA/adresse</span>
                            )}
                          </div>
                          {formData.adressesSupplementRetour.length < 3 && (
                            <button
                              type="button"
                              onClick={() => handleChange('adressesSupplementRetour', [...formData.adressesSupplementRetour, { adresse: '', lat: null, lng: null }])}
                              className="text-xs font-bold text-[#E04A1F] hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter
                            </button>
                          )}
                        </div>
                        {formData.adressesSupplementRetour.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1">
                              <AddressAutocomplete
                                placeholder={`Adresse supplémentaire ${i + 1}`}
                                value={item.adresse}
                                onChange={(val) => {
                                  const updated = [...formData.adressesSupplementRetour];
                                  updated[i] = { ...updated[i], adresse: val };
                                  handleChange('adressesSupplementRetour', updated);
                                }}
                                onSelect={(adresse, lat, lng) => {
                                  const updated = [...formData.adressesSupplementRetour];
                                  updated[i] = { adresse, lat, lng };
                                  handleChange('adressesSupplementRetour', updated);
                                }}
                                countryCode={countryNameToCode(selectedPays)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleChange('adressesSupplementRetour', formData.adressesSupplementRetour.filter((_, idx) => idx !== i))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>}

              {/* Payment method */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F]">
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
                            ? "ring-2 ring-[#E04A1F] shadow-lg shadow-[#E04A1F]/10"
                            : "ring-1 ring-slate-200 hover:ring-slate-300 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              selected
                                ? "bg-[#ffdbd0] text-[#E04A1F]"
                                : "bg-[#dfe3e7] text-slate-500"
                            }`}
                          >
                            {isCompany ? <Users className="w-6 h-6" /> : <User className="w-6 h-6" />}
                          </div>
                          {selected && (
                            <div className="w-6 h-6 rounded-full bg-[#E04A1F] flex items-center justify-center">
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
                  {formData.adressesSupplementAller.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-slate-600 truncate">{a.adresse || `Adresse supp. ${i + 1}`}</span>
                      <span className="text-slate-800 shrink-0">+{(selectedTrajet?.prixAdresseSupplementaire || 0).toLocaleString()} FCFA</span>
                    </div>
                  ))}
                  {formData.is_round_trip && getRoundTripDiscount() > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-700 font-medium">Reduction aller-retour (-10%)</span>
                      <span className="text-emerald-700 font-semibold">-{getRoundTripDiscount().toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-lg font-semibold text-slate-800">{user?.isTva ? 'Total HT' : 'Total'}</span>
                    <span className={`font-bold ${user?.isTva ? 'text-lg text-slate-800' : 'text-2xl text-[#E04A1F]'}`}>{calculateTotal().toLocaleString()} FCFA</span>
                  </div>
                  {user?.isTva && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">TVA (18%)</span>
                        <span className="font-medium text-slate-800">{Math.round(calculateTotal() * 0.18).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-lg font-semibold text-slate-800">Total TTC</span>
                        <span className="text-2xl font-bold text-[#E04A1F]">{Math.round(calculateTotal() * 1.18).toLocaleString()} FCFA</span>
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

              <div className="space-y-4">

                {/* ── Client ── */}
                <div className="p-5 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Client</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E04A1F] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {formData.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{formData.clientName}</p>
                      <p className="text-sm text-slate-500">{formData.clientPhone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {formData.clientEmail && (
                      <div>
                        <p className="text-xs text-slate-400">Email</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{formData.clientEmail}</p>
                      </div>
                    )}
                    {formData.clientAddress && (
                      <div>
                        <p className="text-xs text-slate-400">Adresse</p>
                        <p className="text-sm font-medium text-slate-700">{formData.clientAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Résumé du trajet ── */}
                <div className="p-5 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Trajet</p>
                    {isCIBooking ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#ffdbd0] text-orange-700 font-bold">
                        {ciSens === 'airport_to_city' ? 'Aéroport → Ville' : 'Ville → Aéroport'}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#ffdbd0] text-orange-700 font-bold">
                          {formData.is_round_trip ? 'Aller-retour' : 'Aller simple'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                          {formData.direction === 'from_airport' ? 'Depuis aeroport' : 'Vers aeroport'}
                        </span>
                      </>
                    )}
                  </div>

                  {isCIBooking ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#E04A1F] mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">Départ</p>
                            <p className="text-sm font-bold text-slate-900 break-words">{ciDepartAddressDisplay || formData.address || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">Arrivée</p>
                            <p className="text-sm font-bold text-slate-900 break-words">{ciArriveeAddressDisplay || formData.return_address || '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <p className="text-xs text-slate-400">Passagers</p>
                          <p className="font-medium text-slate-700">{formData.passengers}</p>
                        </div>
                        {ciBagages23 > 0 && (
                          <div>
                            <p className="text-xs text-slate-400">Bagages 23kg</p>
                            <p className="font-medium text-slate-700">{ciBagages23}</p>
                          </div>
                        )}
                        {ciBagages10 > 0 && (
                          <div>
                            <p className="text-xs text-slate-400">Bagages 10kg</p>
                            <p className="font-medium text-slate-700">{ciBagages10}</p>
                          </div>
                        )}
                        {formData.flight_number && (
                          <div>
                            <p className="text-xs text-slate-400">Numéro de vol</p>
                            <p className="font-medium text-slate-700">{formData.flight_number}</p>
                          </div>
                        )}
                        {ciDistanceKm > 0 && (
                          <div>
                            <p className="text-xs text-slate-400">Distance</p>
                            <p className="font-medium text-slate-700">{ciDistanceKm} km</p>
                          </div>
                        )}
                      </div>

                      {/* Options supplémentaires sélectionnées */}
                      {(Object.values(ciSimpleOptions).some(q => q > 0) || Object.values(ciAddressOptions).some(a => a.length > 0)) && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <p className="text-xs text-slate-400">Options supplémentaires</p>
                          {Object.entries(ciSimpleOptions).map(([id, qty]) => {
                            if (!qty) return null;
                            const opt = ciOptions.find(o => o.id === Number(id));
                            if (!opt) return null;
                            return (
                              <div key={id} className="flex justify-between text-sm">
                                <span className="text-slate-600">{opt.label} ×{qty}</span>
                                <span className="font-medium text-slate-800">+{(opt.prix * qty).toLocaleString()} FCFA</span>
                              </div>
                            );
                          })}
                          {Object.entries(ciAddressOptions).map(([id, adrs]) => {
                            if (!adrs.length) return null;
                            const opt = ciOptions.find(o => o.id === Number(id));
                            if (!opt) return null;
                            return (
                              <div key={id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">{opt.label} ({adrs.length} arrêt{adrs.length > 1 ? 's' : ''})</span>
                                  <span className="font-medium text-slate-800">
                                    {opt.pricingMode === 'FLAT'
                                      ? `+${(opt.prix * adrs.length).toLocaleString()} FCFA`
                                      : 'Calculé au km'}
                                  </span>
                                </div>
                                {adrs.map((a, i) => (
                                  <div key={i} className="flex items-start gap-1.5 pl-3">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="text-xs text-slate-500">{a.adresse || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        {(() => {
                          const villeDepart = allVilles.find(v => v.id === selectedDepartId);
                          const villeArrivee = allVilles.find(v => v.id === selectedArriveeId);
                          const nomDepart = getVilleName(villeDepart) || '—';
                          const nomArrivee = getVilleName(villeArrivee) || '—';
                          return (
                            <>
                              <div className="flex items-center gap-2">
                                <PlaneTakeoff className="w-4 h-4 text-[#E04A1F] shrink-0" />
                                <p className="font-bold text-slate-900">{nomDepart} <span className="text-slate-400">→</span> {nomArrivee}</p>
                              </div>
                              {formData.is_round_trip && (
                                <div className="flex items-center gap-2">
                                  <PlaneLanding className="w-4 h-4 text-blue-500 shrink-0" />
                                  <p className="font-bold text-slate-900">{nomArrivee} <span className="text-slate-400">→</span> {nomDepart}</p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-xs text-slate-400">Passagers</p>
                          <p className="font-medium text-slate-700">{formData.passengers}</p>
                        </div>
                        {formData.direction === 'from_airport' && formData.flight_number && (
                          <div>
                            <p className="text-xs text-slate-400">Numero de vol</p>
                            <p className="font-medium text-slate-700">{formData.flight_number}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* ── Aller ── */}
                <div className="p-5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff className="w-4 h-4 text-[#E04A1F]" />
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Aller</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Date & Heure</p>
                      <p className="font-medium text-slate-800">
                        {formData.departure_date && format(new Date(formData.departure_date), 'dd MMM yyyy', { locale: fr })}
                        {' a '}{formData.departure_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Adresse de prise en charge</p>
                      <p className="text-sm font-medium text-slate-700">{formData.address}</p>
                    </div>
                  </div>
                  {formData.adressesSupplementAller.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Arrets supplementaires</p>
                      <div className="space-y-1">
                        {formData.adressesSupplementAller.map((a, i) => (
                          <p key={i} className="text-sm text-slate-700 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {a.adresse || '—'}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Retour ── */}
                {formData.is_round_trip && (
                  <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <PlaneLanding className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Retour</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Date & Heure</p>
                        <p className="font-medium text-slate-800">
                          {formData.return_date && format(new Date(formData.return_date), 'dd MMM yyyy', { locale: fr })}
                          {' a '}{formData.return_time}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Adresse de prise en charge</p>
                        <p className="text-sm font-medium text-slate-700">{formData.return_address}</p>
                      </div>
                    </div>
                    {formData.adressesSupplementRetour.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Arrets supplementaires</p>
                        <div className="space-y-1">
                          {formData.adressesSupplementRetour.map((a, i) => (
                            <p key={i} className="text-sm text-slate-700 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {a.adresse || '—'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Véhicule ── */}
                {selectedTrajet?.vehicule && (
                  <div className="p-5 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Vehicule</p>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const img = Array.isArray(selectedTrajet.vehicule.image)
                          ? selectedTrajet.vehicule.image[0]
                          : selectedTrajet.vehicule.image;
                        return img ? (
                          <img src={img} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Car className="w-6 h-6 text-slate-300" />
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 capitalize">
                          {selectedTrajet.vehicule.categorie || selectedTrajet.vehicule.marque || 'Vehicule'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[selectedTrajet.vehicule.marque, selectedTrajet.vehicule.modele || selectedTrajet.vehicule.model].filter(Boolean).join(' ') || ''}
                          {[selectedTrajet.vehicule.marque, selectedTrajet.vehicule.modele || selectedTrajet.vehicule.model].filter(Boolean).length > 0 ? ' ou equivalent' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap text-slate-600 pt-1">
                      {selectedTrajet.vehicule.places != null && (
                        <span className="text-sm"><span className="font-medium">{selectedTrajet.vehicule.places}</span> places</span>
                      )}
                      {selectedTrajet.vehicule.grandBagage != null && (
                        <span className="text-sm"><span className="font-medium">{selectedTrajet.vehicule.grandBagage}</span> grand{Number(selectedTrajet.vehicule.grandBagage) > 1 ? 's' : ''} <span className="text-slate-400">(23kg)</span></span>
                      )}
                      {selectedTrajet.vehicule.petitBagage != null && (
                        <span className="text-sm"><span className="font-medium">{selectedTrajet.vehicule.petitBagage}</span> petit{Number(selectedTrajet.vehicule.petitBagage) > 1 ? 's' : ''} <span className="text-slate-400">(10kg)</span></span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Options ── */}
                {(formData.siegeBebes > 0 || formData.animalDeCompagnie ||
                  formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour) && (
                  <div className="p-5 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Options</p>
                    <div className="space-y-1.5 text-sm">
                      {formData.siegeBebes > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Siege bebe (aller)</span>
                          <span className="font-medium text-slate-800">+{((selectedTrajet?.prixSiegeBebe || 0) * formData.siegeBebes).toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {formData.animalDeCompagnie && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Animal de compagnie (aller)</span>
                          <span className="font-medium text-slate-800">+{(selectedTrajet?.prixAnimalCompagnie || 0).toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {formData.adressesSupplementAller.map((a, i) => (
                        <div key={i} className="flex justify-between gap-3">
                          <span className="text-slate-600 truncate">{a.adresse || `Adresse supp. aller ${i + 1}`}</span>
                          <span className="font-medium text-slate-800 shrink-0">+{(selectedTrajet?.prixAdresseSupplementaire || 0).toLocaleString()} FCFA</span>
                        </div>
                      ))}
                      {formData.siegeBebesRetour > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Siege bebe (retour)</span>
                          <span className="font-medium text-slate-800">+{((selectedTrajet?.prixSiegeBebe || 0) * formData.siegeBebesRetour).toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {formData.animalDeCompagnieRetour && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Animal de compagnie (retour)</span>
                          <span className="font-medium text-slate-800">+{(selectedTrajet?.prixAnimalCompagnie || 0).toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {formData.adressesSupplementRetour.map((a, i) => (
                        <div key={i} className="flex justify-between gap-3">
                          <span className="text-slate-600 truncate">{a.adresse || `Adresse supp. retour ${i + 1}`}</span>
                          <span className="font-medium text-slate-800 shrink-0">+{(selectedTrajet?.prixAdresseSupplementaire || 0).toLocaleString()} FCFA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Informations supplémentaires ── */}
                {formData.specialRequests && (
                  <div className="p-5 rounded-xl border border-slate-200">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Informations supplementaires</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{formData.specialRequests}</p>
                  </div>
                )}

              </div>

              {/* ── Paiement & Total ── */}
              <div className="p-6 rounded-xl bg-[#ffdbd0]/40 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Mode de paiement</span>
                  <span className="font-medium text-slate-800">
                    {paymentMethods.find((m: { id: string; label: string }) => m.id === formData.payment_method)?.label || 'Non selectionne'}
                  </span>
                </div>
                {formData.is_round_trip && getRoundTripDiscount() > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-emerald-700 font-medium">Reduction aller-retour (-10%)</span>
                    <span className="text-emerald-700 font-semibold">-{getRoundTripDiscount().toLocaleString()} FCFA</span>
                  </div>
                )}
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
        {currentStep === 5 ? null : currentStep === 1 ? (
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
              <div className="flex items-center gap-2 text-sm font-bold text-[#E04A1F]">
                <ArrowRight className="w-4 h-4" />
                <span>Reservations express</span>
              </div>
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#E04A1F]/10 rounded-full blur-2xl" />
            </div>

            {/* Besoin d'aide */}
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0">
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
              {premiumVehicleImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={premiumVehicleImage}
                  alt="Vehicule premium"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Car className="absolute -right-6 -top-6 w-32 h-32 text-white/10" strokeWidth={1.5} />
              )}
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
                <div className="w-2.5 h-2.5 rounded-full bg-[#E04A1F]" />
                <div className="w-0.5 h-10 bg-[#dfe3e7]" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[#E04A1F]" />
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
                      return getVilleName(arrivee) || ciArriveeAddressDisplay || formData.return_address || "—";
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
                <span className="text-slate-500 shrink-0">{formData.is_round_trip ? "Aller" : "Date & heure"}</span>
                <span className="font-bold text-[#171c1f] text-right">
                  {formData.departure_date
                    ? `${format(new Date(formData.departure_date), "dd MMM", { locale: fr })}, ${formData.departure_time || "—"}`
                    : "—"}
                </span>
              </div>
              {formData.is_round_trip && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Retour</span>
                  <span className="font-bold text-[#171c1f] text-right">
                    {formData.return_date
                      ? `${format(new Date(formData.return_date), "dd MMM", { locale: fr })}, ${formData.return_time || "—"}`
                      : "—"}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Passagers</span>
                <span className="font-bold text-[#171c1f]">{formData.passengers}</span>
              </div>
              {isCIBooking && ciBagages23 > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Bagages 23kg</span>
                  <span className="font-bold text-[#171c1f]">{ciBagages23}</span>
                </div>
              )}
              {isCIBooking && ciBagages10 > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Bagages 10kg</span>
                  <span className="font-bold text-[#171c1f]">{ciBagages10}</span>
                </div>
              )}
              {isCIBooking && Object.entries(ciSimpleOptions).map(([id, qty]) => {
                if (!qty) return null;
                const opt = ciOptions.find(o => o.id === Number(id));
                if (!opt) return null;
                return (
                  <div key={id} className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0 truncate">{opt.label}</span>
                    <span className="font-bold text-[#171c1f]">×{qty}</span>
                  </div>
                );
              })}
              {isCIBooking && Object.entries(ciAddressOptions).map(([id, adrs]) => {
                if (!adrs.length) return null;
                const opt = ciOptions.find(o => o.id === Number(id));
                if (!opt) return null;
                return (
                  <div key={id} className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0 truncate">{opt.label}</span>
                    <span className="font-bold text-[#171c1f]">{adrs.length} arrêt{adrs.length > 1 ? 's' : ''}</span>
                  </div>
                );
              })}
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
              <span className="text-sm text-slate-500">
                {isCIBooking ? "Véhicule" : formData.is_round_trip ? "Tarif aller-retour" : "Tarif de base"}
              </span>
              <span className="text-sm font-medium text-[#171c1f]">
                {isCIBooking
                  ? (ciCategoryPrice > 0 ? `${ciCategoryPrice.toLocaleString()} FCFA` : "—")
                  : selectedTrajet ? `${getTrajetBase().toLocaleString()} FCFA` : "—"}
              </span>
            </div>
            {isCIBooking && Object.entries(ciSimpleOptions).map(([id, qty]) => {
              if (!qty) return null;
              const opt = ciOptions.find(o => o.id === Number(id));
              if (!opt) return null;
              return (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{opt.label} ×{qty}</span>
                  <span className="text-sm font-medium text-[#171c1f]">
                    +{(opt.prix * qty).toLocaleString()} FCFA
                  </span>
                </div>
              );
            })}
            {isCIBooking && Object.entries(ciAddressOptions).map(([id, adrs]) => {
              if (!adrs.length) return null;
              const opt = ciOptions.find(o => o.id === Number(id));
              if (!opt) return null;
              return (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{opt.label} ×{adrs.length}</span>
                  <span className="text-sm font-medium text-[#171c1f]">
                    {opt.pricingMode === 'FLAT'
                      ? `+${(opt.prix * adrs.length).toLocaleString()} FCFA`
                      : 'Calculé au km'}
                  </span>
                </div>
              );
            })}
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
            {formData.adressesSupplementAller.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Arrets sup. (x{formData.adressesSupplementAller.length})</span>
                <span className="text-sm font-medium text-[#171c1f]">
                  +{((selectedTrajet?.prixAdresseSupplementaire || 0) * formData.adressesSupplementAller.length).toLocaleString()} FCFA
                </span>
              </div>
            )}
            {formData.is_round_trip && getRoundTripDiscount() > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-700">Reduction A/R (-10%)</span>
                <span className="text-sm font-semibold text-emerald-700">
                  -{getRoundTripDiscount().toLocaleString()} FCFA
                </span>
              </div>
            )}
            <div className="flex justify-between items-end pt-4 border-t border-[#dfe3e7]">
              <span className="font-bold text-lg text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Total</span>
              <div className="text-right">
                {formData.payment_method === "company_account" && (
                  <p className="text-[10px] text-[#E04A1F] font-bold uppercase tracking-widest">
                    Payable par l&apos;entreprise
                  </p>
                )}
                <p
                  className="text-2xl font-black text-[#E04A1F] tracking-tight"
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
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isEdit ? updateBooking.isPending : (createBooking.isPending || createCIBooking.isPending)}
            className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold text-base shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl active:scale-95 transition-all"
          >
            {isEdit
              ? (updateBooking.isPending ? 'Enregistrement...' : 'Enregistrer les modifications')
              : ((createBooking.isPending || createCIBooking.isPending) ? 'Confirmation...' : `Confirmer - ${calculateTotal().toLocaleString()} FCFA`)}
          </Button>
        )}
      </div>
    </div>
  );
}
