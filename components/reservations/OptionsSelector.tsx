'use client';

import { Pension, PriceOption } from '@/lib/api';
import { getPricingModeLabel, getFormuleLabel, formatPrice } from '@/lib/booking-utils';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

interface OptionsSelectorProps {
  pensions?: Pension[];
  priceOptions?: PriceOption[];
  interactive?: boolean;
  selectedPensionIds?: number[];
  selectedPriceOptionIds?: number[];
  onPensionChange?: (id: number, checked: boolean) => void;
  onPriceOptionChange?: (id: number, checked: boolean) => void;
}

export function OptionsSelector({
  pensions = [],
  priceOptions = [],
  interactive = false,
  selectedPensionIds = [],
  selectedPriceOptionIds = [],
  onPensionChange,
  onPriceOptionChange,
}: OptionsSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Pensions / Formules de repas */}
      {pensions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">
            Options de repas
          </h3>
          <div className="space-y-2">
            {pensions.map((pension) => {
              const isSelected = selectedPensionIds.includes(pension.id);
              return (
                <div
                  key={pension.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition ${
                    interactive
                      ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
                      : 'bg-transparent'
                  }`}
                >
                  {interactive && onPensionChange && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onPensionChange(pension.id, e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-[#E04A1F] cursor-pointer"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {getFormuleLabel(pension.formule || '')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {pension.prix === 0 ? (
                      <span className="text-sm font-bold text-slate-600">Gratuit</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-900">
                        {formatPrice(pension.prix || 0)} FCFA
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Options tarifaires supplémentaires */}
      {priceOptions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">
            Options supplémentaires
          </h3>
          <div className="space-y-2">
            {priceOptions.map((option) => {
              const isSelected = selectedPriceOptionIds.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition ${
                    interactive
                      ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
                      : 'bg-transparent'
                  }`}
                >
                  {interactive && onPriceOptionChange && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onPriceOptionChange(option.id, e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-[#E04A1F] cursor-pointer"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{option.titre || option.code}</p>
                    {option.description && (
                      <p className="text-xs text-slate-600 mt-0.5">{option.description}</p>
                    )}
                    {option.pricingMode && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getPricingModeLabel(option.pricingMode)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatPrice(option.prix || 0)} FCFA
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pensions.length === 0 && priceOptions.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <p className="text-sm">Aucune option disponible pour ce produit</p>
        </div>
      )}
    </div>
  );
}
