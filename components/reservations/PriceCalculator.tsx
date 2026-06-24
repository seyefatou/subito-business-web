'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api, QuoteResponseDto } from '@/lib/api';
import { formatPrice, getPricingModeLabel } from '@/lib/booking-utils';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

interface PriceCalculatorProps {
  productType: 'logement' | 'activite' | 'circuit' | 'vehicule' | 'salle';
  productId: number;
  dateDebut?: Date;
  dateFin?: Date;
  heureDebut?: string;
  heureFin?: string;
  nombrePersonnes?: number;
  pensionIds?: number[];
  priceOptionIds?: number[];
  pensions?: any[];
  priceOptions?: any[];
  onAvailabilityError?: (hasError: boolean) => void;
}

export function PriceCalculator({
  productType,
  productId,
  dateDebut,
  dateFin,
  heureDebut,
  heureFin,
  nombrePersonnes = 1,
  pensionIds = [],
  priceOptionIds = [],
  pensions = [],
  priceOptions = [],
  onAvailabilityError,
}: PriceCalculatorProps) {
  const { data: quoteResponse, isLoading, error } = useQuery({
    queryKey: ['quote', productType, productId, dateDebut, dateFin, heureDebut, heureFin, nombrePersonnes, pensionIds, priceOptionIds],
    queryFn: () => {
      const params: any = {
        nombrePersonnes,
      };

      if (dateDebut) params.dateDebut = dateDebut.toISOString();
      if (dateFin) params.dateFin = dateFin.toISOString();
      if (heureDebut) params.heureDebut = heureDebut;
      if (heureFin) params.heureFin = heureFin;

      // Map pension IDs to formule code
      if (pensionIds.length > 0) {
        const pension = pensions.find((p) => p.id === pensionIds[0]);
        if (pension) {
          params.formuleRepas = pension.formule || pension.code;
        }
      }

      // Map option IDs to codes for priceOptions field
      if (priceOptionIds.length > 0) {
        params.priceOptions = priceOptionIds
          .map((id) => {
            const option = priceOptions.find((o) => o.id === id);
            return option ? { code: option.code, quantite: 1 } : null;
          })
          .filter(Boolean);
      }

      // Set serviceType and product ID based on type
      switch (productType) {
        case 'logement':
          params.serviceType = 'LOGEMENT';
          params.logementId = productId;
          break;
        case 'activite':
          params.serviceType = 'ACTIVITE';
          params.activiteId = productId;
          break;
        case 'circuit':
          params.serviceType = 'ACTIVITE';
          params.circuitId = productId;
          break;
        case 'vehicule':
          params.serviceType = 'FLOTTE';
          params.vehiculeLocationId = productId;
          break;
        case 'salle':
          params.serviceType = 'SALLE';
          params.salleId = productId;
          break;
      }

      return api.serviceReservations.quote(params);
    },
    enabled: !!productId && (!!dateDebut || productType === 'activite' || productType === 'circuit'),
  });

  const quote = quoteResponse?.data as QuoteResponseDto | undefined;

  // Notify parent of availability errors
  useEffect(() => {
    if (onAvailabilityError) {
      const isUnavailable = (error as any)?.status === 409 || error?.message?.includes('indisponible') || error?.message?.includes('disponible');
      onAvailabilityError(!!error && isUnavailable);
    }
  }, [error, onAvailabilityError]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#E04A1F]" />
          <span className="text-sm text-slate-600">Calcul du prix...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isUnavailable = (error as any)?.status === 409 || error.message?.includes('indisponible') || error.message?.includes('disponible');
    const errorTitle = isUnavailable ? '❌ Service indisponible' : '⚠️ Erreur lors du calcul du prix';
    const errorMessage = isUnavailable
      ? 'Cette salle n\'est pas disponible pour les dates/heures sélectionnées. Veuillez choisir d\'autres dates.'
      : error.message;

    return (
      <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
        <p className="text-sm font-semibold text-red-800">{errorTitle}</p>
        <p className="text-xs text-red-600">{errorMessage}</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-3 p-4 bg-yellow-50 rounded-xl">
        <p className="text-sm text-yellow-800">⏳ Calcul du prix en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-slate-50 rounded-xl p-4">
      {/* Détail du prix */}
      <div className="space-y-2 text-sm">
        {quote.base && (
          <div className="flex justify-between items-center">
            <span className="text-slate-600">{quote.base.libelle}</span>
            <span className="font-medium text-slate-900">{formatPrice(quote.base.montant)} FCFA</span>
          </div>
        )}

        {quote.pension && (
          <div className="flex justify-between items-center">
            <span className="text-slate-600">{quote.pension.formule}</span>
            <span className="font-medium text-slate-900">{formatPrice(quote.pension.total)} FCFA</span>
          </div>
        )}

        {quote.options && quote.options.montant > 0 && (
          <>
            {quote.options.items.map((item) => (
              <div key={item.code} className="flex justify-between items-center text-xs">
                <span className="text-slate-600">
                  {item.titre || item.code}
                  {item.pricingMode && <span className="text-slate-500 ml-1">({getPricingModeLabel(item.pricingMode)})</span>}
                </span>
                <span className="font-medium text-slate-900">{formatPrice(item.total)} FCFA</span>
              </div>
            ))}
          </>
        )}

        {quote.reduction && quote.reduction.montant > 0 && (
          <div className="flex justify-between items-center text-red-600">
            <span>Réduction</span>
            <span className="font-medium">-{formatPrice(quote.reduction.montant)} FCFA</span>
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div className="border-t border-slate-200"></div>

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="font-bold text-slate-900">Total</span>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-[#E04A1F]" style={MANROPE}>
            {formatPrice(quote.totalPrice)} FCFA
          </div>
          {quote.sejour && (
            <p className="text-xs text-slate-600">
              {quote.sejour.nbNuits} nuit{quote.sejour.nbNuits > 1 ? 's' : ''}
              {quote.sejour.nbWeekend > 0 ? ` (+${quote.sejour.nbWeekend} weekend)` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Acompte si requis */}
      {quote.acompte && quote.acompte.requis && quote.acompte.montant && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
          Acompte requis : {formatPrice(quote.acompte.montant)} FCFA
        </div>
      )}

      {/* Disponibilité */}
      {!quote.disponible && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
          Pas disponible pour ces dates
        </div>
      )}
    </div>
  );
}
