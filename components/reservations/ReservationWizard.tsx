'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react';
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
  const { user } = useAuth();
  const [state, setState] = useState<ReservationWizardState>({
    step: 1,
    nombrePersonnes: 1,
    selectedPensions: [],
    selectedPriceOptions: [],
  });
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const isStep2Complete = () => {
    if (productType === 'logement' || productType === 'circuit') {
      return !!state.dateDebut && !!state.dateFin;
    }
    if (productType === 'activite') {
      return !!state.dateDebut;
    }
    if (productType === 'vehicule') {
      return !!state.dateDebut && !!state.dateFin && !!state.heureDebut && !!state.heureFin;
    }
    return false;
  };

  const handleNextStep = () => {
    if (state.step < 3) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as 1 | 2 | 3 }));
    }
  };

  const handlePrevStep = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as 1 | 2 | 3 }));
    }
  };

  const handleConfirm = () => {
    const clientData = selectedEmployee || user;
    // TODO: Créer la réservation
    console.log('Confirm reservation', {
      productType,
      productId,
      ...state,
      clientData: {
        nom: clientData?.nom,
        prenom: clientData?.prenom,
        email: clientData?.email,
        telephone: clientData?.telephone,
      },
    });
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
          <Step3Confirmation
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
        return 'Confirmation et paiement';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6 text-[#171c1f]" />
          </button>
          <div>
            <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
              Étape {state.step} sur 3
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
              {getStepTitle()}
            </h1>
          </div>
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
              {state.step >= 2 && (
                isStep2Complete() ? (
                  <PriceCalculator
                    productType={productType}
                    productId={productId}
                    dateDebut={state.dateDebut}
                    dateFin={state.dateFin}
                    nombrePersonnes={state.nombrePersonnes}
                    pensionIds={state.selectedPensions}
                    priceOptionIds={state.selectedPriceOptions}
                    pensions={pensions}
                    priceOptions={priceOptions}
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

                {state.step < 3 ? (
                  <Button
                    onClick={handleNextStep}
                    disabled={state.step === 2 && !isStep2Complete()}
                    className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Continuer
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirm}
                    className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmer la réservation
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

// ==================== STEP 3: CONFIRMATION ====================
interface Step3Props {
  productType: ProductType;
  productId: number;
  productName: string;
  state: ReservationWizardState;
  selectedEmployee: any;
  user: any;
  pensions: any[];
  priceOptions: any[];
}

function Step3Confirmation({
  productType,
  productId,
  productName,
  state,
  selectedEmployee,
  user,
  pensions,
  priceOptions,
}: Step3Props) {
  const getPensionLabel = (id: number) => {
    const pension = pensions.find((p) => p.id === id);
    return pension?.nom || pension?.label || pension?.titre || '';
  };
  const getOptionLabel = (id: number) => {
    const option = priceOptions.find((o) => o.id === id);
    return option?.titre || option?.label || option?.nom || '';
  };

  return (
    <div className="space-y-6">
      {/* Récapitulatif */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
          Récapitulatif de votre réservation
        </h2>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#585e6c]">Produit :</span>
            <span className="font-medium text-[#171c1f]">{productName}</span>
          </div>

          {(productType === 'logement' || productType === 'circuit') && (
            <>
              <div className="flex justify-between">
                <span className="text-[#585e6c]">Arrivée :</span>
                <span className="font-medium text-[#171c1f]">
                  {state.dateDebut ? format(state.dateDebut, 'dd MMMM yyyy', { locale: fr }) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#585e6c]">Départ :</span>
                <span className="font-medium text-[#171c1f]">
                  {state.dateFin ? format(state.dateFin, 'dd MMMM yyyy', { locale: fr }) : '-'}
                </span>
              </div>
            </>
          )}

          {productType === 'activite' && state.dateDebut && (
            <div className="flex justify-between">
              <span className="text-[#585e6c]">Date :</span>
              <span className="font-medium text-[#171c1f]">
                {format(state.dateDebut, 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          )}

          {productType === 'vehicule' && (
            <>
              <div className="flex justify-between">
                <span className="text-[#585e6c]">Début :</span>
                <span className="font-medium text-[#171c1f]">
                  {state.dateDebut ? format(state.dateDebut, 'dd MMMM yyyy', { locale: fr }) : '-'}{' '}
                  {state.heureDebut ? `à ${state.heureDebut}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#585e6c]">Fin :</span>
                <span className="font-medium text-[#171c1f]">
                  {state.dateFin ? format(state.dateFin, 'dd MMMM yyyy', { locale: fr }) : '-'}{' '}
                  {state.heureFin ? `à ${state.heureFin}` : ''}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="text-[#585e6c]">Nombre de personnes :</span>
            <span className="font-medium text-[#171c1f]">{state.nombrePersonnes}</span>
          </div>

          {state.selectedPensions.length > 0 && (
            <div>
              <span className="text-[#585e6c] block mb-1">Options repas :</span>
              {state.selectedPensions.map((id) => (
                <span key={id} className="block text-[#171c1f] font-medium ml-4">
                  • {getPensionLabel(id)}
                </span>
              ))}
            </div>
          )}

          {state.selectedPriceOptions.length > 0 && (
            <div>
              <span className="text-[#585e6c] block mb-1">Options supplémentaires :</span>
              {state.selectedPriceOptions.map((id) => (
                <span key={id} className="block text-[#171c1f] font-medium ml-4">
                  • {getOptionLabel(id)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client info */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
          Informations du client
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#585e6c]">Prénom :</span>
            <span className="font-medium text-[#171c1f]">{selectedEmployee?.prenom || user?.prenom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#585e6c]">Nom :</span>
            <span className="font-medium text-[#171c1f]">{selectedEmployee?.nom || user?.nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#585e6c]">Email :</span>
            <span className="font-medium text-[#171c1f]">{selectedEmployee?.email || user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#585e6c]">Téléphone :</span>
            <span className="font-medium text-[#171c1f]">{selectedEmployee?.telephone || user?.telephone}</span>
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

  if (productType === 'vehicule') {
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
            <div className="space-y-2">
              {/* Date debut */}
              {/* Heure debut */}
              <input
                type="time"
                value={state.heureDebut || ''}
                onChange={(e) => setState((prev) => ({ ...prev, heureDebut: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
              Date et heure de fin
            </label>
            <div className="space-y-2">
              {/* Date fin */}
              {/* Heure fin */}
              <input
                type="time"
                value={state.heureFin || ''}
                onChange={(e) => setState((prev) => ({ ...prev, heureFin: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
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

        {(productType === 'logement' || productType === 'circuit' || productType === 'vehicule') && (
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
      <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 w-fit">
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
        <span className="text-lg font-extrabold text-[#171c1f] px-6" style={MANROPE}>
          {state.nombrePersonnes}
        </span>
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
