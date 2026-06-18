'use client';

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api, Ville, TrajetInterVille, CreateInterCityBookingDto,
  EmployeeResponse, CreateEmployeeDto, DepartmentResponse,
} from "@/lib/api";
import type { BookingResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin, Route, ArrowRightLeft, Calendar as CalendarIcon, Car, CreditCard, Check,
  ArrowRight, ArrowLeft, CheckCircle2, Shield, Plus, Baby, PawPrint, Users, Briefcase,
  Clock, User, Phone, Mail, Home, Search, UserPlus, Info, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { AddressAutocomplete, countryNameToCode } from "@/components/ui/address-autocomplete";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type InterCityPaymentMethod = string;

interface AdresseSupplementItem {
  adresse: string;
  lat: number | null;
  lng: number | null;
}

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FormData {
  clientName: string; clientEmail: string; clientPhone: string; clientAddress: string; employeeId: number | null;
  trajetInterVilleId: number | null; vehiculeId: number | null; departureCity: string; arrivalCity: string;
  pickupDateAller: string; pickupTimeAller: string; isOneWay: boolean;
  adressePriseEnChargeDepartAller: string; adressePriseEnChargeDepartAllerLat: number | null; adressePriseEnChargeDepartAllerLng: number | null;
  adressePriseEnChargeArriveeAller: string; adressePriseEnChargeArriveeAllerLat: number | null; adressePriseEnChargeArriveeAllerLng: number | null;
  adressePriseEnChargeDepartRetour: string; adressePriseEnChargeDepartRetourLat: number | null; adressePriseEnChargeDepartRetourLng: number | null;
  adressePriseEnChargeArriveeRetour: string; adressePriseEnChargeArriveeRetourLat: number | null; adressePriseEnChargeArriveeRetourLng: number | null;
  siegeBebes: number; animalDeCompagnie: boolean; adressesSupplementAller: AdresseSupplementItem[]; smallBags: number; largeBags: number;
  specialRequests: string; pickupDateRetour: string; pickupTimeRetour: string; siegeBebesRetour: number; animalDeCompagnieRetour: boolean;
  adressesSupplementRetour: AdresseSupplementItem[]; paymentMethod: InterCityPaymentMethod | '';
  ci_departAddress: string; ci_departLat: number | null; ci_departLng: number | null;
  ci_arriveeAddress: string; ci_arriveeLat: number | null; ci_arriveeLng: number | null;
  ci_categoryCode: string;
  ci_selectedOptions: Array<{ code: string; quantite: number }>;
  ci_selectedOptionsRetour: Array<{ code: string; quantite: number }>;
  ci_adressesSupplementAller: AdresseSupplementItem[];
  ci_adressesSupplementRetour: AdresseSupplementItem[];
  ci_departAddressRetour: string; ci_departLatRetour: number | null; ci_departLngRetour: number | null;
  ci_arriveeAddressRetour: string; ci_arriveeLatRetour: number | null; ci_arriveeLngRetour: number | null;
  ci_pickupDateRetour: string; ci_pickupTimeRetour: string;
}

const steps: Step[] = [
  { id: 1, title: "Client", icon: User }, { id: 2, title: "Trajet", icon: MapPin },
  { id: 3, title: "Vehicule", icon: Car }, { id: 4, title: "Paiement", icon: CreditCard },
  { id: 5, title: "Confirmation", icon: Check },
];

export default function InterCityBookingWizard({
  mode = 'create', bookingId, initialData,
}: { mode?: 'create' | 'edit'; bookingId?: number; initialData?: BookingResponse } = {}) {
  const isEdit = mode === 'edit';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState("");

  const initialFormData: FormData = {
    clientName: "", clientEmail: "", clientPhone: "", clientAddress: "", employeeId: null,
    trajetInterVilleId: null, vehiculeId: null, departureCity: "", arrivalCity: "",
    pickupDateAller: "", pickupTimeAller: "", isOneWay: true,
    adressePriseEnChargeDepartAller: "", adressePriseEnChargeDepartAllerLat: null, adressePriseEnChargeDepartAllerLng: null,
    adressePriseEnChargeArriveeAller: "", adressePriseEnChargeArriveeAllerLat: null, adressePriseEnChargeArriveeAllerLng: null,
    adressePriseEnChargeDepartRetour: "", adressePriseEnChargeDepartRetourLat: null, adressePriseEnChargeDepartRetourLng: null,
    adressePriseEnChargeArriveeRetour: "", adressePriseEnChargeArriveeRetourLat: null, adressePriseEnChargeArriveeRetourLng: null,
    siegeBebes: 0, animalDeCompagnie: false, adressesSupplementAller: [], smallBags: 0, largeBags: 0,
    specialRequests: "", pickupDateRetour: "", pickupTimeRetour: "", siegeBebesRetour: 0, animalDeCompagnieRetour: false, adressesSupplementRetour: [],
    paymentMethod: "",
    ci_departAddress: "", ci_departLat: null, ci_departLng: null,
    ci_arriveeAddress: "", ci_arriveeLat: null, ci_arriveeLng: null,
    ci_categoryCode: "",
    ci_selectedOptions: [],
    ci_selectedOptionsRetour: [],
    ci_adressesSupplementAller: [],
    ci_adressesSupplementRetour: [],
    ci_departAddressRetour: "", ci_departLatRetour: null, ci_departLngRetour: null,
    ci_arriveeAddressRetour: "", ci_arriveeLatRetour: null, ci_arriveeLngRetour: null,
    ci_pickupDateRetour: "", ci_pickupTimeRetour: "",
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // États communs
  const [selectedPays, setSelectedPays] = useState<string>("");
  const [selectedDepartId, setSelectedDepartId] = useState<number | null>(null);
  const [selectedArriveeId, setSelectedArriveeId] = useState<number | null>(null);
  const [departPopoverOpen, setDepartPopoverOpen] = useState(false);
  const [arriveePopoverOpen, setArriveePopoverOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [vehiclePage, setVehiclePage] = useState(0);
  const VEHICLES_PER_PAGE = 4;

  // ---- Queries partagées ----
  const { data: paymentOptionsResponse } = useQuery({ queryKey: ['payment-options'], queryFn: () => api.reference.getPaymentOptions() });
  const paymentMethods = [
    { value: "company_account", label: "Compte entreprise", desc: "L'entreprise paie via Bictorys", icon: "🏢" },
    { value: "client", label: "Client / Employe", desc: "Le client ou l'employe paie lui-meme", icon: "👤" },
  ];

  const { data: paysResponse } = useQuery({ queryKey: ['pays'], queryFn: () => api.reference.getPays() });
  const paysArr: unknown[] = Array.isArray(paysResponse) ? paysResponse : Array.isArray((paysResponse as any)?.data) ? (paysResponse as any).data : [];
  const pays: string[] = paysArr.map((p: unknown) => typeof p === 'string' ? p : (p as Record<string, unknown>)?.nom as string || '').filter(Boolean);

  // ---- Sénégal ----
  const { data: villesResponse } = useQuery({ queryKey: ['villes', selectedPays], queryFn: () => api.reference.getVilles(selectedPays), enabled: !!selectedPays && selectedPays !== "Côte d'Ivoire" });
  const allVilles: Ville[] = Array.isArray(villesResponse) ? villesResponse : (villesResponse as any)?.data || [];
  const villes = allVilles.filter(v => !v.isAeroport);

  const { data: trajetsResponse, isLoading: trajetsLoading } = useQuery({ queryKey: ['trajet-inter-ville'], queryFn: () => api.reference.getTrajetInterVille() });
  const trajets: TrajetInterVille[] = (() => {
    const r = trajetsResponse as any;
    if (Array.isArray(r?.list)) return r.list;
    if (Array.isArray(r?.data?.list)) return r.data.list;
    if (Array.isArray(r?.data)) return r.data;
    return [];
  })();

  // ---- CI ----
  const { data: ciCategories, isLoading: ciCatLoading } = useQuery({
    queryKey: ['interville-ci-categories'], queryFn: () => api.reference.getInterCityCiCategories(),
    enabled: selectedPays === "Côte d'Ivoire",
  });
  const { data: ciOptions, isLoading: ciOptLoading } = useQuery({
    queryKey: ['interville-ci-options'], queryFn: () => api.reference.getInterCityCiOptions(),
    enabled: selectedPays === "Côte d'Ivoire",
  });

  // ---- CI Quote/Price ----
  const [ciQuote, setCiQuote] = useState<any>(null);
  const [ciPrice, setCiPrice] = useState<any>(null);
  const [ciQuoteLoading, setCiQuoteLoading] = useState(false);

  // 1er useEffect : devis (quote)
  useEffect(() => {
    if (selectedPays !== "Côte d'Ivoire") return;
    const { ci_departLat, ci_departLng, ci_arriveeLat, ci_arriveeLng, isOneWay } = formData;
    if (!ci_departLat || !ci_departLng || !ci_arriveeLat || !ci_arriveeLng) return;
    setCiQuoteLoading(true);
    api.bookings.getInterCityCiQuote({
      departLat: ci_departLat, departLng: ci_departLng,
      arriveeLat: ci_arriveeLat, arriveeLng: ci_arriveeLng,
      pax: 1, bagages23: 0, bagages10: 0, isOneWay,
    }).then(res => { setCiQuote(res); setCiQuoteLoading(false); })
      .catch(() => { setCiQuote(null); setCiQuoteLoading(false); });
  }, [formData.ci_departLat, formData.ci_departLng, formData.ci_arriveeLat, formData.ci_arriveeLng, formData.isOneWay, selectedPays]);

  // 2ème useEffect : prix final (price) avec options (uniquement SIMPLE, pas ADDRESS)
  useEffect(() => {
    if (selectedPays !== "Côte d'Ivoire") return;
    const { ci_categoryCode, ci_departLat, ci_departLng, ci_arriveeLat, ci_arriveeLng, isOneWay } = formData;
    if (!ci_categoryCode || !ci_departLat || !ci_departLng || !ci_arriveeLat || !ci_arriveeLng) return;

    // On filtre les options pour ne garder que celles qui ne sont pas ADRESSE_SUPP
    const optionsAller = formData.ci_selectedOptions
      .filter(opt => {
        const def = (ciOptions as any[])?.find(o => o.code === opt.code);
        return def?.type !== 'ADDRESS';
      })
      .map(opt => ({ code: opt.code, quantite: opt.quantite }));

    let optionsRetour: Array<{ code: string; quantite: number }> = [];
    if (!isOneWay) {
      optionsRetour = formData.ci_selectedOptionsRetour
        .filter(opt => {
          const def = (ciOptions as any[])?.find(o => o.code === opt.code);
          return def?.type !== 'ADDRESS';
        })
        .map(opt => ({ code: opt.code, quantite: opt.quantite }));
    }

    setCiQuoteLoading(true);
    api.bookings.getInterCityCiPrice({
      categoryCode: ci_categoryCode,
      departLat: ci_departLat, departLng: ci_departLng,
      arriveeLat: ci_arriveeLat, arriveeLng: ci_arriveeLng,
      pax: 1, bagages23: 0, bagages10: 0, isOneWay,
      options: optionsAller.length > 0 ? optionsAller : undefined,
      optionsRetour: optionsRetour.length > 0 ? optionsRetour : undefined,
    }).then(res => { setCiPrice(res); setCiQuoteLoading(false); })
      .catch(() => { setCiPrice(null); setCiQuoteLoading(false); });
  }, [
    formData.ci_categoryCode,
    formData.ci_selectedOptions,
    formData.ci_selectedOptionsRetour,
    formData.ci_departLat,
    formData.ci_departLng,
    formData.ci_arriveeLat,
    formData.ci_arriveeLng,
    formData.isOneWay,
    selectedPays,
    ciOptions
  ]);

  // Employés / Départements
  const { data: employeesResponse } = useQuery({ queryKey: ['employees'], queryFn: () => api.employees.list({ limit: 100, actif: true }) });
  const employeesRaw = employeesResponse?.data;
  const employees: EmployeeResponse[] = Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as any)?.items || [];
  const { data: departmentsResponse } = useQuery({ queryKey: ['departments'], queryFn: () => api.departments.list(1, 100) });
  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData) ? deptData : (deptData as any)?.items || [];

  // Helpers
  const getVilleName = (v?: Ville | null) => v?.nom || v?.name || '';
  const selectedTrajet = trajets.find(t => t.id === formData.trajetInterVilleId);
  const matchingTrajets = (selectedDepartId && selectedArriveeId && selectedPays !== "Côte d'Ivoire")
    ? trajets.filter(t => t.villeDepart?.id === selectedDepartId && t.villeArrivee?.id === selectedArriveeId) : [];

  // CI options handlers
  const getCIOptionQty = (code: string) => formData.ci_selectedOptions.find(o => o.code === code)?.quantite || 0;
  const updateCIOption = (code: string, delta: number) => {
    const existing = formData.ci_selectedOptions.find(o => o.code === code);
    if (existing) {
      const newQty = existing.quantite + delta;
      if (newQty <= 0) setFormData(prev => ({ ...prev, ci_selectedOptions: prev.ci_selectedOptions.filter(o => o.code !== code) }));
      else setFormData(prev => ({ ...prev, ci_selectedOptions: prev.ci_selectedOptions.map(o => o.code === code ? { ...o, quantite: newQty } : o) }));
    } else if (delta > 0) {
      setFormData(prev => ({ ...prev, ci_selectedOptions: [...prev.ci_selectedOptions, { code, quantite: delta }] }));
    }
  };

  const getCIOptionQtyRetour = (code: string) => formData.ci_selectedOptionsRetour.find(o => o.code === code)?.quantite || 0;
  const updateCIOptionRetour = (code: string, delta: number) => {
    const existing = formData.ci_selectedOptionsRetour.find(o => o.code === code);
    if (existing) {
      const newQty = existing.quantite + delta;
      if (newQty <= 0) setFormData(prev => ({ ...prev, ci_selectedOptionsRetour: prev.ci_selectedOptionsRetour.filter(o => o.code !== code) }));
      else setFormData(prev => ({ ...prev, ci_selectedOptionsRetour: prev.ci_selectedOptionsRetour.map(o => o.code === code ? { ...o, quantite: newQty } : o) }));
    } else if (delta > 0) {
      setFormData(prev => ({ ...prev, ci_selectedOptionsRetour: [...prev.ci_selectedOptionsRetour, { code, quantite: delta }] }));
    }
  };

  // Adresses supplémentaires CI
  const addCIAdresse = () => {
    if (formData.ci_adressesSupplementAller.length >= 3) return;
    setFormData(prev => ({ ...prev, ci_adressesSupplementAller: [...prev.ci_adressesSupplementAller, { adresse: '', lat: null, lng: null }] }));
  };
  const removeCIAdresse = (idx: number) => setFormData(prev => ({ ...prev, ci_adressesSupplementAller: prev.ci_adressesSupplementAller.filter((_, i) => i !== idx) }));
  const updateCIAdresse = (idx: number, address: string, lat: number | null, lng: number | null) => {
    const newArr = [...formData.ci_adressesSupplementAller];
    newArr[idx] = { adresse: address, lat, lng };
    setFormData(prev => ({ ...prev, ci_adressesSupplementAller: newArr }));
  };

  const addCIAdresseRetour = () => {
    if (formData.ci_adressesSupplementRetour.length >= 3) return;
    setFormData(prev => ({ ...prev, ci_adressesSupplementRetour: [...prev.ci_adressesSupplementRetour, { adresse: '', lat: null, lng: null }] }));
  };
  const removeCIAdresseRetour = (idx: number) => setFormData(prev => ({ ...prev, ci_adressesSupplementRetour: prev.ci_adressesSupplementRetour.filter((_, i) => i !== idx) }));
  const updateCIAdresseRetour = (idx: number, address: string, lat: number | null, lng: number | null) => {
    const newArr = [...formData.ci_adressesSupplementRetour];
    newArr[idx] = { adresse: address, lat, lng };
    setFormData(prev => ({ ...prev, ci_adressesSupplementRetour: newArr }));
  };

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  useEffect(() => { setVehiclePage(0); }, [selectedDepartId, selectedArriveeId]);

  const handleSwapCities = () => {
    const newDep = selectedArriveeId;
    const newArr = selectedDepartId;
    setSelectedDepartId(newDep);
    setSelectedArriveeId(newArr);
    handleChange('trajetInterVilleId', null);
    handleChange('vehiculeId', null);
  };

  const cleanPhone = (phone: string) => phone.replace(/[\s\-\.\(\)]/g, '');
  const isValidPhone = (phone: string) => /^\+?\d{7,15}$/.test(cleanPhone(phone));
  const formatPhoneForApi = (phone: string) => {
    const digits = cleanPhone(phone);
    const match = digits.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      const [, code, num] = match;
      return `${code} ${num.replace(/(\d{2})(?=\d)/g, '$1 ')}`;
    }
    return phone;
  };
  const phoneError = formData.clientPhone && !isValidPhone(formData.clientPhone);

  // Calcul total
  const calculateTotal = () => {
    if (selectedPays === "Côte d'Ivoire") {
      const baseAller = ciPrice?.prixAller ?? ciQuote?.options?.[0]?.prixAller ?? ciQuote?.options?.[0]?.prix ?? 0;
      const baseRetour = ciPrice?.prixRetour ?? ciQuote?.options?.[0]?.prixRetour ?? 0;
      const optionsAller = ciPrice?.aller?.montantOptions ?? 0;
      const optionsRetour = ciPrice?.retour?.montantOptions ?? 0;
      let total = baseAller + optionsAller;
      if (!formData.isOneWay) {
        total += baseRetour + optionsRetour;
      }
      return total;
    } else {
      if (!selectedTrajet) return 0;
      const base = selectedTrajet.prixAllerSimple ?? selectedTrajet.prix ?? 0;
      let total = base;
      if (formData.siegeBebes > 0) total += formData.siegeBebes * (selectedTrajet.prixSiegeBebe ?? 5000);
      if (formData.animalDeCompagnie) total += selectedTrajet.prixAnimalCompagnie ?? 5000;
      if (!formData.isOneWay) {
        total += selectedTrajet.prixAllerRetour || base;
        if (formData.siegeBebesRetour > 0) total += formData.siegeBebesRetour * (selectedTrajet.prixSiegeBebe ?? 5000);
        if (formData.animalDeCompagnieRetour) total += selectedTrajet.prixAnimalCompagnie ?? 5000;
      }
      return total;
    }
  };

  // Validation
  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.employeeId) { toast.error("Veuillez sélectionner un voyageur"); return; }
      if (!formData.clientName) { toast.error("Veuillez entrer le nom du client"); return; }
      if (!formData.clientPhone) { toast.error("Veuillez entrer le numéro de téléphone"); return; }
      if (!isValidPhone(formData.clientPhone)) { toast.error("Numéro de téléphone invalide"); return; }
    }
    if (currentStep === 2) {
      if (!selectedPays) { toast.error("Veuillez sélectionner un pays"); return; }
      if (selectedPays === "Côte d'Ivoire") {
        if (!formData.ci_departAddress || !formData.ci_departLat || !formData.ci_departLng) { toast.error("L'adresse de départ est requise et doit être géolocalisée"); return; }
        if (!formData.ci_arriveeAddress || !formData.ci_arriveeLat || !formData.ci_arriveeLng) { toast.error("L'adresse d'arrivée est requise et doit être géolocalisée"); return; }
        if (!formData.isOneWay) {
          if (!formData.ci_departAddressRetour || !formData.ci_departLatRetour || !formData.ci_departLngRetour) { toast.error("L'adresse de départ retour est requise et doit être géolocalisée"); return; }
          if (!formData.ci_arriveeAddressRetour || !formData.ci_arriveeLatRetour || !formData.ci_arriveeLngRetour) { toast.error("L'adresse d'arrivée retour est requise et doit être géolocalisée"); return; }
          if (!formData.ci_pickupDateRetour) { toast.error("Veuillez sélectionner une date de retour"); return; }
          if (!formData.ci_pickupTimeRetour) { toast.error("Veuillez sélectionner une heure de retour"); return; }
        }
      } else {
        if (!selectedDepartId) { toast.error("Veuillez sélectionner une ville de départ"); return; }
        if (!selectedArriveeId) { toast.error("Veuillez sélectionner une ville d'arrivée"); return; }
        if (!formData.adressePriseEnChargeDepartAller) { toast.error("L'adresse de prise en charge au départ est requise"); return; }
        if (!formData.adressePriseEnChargeArriveeAller) { toast.error("L'adresse de dépose à l'arrivée est requise"); return; }
        if (!formData.isOneWay) {
          if (!formData.adressePriseEnChargeDepartRetour) { toast.error("L'adresse de prise en charge retour est requise"); return; }
          if (!formData.adressePriseEnChargeArriveeRetour) { toast.error("L'adresse de dépose retour est requise"); return; }
          if (!formData.pickupDateRetour) { toast.error("Veuillez sélectionner une date de retour"); return; }
          if (!formData.pickupTimeRetour) { toast.error("Veuillez sélectionner une heure de retour"); return; }
        }
      }
      if (!formData.pickupDateAller) { toast.error("Veuillez sélectionner une date de départ"); return; }
      if (!formData.pickupTimeAller) { toast.error("Veuillez sélectionner une heure de départ"); return; }
    }
    if (currentStep === 3) {
      if (selectedPays === "Côte d'Ivoire") {
        if (!formData.ci_categoryCode) { toast.error("Veuillez sélectionner une catégorie de véhicule"); return; }
      } else {
        if (!formData.trajetInterVilleId) { toast.error("Veuillez sélectionner un véhicule"); return; }
      }
    }
    if (currentStep < 5) setCurrentStep(s => s + 1);
  };

  const handleBack = () => { if (currentStep > 1) setCurrentStep(s => s - 1); };

  // Mutations
  const createBookingSN = useMutation({
    mutationFn: (data: CreateInterCityBookingDto) => api.bookings.createInterCity(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBookingReference(response.data?.reference || `SUB-${Date.now()}`);
      setBookingSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la réservation"),
  });

  const createBookingCI = useMutation({
    mutationFn: (data: any) => api.bookings.createInterCityCi(data),
    onSuccess: (response) => {
      setBookingReference(response.data?.bookingCode || '');
      setBookingSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => router.push('/tracking'), 2000);
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la réservation CI"),
  });

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
    onError: (err: Error) => toast.error(err.message || "Erreur lors de l'ajout de l'employe"),
  });

  // Fonction handleSubmit corrigée : on filtre ADRESSE_SUPP des options, on envoie les adresses séparément
  const handleSubmit = () => {
    if (selectedPays === "Côte d'Ivoire") {
      // On filtre l'option ADRESSE_SUPP des options, car les adresses sont envoyées dans des champs dédiés
      const optionsAller = [...formData.ci_selectedOptions].filter(opt => opt.code !== 'ADRESSE_SUPP');
      const optionsRetour = [...formData.ci_selectedOptionsRetour].filter(opt => opt.code !== 'ADRESSE_SUPP');

      const payload: any = {
        categoryCode: formData.ci_categoryCode,
        departLat: formData.ci_departLat,
        departLng: formData.ci_departLng,
        departAddress: formData.ci_departAddress,
        arriveeLat: formData.ci_arriveeLat,
        arriveeLng: formData.ci_arriveeLng,
        arriveeAddress: formData.ci_arriveeAddress,
        pax: 1,
        isOneWay: formData.isOneWay,
        paidBy: 'company',
        scheduledDate: formData.pickupDateAller,
        scheduledTime: formData.pickupTimeAller,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        options: optionsAller.length > 0 ? optionsAller : undefined,
        specialRequests: formData.specialRequests || undefined,
      };

      // Envoyer les adresses supplémentaires si elles existent
      if (formData.ci_adressesSupplementAller.length > 0) {
        payload.adressesSupplementAller = formData.ci_adressesSupplementAller.map(addr => ({
          adresse: addr.adresse,
          lat: addr.lat,
          lng: addr.lng,
        }));
      }
      if (formData.ci_adressesSupplementRetour.length > 0) {
        payload.adressesSupplementRetour = formData.ci_adressesSupplementRetour.map(addr => ({
          adresse: addr.adresse,
          lat: addr.lat,
          lng: addr.lng,
        }));
      }

      if (!formData.isOneWay) {
        payload.departAddressRetour = formData.ci_departAddressRetour;
        payload.departLatRetour = formData.ci_departLatRetour;
        payload.departLngRetour = formData.ci_departLngRetour;
        payload.arriveeAddressRetour = formData.ci_arriveeAddressRetour;
        payload.arriveeLatRetour = formData.ci_arriveeLatRetour;
        payload.arriveeLngRetour = formData.ci_arriveeLngRetour;
        payload.pickupDateRetour = formData.ci_pickupDateRetour;
        payload.pickupTimeRetour = formData.ci_pickupTimeRetour;
        payload.optionsRetour = optionsRetour.length > 0 ? optionsRetour : undefined;
      }

      createBookingCI.mutate(payload);
    } else {
      if (!selectedTrajet) { toast.error("Veuillez sélectionner un trajet valide"); return; }
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
      createBookingSN.mutate(bookingData);
    }
  };

  const resetForm = () => {
    setBookingSuccess(false);
    setCurrentStep(1);
    setFormData(initialFormData);
    setSelectedPays("");
    setSelectedDepartId(null);
    setSelectedArriveeId(null);
  };

  const canContinue = () => {
    if (currentStep === 1) return !!(formData.employeeId && formData.clientName && isValidPhone(formData.clientPhone));
    if (currentStep === 2) {
      if (selectedPays === "Côte d'Ivoire") {
        const baseValid = !!(formData.ci_departAddress && formData.ci_departLat && formData.ci_arriveeAddress && formData.ci_arriveeLat
          && formData.pickupDateAller && formData.pickupTimeAller);
        if (!formData.isOneWay) {
          return baseValid && !!formData.ci_departAddressRetour && !!formData.ci_departLatRetour && !!formData.ci_arriveeAddressRetour && !!formData.ci_arriveeLatRetour
            && !!formData.ci_pickupDateRetour && !!formData.ci_pickupTimeRetour;
        }
        return baseValid;
      } else {
        const baseValid = !!(selectedPays && selectedDepartId && selectedArriveeId && formData.adressePriseEnChargeDepartAller
          && formData.adressePriseEnChargeArriveeAller && formData.pickupDateAller && formData.pickupTimeAller);
        if (!formData.isOneWay) {
          return baseValid && !!formData.adressePriseEnChargeDepartRetour && !!formData.adressePriseEnChargeArriveeRetour
            && !!formData.pickupDateRetour && !!formData.pickupTimeRetour;
        }
        return baseValid;
      }
    }
    if (currentStep === 3) {
      return selectedPays === "Côte d'Ivoire" ? !!formData.ci_categoryCode : !!formData.trajetInterVilleId;
    }
    return true;
  };

  if (bookingSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto space-y-10">
        <section className="mb-4">
          <p className="text-[#E04A1F] font-bold tracking-widest text-xs uppercase mb-2">Derniere etape</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight leading-tight">Recapitulatif de votre reservation</h1>
          <p className="text-slate-500 max-w-2xl leading-relaxed">Votre trajet inter-urbain a ete enregistre. Une fois valide, votre demande sera traitee par notre equipe logistique.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#ffdbd0] rounded-full"><CheckCircle2 className="w-4 h-4 text-[#E04A1F]" /><span className="text-sm font-bold text-orange-700 tracking-wider">REF: {bookingReference}</span></div>
        </section>
        <div className="flex justify-center gap-4">
          <Button onClick={() => router.push("/tracking")} className="bg-[#E04A1F] text-white">Voir dans le suivi</Button>
          <Button onClick={resetForm} variant="outline">Nouvelle reservation</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6">
      {/* HEADER */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
          <div>
            <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              <span>Reservations</span><span>/</span><span className="text-[#E04A1F]">{isEdit ? "Modifier" : "Inter-villes"}</span>
            </nav>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#171c1f]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
              {isEdit ? "Modifier la reservation" : currentStep === 1 ? "Informations du client" : currentStep === 2 ? "Configuration du trajet" : currentStep === 3 ? "Selectionnez votre vehicule" : currentStep === 4 ? "Paiement" : "Recapitulatif de votre reservation"}
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {currentStep === 1 && "Renseignez les details du voyageur pour cette reservation."}
              {currentStep === 2 && "Etape 2 sur 5 — Definissez les details de votre voyage inter-villes."}
              {currentStep === 3 && "Choisissez la categorie de vehicule la mieux adaptee a votre trajet."}
              {currentStep === 4 && "Choisissez votre mode de facturation pour cette reservation."}
              {currentStep === 5 && "Verifiez les details avant de confirmer votre reservation."}
            </p>
          </div>
          <span className="text-[#E04A1F] font-bold text-xs bg-[#ffdbd0] px-4 py-2 rounded-full whitespace-nowrap uppercase tracking-widest">Etape {currentStep}/{steps.length}</span>
        </div>
        <div className="flex items-center w-full">
          {steps.map((step, idx) => {
            const isDone = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isLast = idx === steps.length - 1;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`rounded-full flex items-center justify-center transition-all font-bold ${isActive ? "w-12 h-12 bg-[#E04A1F] text-white ring-4 ring-[#ffdbd0] shadow-lg shadow-[#E04A1F]/20" : isDone ? "w-10 h-10 bg-[#E04A1F] text-white" : "w-10 h-10 bg-[#dfe3e7] text-slate-500"}`}>
                    {isDone ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-sm">{step.id}</span>}
                  </div>
                  <span className={`text-xs hidden sm:block whitespace-nowrap ${isActive ? "font-bold text-[#E04A1F]" : isDone ? "font-semibold text-[#171c1f]" : "font-medium text-slate-400"}`}>{step.title}</span>
                </div>
                {!isLast && <div className="flex-1 h-1 mx-2 sm:mx-4 -mt-6 rounded-full overflow-hidden bg-[#dfe3e7]"><div className={`h-full transition-all duration-500 ${isDone ? "bg-[#E04A1F] w-full" : "bg-transparent w-0"}`} /></div>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10">
        <AnimatePresence mode="wait">
          {/* ÉTAPE 1 : CLIENT - inchangée */}
          {currentStep === 1 && (
            <motion.div key="step1-client" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Informations du client</h3>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold text-slate-600 ml-1">Sélectionner l&apos;employé (voyageur)</Label>
                    <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={employeePopoverOpen} className="w-full justify-between font-normal h-10">
                          <span className="flex items-center gap-2 truncate"><Users className="w-4 h-4 shrink-0" />{formData.employeeId ? (() => { const emp = employees.find(e => e.id === formData.employeeId); return emp ? `${emp.prenom} ${emp.nom}` : 'Selectionner un employe'; })() : 'Selectionner un employe'}</span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher un employe..." value={employeeSearch} onValueChange={setEmployeeSearch} />
                          <CommandList>
                            <CommandEmpty>
                              <p className="text-sm text-slate-500 mb-2">Aucun employe trouve</p>
                              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => { setShowAddEmployee(true); setEmployeePopoverOpen(false); }}><UserPlus className="w-3.5 h-3.5" /> Ajouter "{employeeSearch}"</Button>
                            </CommandEmpty>
                            <CommandGroup>
                              {employees.map(emp => {
                                const deptName = emp.departement ? (typeof emp.departement === 'object' ? emp.departement.nom : emp.departement) : '';
                                return (
                                  <CommandItem key={emp.id} value={`${emp.prenom} ${emp.nom}`} onSelect={() => { handleChange('employeeId', emp.id); handleChange('clientName', `${emp.prenom} ${emp.nom}`); if (emp.email) handleChange('clientEmail', emp.email); if (emp.telephone) handleChange('clientPhone', emp.telephone); if (emp.adresse) handleChange('clientAddress', emp.adresse); setEmployeeSearch(""); setEmployeePopoverOpen(false); }} className="cursor-pointer">
                                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">{emp.prenom?.[0]}{emp.nom?.[0]}</div>
                                    <div className="flex-1 min-w-0"><p className="text-sm font-medium">{emp.prenom} {emp.nom}</p>{deptName && <p className="text-xs text-slate-500">{deptName}</p>}</div>
                                    {formData.employeeId === emp.id && <Check className="w-4 h-4 text-[#E04A1F] shrink-0" />}
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
                    <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Ajouter un employe</DialogTitle></DialogHeader>
                      <EmployeeForm departments={departments} onSubmit={(data) => createEmployee.mutate(data)} onCancel={() => setShowAddEmployee(false)} isSubmitting={createEmployee.isPending} />
                    </DialogContent>
                  </Dialog>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2"><Label className="text-sm font-semibold text-slate-600 ml-1">Nom complet</Label><Input placeholder="Nom et prenom du client" className="w-full h-14 px-4 bg-slate-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/40 font-medium text-slate-900" value={formData.clientName} onChange={(e) => handleChange('clientName', e.target.value)} /></div>
                    <div className="flex flex-col gap-2"><Label className="text-sm font-semibold text-slate-600 ml-1">Téléphone</Label><div className="bg-slate-50 rounded-xl h-14 flex items-center px-2"><PhoneInput value={formData.clientPhone} onChange={(v) => handleChange('clientPhone', v)} error={!!phoneError} /></div>{phoneError && <p className="text-sm text-red-500 ml-1">Numero invalide</p>}</div>
                  </div>
                  <div className="flex flex-col gap-2"><Label className="text-sm font-semibold text-slate-600 ml-1">Adresse e-mail (optionnel)</Label><Input type="email" placeholder="client@email.com" className="w-full h-14 px-4 bg-slate-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/40 font-medium text-slate-900" value={formData.clientEmail} onChange={(e) => handleChange('clientEmail', e.target.value)} /></div>
                  <div className="flex flex-col gap-2 pt-4"><Label className="text-sm font-semibold text-slate-600 ml-1">Notes particulieres pour le chauffeur</Label><Textarea rows={3} placeholder="Ex: Accueil avec pancarte, bagages volumineux..." className="w-full p-4 bg-slate-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/40 font-medium text-slate-900 resize-none" value={formData.specialRequests || ''} onChange={(e) => handleChange('specialRequests', e.target.value)} /></div>
                </div>
              </div>
              <aside className="lg:col-span-4 space-y-6">
                <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                  <h3 className="text-lg font-bold mb-6 text-slate-900">Resume du trajet</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center py-1"><div className="w-3 h-3 rounded-full border-2 border-orange-600 bg-white shrink-0" /><div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[32px]" /><div className="w-3 h-3 rounded-full bg-orange-600 shrink-0" /></div>
                      <div className="space-y-4 min-w-0">
                        <div><p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Depart</p><p className="text-sm font-semibold leading-tight mt-1 truncate">{selectedPays === "Côte d'Ivoire" ? formData.ci_departAddress || '—' : getVilleName(villes.find(v => v.id === selectedDepartId)) || '—'}</p></div>
                        <div><p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Arrivee</p><p className="text-sm font-semibold leading-tight mt-1 truncate">{selectedPays === "Côte d'Ivoire" ? formData.ci_arriveeAddress || '—' : getVilleName(villes.find(v => v.id === selectedArriveeId)) || '—'}</p></div>
                      </div>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Date</p><div className="flex items-center gap-1.5 mt-1"><CalendarIcon className="w-3 h-3 text-[#E04A1F]" /><span className="text-sm font-bold">{formData.pickupDateAller ? format(new Date(formData.pickupDateAller), 'dd MMM', { locale: fr }) : '—'}</span></div></div>
                      <div><p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Heure</p><div className="flex items-center gap-1.5 mt-1"><Clock className="w-3 h-3 text-[#E04A1F]" /><span className="text-sm font-bold">{formData.pickupTimeAller || '—'}</span></div></div>
                    </div>
                    {!formData.isOneWay && <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffdbd0] text-orange-700 rounded-full text-[10px] font-bold uppercase tracking-wider"><ArrowRightLeft className="w-3 h-3" /> Aller-retour</div>}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-1">Prix estime</p>
                  <p className="text-3xl font-extrabold text-slate-900">{calculateTotal().toLocaleString()} FCFA</p>
                  <p className="text-xs text-slate-500 mt-2">TTC, hors options supplementaires</p>
                </div>
              </aside>
            </motion.div>
          )}

          {/* ÉTAPE 2 : TRAJET - inchangée */}
          {currentStep === 2 && (
            <motion.div key="step2-trip" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                  <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900"><Route className="w-5 h-5 text-[#E04A1F]" /> Itineraire</h2>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pays</Label>
                          <Select value={selectedPays} onValueChange={(v) => {
                            setSelectedPays(v);
                            if (v === "Côte d'Ivoire") {
                              setSelectedDepartId(null); setSelectedArriveeId(null);
                              handleChange('trajetInterVilleId', null); handleChange('vehiculeId', null);
                            } else {
                              handleChange('ci_departAddress', ''); handleChange('ci_departLat', null); handleChange('ci_departLng', null);
                              handleChange('ci_arriveeAddress', ''); handleChange('ci_arriveeLat', null); handleChange('ci_arriveeLng', null);
                              handleChange('ci_categoryCode', ''); handleChange('ci_selectedOptions', []); handleChange('ci_selectedOptionsRetour', []); handleChange('ci_adressesSupplementAller', []); handleChange('ci_adressesSupplementRetour', []);
                              handleChange('ci_departAddressRetour', ''); handleChange('ci_departLatRetour', null); handleChange('ci_departLngRetour', null);
                              handleChange('ci_arriveeAddressRetour', ''); handleChange('ci_arriveeLatRetour', null); handleChange('ci_arriveeLngRetour', null);
                              handleChange('ci_pickupDateRetour', ''); handleChange('ci_pickupTimeRetour', '');
                            }
                          }}>
                            <SelectTrigger className="bg-slate-50 border-0 rounded-xl h-12 px-4"><MapPin className="w-4 h-4 mr-2 text-slate-400" /><SelectValue placeholder="Choisir un pays" /></SelectTrigger>
                            <SelectContent>{pays.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Date de départ</Label>
                          <Popover>
                            <PopoverTrigger asChild><Button variant="ghost" className="w-full justify-start bg-slate-50 hover:bg-slate-100 rounded-xl h-12 px-4 font-normal"><CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />{formData.pickupDateAller ? format(new Date(formData.pickupDateAller + 'T00:00:00'), "dd/MM/yyyy", { locale: fr }) : <span className="text-slate-500">Selectionner une date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.pickupDateAller ? new Date(formData.pickupDateAller + 'T00:00:00') : undefined} onSelect={(date) => handleChange('pickupDateAller', date ? format(date, 'yyyy-MM-dd') : '')} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} /></PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Heure de départ</Label><div className="bg-slate-50 rounded-xl px-4 h-12 flex items-center"><TimePicker value={formData.pickupTimeAller} onChange={(v) => handleChange('pickupTimeAller', v)} placeholder="Choisir une heure" selectedDate={formData.pickupDateAller} /></div></div>

                      {/* CONTENU SPÉCIFIQUE AU PAYS */}
                      {selectedPays === "Côte d'Ivoire" ? (
                        <>
                          <div className="space-y-2"><Label>Lieu de départ</Label><AddressAutocomplete defaultCountry="Côte d'Ivoire" countryCode="CI" value={formData.ci_departAddress} onChange={(val) => handleChange('ci_departAddress', val)} onSelect={(address, lat, lng) => { handleChange('ci_departAddress', address); handleChange('ci_departLat', lat); handleChange('ci_departLng', lng); }} /></div>
                          <div className="space-y-2"><Label>Destination</Label><AddressAutocomplete defaultCountry="Côte d'Ivoire" countryCode="CI" value={formData.ci_arriveeAddress} onChange={(val) => handleChange('ci_arriveeAddress', val)} onSelect={(address, lat, lng) => { handleChange('ci_arriveeAddress', address); handleChange('ci_arriveeLat', lat); handleChange('ci_arriveeLng', lng); }} /></div>

                          {!formData.isOneWay && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-orange-100">
                              <h3 className="text-lg font-semibold flex items-center gap-2 text-[#E04A1F]"><ArrowRightLeft className="w-5 h-5" /> Trajet retour</h3>
                              <div className="space-y-2"><Label>Adresse de prise en charge retour</Label><AddressAutocomplete defaultCountry="Côte d'Ivoire" countryCode="CI" value={formData.ci_departAddressRetour} onChange={(val) => handleChange('ci_departAddressRetour', val)} onSelect={(address, lat, lng) => { handleChange('ci_departAddressRetour', address); handleChange('ci_departLatRetour', lat); handleChange('ci_departLngRetour', lng); }} /></div>
                              <div className="space-y-2"><Label>Adresse de dépose retour</Label><AddressAutocomplete defaultCountry="Côte d'Ivoire" countryCode="CI" value={formData.ci_arriveeAddressRetour} onChange={(val) => handleChange('ci_arriveeAddressRetour', val)} onSelect={(address, lat, lng) => { handleChange('ci_arriveeAddressRetour', address); handleChange('ci_arriveeLatRetour', lat); handleChange('ci_arriveeLngRetour', lng); }} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Date de retour</Label><Popover><PopoverTrigger asChild><Button variant="ghost" className="w-full justify-start bg-slate-50 hover:bg-slate-100 rounded-xl h-12 px-4 font-normal"><CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />{formData.ci_pickupDateRetour ? format(new Date(formData.ci_pickupDateRetour + 'T00:00:00'), "dd/MM/yyyy", { locale: fr }) : <span className="text-slate-500">Selectionner une date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.ci_pickupDateRetour ? new Date(formData.ci_pickupDateRetour + 'T00:00:00') : undefined} onSelect={(date) => handleChange('ci_pickupDateRetour', date ? format(date, 'yyyy-MM-dd') : '')} disabled={(date) => { const minDate = formData.pickupDateAller ? new Date(formData.pickupDateAller + 'T00:00:00') : new Date(new Date().setHours(0, 0, 0, 0)); return date < minDate; }} /></PopoverContent></Popover></div>
                                <div className="space-y-2"><Label>Heure de retour</Label><div className="bg-slate-50 rounded-xl px-4 h-12 flex items-center"><TimePicker value={formData.ci_pickupTimeRetour} onChange={(v) => handleChange('ci_pickupTimeRetour', v)} placeholder="Choisir une heure" selectedDate={formData.ci_pickupDateRetour} /></div></div>
                              </div>
                            </motion.div>
                          )}

                          {/* Options CI ALLER */}
                          {ciOptions && ciOptions.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                              <h3 className="font-semibold text-lg">Options supplémentaires – Aller</h3>
                              <div className="grid gap-3">
                                {(ciOptions as any[]).filter(o => o.type !== 'ADDRESS').map(opt => (
                                  <div key={opt.code} className="flex justify-between items-center p-3 border rounded-lg">
                                    <div><p className="font-semibold">{opt.label}</p><p className="text-xs text-slate-500">{opt.description}</p><p className="text-sm font-bold text-orange-600">{opt.prix.toLocaleString()} FCFA</p></div>
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" variant="outline" disabled={getCIOptionQty(opt.code) === 0} onClick={() => updateCIOption(opt.code, -1)}>−</Button>
                                      <span className="w-8 text-center">{getCIOptionQty(opt.code)}</span>
                                      <Button size="sm" variant="outline" disabled={getCIOptionQty(opt.code) >= opt.maxQuantite} onClick={() => updateCIOption(opt.code, 1)}>+</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {(ciOptions as any[]).find(o => o.type === 'ADDRESS') && (
                                <div className="pt-2 space-y-2">
                                  <p className="text-sm font-semibold">Adresses supplémentaires (aller)</p>
                                  {formData.ci_adressesSupplementAller.map((addr, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <AddressAutocomplete countryCode="CI" value={addr.adresse} onChange={(val) => updateCIAdresse(idx, val, addr.lat, addr.lng)} onSelect={(address, lat, lng) => updateCIAdresse(idx, address, lat, lng)} />
                                      <Button variant="ghost" size="icon" onClick={() => removeCIAdresse(idx)}><X className="w-4 h-4" /></Button>
                                    </div>
                                  ))}
                                  {formData.ci_adressesSupplementAller.length < 3 && <Button variant="link" onClick={addCIAdresse}><Plus className="w-3.5 h-3.5" /> Ajouter un arrêt</Button>}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Options CI RETOUR (conditionnel) */}
                          {!formData.isOneWay && ciOptions && ciOptions.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-blue-100">
                              <h3 className="font-semibold text-lg text-blue-700">Options supplémentaires – Retour</h3>
                              <div className="grid gap-3">
                                {(ciOptions as any[]).filter(o => o.type !== 'ADDRESS').map(opt => (
                                  <div key={opt.code} className="flex justify-between items-center p-3 border rounded-lg">
                                    <div><p className="font-semibold">{opt.label}</p><p className="text-xs text-slate-500">{opt.description}</p><p className="text-sm font-bold text-orange-600">{opt.prix.toLocaleString()} FCFA</p></div>
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" variant="outline" disabled={getCIOptionQtyRetour(opt.code) === 0} onClick={() => updateCIOptionRetour(opt.code, -1)}>−</Button>
                                      <span className="w-8 text-center">{getCIOptionQtyRetour(opt.code)}</span>
                                      <Button size="sm" variant="outline" disabled={getCIOptionQtyRetour(opt.code) >= opt.maxQuantite} onClick={() => updateCIOptionRetour(opt.code, 1)}>+</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {(ciOptions as any[]).find(o => o.type === 'ADDRESS') && (
                                <div className="pt-2 space-y-2">
                                  <p className="text-sm font-semibold">Adresses supplémentaires (retour)</p>
                                  {formData.ci_adressesSupplementRetour.map((addr, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <AddressAutocomplete countryCode="CI" value={addr.adresse} onChange={(val) => updateCIAdresseRetour(idx, val, addr.lat, addr.lng)} onSelect={(address, lat, lng) => updateCIAdresseRetour(idx, address, lat, lng)} />
                                      <Button variant="ghost" size="icon" onClick={() => removeCIAdresseRetour(idx)}><X className="w-4 h-4" /></Button>
                                    </div>
                                  ))}
                                  {formData.ci_adressesSupplementRetour.length < 3 && <Button variant="link" onClick={addCIAdresseRetour}><Plus className="w-3.5 h-3.5" /> Ajouter un arrêt</Button>}
                                </div>
                              )}
                            </div>
                          )}

                          {ciQuoteLoading && <p className="text-sm text-slate-500">Calcul du prix...</p>}
                          {ciQuote && !ciQuoteLoading && (
                            <div className="bg-green-50 p-3 rounded-lg text-sm">
                              <p className="font-semibold text-green-800">Prix estimé à partir de: {ciQuote.options?.[0]?.prix?.toLocaleString()} FCFA</p>
                              <p className="text-green-700">Distance : {ciQuote.distanceKm} km</p>
                            </div>
                          )}
                        </>
                      ) : (
                        /* BLOC SÉNÉGAL - inchangé */
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                            <div className="space-y-2"><Label>Ville de départ</Label>
                              <Popover open={departPopoverOpen} onOpenChange={setDepartPopoverOpen}>
                                <PopoverTrigger asChild><Button type="button" variant="ghost" role="combobox" disabled={!selectedPays} className="w-full justify-between font-normal h-12 bg-slate-50 hover:bg-slate-100 rounded-xl px-4"><span className="flex items-center gap-2 truncate"><MapPin className="w-4 h-4 shrink-0 text-slate-400" />{selectedDepartId ? getVilleName(villes.find(v => v.id === selectedDepartId)) : (!selectedPays ? <span className="text-slate-500">Selectionnez un pays</span> : <span className="text-slate-500">Choisir une ville</span>)}</span><Search className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command><CommandInput placeholder="Rechercher une ville..." /><CommandList><CommandEmpty>Aucune ville trouvee</CommandEmpty><CommandGroup>{villes.map(v => <CommandItem key={v.id} value={getVilleName(v)} onSelect={() => { setSelectedDepartId(v.id); if (selectedArriveeId === v.id) setSelectedArriveeId(null); handleChange('trajetInterVilleId', null); handleChange('vehiculeId', null); setDepartPopoverOpen(false); }} className="cursor-pointer"><MapPin className="w-4 h-4 mr-2 shrink-0" />{getVilleName(v)}{selectedDepartId === v.id && <Check className="ml-auto w-4 h-4 text-[#E04A1F] shrink-0" />}</CommandItem>)}</CommandGroup></CommandList></Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <Button variant="outline" size="icon" onClick={handleSwapCities} disabled={!selectedDepartId || !selectedArriveeId} className="h-12 w-12 rounded-xl bg-[#ffdbd0]/40 hover:bg-[#ffdbd0] border-0 text-[#E04A1F]"><ArrowRightLeft className="w-4 h-4" /></Button>
                            <div className="space-y-2"><Label>Ville d'arrivée</Label>
                              <Popover open={arriveePopoverOpen} onOpenChange={setArriveePopoverOpen}>
                                <PopoverTrigger asChild><Button type="button" variant="ghost" role="combobox" disabled={!selectedPays} className="w-full justify-between font-normal h-12 bg-slate-50 hover:bg-slate-100 rounded-xl px-4"><span className="flex items-center gap-2 truncate"><MapPin className="w-4 h-4 shrink-0 text-slate-400" />{selectedArriveeId ? getVilleName(villes.find(v => v.id === selectedArriveeId)) : (!selectedPays ? <span className="text-slate-500">Selectionnez un pays</span> : <span className="text-slate-500">Choisir une ville</span>)}</span><Search className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command><CommandInput placeholder="Rechercher une ville..." /><CommandList><CommandEmpty>Aucune ville trouvee</CommandEmpty><CommandGroup>{villes.filter(v => v.id !== selectedDepartId).map(v => <CommandItem key={v.id} value={getVilleName(v)} onSelect={() => { setSelectedArriveeId(v.id); handleChange('trajetInterVilleId', null); handleChange('vehiculeId', null); setArriveePopoverOpen(false); }} className="cursor-pointer"><MapPin className="w-4 h-4 mr-2 shrink-0" />{getVilleName(v)}{selectedArriveeId === v.id && <Check className="ml-auto w-4 h-4 text-[#E04A1F] shrink-0" />}</CommandItem>)}</CommandGroup></CommandList></Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Adresse de prise en charge *</Label><AddressAutocomplete placeholder="Ex: Hotel Terrou-Bi, Corniche, Dakar" value={formData.adressePriseEnChargeDepartAller} onChange={(val) => handleChange('adressePriseEnChargeDepartAller', val)} onSelect={(address, lat, lng) => { handleChange('adressePriseEnChargeDepartAller', address); handleChange('adressePriseEnChargeDepartAllerLat', lat); handleChange('adressePriseEnChargeDepartAllerLng', lng); }} iconColor="text-green-500" countryCode={countryNameToCode(selectedPays)} /></div>
                            <div className="space-y-2"><Label>Adresse de dépose *</Label><AddressAutocomplete placeholder="Ex: Gare routiere, Thies" value={formData.adressePriseEnChargeArriveeAller} onChange={(val) => handleChange('adressePriseEnChargeArriveeAller', val)} onSelect={(address, lat, lng) => { handleChange('adressePriseEnChargeArriveeAller', address); handleChange('adressePriseEnChargeArriveeAllerLat', lat); handleChange('adressePriseEnChargeArriveeAllerLng', lng); }} iconColor="text-red-500" countryCode={countryNameToCode(selectedPays)} /></div>
                          </div>
                          {!formData.isOneWay && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-orange-100 mt-6">
                              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900"><ArrowRightLeft className="w-5 h-5 text-[#E04A1F]" /> Trajet retour</h2>
                              <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2"><Label>Adresse de prise en charge</Label><AddressAutocomplete placeholder="Ex: Gare routiere, Thies" value={formData.adressePriseEnChargeDepartRetour} onChange={(val) => handleChange('adressePriseEnChargeDepartRetour', val)} onSelect={(address, lat, lng) => { handleChange('adressePriseEnChargeDepartRetour', address); handleChange('adressePriseEnChargeDepartRetourLat', lat); handleChange('adressePriseEnChargeDepartRetourLng', lng); }} iconColor="text-green-500" countryCode={countryNameToCode(selectedPays)} /></div>
                                  <div className="space-y-2"><Label>Adresse de dépose</Label><AddressAutocomplete placeholder="Ex: Hotel Terrou-Bi, Corniche, Dakar" value={formData.adressePriseEnChargeArriveeRetour} onChange={(val) => handleChange('adressePriseEnChargeArriveeRetour', val)} onSelect={(address, lat, lng) => { handleChange('adressePriseEnChargeArriveeRetour', address); handleChange('adressePriseEnChargeArriveeRetourLat', lat); handleChange('adressePriseEnChargeArriveeRetourLng', lng); }} iconColor="text-red-500" countryCode={countryNameToCode(selectedPays)} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2"><Label>Date de retour</Label><Popover><PopoverTrigger asChild><Button variant="ghost" className="w-full justify-start bg-slate-50 hover:bg-slate-100 rounded-xl h-12 px-4 font-normal"><CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />{formData.pickupDateRetour ? format(new Date(formData.pickupDateRetour + 'T00:00:00'), "dd/MM/yyyy", { locale: fr }) : <span className="text-slate-500">Selectionner une date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.pickupDateRetour ? new Date(formData.pickupDateRetour + 'T00:00:00') : undefined} onSelect={(date) => handleChange('pickupDateRetour', date ? format(date, 'yyyy-MM-dd') : '')} disabled={(date) => { const minDate = formData.pickupDateAller ? new Date(formData.pickupDateAller + 'T00:00:00') : new Date(new Date().setHours(0, 0, 0, 0)); return date < minDate; }} /></PopoverContent></Popover></div>
                                  <div className="space-y-2"><Label>Heure de retour</Label><div className="bg-slate-50 rounded-xl px-4 h-12 flex items-center"><TimePicker value={formData.pickupTimeRetour} onChange={(v) => handleChange('pickupTimeRetour', v)} placeholder="Choisir une heure" selectedDate={formData.pickupDateRetour} /></div></div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                  <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-3 block">Demandes speciales (optionnel)</Label>
                    <Textarea placeholder="Instructions particulieres pour le chauffeur..." value={formData.specialRequests} onChange={(e) => handleChange('specialRequests', e.target.value)} className="bg-slate-50 border-0 rounded-xl resize-none min-h-[80px]" />
                  </section>
                </div>
                {/* Sidebar options */}
                <aside className="lg:col-span-4">
                  <div className="sticky top-6 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-5">
                    <h2 className="text-xl font-bold text-slate-900">Options</h2>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0"><ArrowRightLeft className="w-4 h-4" /></div>
                        <div className="min-w-0"><p className="text-sm font-bold text-[#E04A1F] truncate">Aller-retour</p><p className="text-xs text-slate-500">Reserver le retour</p></div>
                      </div>
                      <Switch checked={!formData.isOneWay} onCheckedChange={(v) => handleChange('isOneWay', !v)} />
                    </div>
                    {selectedPays !== "Côte d'Ivoire" ? (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] border-b border-slate-100 pb-2">Aller</p>
                        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Baby className="w-4 h-4" /><span>Siège bébé</span></div><Select value={formData.siegeBebes.toString()} onValueChange={(v) => handleChange('siegeBebes', parseInt(v))}><SelectTrigger className="w-16 h-9"><SelectValue /></SelectTrigger><SelectContent>{[0,1].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
                        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><PawPrint className="w-4 h-4" /><span>Animal de compagnie</span></div><Switch checked={formData.animalDeCompagnie} onCheckedChange={(v) => handleChange('animalDeCompagnie', v)} /></div>
                        {!formData.isOneWay && (
                          <>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 border-b border-slate-100 pb-2 pt-2">Retour</p>
                            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Baby className="w-4 h-4" /><span>Siège bébé</span></div><Select value={formData.siegeBebesRetour.toString()} onValueChange={(v) => handleChange('siegeBebesRetour', parseInt(v))}><SelectTrigger className="w-16 h-9"><SelectValue /></SelectTrigger><SelectContent>{[0,1].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
                            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><PawPrint className="w-4 h-4" /><span>Animal de compagnie</span></div><Switch checked={formData.animalDeCompagnieRetour} onCheckedChange={(v) => handleChange('animalDeCompagnieRetour', v)} /></div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Estimation à partir de</p>
                        <p className="text-2xl font-extrabold text-[#E04A1F]">{calculateTotal().toLocaleString()} FCFA</p>
                      </div>
                    )}
                    <p className="text-center text-xs text-slate-400 leading-relaxed">Vos donnees sont securisees et traitees selon notre politique de confidentialite.</p>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 3 VÉHICULE */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center"><h3 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Selectionnez votre vehicule</h3><p className="text-slate-500 max-w-xl mx-auto">Choisissez la categorie la mieux adaptee a votre trajet interurbain et a vos bagages.</p></div>
              {selectedPays === "Côte d'Ivoire" ? (
                <div className="grid gap-3">
                  {ciCatLoading ? <p>Chargement...</p> : (ciCategories as any[])?.map(cat => (
                    <div key={cat.code} onClick={() => handleChange('ci_categoryCode', cat.code)} className={`p-4 border-2 rounded-xl cursor-pointer ${formData.ci_categoryCode === cat.code ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start">
                        <div><h4 className="font-bold text-lg">{cat.label}</h4><p className="text-sm text-slate-600">Jusqu'à {cat.maxPax} passagers • {cat.maxBagages23kg}x23kg • {cat.maxBagages10kg}x10kg</p></div>
                        <Badge className="bg-orange-100 text-orange-700 border-0">
                          {ciQuote?.options?.find((opt: any) => opt.code === cat.code)?.prix
                            ? `${ciQuote.options.find((opt: any) => opt.code === cat.code).prix.toLocaleString()} FCFA`
                            : `À partir de ${cat.tarifs[0]?.minimumGaranti.toLocaleString()} FCFA`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                matchingTrajets.length > 0 ? (() => {
                  const totalPages = Math.max(1, Math.ceil(matchingTrajets.length / VEHICLES_PER_PAGE));
                  const safePage = Math.min(vehiclePage, totalPages - 1);
                  const start = safePage * VEHICLES_PER_PAGE;
                  const pageTrajets = matchingTrajets.slice(start, start + VEHICLES_PER_PAGE);
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {pageTrajets.map(trajet => {
                          const v = trajet.vehicule;
                          const price = trajet.prixAllerSimple ?? trajet.prix ?? 0;
                          const isSelected = formData.trajetInterVilleId === trajet.id;
                          return (
                            <button key={trajet.id} type="button" onClick={() => { handleChange('trajetInterVilleId', trajet.id); handleChange('vehiculeId', v?.id || null); }} className={`relative text-left bg-white rounded-3xl p-6 transition-all overflow-hidden ${isSelected ? 'ring-2 ring-orange-600 shadow-lg shadow-orange-500/10' : 'ring-1 ring-slate-100 hover:ring-orange-200 hover:shadow-md'}`}>
                              {isSelected && <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center shadow"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>}
                              <div className="bg-slate-50 rounded-2xl h-40 flex items-center justify-center mb-4 overflow-hidden">{v?.image?.[0] ? <img src={v.image[0]} alt="" className="max-w-full max-h-32 object-contain drop-shadow-md" /> : <Car className="w-20 h-20 text-slate-300" />}</div>
                              <div className="mb-4"><span className="text-[10px] font-bold uppercase tracking-widest text-[#E04A1F] block mb-1">Categorie</span><h3 className="text-lg font-extrabold capitalize text-slate-900 leading-tight">{v?.categorie || v?.marque || 'Vehicule'}</h3></div>
                              <div className="flex flex-wrap gap-2 mb-5">
                                {v?.places != null && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700"><Users className="w-3.5 h-3.5 text-[#E04A1F]" />{v.places} places</span>}
                                {v?.grandBagage != null && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700"><Briefcase className="w-3.5 h-3.5 text-[#E04A1F]" />{v.grandBagage} grand{Number(v.grandBagage) > 1 ? 's' : ''} (23kg)</span>}
                                {v?.petitBagage != null && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-700"><Briefcase className="w-3.5 h-3.5 text-[#E04A1F]" />{v.petitBagage} petit{Number(v.petitBagage) > 1 ? 's' : ''} (10kg)</span>}
                              </div>
                              <div className="flex items-end justify-between pt-4 border-t border-slate-100"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Prix du trajet</p>{price > 0 ? <p className="text-xl font-extrabold text-slate-900">{Number(price).toLocaleString()}<span className="text-xs font-bold text-slate-500 ml-1">FCFA</span></p> : <p className="text-xs font-bold uppercase tracking-wider text-[#E04A1F]">Prix sur demande</p>}</div>
                            </button>
                          );
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-8">
                          <button onClick={() => setVehiclePage(p => Math.max(0, p - 1))} disabled={safePage === 0} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"><ArrowLeft className="w-4 h-4" /> Precedent</button>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Page {safePage + 1} / {totalPages} <span className="text-slate-400 normal-case">({matchingTrajets.length} vehicules)</span></p>
                          <button onClick={() => setVehiclePage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E04A1F] text-white text-sm font-bold shadow-lg shadow-[#E04A1F]/25 hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition">Suivant <ArrowRight className="w-4 h-4" /></button>
                        </div>
                      )}
                    </>
                  );
                })() : <div className="text-center py-16 bg-slate-50 rounded-3xl"><Car className="w-14 h-14 mx-auto mb-3 text-slate-300" /><p className="font-semibold text-slate-700">Aucun vehicule disponible</p><p className="text-sm mt-1 text-slate-500">Selectionnez un trajet valide pour voir les vehicules</p></div>
              )}
              {ciPrice && selectedPays === "Côte d'Ivoire" && <div className="bg-green-50 p-4 rounded-xl text-center"><p className="font-bold text-green-800">Prix final : {calculateTotal().toLocaleString()} FCFA</p></div>}
            </motion.div>
          )}

          {/* ÉTAPE 4 PAIEMENT */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-8">
                <h3 className="text-xl font-bold text-slate-900">Selectionnez le mode de paiement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paymentMethods.map((option, idx) => {
                    const isSelected = formData.paymentMethod === option.value;
                    return (
                      <div key={option.value} onClick={() => handleChange('paymentMethod', option.value)} className={`group relative p-8 rounded-2xl cursor-pointer hover:shadow-xl transition-all duration-300 ${isSelected ? 'bg-white border-2 border-orange-600 shadow-lg shadow-orange-500/5' : 'bg-slate-50 border-2 border-transparent hover:bg-white'}`}>
                        <div className="absolute top-4 right-4"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-orange-600' : 'border-2 border-slate-300'}`}>{isSelected && <div className="w-2 h-2 rounded-full bg-white" />}</div></div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 text-3xl ${isSelected ? 'bg-[#ffdbd0] text-[#E04A1F]' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-100'}`}>{option.icon || (idx === 0 ? '🏢' : '👤')}</div>
                        <h3 className="text-lg font-bold mb-2 text-slate-900">{option.label}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{option.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <aside className="lg:col-span-5">
                <div className="sticky top-6 bg-slate-50 rounded-3xl p-8 space-y-6">
                  <h2 className="text-xl font-bold text-slate-900">Detail du prix</h2>
                  <div className="pt-6 mt-6 border-t-2 border-dashed border-slate-300">
                    <div className="flex justify-between items-end">
                      <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total a regler</p><p className="text-3xl font-extrabold text-slate-900">{calculateTotal().toLocaleString()} FCFA</p></div>
                    </div>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {/* ÉTAPE 5 CONFIRMATION */}
          {currentStep === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Client */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><User className="w-5 h-5 text-[#E04A1F]" /> Client</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nom complet</p><p className="font-medium">{formData.clientName}</p></div>
                      <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone</p><p className="font-medium">{formData.clientPhone}</p></div>
                      {formData.clientEmail && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p><p className="font-medium">{formData.clientEmail}</p></div>}
                    </div>
                  </div>

                  {/* Trajet aller */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><MapPin className="w-5 h-5 text-[#E04A1F]" /> Trajet aller</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 mt-2 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prise en charge</p>
                          <p className="font-medium">{selectedPays === "Côte d'Ivoire" ? formData.ci_departAddress : (formData.adressePriseEnChargeDepartAller || getVilleName(villes.find(v => v.id === selectedDepartId)))}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 mt-2 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination</p>
                          <p className="font-medium">{selectedPays === "Côte d'Ivoire" ? formData.ci_arriveeAddress : (formData.adressePriseEnChargeArriveeAller || getVilleName(villes.find(v => v.id === selectedArriveeId)))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-slate-400" /><span>{formData.pickupDateAller ? format(new Date(formData.pickupDateAller), 'dd MMM yyyy', { locale: fr }) : "—"}</span></div>
                        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /><span>{formData.pickupTimeAller || "—"}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Trajet retour (si applicable) */}
                  {!formData.isOneWay && (
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-orange-100">
                      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><ArrowRightLeft className="w-5 h-5 text-[#E04A1F]" /> Trajet retour</h2>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mt-2 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prise en charge retour</p>
                            <p className="font-medium">{selectedPays === "Côte d'Ivoire" ? formData.ci_departAddressRetour : (formData.adressePriseEnChargeDepartRetour || "—")}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mt-2 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination retour</p>
                            <p className="font-medium">{selectedPays === "Côte d'Ivoire" ? formData.ci_arriveeAddressRetour : (formData.adressePriseEnChargeArriveeRetour || "—")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-slate-400" /><span>{selectedPays === "Côte d'Ivoire" ? (formData.ci_pickupDateRetour ? format(new Date(formData.ci_pickupDateRetour), 'dd MMM yyyy', { locale: fr }) : "—") : (formData.pickupDateRetour ? format(new Date(formData.pickupDateRetour), 'dd MMM yyyy', { locale: fr }) : "—")}</span></div>
                          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /><span>{selectedPays === "Côte d'Ivoire" ? formData.ci_pickupTimeRetour || "—" : formData.pickupTimeRetour || "—"}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Véhicule */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><Car className="w-5 h-5 text-[#E04A1F]" /> Véhicule</h2>
                    <p className="font-medium">
                      {selectedPays === "Côte d'Ivoire"
                        ? ((ciCategories as any[])?.find(c => c.code === formData.ci_categoryCode)?.label || formData.ci_categoryCode || "Non spécifié")
                        : (selectedTrajet?.vehicule?.categorie || selectedTrajet?.vehicule?.marque || "Non spécifié")}
                    </p>
                  </div>

                  {/* Options (si au moins une option sélectionnée) */}
                  {(selectedPays !== "Côte d'Ivoire" && (formData.siegeBebes > 0 || formData.animalDeCompagnie || formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour))
                    || (selectedPays === "Côte d'Ivoire" && (formData.ci_selectedOptions.length > 0 || formData.ci_selectedOptionsRetour.length > 0)) ? (
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><Plus className="w-5 h-5 text-[#E04A1F]" /> Options</h2>
                      {selectedPays !== "Côte d'Ivoire" ? (
                        <div className="space-y-3">
                          {formData.siegeBebes > 0 && (
                            <div className="flex items-center gap-2">
                              <Baby className="w-4 h-4 text-teal-500" />
                              <span>Siège bébé (aller) : {formData.siegeBebes} x 5 000 FCFA</span>
                            </div>
                          )}
                          {formData.animalDeCompagnie && (
                            <div className="flex items-center gap-2">
                              <PawPrint className="w-4 h-4 text-teal-500" />
                              <span>Animal de compagnie (aller) : 5 000 FCFA</span>
                            </div>
                          )}
                          {formData.siegeBebesRetour > 0 && (
                            <div className="flex items-center gap-2">
                              <Baby className="w-4 h-4 text-teal-500" />
                              <span>Siège bébé (retour) : {formData.siegeBebesRetour} x 5 000 FCFA</span>
                            </div>
                          )}
                          {formData.animalDeCompagnieRetour && (
                            <div className="flex items-center gap-2">
                              <PawPrint className="w-4 h-4 text-teal-500" />
                              <span>Animal de compagnie (retour) : 5 000 FCFA</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formData.ci_selectedOptions.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-[#E04A1F] mb-2">Aller</h3>
                              <div className="space-y-1">
                                {formData.ci_selectedOptions.map(opt => {
                                  const optionDef = (ciOptions as any[])?.find(o => o.code === opt.code);
                                  return (
                                    <div key={opt.code} className="flex items-center justify-between text-sm">
                                      <span>{optionDef?.label || opt.code}</span>
                                      <span className="font-medium">x{opt.quantite} {optionDef ? `${(optionDef.prix * opt.quantite).toLocaleString()} FCFA` : ''}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {formData.ci_selectedOptionsRetour.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-blue-700 mb-2">Retour</h3>
                              <div className="space-y-1">
                                {formData.ci_selectedOptionsRetour.map(opt => {
                                  const optionDef = (ciOptions as any[])?.find(o => o.code === opt.code);
                                  return (
                                    <div key={opt.code} className="flex items-center justify-between text-sm">
                                      <span>{optionDef?.label || opt.code}</span>
                                      <span className="font-medium">x{opt.quantite} {optionDef ? `${(optionDef.prix * opt.quantite).toLocaleString()} FCFA` : ''}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Sidebar récapitulatif prix */}
                <div className="lg:col-span-4">
                  <div className="sticky top-6 bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Détail du prix</h3>
                    <div className="space-y-3">
                      {selectedPays !== "Côte d'Ivoire" ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70">Prix aller simple</span>
                            <span>{(selectedTrajet?.prixAllerSimple ?? 0).toLocaleString()} FCFA</span>
                          </div>
                          {!formData.isOneWay && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Prix retour</span>
                              <span>{(selectedTrajet?.prixAllerRetour ?? selectedTrajet?.prixAllerSimple ?? 0).toLocaleString()} FCFA</span>
                            </div>
                          )}
                          {(formData.siegeBebes > 0 || formData.animalDeCompagnie || formData.siegeBebesRetour > 0 || formData.animalDeCompagnieRetour) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Options</span>
                              <span>{(
                                (formData.siegeBebes + formData.siegeBebesRetour) * 5000 +
                                (formData.animalDeCompagnie ? 5000 : 0) +
                                (formData.animalDeCompagnieRetour ? 5000 : 0)
                              ).toLocaleString()} FCFA</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70">Prix aller</span>
                            <span>{(ciPrice?.prixAller ?? ciQuote?.options?.[0]?.prixAller ?? 0).toLocaleString()} FCFA</span>
                          </div>
                          {!formData.isOneWay && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Prix retour</span>
                              <span>{(ciPrice?.prixRetour ?? ciQuote?.options?.[0]?.prixRetour ?? 0).toLocaleString()} FCFA</span>
                            </div>
                          )}
                          {(ciPrice?.aller?.montantOptions ?? 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Options aller</span>
                              <span>{ciPrice.aller.montantOptions.toLocaleString()} FCFA</span>
                            </div>
                          )}
                          {(ciPrice?.retour?.montantOptions ?? 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Options retour</span>
                              <span>{ciPrice.retour.montantOptions.toLocaleString()} FCFA</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-end">
                      <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Total</span>
                      <p className="text-2xl font-black text-orange-400">{calculateTotal().toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NAVIGATION */}
        <div className="flex items-center justify-between gap-4 mt-8 bg-slate-50 p-4 md:p-6 rounded-2xl">
          <Button variant="ghost" onClick={currentStep === 1 ? () => router.back() : handleBack} className="gap-2 text-slate-600 font-bold px-6 py-3 hover:bg-slate-200 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> {currentStep === 1 ? 'Annuler' : 'Retour'}
          </Button>
          {currentStep < 5 ? (
            <Button onClick={handleNext} disabled={!canContinue()} className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 md:px-10 py-3 font-extrabold shadow-lg hover:shadow-xl">
              Continuer <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createBookingSN.isPending || createBookingCI.isPending} className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-3 font-extrabold">
              {createBookingSN.isPending || createBookingCI.isPending ? 'Création...' : 'Créer la réservation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}