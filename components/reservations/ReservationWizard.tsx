'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, Minus, Plus, CreditCard, Calendar, Users, Wallet, Mail, Phone, User as UserIcon, CheckCircle2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PriceCalculator } from './PriceCalculator';
import { OptionsSelector } from './OptionsSelector';
import { ProductType, ReservationWizardState } from '@/lib/booking-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

interface ReservationWizardProps {
  productType: ProductType;
  productId: number;
  productName: string;
  pensions?: any[];
  priceOptions?: any[];
  capacite?: number;
  productImage?: string;
  productDescription?: string;
  onCancel: () => void;
}

type StepComponent = React.ReactNode;

export function ReservationWizard({
  productType,
  productId,
  productName,
  pensions = [],
  priceOptions = [],
  capacite = 99,
  productImage,
  productDescription,
  onCancel,
}: ReservationWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [state, setState] = useState<ReservationWizardState>({
    step: 1,
    nombrePersonnes: 1,
    selectedPensions: [],
    selectedPriceOptions: [],
  });
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const isStep2Complete = () => {
    if (productType === 'logement' || productType === 'circuit') {
      return !!state.dateDebut && !!state.dateFin;
    }
    if (productType === 'salle' || productType === 'vehicule') {
      return !!state.dateDebut && !!state.dateFin && !!state.heureDebut && !!state.heureFin;
    }
    if (productType === 'activite') {
      return !!state.dateDebut;
    }
    return false;
  };

  const handleNextStep = () => {
    if (state.step < 4) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as 1 | 2 | 3 | 4 }));
    }
  };

  const handlePrevStep = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as 1 | 2 | 3 | 4 }));
    }
  };

  const createReservationMutation = useMutation({
    mutationFn: (data: any) => api.serviceReservations.create(data),
    onSuccess: (response: any) => {
      const ref = response?.data?.reservationCode || response?.reservationCode || `SRV-${Date.now()}`;
      const id = response?.data?.id || response?.id;
      setBookingRef(ref);
      setBookingId(id);
      setBookingSuccess(true);
      toast.success('Réservation confirmée avec succès !');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création de la réservation');
    },
  });

  const handleConfirm = () => {
    const clientData = selectedEmployee || user;

    if (!clientData?.nom || !clientData?.prenom) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }

    if (!state.dateDebut || !state.dateFin) {
      toast.error('Veuillez sélectionner les dates');
      return;
    }

    if (!state.paymentMethod) {
      toast.error('Veuillez sélectionner un mode de paiement');
      return;
    }

    const getFormuleRepas = (): string | undefined => {
      if (state.selectedPensions.length === 0) return undefined;
      const pensionId = state.selectedPensions[0];
      const pension = pensions.find((p) => p.id === pensionId);
      return pension?.formule || undefined;
    };

    const reservationData = {
      serviceType: productType === 'logement' ? 'LOGEMENT' : productType.toUpperCase(),
      logementId: productType === 'logement' ? productId : undefined,
      activiteId: productType === 'activite' ? productId : undefined,
      circuitId: productType === 'circuit' ? productId : undefined,
      vehiculeLocationId: productType === 'vehicule' ? productId : undefined,
      salleId: productType === 'salle' ? productId : undefined,
      employeeId: selectedEmployee?.id || undefined,
      clientName: `${clientData.prenom} ${clientData.nom}`,
      clientPhone: clientData.telephone || '',
      clientEmail: clientData.email,
      dateDebut: state.dateDebut.toISOString().split('T')[0],
      dateFin: state.dateFin.toISOString().split('T')[0],
      heureDebut: state.heureDebut,
      heureFin: state.heureFin,
      nombrePersonnes: state.nombrePersonnes,
      formuleRepas: getFormuleRepas(),
      priceOptions: state.selectedPriceOptions.map((id) => {
        const option = priceOptions.find((o) => o.id === id);
        return {
          code: option?.code || `OPTION_${id}`,
          quantite: 1,
        };
      }),
      notes: `Mode de paiement: ${state.paymentMethod === 'company_account' ? 'Compte entreprise' : 'Client/Employé'}`,
      canal: 'company',
    };

    createReservationMutation.mutate(reservationData);
  };

  const renderStep = (): StepComponent => {
    switch (state.step) {
      case 1:
        return (
          <Step1ClientInfo
            user={user}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
          />
        );
      case 2:
        return (
          <Step2ReservationDetails
            productType={productType}
            capacite={capacite}
            pensions={pensions}
            priceOptions={priceOptions}
            state={state}
            setState={setState}
          />
        );
      case 3:
        return (
          <Step3Payment
            state={state}
            setState={setState}
          />
        );
      case 4:
        return (
          <Step4Confirmation
            productType={productType}
            productId={productId}
            productName={productName}
            state={state}
            selectedEmployee={selectedEmployee}
            user={user}
            pensions={pensions}
            priceOptions={priceOptions}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = (): string => {
    switch (state.step) {
      case 1:
        return 'Informations client';
      case 2:
        return 'Détails de réservation';
      case 3:
        return 'Mode de paiement';
      case 4:
        return 'Confirmation';
      default:
        return '';
    }
  };

  const steps = [
    { title: 'Informations client' },
    { title: 'Détails de réservation' },
    { title: 'Mode de paiement' },
    { title: 'Confirmation' },
  ];

  if (bookingSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6 space-y-8 py-8"
      >
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#E04A1F] p-10 md:p-14 text-white shadow-xl">
          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            <div className="bg-white/20 backdrop-blur-md rounded-full p-4 ring-8 ring-white/10">
              <CheckCircle2 className="w-14 h-14" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2" style={MANROPE}>
                Réservation confirmée
              </h1>
              <p className="text-white/90 text-base md:text-lg font-medium">
                Votre {productType === 'logement' ? 'logement' : productType} est réservé et vous recevrez bientôt une confirmation.
              </p>
              <p className="text-white/80 text-sm mt-3">
                Référence : <span className="font-bold text-white">{bookingRef}</span>
              </p>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        </section>

        {/* Booking Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-[#ffdbd0] p-3 rounded-2xl text-[#E04A1F]">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">{productName}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date d&apos;arrivée</span>
                <span className="font-semibold text-slate-900">
                  {state.dateDebut ? format(new Date(state.dateDebut), 'dd MMM yyyy', { locale: fr }) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date de départ</span>
                <span className="font-semibold text-slate-900">
                  {state.dateFin ? format(new Date(state.dateFin), 'dd MMM yyyy', { locale: fr }) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Voyageurs</span>
                <span className="font-semibold text-slate-900">{state.nombrePersonnes}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-[#ffdbd0] p-3 rounded-2xl text-[#E04A1F]">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Mode de paiement</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center py-4 bg-[#f0f4f8] rounded-xl">
                <p className="font-bold text-[#E04A1F] text-center">
                  {state.paymentMethod === 'company_account'
                    ? 'Compte entreprise'
                    : state.paymentMethod === 'client'
                    ? 'Client/Employé'
                    : 'Non spécifié'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => bookingId && router.push(`/service-reservations/${bookingId}/tracking`)}
            disabled={!bookingId}
            className="flex-1 bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98] gap-2 disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
            Suivre ma réservation
          </Button>
          <Button
            onClick={() => {
              setBookingSuccess(false);
              setState({
                step: 1,
                nombrePersonnes: 1,
                selectedPensions: [],
                selectedPriceOptions: [],
              });
              setSelectedEmployee(null);
            }}
            className="flex-1 py-6 rounded-2xl font-bold text-base bg-slate-100 border-0 hover:bg-slate-200 active:scale-[0.98] transition-all gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle réservation
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header with back button and step info */}
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={state.step > 1 ? handlePrevStep : onCancel}
              className="p-2 hover:bg-slate-100 rounded-full transition"
            >
              <ArrowLeft className="w-6 h-6 text-[#171c1f]" />
            </button>
            <div>
              <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
                Étape {state.step} sur 4
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
                {getStepTitle()}
              </h1>
            </div>
          </div>
          <span className="text-[#E04A1F] font-bold text-xs bg-[#ffdbd0] px-4 py-2 rounded-full uppercase tracking-widest shrink-0">
            Étape {state.step}/4
          </span>
        </div>

        {/* Editorial Stepper */}
        <div className="flex items-center w-full mb-10">
          {steps.map((step, idx) => {
            const isDone = state.step > (idx + 1);
            const isActive = state.step === (idx + 1);
            const isLast = idx === steps.length - 1;
            return (
              <React.Fragment key={idx}>
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
                      <span className="text-sm">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs hidden sm:block whitespace-nowrap text-center ${
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

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="md:col-span-2">{renderStep()}</div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 sticky top-24">
              <h3 className="text-sm font-extrabold text-[#171c1f] uppercase tracking-widest mb-4">
                Récapitulatif
              </h3>

              {/* Product */}
              <div className="mb-4 pb-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-[#585e6c] uppercase tracking-widest mb-2">
                  Produit
                </p>
                <p className="text-sm font-bold text-[#171c1f]">{productName}</p>
              </div>

{/* Pricing */}
              {state.step >= 1 && (
                isStep2Complete() ? (
                  <PriceCalculator
                    productType={productType}
                    productId={productId}
                    dateDebut={state.dateDebut}
                    dateFin={state.dateFin}
                    heureDebut={state.heureDebut}
                    heureFin={state.heureFin}
                    nombrePersonnes={state.nombrePersonnes}
                    pensionIds={state.selectedPensions}
                    priceOptionIds={state.selectedPriceOptions}
                    pensions={pensions}
                    priceOptions={priceOptions}
                    onAvailabilityError={setIsUnavailable}
                  />
                ) : (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-600 text-center">
                      📅 Remplissez les dates pour voir le prix
                    </p>
                  </div>
                )
              )}

              {/* Buttons */}
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                {state.step > 1 && (
                  <Button
                    onClick={handlePrevStep}
                    className="w-full bg-[#f0f4f8] text-[#171c1f] border-0 py-6 rounded-2xl font-bold text-base hover:bg-slate-200 active:scale-[0.98] transition-all"
                  >
                    Retour
                  </Button>
                )}

                {state.step < 4 ? (
                  <Button
                    onClick={handleNextStep}
                    disabled={(state.step === 2 && !isStep2Complete()) || (state.step === 3 && !state.paymentMethod)}
                    className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Continuer
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirm}
                    disabled={createReservationMutation.isPending || isUnavailable}
                    title={isUnavailable ? 'Veuillez choisir d\'autres dates' : ''}
                    className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {createReservationMutation.isPending ? 'Confirmation en cours...' : 'Confirmer la réservation'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 1: CLIENT INFO ====================
interface Step1Props {
  user: any;
  selectedEmployee: any | null;
  setSelectedEmployee: (emp: any) => void;
}

function Step1ClientInfo({ user, selectedEmployee, setSelectedEmployee }: Step1Props) {
  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.employees.list({ limit: 100 }),
  });

  const employeesRaw = employeesResponse?.data;
  const employees = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as any)?.items || (employeesRaw as any)?.list || [];

  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee);
  };

  const currentEmployee = selectedEmployee || user;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
          Sélectionner un employé
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Employé
            </label>
            {isLoading ? (
              <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#585e6c] bg-slate-50">
                ⏳ Chargement des employés...
              </div>
            ) : employees.length === 0 ? (
              <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-red-600 bg-red-50">
                ⚠️ Aucun employé disponible
              </div>
            ) : (
              <select
                value={selectedEmployee?.id?.toString() || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const emp = employees.find((emp) => emp.id === parseInt(e.target.value, 10));
                    if (emp) {
                      handleEmployeeSelect(emp);
                    }
                  } else {
                    handleEmployeeSelect(null);
                  }
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#171c1f]"
              >
                <option value="">-- Sélectionner un employé --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id?.toString()}>
                    {emp.prenom} {emp.nom}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Infos auto-remplies */}
      {currentEmployee && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
            Informations du client
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                Nom
              </label>
              <input
                type="text"
                value={currentEmployee?.nom || ''}
                disabled
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-[#171c1f] font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={currentEmployee?.prenom || ''}
                disabled
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-[#171c1f] font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={currentEmployee?.email || ''}
                disabled
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-[#171c1f] font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={currentEmployee?.telephone || ''}
                disabled
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-[#171c1f] font-medium"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STEP 2: RESERVATION DETAILS ====================
interface Step2Props {
  productType: ProductType;
  capacite: number;
  pensions: any[];
  priceOptions: any[];
  state: ReservationWizardState;
  setState: (updater: (prev: ReservationWizardState) => ReservationWizardState) => void;
}

function Step2ReservationDetails({
  productType,
  capacite,
  pensions,
  priceOptions,
  state,
  setState,
}: Step2Props) {
  return (
    <div className="space-y-6">
      {/* Dates */}
      <DateSection productType={productType} state={state} setState={setState} />

      {/* Nombre de personnes */}
      <ParticipantsSection capacite={capacite} state={state} setState={setState} />

      {/* Options - seulement si applicable */}
      {(pensions.length > 0 || priceOptions.length > 0) && (
        <OptionsSection
          pensions={pensions}
          priceOptions={priceOptions}
          state={state}
          setState={setState}
        />
      )}
    </div>
  );
}

// ==================== STEP 3: PAYMENT ====================
interface Step3PaymentProps {
  state: ReservationWizardState;
  setState: (updater: (prev: ReservationWizardState) => ReservationWizardState) => void;
}

function Step3Payment({ state, setState }: Step3PaymentProps) {
  const paymentMethods = [
    { id: 'company_account', label: 'Compte entreprise', description: 'L\'entreprise paie' },
    { id: 'client', label: 'Client/Employé', description: 'Le client ou l\'employé paie lui-même' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
          Sélectionnez le mode de paiement
        </h2>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${
                state.paymentMethod === method.id
                  ? 'border-[#E04A1F] bg-[#ffdbd0]/30'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={state.paymentMethod === method.id}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value as 'company_account' | 'client',
                  }))
                }
                className="w-5 h-5 cursor-pointer"
              />
              <div className="ml-4 flex-1">
                <p className="font-semibold text-[#171c1f]">{method.label}</p>
                <p className="text-sm text-[#585e6c]">{method.description}</p>
              </div>
              {state.paymentMethod === method.id && (
                <div className="w-5 h-5 rounded-full bg-[#E04A1F] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 4: CONFIRMATION ====================
interface Step4Props {
  productType: ProductType;
  productId: number;
  productName: string;
  state: ReservationWizardState;
  selectedEmployee: any;
  user: any;
  pensions: any[];
  priceOptions: any[];
}

function Step4Confirmation({
  productType,
  productId,
  productName,
  state,
  selectedEmployee,
  user,
  pensions,
  priceOptions,
}: Step4Props) {
  const getPensionLabel = (id: number) => {
    const pension = pensions.find((p) => p.id === id);
    if (!pension) return '';

    const formuleLabelMap: Record<string, string> = {
      'PENSION_COMPLETE': 'Pension complète',
      'DEMI_PENSION': 'Demi-pension',
      'PETIT_DEJEUNER': 'Petit-déjeuner',
      'NUIT_SIMPLE': 'Nuit simple',
    };

    return formuleLabelMap[pension.formule || ''] || pension.nom || pension.label || pension.titre || 'Option repas';
  };
  const getOptionLabel = (id: number) => {
    const option = priceOptions.find((o) => o.id === id);
    return option?.titre || option?.label || option?.nom || '';
  };

  const getPaymentMethodLabel = () => {
    return state.paymentMethod === 'company_account'
      ? 'Compte entreprise'
      : state.paymentMethod === 'client'
      ? 'Client/Employé'
      : 'Non sélectionné';
  };

  return (
    <div className="space-y-8">
      {/* Détails de la réservation - Bento Grid */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
          Détails de votre réservation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Produit */}
          <div className="flex items-start gap-4 pb-6 md:pb-0 md:border-b-0 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-[#E04A1F]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Logement</p>
              <p className="text-base font-bold text-[#171c1f]">{productName}</p>
            </div>
          </div>

          {/* Nombre de personnes */}
          <div className="flex items-start gap-4 pb-6 md:pb-0 md:border-b-0 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Voyageurs</p>
              <p className="text-base font-bold text-[#171c1f]">{state.nombrePersonnes} personne{state.nombrePersonnes > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Dates */}
          {(productType === 'logement' || productType === 'circuit' || productType === 'salle') && (
            <div className="flex items-start gap-4 pb-6 md:pb-0 md:border-b-0 border-b border-slate-100 md:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Dates du séjour</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-[#585e6c] mb-1">Arrivée</p>
                    <p className="text-sm font-bold text-[#171c1f]">
                      {state.dateDebut ? format(state.dateDebut, 'dd MMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                  <div className="text-[#585e6c]">→</div>
                  <div>
                    <p className="text-xs text-[#585e6c] mb-1">Départ</p>
                    <p className="text-sm font-bold text-[#171c1f]">
                      {state.dateFin ? format(state.dateFin, 'dd MMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Options repas */}
          {state.selectedPensions.length > 0 && (
            <div className="flex items-start gap-4 pb-6 md:pb-0 md:border-b-0 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Options repas</p>
                <div className="space-y-1">
                  {state.selectedPensions.map((id) => (
                    <p key={id} className="text-sm font-medium text-[#171c1f]">
                      • {getPensionLabel(id)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Options supplémentaires */}
          {state.selectedPriceOptions.length > 0 && (
            <div className="flex items-start gap-4 pb-6 md:pb-0 md:border-b-0 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">Options supplémentaires</p>
                <div className="space-y-1">
                  {state.selectedPriceOptions.map((id) => (
                    <p key={id} className="text-sm font-medium text-[#171c1f]">
                      • {getOptionLabel(id)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode de paiement */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-[#E04A1F]" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-extrabold text-[#171c1f] mb-1" style={MANROPE}>Mode de paiement</p>
            <p className="text-base font-bold text-[#E04A1F]">{getPaymentMethodLabel()}</p>
            <p className="text-xs text-[#585e6c] mt-2">
              {state.paymentMethod === 'company_account'
                ? 'L\'entreprise paiera cette réservation'
                : state.paymentMethod === 'client'
                ? 'Le client ou l\'employé paiera cette réservation'
                : 'Veuillez sélectionner un mode de paiement'}
            </p>
          </div>
        </div>
      </div>

      {/* Informations du client */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-extrabold text-[#171c1f] mb-6" style={MANROPE}>
          Informations du client
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nom et Prénom */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Prénom</p>
              <p className="text-sm font-bold text-[#171c1f] truncate">{selectedEmployee?.prenom || user?.prenom}</p>
              <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1 mt-3">Nom</p>
              <p className="text-sm font-bold text-[#171c1f] truncate">{selectedEmployee?.nom || user?.nom}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Email</p>
              <p className="text-sm font-bold text-[#171c1f] truncate">{selectedEmployee?.email || user?.email}</p>
            </div>
          </div>

          {/* Téléphone */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-1">Téléphone</p>
              <p className="text-sm font-bold text-[#171c1f]">{selectedEmployee?.telephone || user?.telephone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================
interface DateSectionProps {
  productType: ProductType;
  state: ReservationWizardState;
  setState: (updater: (prev: ReservationWizardState) => ReservationWizardState) => void;
}

function DateSection({ productType, state, setState }: DateSectionProps) {

  if (productType === 'vehicule' || productType === 'salle') {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
          Dates et heures
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Date et heure de début
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={state.dateDebut ? state.dateDebut.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  setState((prev) => ({ ...prev, dateDebut: date }));
                }}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <input
                type="time"
                value={state.heureDebut || ''}
                onChange={(e) => setState((prev) => ({ ...prev, heureDebut: e.target.value }))}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Date et heure de fin
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={state.dateFin ? state.dateFin.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  setState((prev) => ({ ...prev, dateFin: date }));
                }}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <input
                type="time"
                value={state.heureFin || ''}
                onChange={(e) => setState((prev) => ({ ...prev, heureFin: e.target.value }))}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateLabel = productType === 'activite' ? 'Date de l\'activité' : 'Dates de séjour';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
        {dateLabel}
      </h3>
      <div className="space-y-3">
        {productType !== 'activite' && (
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Date d&apos;arrivée
            </label>
            <input
              type="date"
              value={state.dateDebut ? state.dateDebut.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                setState((prev) => ({ ...prev, dateDebut: date }));
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />
          </div>
        )}

        {productType === 'activite' && (
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Date de l&apos;activité
            </label>
            <input
              type="date"
              value={state.dateDebut ? state.dateDebut.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                setState((prev) => ({ ...prev, dateDebut: date }));
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />
          </div>
        )}

        {(productType === 'logement' || productType === 'circuit' || productType === 'vehicule' || productType === 'salle') && (
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Date de départ
            </label>
            <input
              type="date"
              value={state.dateFin ? state.dateFin.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                setState((prev) => ({ ...prev, dateFin: date }));
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ParticipantsSectionProps {
  capacite: number;
  state: ReservationWizardState;
  setState: (updater: (prev: ReservationWizardState) => ReservationWizardState) => void;
}

function ParticipantsSection({ capacite, state, setState }: ParticipantsSectionProps) {

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
        Nombre de personnes
      </h3>
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 w-fit">
        <button
          onClick={() =>
            setState((prev) => ({
              ...prev,
              nombrePersonnes: Math.max(1, prev.nombrePersonnes - 1),
            }))
          }
          className="w-9 h-9 rounded-lg bg-[#f0f4f8] hover:bg-slate-200 text-[#171c1f] flex items-center justify-center transition"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          min="1"
          max={capacite}
          value={state.nombrePersonnes}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value >= 1 && value <= capacite) {
              setState((prev) => ({ ...prev, nombrePersonnes: value }));
            }
          }}
          className="w-16 text-center text-lg font-extrabold text-[#171c1f] border-0 focus:outline-none focus:ring-0"
          style={MANROPE}
        />
        <button
          onClick={() =>
            setState((prev) => ({
              ...prev,
              nombrePersonnes: Math.min(capacite, prev.nombrePersonnes + 1),
            }))
          }
          disabled={state.nombrePersonnes >= capacite}
          className="w-9 h-9 rounded-lg bg-[#E04A1F] hover:bg-[#C8330F] text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface OptionsSectionProps {
  pensions: any[];
  priceOptions: any[];
  state: ReservationWizardState;
  setState: (updater: (prev: ReservationWizardState) => ReservationWizardState) => void;
}

function OptionsSection({ pensions, priceOptions, state, setState }: OptionsSectionProps) {
  const handlePensionChange = (id: number, checked: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedPensions: checked
        ? [...prev.selectedPensions, id]
        : prev.selectedPensions.filter((pid) => pid !== id),
    }));
  };

  const handlePriceOptionChange = (id: number, checked: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedPriceOptions: checked
        ? [...prev.selectedPriceOptions, id]
        : prev.selectedPriceOptions.filter((pid) => pid !== id),
    }));
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
        Options disponibles
      </h3>
      <OptionsSelector
        pensions={pensions}
        priceOptions={priceOptions}
        interactive={true}
        selectedPensionIds={state.selectedPensions}
        selectedPriceOptionIds={state.selectedPriceOptions}
        onPensionChange={handlePensionChange}
        onPriceOptionChange={handlePriceOptionChange}
      />
    </div>
  );
}
