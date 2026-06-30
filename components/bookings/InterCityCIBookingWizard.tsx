'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, CreateInterCityBookingDto } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  CreditCard,
  Check,
  User,
  Phone,
  Mail,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  Plus,
  X,
  CheckCircle2,
  Users,
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Client', icon: User },
  { id: 2, title: 'Trajet', icon: MapPin },
  { id: 3, title: 'Véhicule', icon: Car },
  { id: 4, title: 'Paiement', icon: CreditCard },
  { id: 5, title: 'Confirmation', icon: Check },
];

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
  departRetourAddress: string;
  departRetourLat: number | null;
  departRetourLng: number | null;
  arriveeRetourAddress: string;
  arriveeRetourLat: number | null;
  arriveeRetourLng: number | null;
  scheduledDateRetour: string;
  scheduledTimeRetour: string;
  pax: number;
  bagages23: number;
  bagages10: number;
  categoryCode: string;
  selectedOptionsAller: Array<{ code: string; quantite: number }>;
  selectedOptionsRetour: Array<{ code: string; quantite: number }>;
  paidBy: 'company' | 'client';
}

export default function InterCityCIBookingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    departAddress: '',
    departLat: null,
    departLng: null,
    arriveeAddress: '',
    arriveeLat: null,
    arriveeLng: null,
    scheduledDate: '',
    scheduledTime: '',
    isOneWay: true,
    departRetourAddress: '',
    departRetourLat: null,
    departRetourLng: null,
    arriveeRetourAddress: '',
    arriveeRetourLat: null,
    arriveeRetourLng: null,
    scheduledDateRetour: '',
    scheduledTimeRetour: '',
    pax: 1,
    bagages23: 0,
    bagages10: 0,
    categoryCode: '',
    selectedOptionsAller: [],
    selectedOptionsRetour: [],
    paidBy: 'company',
  });

  // Récupérer l'employé depuis les paramètres d'URL
  useEffect(() => {
    const employeeId = searchParams.get('employeeId');
    if (employeeId) {
      // Fetch employee data
      api.employees.get(Number(employeeId)).then((res: any) => {
        const emp = res?.data || res;
        if (emp) {
          setSelectedEmployee(emp);
          setFormData(prev => ({
            ...prev,
            clientName: `${emp.prenom} ${emp.nom}`,
            clientEmail: emp.email || '',
            clientPhone: emp.telephone || '',
          }));
          // Skip étape 1 (client) et aller directement à étape 2 (trajet)
          setCurrentStep(2);
        }
      }).catch(err => {
        console.error('Erreur récupération employé:', err);
      });
    }
  }, [searchParams]);

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['interville-ci-categories'],
    queryFn: () => api.reference.getInterCityCiCategories(),
    select: (response: any) => response?.data || response,
  });

  // Fetch options
  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['interville-ci-options'],
    queryFn: () => api.reference.getInterCityCiOptions(),
    select: (response: any) => response?.data || response,
  });

  // Create booking
  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: async (data: any) => {
      return api.bookings.intervilleCi.create(data);
    },
    onSuccess: (response: any) => {
      const booking = response?.data || response;
      const bookingCode = booking.bookingCode || '';
      setBookingReference(bookingCode);
      setBookingSuccess(true);
      toast.success('Réservation créée avec succès!');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      // No auto-redirect, user can click button or wait
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création de la réservation');
    },
  });

  const selectedCategory = categories?.find((c: any) => c.code === formData.categoryCode);
  const selectedCategoryInfo = useMemo(() => {
    if (!categories || !formData.categoryCode) return null;
    return categories.find((c: any) => c.code === formData.categoryCode);
  }, [categories, formData.categoryCode]);

  // Calculate pricing for selected category
  const categoryPrice = useMemo(() => {
    if (!selectedCategoryInfo || !selectedCategoryInfo.tarifs[0]) return 0;
    const tarif = selectedCategoryInfo.tarifs[0];
    // Distance would need to be calculated - for now showing minimum guaranteed
    return tarif.minimumGaranti;
  }, [selectedCategoryInfo]);

  const optionsCost = useMemo(() => {
    const allerCost = formData.selectedOptionsAller.reduce((total, opt) => {
      const optionInfo = options?.find((o: any) => o.code === opt.code);
      return total + (optionInfo?.prix || 0) * opt.quantite;
    }, 0);
    const retourCost = formData.selectedOptionsRetour.reduce((total, opt) => {
      const optionInfo = options?.find((o: any) => o.code === opt.code);
      return total + (optionInfo?.prix || 0) * opt.quantite;
    }, 0);
    return allerCost + retourCost;
  }, [formData.selectedOptionsAller, formData.selectedOptionsRetour, options]);

  const totalPrice = categoryPrice + optionsCost;

  const handleSubmit = () => {
    if (!formData.clientName || !formData.clientPhone || !formData.departAddress || !formData.arriveeAddress) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    if (!formData.categoryCode) {
      toast.error('Veuillez sélectionner une catégorie de véhicule');
      return;
    }

    const bookingData: CreateInterCityBookingDto = {
      categoryCode: formData.categoryCode,
      departLat: formData.departLat || 0,
      departLng: formData.departLng || 0,
      departAddress: formData.departAddress,
      arriveeLat: formData.arriveeLat || 0,
      arriveeLng: formData.arriveeLng || 0,
      arriveeAddress: formData.arriveeAddress,
      pax: formData.pax,
      isOneWay: formData.isOneWay,
      paidBy: formData.paidBy,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      clientEmail: formData.clientEmail,
    };

    createBooking(bookingData);
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Header */}
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

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Trip Details */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 mb-6">
                  <MapPin className="w-5 h-5 text-[#E04A1F]" />
                  Details du trajet
                </h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Depart</p>
                      <p className="text-lg font-bold text-slate-900">{formData.departAddress || '—'}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Arrivee</p>
                      <p className="text-lg font-bold text-slate-900">{formData.arriveeAddress || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
                      <p className="font-semibold text-slate-900">{formData.scheduledDate || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Heure</p>
                      <p className="font-semibold text-slate-900">{formData.scheduledTime || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Passagers</p>
                      <p className="font-semibold text-slate-900">{formData.pax}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Vehicule</p>
                      <p className="font-semibold text-slate-900">{selectedCategory?.label || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 mb-6">
                  <User className="w-5 h-5 text-[#E04A1F]" />
                  Informations du client
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nom</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-slate-900">{formData.clientEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Telephone</p>
                    <p className="text-slate-900">{formData.clientPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Action Buttons */}
            <aside className="lg:col-span-1">
              <div className="sticky top-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => router.push("/tracking")}
                    className="w-full bg-[#E04A1F] text-white py-5 rounded-2xl font-extrabold text-base border-0 hover:shadow-[0_0_32px_rgba(172,53,9,0.4)] active:scale-[0.98] transition-all gap-2"
                  >
                    Suivi commande
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setFormData({
                        clientName: '',
                        clientEmail: '',
                        clientPhone: '',
                        departAddress: '',
                        departLat: null,
                        departLng: null,
                        arriveeAddress: '',
                        arriveeLat: null,
                        arriveeLng: null,
                        scheduledDate: '',
                        scheduledTime: '',
                        isOneWay: true,
                        departRetourAddress: '',
                        departRetourLat: null,
                        departRetourLng: null,
                        arriveeRetourAddress: '',
                        arriveeRetourLat: null,
                        arriveeRetourLng: null,
                        scheduledDateRetour: '',
                        scheduledTimeRetour: '',
                        pax: 1,
                        bagages23: 0,
                        bagages10: 0,
                        categoryCode: '',
                        selectedOptionsAller: [],
                        selectedOptionsRetour: [],
                        paidBy: 'company',
                      });
                      setCurrentStep(2);
                      setBookingSuccess(false);
                      setBookingReference('');
                    }}
                    variant="outline"
                    className="w-full py-5 rounded-2xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Nouvelle reservation
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step: any, idx: number) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${isActive ? '' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      isActive
                        ? 'bg-orange-500'
                        : isCompleted
                          ? 'bg-green-500'
                          : 'bg-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                  </div>
                  <p className="text-xs font-semibold mt-2 text-center">{step.title}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${isActive || isCompleted ? 'bg-green-500' : 'bg-slate-300'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Informations du client</h2>
              <div className="space-y-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    placeholder="Nom du client"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(value) => setFormData({ ...formData, clientPhone: value })}
                    defaultCountryCode="CI"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Détails du trajet</h2>

              {/* ALLER SECTION */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-5">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <ArrowRight className="w-5 h-5 text-[#E04A1F]" />
                  Trajet - Aller
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Lieu de départ</Label>
                    <AddressAutocomplete
                      value={formData.departAddress || ''}
                      onChange={(val) => setFormData({ ...formData, departAddress: val })}
                      onSelect={(address: string, lat: number, lng: number) =>
                        setFormData({
                          ...formData,
                          departAddress: address,
                          departLat: lat,
                          departLng: lng,
                        })
                      }
                      countryCode="CI"
                      iconColor="text-green-500"
                    />
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <AddressAutocomplete
                      value={formData.arriveeAddress || ''}
                      onChange={(val) => setFormData({ ...formData, arriveeAddress: val })}
                      onSelect={(address: string, lat: number, lng: number) =>
                        setFormData({
                          ...formData,
                          arriveeAddress: address,
                          arriveeLat: lat,
                          arriveeLng: lng,
                        })
                      }
                      countryCode="CI"
                      iconColor="text-red-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date aller</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {formData.scheduledDate
                              ? format(new Date(formData.scheduledDate), 'dd MMM yyyy', { locale: fr })
                              : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={formData.scheduledDate ? new Date(formData.scheduledDate) : undefined}
                            onSelect={(date) =>
                              setFormData({
                                ...formData,
                                scheduledDate: date ? format(date, 'yyyy-MM-dd') : '',
                              })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Heure aller</Label>
                      <TimePicker
                        value={formData.scheduledTime}
                        onChange={(time) => setFormData({ ...formData, scheduledTime: time })}
                      />
                    </div>
                  </div>

                  {/* Options supplémentaires - Aller */}
                  {options && options.length > 0 && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[#E04A1F]" />
                        Options supplémentaires
                      </h4>
                      <div className="space-y-2">
                        {options.map((option: any) => {
                          const selectedOption = formData.selectedOptionsAller.find((o: any) => o.code === option.code);
                          const quantity = selectedOption?.quantite || 0;

                          return (
                            <div key={option.code} className="p-2 border border-slate-200 rounded-lg hover:border-orange-200 transition">
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-slate-900">{option.label}</p>
                                  <p className="text-xs text-slate-600">{option.prix.toLocaleString()} FCFA</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {quantity > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      onClick={() =>
                                        setFormData({
                                          ...formData,
                                          selectedOptionsAller: formData.selectedOptionsAller
                                            .map(o =>
                                              o.code === option.code && o.quantite > 1
                                                ? { ...o, quantite: o.quantite - 1 }
                                                : o
                                            )
                                            .filter((o: any) => o.quantite > 0),
                                        })
                                      }
                                    >
                                      −
                                    </Button>
                                  )}
                                  <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
                                  {quantity < option.maxQuantite && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        const existing = formData.selectedOptionsAller.find((o: any) => o.code === option.code);
                                        if (existing) {
                                          setFormData({
                                            ...formData,
                                            selectedOptionsAller: formData.selectedOptionsAller.map(o =>
                                              o.code === option.code ? { ...o, quantite: o.quantite + 1 } : o
                                            ),
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selectedOptionsAller: [...formData.selectedOptionsAller, { code: option.code, quantite: 1 }],
                                          });
                                        }
                                      }}
                                    >
                                      +
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ALLER-RETOUR TOGGLE */}
              <div className="flex items-center justify-between gap-3 border border-slate-200 p-4 rounded-2xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[#E04A1F] shrink-0">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#E04A1F]">Aller-retour</p>
                    <p className="text-xs text-slate-500">Réserver le retour</p>
                  </div>
                </div>
                <Switch
                  checked={!formData.isOneWay}
                  onCheckedChange={(v) => setFormData({ ...formData, isOneWay: !v })}
                />
              </div>

              {/* RETOUR SECTION - CONDITIONAL */}
              {!formData.isOneWay && (
                <div className="bg-orange-50 rounded-3xl p-6 md:p-8 shadow-sm border border-orange-100 space-y-5">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    <ArrowLeft className="w-5 h-5 text-[#E04A1F]" />
                    Trajet - Retour
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Lieu de départ (retour)</Label>
                      <AddressAutocomplete
                        value={formData.departRetourAddress || ''}
                        onChange={(val) => setFormData({ ...formData, departRetourAddress: val })}
                        onSelect={(address: string, lat: number, lng: number) =>
                          setFormData({
                            ...formData,
                            departRetourAddress: address,
                            departRetourLat: lat,
                            departRetourLng: lng,
                          })
                        }
                        countryCode="CI"
                        iconColor="text-green-500"
                      />
                    </div>
                    <div>
                      <Label>Destination retour</Label>
                      <AddressAutocomplete
                        value={formData.arriveeRetourAddress || ''}
                        onChange={(val) => setFormData({ ...formData, arriveeRetourAddress: val })}
                        onSelect={(address: string, lat: number, lng: number) =>
                          setFormData({
                            ...formData,
                            arriveeRetourAddress: address,
                            arriveeRetourLat: lat,
                            arriveeRetourLng: lng,
                          })
                        }
                        countryCode="CI"
                        iconColor="text-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date retour</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {formData.scheduledDateRetour ? formData.scheduledDateRetour : 'Sélectionner'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.scheduledDateRetour ? new Date(formData.scheduledDateRetour) : undefined}
                              onSelect={(date) => setFormData({ ...formData, scheduledDateRetour: date ? format(date, 'yyyy-MM-dd') : '' })}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Heure retour</Label>
                        <Input
                          type="time"
                          value={formData.scheduledTimeRetour}
                          onChange={(e) => setFormData({ ...formData, scheduledTimeRetour: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Options supplémentaires - Retour */}
                    {options && options.length > 0 && (
                      <div className="pt-4 border-t border-orange-200 space-y-3">
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#E04A1F]" />
                          Options supplémentaires
                        </h4>
                        <div className="space-y-2">
                          {options.map((option: any) => {
                            const selectedOption = formData.selectedOptionsRetour.find((o: any) => o.code === option.code);
                            const quantity = selectedOption?.quantite || 0;

                            return (
                              <div key={option.code} className="p-2 border border-orange-200 rounded-lg hover:border-orange-300 transition bg-white/50">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-slate-900">{option.label}</p>
                                    <p className="text-xs text-slate-600">{option.prix.toLocaleString()} FCFA</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {quantity > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 w-7 p-0"
                                        onClick={() =>
                                          setFormData({
                                            ...formData,
                                            selectedOptionsRetour: formData.selectedOptionsRetour
                                              .map(o =>
                                                o.code === option.code && o.quantite > 1
                                                  ? { ...o, quantite: o.quantite - 1 }
                                                  : o
                                              )
                                              .filter((o: any) => o.quantite > 0),
                                          })
                                        }
                                      >
                                        −
                                      </Button>
                                    )}
                                    <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
                                    {quantity < option.maxQuantite && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          const existing = formData.selectedOptionsRetour.find((o: any) => o.code === option.code);
                                          if (existing) {
                                            setFormData({
                                              ...formData,
                                              selectedOptionsRetour: formData.selectedOptionsRetour.map(o =>
                                                o.code === option.code ? { ...o, quantite: o.quantite + 1 } : o
                                              ),
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              selectedOptionsRetour: [...formData.selectedOptionsRetour, { code: option.code, quantite: 1 }],
                                            });
                                          }
                                        }}
                                      >
                                        +
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PASSAGERS ET BAGAGES SECTION */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-5">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-[#E04A1F]" />
                  Passagers et bagages
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre de passagers</Label>
                    <Select value={String(formData.pax)} onValueChange={(v) => setFormData({ ...formData, pax: parseInt(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n: number) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} personne{n > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bagages 23kg</Label>
                      <Select
                        value={String(formData.bagages23)}
                        onValueChange={(v) => setFormData({ ...formData, bagages23: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4].map((n: number) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bagages 10kg</Label>
                      <Select
                        value={String(formData.bagages10)}
                        onValueChange={(v) => setFormData({ ...formData, bagages10: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4].map((n: number) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Sélection du véhicule</h2>

              {/* Vehicle Categories */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Catégories de véhicules</h3>
                {categoriesLoading ? (
                  <p className="text-slate-500">Chargement des catégories...</p>
                ) : categories && categories.length > 0 ? (
                  <div className="grid gap-3">
                    {categories.map((category: any) => (
                      <div
                        key={category.code}
                        onClick={() => setFormData({ ...formData, categoryCode: category.code })}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                          formData.categoryCode === category.code
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg">{category.label}</h4>
                            <p className="text-sm text-slate-600">
                              Jusqu&apos;à {category.maxPax} passagers • {category.maxBagages23kg}x23kg • {category.maxBagages10kg}x10kg
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 border-0">
                            À partir de {category.tarifs[0]?.minimumGaranti.toLocaleString()} FCFA
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">Aucune catégorie disponible</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Mode de paiement</h2>
              <p className="text-slate-600">Qui paiera pour cette réservation?</p>

              <div className="grid gap-4">
                {/* Compte Entreprise */}
                <div
                  onClick={() => setFormData({ ...formData, paidBy: 'company' })}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition ${
                    formData.paidBy === 'company'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🏢</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900">Compte entreprise</h3>
                      <p className="text-sm text-slate-600 mt-1">L'entreprise paie via Bictorys</p>
                    </div>
                    {formData.paidBy === 'company' && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Client / Employe */}
                <div
                  onClick={() => setFormData({ ...formData, paidBy: 'client' })}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition ${
                    formData.paidBy === 'client'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">👤</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900">Client / Employe</h3>
                      <p className="text-sm text-slate-600 mt-1">Le client ou l'employé paie lui-même</p>
                    </div>
                    {formData.paidBy === 'client' && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Confirmation</h2>
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-600">Client:</span>
                  <span className="font-semibold">{formData.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Trajet:</span>
                  <span className="font-semibold">{formData.departAddress} → {formData.arriveeAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date:</span>
                  <span className="font-semibold">{formData.scheduledDate} à {formData.scheduledTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Passagers:</span>
                  <span className="font-semibold">{formData.pax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Véhicule:</span>
                  <span className="font-semibold">{selectedCategoryInfo?.label || formData.categoryCode}</span>
                </div>
                {(formData.selectedOptionsAller.length > 0 || formData.selectedOptionsRetour.length > 0) && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Options:</span>
                    <span className="font-semibold">
                      {[
                        ...formData.selectedOptionsAller.map(opt => {
                          const optInfo = options?.find((o: any) => o.code === opt.code);
                          return `${optInfo?.label} x${opt.quantite}`;
                        }),
                        ...formData.selectedOptionsRetour.map(opt => {
                          const optInfo = options?.find((o: any) => o.code === opt.code);
                          return `${optInfo?.label} x${opt.quantite}`;
                        }),
                      ].join(', ')}
                    </span>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Véhicule:</span>
                    <span className="font-semibold">{categoryPrice.toLocaleString()} FCFA</span>
                  </div>
                  {optionsCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Options:</span>
                      <span className="font-semibold">{optionsCost.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg pt-2 border-t border-slate-300">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-orange-600">{totalPrice.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <Button
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          >
            Précédent
          </Button>
          {currentStep < 5 ? (
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {isPending ? 'Création...' : 'Créer la réservation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
