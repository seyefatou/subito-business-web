'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, CreateInterCityCIBookingDto } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PhoneInput } from '@/components/ui/phone-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MapPin,
  Calendar as CalendarIcon,
  Car,
  Check,
  User,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  { id: 1, title: 'Client', icon: User },
  { id: 2, title: 'Trajet', icon: MapPin },
  { id: 3, title: 'Véhicule', icon: Car },
  { id: 4, title: 'Confirmation', icon: Check },
];

interface AdresseSupplementItem {
  adresse: string;
  lat: number | null;
  lng: number | null;
}

interface FormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  departAddress: string;
  departLat: number | null;
  departLng: number | null;
  arriveeAddress: string;
  arriveeLat: number | null;
  arriveeLng: number | null;
  scheduledDate: string;
  scheduledTime: string;
  isOneWay: boolean;
  pax: number;
  categoryCode: string;
  selectedOptions: Array<{ code: string; quantite: number }>;
  adressesSupplementAller: AdresseSupplementItem[];
  paidBy: 'company' | 'client';
}

export default function InterCityCIBookingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const hasClientData = !!(searchParams.get('clientName') || searchParams.get('clientPhone'));
  const [currentStep, setCurrentStep] = useState(hasClientData ? 2 : 1);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState('');

  const [formData, setFormData] = useState<FormData>({
    clientName: searchParams.get('clientName') || '',
    clientEmail: searchParams.get('clientEmail') || '',
    clientPhone: searchParams.get('clientPhone') || '',
    departAddress: '',
    departLat: null,
    departLng: null,
    arriveeAddress: '',
    arriveeLat: null,
    arriveeLng: null,
    scheduledDate: '',
    scheduledTime: '',
    isOneWay: true,
    pax: 1,
    categoryCode: '',
    selectedOptions: [],
    adressesSupplementAller: [],
    paidBy: 'company',
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['interville-ci-categories'],
    queryFn: () => api.reference.getInterCityCiCategories(),
  });

  // Fetch options
  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['interville-ci-options'],
    queryFn: () => api.reference.getInterCityCiOptions(),
  });

  // Gestion des devis
  const [quoteData, setQuoteData] = useState<any>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  // Quote (sans options) dès que les coordonnées sont là
  useEffect(() => {
    const { departLat, departLng, arriveeLat, arriveeLng, pax, isOneWay } = formData;
    if (!departLat || !departLng || !arriveeLat || !arriveeLng) return;

    setIsQuoteLoading(true);
    api.bookings.getInterCityCiQuote({
      departLat,
      departLng,
      arriveeLat,
      arriveeLng,
      pax,
      bagages23: undefined,
      bagages10: undefined,
      isOneWay,
    })
      .then(res => { setQuoteData(res); setIsQuoteLoading(false); })
      .catch(() => { setQuoteData(null); setIsQuoteLoading(false); });
  }, [formData.departLat, formData.departLng, formData.arriveeLat, formData.arriveeLng, formData.pax, formData.isOneWay]);

  // Price (avec options simples + catégorie) – ne prend pas en compte les adresses supplémentaires pour l'instant
  useEffect(() => {
    const { departLat, departLng, arriveeLat, arriveeLng, categoryCode, pax, isOneWay, selectedOptions } = formData;
    if (!categoryCode || !departLat || !departLng || !arriveeLat || !arriveeLng) return;
    // On ne prend que les options simples (pas les adresses)
    const simpleOptions = selectedOptions.filter(opt => {
      const def = options?.find(o => o.code === opt.code);
      return def?.type !== 'ADDRESS';
    });
    if (simpleOptions.length === 0) {
      setPriceData(null);
      return;
    }

    setIsQuoteLoading(true);
    api.bookings.getInterCityCiPrice({
      categoryCode,
      departLat,
      departLng,
      arriveeLat,
      arriveeLng,
      pax,
      bagages23: undefined,
      bagages10: undefined,
      isOneWay,
      options: simpleOptions,
    })
      .then(res => { setPriceData(res); setIsQuoteLoading(false); })
      .catch(() => { setPriceData(null); setIsQuoteLoading(false); });
  }, [formData.categoryCode, formData.selectedOptions]);

  // Données d'affichage
  const prixAller = priceData?.prixAller ?? quoteData?.options?.[0]?.prixAller ?? null;
  const prixRetour = priceData?.prixRetour ?? quoteData?.options?.[0]?.prixRetour ?? null;
  const distanceAller = priceData?.distanceAller ?? quoteData?.distanceKm ?? null;
  const optionsAller = priceData?.aller?.montantOptions ?? 0;
  const optionsRetour = priceData?.retour?.montantOptions ?? 0;
  const totalPrice = priceData?.total ?? quoteData?.options?.[0]?.prix ?? null;

  // Création de réservation
  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: async (data: CreateInterCityCIBookingDto) => api.bookings.createInterCityCi(data),
    onSuccess: (response) => {
      setBookingReference(response.data.bookingCode || '');
      setBookingSuccess(true);
      toast.success('Réservation créée avec succès!');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => router.push('/service-reservations'), 2000);
    },
    onError: (error: any) => toast.error(error?.message || 'Erreur lors de la création de la réservation'),
  });

  const selectedCategory = useMemo(() => categories?.find(c => c.code === formData.categoryCode), [categories, formData.categoryCode]);

  // Gestion des options
  const handleOptionChange = (code: string, delta: number) => {
    setFormData(prev => {
      const existing = prev.selectedOptions.find(o => o.code === code);
      if (existing) {
        const newQty = existing.quantite + delta;
        if (newQty <= 0) {
          return {
            ...prev,
            selectedOptions: prev.selectedOptions.filter(o => o.code !== code),
          };
        }
        return {
          ...prev,
          selectedOptions: prev.selectedOptions.map(o =>
            o.code === code ? { ...o, quantite: newQty } : o
          ),
        };
      } else if (delta > 0) {
        return {
          ...prev,
          selectedOptions: [...prev.selectedOptions, { code, quantite: delta }],
        };
      }
      return prev;
    });
  };

  // Gestion des adresses supplémentaires
  const addAdresseSupplement = () => {
    if (formData.adressesSupplementAller.length >= 3) return;
    setFormData({
      ...formData,
      adressesSupplementAller: [
        ...formData.adressesSupplementAller,
        { adresse: '', lat: null, lng: null },
      ],
    });
  };

  const removeAdresseSupplement = (index: number) => {
    setFormData({
      ...formData,
      adressesSupplementAller: formData.adressesSupplementAller.filter((_, i) => i !== index),
    });
  };

  const updateAdresseSupplement = (index: number, address: string, lat: number | null, lng: number | null) => {
    const newList = [...formData.adressesSupplementAller];
    newList[index] = { adresse: address, lat, lng };
    setFormData({ ...formData, adressesSupplementAller: newList });
  };

  // Obtenir la quantité actuelle d'une option
  const getOptionQty = (code: string) => formData.selectedOptions.find(o => o.code === code)?.quantite || 0;

  // Options affichées : on sépare les options ADDRESS des autres
  const simpleOptions = options?.filter(o => o.type !== 'ADDRESS') || [];
  const addressOption = options?.find(o => o.type === 'ADDRESS');

  const handleSubmit = () => {
    if (!formData.clientName || !formData.clientPhone || !formData.departAddress || !formData.arriveeAddress) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    if (!formData.categoryCode) {
      toast.error('Veuillez sélectionner une catégorie de véhicule');
      return;
    }
    if (!formData.departLat || !formData.departLng || !formData.arriveeLat || !formData.arriveeLng) {
      toast.error('Les adresses doivent être géolocalisées.');
      return;
    }

    // Options à envoyer : les options simples sélectionnées, plus les adresses supplémentaires
    const optionsToSend = [...formData.selectedOptions];
    if (formData.adressesSupplementAller.length > 0 && addressOption) {
      // On ajoute autant d'options ADRESSE_SUPP que d'adresses saisies
      formData.adressesSupplementAller.forEach(() => {
        optionsToSend.push({ code: addressOption.code, quantite: 1 });
      });
    }

    createBooking({
      categoryCode: formData.categoryCode,
      departLat: formData.departLat,
      departLng: formData.departLng,
      departAddress: formData.departAddress,
      arriveeLat: formData.arriveeLat,
      arriveeLng: formData.arriveeLng,
      arriveeAddress: formData.arriveeAddress,
      pax: formData.pax,
      isOneWay: formData.isOneWay,
      paidBy: formData.paidBy,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      clientEmail: formData.clientEmail,
      options: optionsToSend.length > 0 ? optionsToSend : undefined,
      specialRequests: formData.adressesSupplementAller.length > 0
        ? `Arrêts supplémentaires : ${formData.adressesSupplementAller.map(a => a.adresse).join('; ')}`
        : undefined,
    } as any);
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Réservation confirmée!</h2>
          <p className="text-slate-600">Référence: <span className="font-bold text-orange-600">{bookingReference}</span></p>
          <p className="text-slate-500">Redirection en cours...</p>
        </div>
      </div>
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
              <span className="text-[#E04A1F]">Inter-villes CI</span>
            </nav>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {currentStep === 1 && "Informations du client"}
              {currentStep === 2 && "Configuration du trajet"}
              {currentStep === 3 && "Sélection du véhicule"}
              {currentStep === 4 && "Confirmation"}
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              {currentStep === 1 && "Renseignez les détails du voyageur."}
              {currentStep === 2 && "Définissez votre itinéraire, vos adresses et options."}
              {currentStep === 3 && "Choisissez la catégorie de véhicule."}
              {currentStep === 4 && "Vérifiez les détails avant de confirmer."}
            </p>
          </div>
          <span className="text-[#E04A1F] font-bold text-xs bg-[#ffdbd0] px-4 py-2 rounded-full whitespace-nowrap uppercase tracking-widest">
            Étape {currentStep}/{steps.length}
          </span>
        </div>

        {/* Stepper */}
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
                    {isDone ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-sm">{step.id}</span>}
                  </div>
                  <span
                    className={`text-xs hidden sm:block whitespace-nowrap ${
                      isActive ? "font-bold text-[#E04A1F]" : isDone ? "font-semibold text-[#171c1f]" : "font-medium text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {!isLast && (
                  <div className="flex-1 h-1 mx-2 sm:mx-4 -mt-6 rounded-full overflow-hidden bg-[#dfe3e7]">
                    <div className={`h-full transition-all duration-500 ${isDone ? "bg-[#E04A1F] w-full" : "bg-transparent w-0"}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-6 md:p-10">
        <AnimatePresence mode="wait">
          {/* Étape 1 – Client */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <h2 className="text-2xl font-bold">Informations du client</h2>
                  <div className="space-y-4">
                    <div>
                      <Label>Nom complet</Label>
                      <Input placeholder="Nom du client" value={formData.clientName}
                        onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@example.com" value={formData.clientEmail}
                        onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <PhoneInput value={formData.clientPhone}
                        onChange={value => setFormData({ ...formData, clientPhone: value })} defaultCountry="CI" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Étape 2 – Trajet & Options (sans bagages 23/10) */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <h2 className="text-2xl font-bold">Détails du trajet</h2>
                  <div className="space-y-4">
                    {/* Adresses */}
                    <div>
                      <Label>Lieu de départ</Label>
                      <AddressAutocomplete
                        defaultCountry="Côte d'Ivoire"
                        countryCode="CI"
                        value={formData.departAddress}
                        onChange={(val) => setFormData({ ...formData, departAddress: val })}
                        onSelect={(address, lat, lng) =>
                          setFormData({
                            ...formData,
                            departAddress: address || '',
                            departLat: lat ?? null,
                            departLng: lng ?? null,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Destination</Label>
                      <AddressAutocomplete
                        defaultCountry="Côte d'Ivoire"
                        countryCode="CI"
                        value={formData.arriveeAddress}
                        onChange={(val) => setFormData({ ...formData, arriveeAddress: val })}
                        onSelect={(address, lat, lng) =>
                          setFormData({
                            ...formData,
                            arriveeAddress: address || '',
                            arriveeLat: lat ?? null,
                            arriveeLng: lng ?? null,
                          })
                        }
                      />
                    </div>

                    {/* Date & Heure */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {formData.scheduledDate ? format(new Date(formData.scheduledDate), 'dd MMM yyyy', { locale: fr }) : 'Sélectionner'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Calendar mode="single"
                              selected={formData.scheduledDate ? new Date(formData.scheduledDate) : undefined}
                              onSelect={date => setFormData({ ...formData, scheduledDate: date ? format(date, 'yyyy-MM-dd') : '' })} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Heure</Label>
                        <TimePicker value={formData.scheduledTime}
                          onChange={time => setFormData({ ...formData, scheduledTime: time })} />
                      </div>
                    </div>

                    {/* Passagers */}
                    <div>
                      <Label>Nombre de passagers</Label>
                      <Select value={String(formData.pax)} onValueChange={v => setFormData({ ...formData, pax: parseInt(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} personne{n>1?'s':''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options simples (sans les bagages de base) */}
                    {simpleOptions.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h3 className="font-semibold text-lg">Options supplémentaires</h3>
                        <div className="grid gap-3">
                          {simpleOptions.map(opt => (
                            <div key={opt.code} className="flex justify-between items-center p-3 border rounded-lg">
                              <div>
                                <p className="font-semibold">{opt.label}</p>
                                <p className="text-xs text-slate-500">{opt.description}</p>
                                <p className="text-sm font-bold text-orange-600">{opt.prix.toLocaleString()} FCFA {opt.pricingMode === 'FLAT' ? '(unitaire)' : ''}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getOptionQty(opt.code) > 0 && (
                                  <Button size="sm" variant="outline" onClick={() => handleOptionChange(opt.code, -1)}>−</Button>
                                )}
                                <span className="w-8 text-center font-semibold">{getOptionQty(opt.code)}</span>
                                {getOptionQty(opt.code) < opt.maxQuantite && (
                                  <Button size="sm" variant="outline" onClick={() => handleOptionChange(opt.code, 1)}>+</Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Adresses supplémentaires */}
                    {addressOption && (
                      <div className="space-y-3 pt-4 border-t">
                        <h3 className="font-semibold text-lg">{addressOption.label}</h3>
                        <p className="text-xs text-slate-500">{addressOption.description}</p>
                        {formData.adressesSupplementAller.length > 0 && (
                          <div className="space-y-3">
                            {formData.adressesSupplementAller.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="flex-1">
                                  <AddressAutocomplete
                                    placeholder={`Adresse de l'arrêt ${idx + 1}`}
                                    countryCode="CI"
                                    value={item.adresse}
                                    onChange={(val) => updateAdresseSupplement(idx, val, item.lat, item.lng)}
                                    onSelect={(address, lat, lng) => updateAdresseSupplement(idx, address, lat, lng)}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAdresseSupplement(idx)}
                                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0 mt-2"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {formData.adressesSupplementAller.length < addressOption.maxQuantite && (
                          <button
                            type="button"
                            onClick={addAdresseSupplement}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#E04A1F] hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter un arrêt
                          </button>
                        )}
                      </div>
                    )}

                    {/* Prix estimé */}
                    {isQuoteLoading && <p className="text-sm text-slate-500">Calcul du prix...</p>}
                    {quoteData && !isQuoteLoading && (
                      <div className="bg-green-50 p-3 rounded-lg text-sm">
                        <p className="font-semibold text-green-800">Prix estimé à partir de : {quoteData.options?.[0]?.prix?.toLocaleString()} FCFA</p>
                        {quoteData.distanceKm && <p className="text-green-700">Distance : {quoteData.distanceKm} km</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="bg-slate-50 rounded-3xl p-6 text-sm text-slate-500">
                    Les adresses seront géolocalisées pour calculer le prix exact.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Étape 3 – Véhicule */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Sélection du véhicule</h2>
                {categoriesLoading ? (
                  <p>Chargement des catégories...</p>
                ) : categories && categories.length > 0 ? (
                  <div className="grid gap-3">
                    {categories.map(cat => (
                      <div key={cat.code}
                        onClick={() => setFormData({ ...formData, categoryCode: cat.code })}
                        className={`p-4 border-2 rounded-xl cursor-pointer ${formData.categoryCode === cat.code ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg">{cat.label}</h4>
                            <p className="text-sm text-slate-600">
                              Jusqu'à {cat.maxPax} passagers • {cat.maxBagages23kg}x23kg • {cat.maxBagages10kg}x10kg
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 border-0">
                            À partir de {cat.tarifs[0]?.minimumGaranti.toLocaleString()} FCFA
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Aucune catégorie disponible</p>
                )}

                {priceData && !isQuoteLoading && (
                  <div className="bg-green-50 p-4 rounded-xl">
                    <p className="font-bold text-green-800">Prix final : {totalPrice?.toLocaleString()} FCFA</p>
                    {optionsAller > 0 && <p className="text-sm text-green-700">+ options : {optionsAller.toLocaleString()} FCFA</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Étape 4 – Confirmation */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Confirmation</h2>
                <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between"><span>Client :</span><span className="font-semibold">{formData.clientName}</span></div>
                  <div className="flex justify-between"><span>Trajet :</span><span className="font-semibold">{formData.departAddress} → {formData.arriveeAddress}</span></div>
                  <div className="flex justify-between"><span>Date :</span><span className="font-semibold">{formData.scheduledDate} à {formData.scheduledTime}</span></div>
                  <div className="flex justify-between"><span>Passagers :</span><span className="font-semibold">{formData.pax}</span></div>
                  <div className="flex justify-between"><span>Véhicule :</span><span className="font-semibold">{selectedCategory?.label || formData.categoryCode}</span></div>
                  {formData.selectedOptions.length > 0 && (
                    <div className="flex justify-between">
                      <span>Options :</span>
                      <span className="font-semibold">
                        {formData.selectedOptions.map(opt => `${options?.find(o=>o.code===opt.code)?.label} x${opt.quantite}`).join(', ')}
                      </span>
                    </div>
                  )}
                  {formData.adressesSupplementAller.length > 0 && (
                    <div className="flex justify-between">
                      <span>Arrêts supp. :</span>
                      <span>{formData.adressesSupplementAller.map(a => a.adresse).join(', ')}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between"><span>Prix aller</span><span>{prixAller?.toLocaleString()} FCFA</span></div>
                    {prixRetour && <div className="flex justify-between"><span>Prix retour</span><span>{prixRetour?.toLocaleString()} FCFA</span></div>}
                    {optionsAller > 0 && <div className="flex justify-between"><span>Options</span><span>{optionsAller.toLocaleString()} FCFA</span></div>}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                      <span>Total</span>
                      <span className="text-orange-600">{totalPrice?.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 mt-8 bg-slate-50 p-4 md:p-6 rounded-2xl">
          <Button
            variant="ghost"
            onClick={() => {
              if (currentStep === 1) {
                if (window.history.length > 1) router.back();
                else router.push('/');
              } else if (currentStep === 2 && hasClientData) {
                router.back();
              } else {
                setCurrentStep(s => s - 1);
              }
            }}
            className="gap-2 text-slate-600 font-bold px-6 py-3 hover:bg-slate-200 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 1 ? 'Annuler' : 'Retour'}
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              className="bg-[#E04A1F] text-white border-0 gap-2 rounded-full px-8 py-3 font-extrabold shadow-lg hover:shadow-xl"
            >
              Continuer <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending || isQuoteLoading}
              className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-3 font-extrabold"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer la réservation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}