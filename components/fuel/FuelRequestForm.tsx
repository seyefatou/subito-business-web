'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const fuelPrices: Record<string, number> = {
  essence: 650,
  diesel: 600,
  super: 750,
};

interface Department {
  id: string;
  name: string;
}

interface FuelRequestFormData {
  vehicle_registration: string;
  vehicle_type: string;
  driver_name: string;
  department: string;
  fuel_type: string;
  quantity_liters: string;
  priority: string;
  purpose: string;
  odometer_reading: string;
  notes: string;
  is_personal_vehicle: boolean;
}

interface FuelRequestSubmitData extends Omit<FuelRequestFormData, 'quantity_liters' | 'odometer_reading'> {
  quantity_liters: number;
  odometer_reading: number | null;
  estimated_cost: number;
  status: string;
}

interface FuelRequestFormProps {
  departments: Department[];
  onSubmit: (data: FuelRequestSubmitData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function FuelRequestForm({ departments, onSubmit, onCancel, isSubmitting }: FuelRequestFormProps) {
  const [formData, setFormData] = useState<FuelRequestFormData>({
    vehicle_registration: "",
    vehicle_type: "",
    driver_name: "",
    department: "",
    fuel_type: "diesel",
    quantity_liters: "",
    priority: "normal",
    purpose: "",
    odometer_reading: "",
    notes: "",
    is_personal_vehicle: false,
  });

  const handleChange = (field: keyof FuelRequestFormData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const estimatedCost = formData.quantity_liters
    ? parseFloat(formData.quantity_liters) * fuelPrices[formData.fuel_type]
    : 0;

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity_liters: parseFloat(formData.quantity_liters),
      odometer_reading: formData.odometer_reading ? parseFloat(formData.odometer_reading) : null,
      estimated_cost: estimatedCost,
      status: 'pending',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Type Selection */}
      <div className="space-y-3">
        <Label>Type de vehicule</Label>
        <RadioGroup
          value={formData.is_personal_vehicle ? "personal" : "company"}
          onValueChange={(v) => handleChange('is_personal_vehicle', v === 'personal')}
          className="grid grid-cols-2 gap-3"
        >
          <Label
            htmlFor="company"
            className={`
              flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
              ${!formData.is_personal_vehicle
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <RadioGroupItem value="company" id="company" className="sr-only" />
            <span className="font-semibold text-slate-800">Vehicule d&apos;entreprise</span>
            <span className="text-xs text-slate-500 mt-1">Immatriculation requise</span>
          </Label>
          <Label
            htmlFor="personal"
            className={`
              flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
              ${formData.is_personal_vehicle
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <RadioGroupItem value="personal" id="personal" className="sr-only" />
            <span className="font-semibold text-slate-800">Vehicule personnel</span>
            <span className="text-xs text-slate-500 mt-1">Pour employe</span>
          </Label>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Immatriculation *</Label>
          <Input
            placeholder="DK-1234-AB"
            value={formData.vehicle_registration}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('vehicle_registration', e.target.value)}
            required
          />
          {formData.is_personal_vehicle && (
            <p className="text-xs text-slate-500">Immatriculation du vehicule personnel</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Marque/Modele</Label>
          <Input
            placeholder="Toyota Corolla, Peugeot 308..."
            value={formData.vehicle_type}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('vehicle_type', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{formData.is_personal_vehicle ? 'Employe beneficiaire' : 'Conducteur'} *</Label>
          <Input
            placeholder={formData.is_personal_vehicle ? "Nom de l'employe" : "Nom du conducteur"}
            value={formData.driver_name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('driver_name', e.target.value)}
            required
          />
          {formData.is_personal_vehicle && (
            <p className="text-xs text-slate-500">Employe qui recevra le carburant</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Departement</Label>
          <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Type de carburant *</Label>
        <RadioGroup
          value={formData.fuel_type}
          onValueChange={(v) => handleChange('fuel_type', v)}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { value: "diesel", label: "Diesel", price: "600 FCFA/L" },
            { value: "essence", label: "Essence", price: "650 FCFA/L" },
            { value: "super", label: "Super", price: "750 FCFA/L" },
          ].map((option) => (
            <Label
              key={option.value}
              htmlFor={option.value}
              className={`
                flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                ${formData.fuel_type === option.value
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
              <span className="font-semibold text-slate-800">{option.label}</span>
              <span className="text-xs text-slate-500 mt-1">{option.price}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantite (litres) *</Label>
          <Input
            type="number"
            placeholder="50"
            value={formData.quantity_liters}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('quantity_liters', e.target.value)}
            required
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label>Kilometrage actuel</Label>
          <Input
            type="number"
            placeholder="45000"
            value={formData.odometer_reading}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('odometer_reading', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Motif de la demande *</Label>
        <Textarea
          placeholder="Ex: Deplacement Dakar-Saint-Louis, livraison urgente..."
          value={formData.purpose}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('purpose', e.target.value)}
          required
          className="h-20"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes additionnelles</Label>
        <Textarea
          placeholder="Informations complementaires..."
          value={formData.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
          className="h-16"
        />
      </div>

      <div className="space-y-3">
        <Label>Priorite</Label>
        <RadioGroup
          value={formData.priority}
          onValueChange={(v) => handleChange('priority', v)}
          className="flex gap-3"
        >
          {[
            { value: "normal", label: "Normale" },
            { value: "urgent", label: "Urgente" },
          ].map((option) => (
            <Label
              key={option.value}
              htmlFor={`priority-${option.value}`}
              className={`
                flex-1 flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all
                ${formData.priority === option.value
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <RadioGroupItem value={option.value} id={`priority-${option.value}`} className="sr-only" />
              <span className="font-medium text-slate-800">{option.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {estimatedCost > 0 && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Cout estime</span>
            <span className="text-2xl font-bold text-subito">
              {estimatedCost.toLocaleString()} FCFA
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Creation...' : 'Creer la demande'}
        </Button>
      </div>
    </form>
  );
}
