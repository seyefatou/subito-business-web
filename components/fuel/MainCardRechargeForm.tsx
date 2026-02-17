'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet } from "lucide-react";

interface MainCardRechargeFormData {
  amount: string;
  payment_method: string;
  notes: string;
}

interface MainCardRechargeSubmitData {
  amount: number;
  payment_method: string;
  notes: string;
  transaction_type: string;
  status: string;
}

interface MainCardRechargeFormProps {
  onSubmit: (data: MainCardRechargeSubmitData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface PaymentMethod {
  value: string;
  label: string;
  icon: string;
}

export default function MainCardRechargeForm({ onSubmit, onCancel, isSubmitting }: MainCardRechargeFormProps) {
  const [formData, setFormData] = useState<MainCardRechargeFormData>({
    amount: "",
    payment_method: "virement",
    notes: "",
  });

  const handleChange = (field: keyof MainCardRechargeFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      transaction_type: 'recharge_main',
      status: 'pending',
    });
  };

  const paymentMethods: PaymentMethod[] = [
    { value: "cheque", label: "Cheque", icon: "memo" },
    { value: "virement", label: "Virement", icon: "bank" },
    { value: "espece", label: "Espece", icon: "cash" },
    { value: "orange_money", label: "Orange Money", icon: "mobile" },
    { value: "wave", label: "Wave", icon: "wave" },
    { value: "carte_bancaire", label: "Carte bancaire", icon: "card" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-6 h-6" />
          <p className="text-sm text-orange-100">Approvisionnement</p>
        </div>
        <p className="text-lg font-semibold">Carte Principale de l&apos;Entreprise</p>
      </div>

      <div className="space-y-2">
        <Label>Montant a approvisionner (FCFA) *</Label>
        <Input
          type="number"
          placeholder="Ex: 500000"
          value={formData.amount}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('amount', e.target.value)}
          required
          min="1"
          className="text-lg"
        />
        <p className="text-xs text-slate-500">
          Ce montant sera credite sur la carte principale apres validation
        </p>
      </div>

      <div className="space-y-3">
        <Label>Moyen de paiement *</Label>
        <RadioGroup
          value={formData.payment_method}
          onValueChange={(v) => handleChange('payment_method', v)}
          className="grid grid-cols-2 gap-3"
        >
          {paymentMethods.map((method) => (
            <Label
              key={method.value}
              htmlFor={method.value}
              className={`
                flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                ${formData.payment_method === method.value
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <RadioGroupItem value={method.value} id={method.value} className="sr-only" />
              <span className="font-medium text-slate-800">{method.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Notes additionnelles</Label>
        <Textarea
          placeholder="Ex: Reference du virement, numero de cheque..."
          value={formData.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
          className="h-20"
        />
      </div>

      {formData.amount && parseFloat(formData.amount) > 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Montant de la demande</span>
            <span className="text-2xl font-bold text-blue-700">
              {parseFloat(formData.amount).toLocaleString()} FCFA
            </span>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          Cette demande sera soumise a validation avant le credit effectif de la carte principale.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Envoi...' : 'Soumettre la demande'}
        </Button>
      </div>
    </form>
  );
}
