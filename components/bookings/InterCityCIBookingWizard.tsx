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
  Plus,
  X,
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Client', icon: User },
  { id: 2, title: 'Trajet', icon: MapPin },
  { id: 3, title: 'Véhicule', icon: Car },
  { id: 4, title: 'Confirmation', icon: Check },
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
  pax: number;
  bagages23: number;
  bagages10: number;
  categoryCode: string;
  selectedOptions: Array<{ code: string; quantite: number }>;
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
    pax: 1,
    bagages23: 0,
    bagages10: 0,
    categoryCode: '',
    selectedOptions: [],
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
      setTimeout(() => router.push(`/tracking/${bookingCode}`), 2000);
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
    return formData.selectedOptions.reduce((total, opt) => {
      const optionInfo = options?.find((o: any) => o.code === opt.code);
      return total + (optionInfo?.prix || 0) * opt.quantite;
    }, 0);
  }, [formData.selectedOptions, options]);

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
                  />
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
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
                    <Label>Heure</Label>
                    <TimePicker
                      value={formData.scheduledTime}
                      onChange={(time) => setFormData({ ...formData, scheduledTime: time })}
                    />
                  </div>
                </div>
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
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Sélection du véhicule et options</h2>

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

              {/* Additional Options */}
              {options && options.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="font-semibold text-lg">Options supplémentaires</h3>
                  <div className="grid gap-3">
                    {options.map((option: any) => {
                      const selectedOption = formData.selectedOptions.find((o: any) => o.code === option.code);
                      const quantity = selectedOption?.quantite || 0;

                      return (
                        <div key={option.code} className="p-3 border border-slate-200 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-semibold">{option.label}</p>
                              <p className="text-xs text-slate-500">{option.description}</p>
                              <p className="text-sm font-bold text-orange-600 mt-1">
                                {option.prix.toLocaleString()} FCFA {option.pricingMode === 'FLAT' ? '(unitaire)' : '(par km)'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {quantity > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      selectedOptions: formData.selectedOptions
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
                              <span className="w-8 text-center font-semibold">{quantity}</span>
                              {quantity < option.maxQuantite && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const existing = formData.selectedOptions.find((o: any) => o.code === option.code);
                                    if (existing) {
                                      setFormData({
                                        ...formData,
                                        selectedOptions: formData.selectedOptions.map(o =>
                                          o.code === option.code ? { ...o, quantite: o.quantite + 1 } : o
                                        ),
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        selectedOptions: [...formData.selectedOptions, { code: option.code, quantite: 1 }],
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
          )}

          {currentStep === 4 && (
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
                {formData.selectedOptions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Options:</span>
                    <span className="font-semibold">
                      {formData.selectedOptions
                        .map(opt => {
                          const optInfo = options?.find((o: any) => o.code === opt.code);
                          return `${optInfo?.label} x${opt.quantite}`;
                        })
                        .join(', ')}
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
          {currentStep < 4 ? (
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
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
