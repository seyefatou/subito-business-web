'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { api, Logement } from '@/lib/api';
import { PriceCalculator } from '@/components/reservations/PriceCalculator';
import { OptionsSelector } from '@/components/reservations/OptionsSelector';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Minus, Plus } from 'lucide-react';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

interface CheckoutPageParams {
  params: {
    id: string;
  };
}

export default function CheckoutPage({ params }: CheckoutPageParams) {
  const logementId = parseInt(params.id, 10);
  const router = useRouter();

  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [nombrePersonnes, setNombrePersonnes] = useState(1);
  const [selectedPensions, setSelectedPensions] = useState<number[]>([]);
  const [selectedPriceOptions, setSelectedPriceOptions] = useState<number[]>([]);

  const { data: logementResponse } = useQuery({
    queryKey: ['logement-public', logementId],
    queryFn: () => api.logements.getPublic(logementId),
    enabled: !!logementId,
  });

  const logement = logementResponse?.data as Logement | undefined;

  if (!logement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  const handlePensionChange = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedPensions([...selectedPensions, id]);
    } else {
      setSelectedPensions(selectedPensions.filter((pid) => pid !== id));
    }
  };

  const handlePriceOptionChange = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedPriceOptions([...selectedPriceOptions, id]);
    } else {
      setSelectedPriceOptions(selectedPriceOptions.filter((pid) => pid !== id));
    }
  };

  const handleContinue = () => {
    // Sauvegarder les données et aller à la page confirmation
    router.push(`/service-reservations/logement/${logementId}/confirmation?dates=${dateDebut?.toISOString()}_${dateFin?.toISOString()}&persons=${nombrePersonnes}&pensions=${selectedPensions.join(',')}&options=${selectedPriceOptions.join(',')}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6 text-[#171c1f]" />
          </button>
          <div>
            <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
              Étape 3 sur 4
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
              Sélectionnez vos options
            </h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="md:col-span-2 space-y-6">
            {/* Produit sélectionné */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                {logement.nom}
              </h2>
              <p className="text-sm text-[#585e6c]">{logement.description}</p>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                Dates de séjour
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                    Arrivée
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 hover:border-[#E04A1F] transition text-left">
                        <span className="text-sm font-medium text-[#171c1f]">
                          {dateDebut ? format(dateDebut, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner'}
                        </span>
                        <CalendarIcon className="w-4 h-4 text-[#585e6c]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateDebut}
                        onSelect={setDateDebut}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                    Départ
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 hover:border-[#E04A1F] transition text-left">
                        <span className="text-sm font-medium text-[#171c1f]">
                          {dateFin ? format(dateFin, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner'}
                        </span>
                        <CalendarIcon className="w-4 h-4 text-[#585e6c]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFin}
                        onSelect={setDateFin}
                        disabled={(d) => d < (dateDebut || new Date(new Date().setHours(0, 0, 0, 0)))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Nombre de personnes */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                Nombre de personnes
              </h3>
              <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 w-fit">
                <button
                  onClick={() => setNombrePersonnes((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg bg-[#f0f4f8] hover:bg-slate-200 text-[#171c1f] flex items-center justify-center transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-extrabold text-[#171c1f] px-6" style={MANROPE}>
                  {nombrePersonnes}
                </span>
                <button
                  onClick={() =>
                    setNombrePersonnes((p) =>
                      logement.capacite ? Math.min(logement.capacite, p + 1) : p + 1
                    )
                  }
                  disabled={!!logement.capacite && nombrePersonnes >= logement.capacite}
                  className="w-9 h-9 rounded-lg bg-[#E04A1F] hover:bg-[#C8330F] text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                Options disponibles
              </h3>
              <OptionsSelector
                pensions={logement.pensions}
                priceOptions={logement.priceOptions}
                interactive={true}
                selectedPensionIds={selectedPensions}
                selectedPriceOptionIds={selectedPriceOptions}
                onPensionChange={handlePensionChange}
                onPriceOptionChange={handlePriceOptionChange}
              />
            </div>
          </div>

          {/* Sidebar - Prix */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 sticky top-24">
              <h3 className="text-sm font-extrabold text-[#171c1f] uppercase tracking-widest mb-4">
                Récapitulatif du prix
              </h3>

              {dateDebut && dateFin ? (
                <>
                  <PriceCalculator
                    productType="logement"
                    productId={logementId}
                    dateDebut={dateDebut}
                    dateFin={dateFin}
                    nombrePersonnes={nombrePersonnes}
                    pensionIds={selectedPensions}
                    priceOptionIds={selectedPriceOptions}
                  />

                  <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                    <Button
                      onClick={handleContinue}
                      className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Continuer
                    </Button>
                    <Button
                      onClick={() => router.back()}
                      className="w-full bg-[#f0f4f8] text-[#171c1f] border-0 py-6 rounded-2xl font-bold text-base hover:bg-slate-200 active:scale-[0.98] transition-all"
                    >
                      Retour
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[#585e6c]">Sélectionnez les dates pour voir le prix</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
