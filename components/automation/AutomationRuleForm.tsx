'use client';

import React, { useState, FormEvent, ChangeEvent, KeyboardEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type RuleType = 'fuel_auto_approval' | 'reminder' | 'invoice_generation';

interface RuleConditions {
  max_amount?: number | null;
  approved_vehicles?: string[];
  approved_drivers?: string[];
  departments?: string[];
}

interface AutomationRule {
  id?: string;
  name: string;
  type: RuleType;
  description: string;
  is_active: boolean;
  conditions: RuleConditions;
}

interface AutomationRuleFormData {
  name: string;
  type: RuleType;
  description: string;
  is_active: boolean;
  conditions: RuleConditions;
}

interface AutomationRuleFormProps {
  rule?: AutomationRule | null;
  onSubmit: (data: AutomationRuleFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const initialFormData: AutomationRuleFormData = {
  name: "",
  type: "fuel_auto_approval",
  description: "",
  is_active: true,
  conditions: {},
};

export default function AutomationRuleForm({ rule, onSubmit, onCancel, isSubmitting }: AutomationRuleFormProps) {
  const [formData, setFormData] = useState<AutomationRuleFormData>(rule ? {
    name: rule.name,
    type: rule.type,
    description: rule.description,
    is_active: rule.is_active,
    conditions: rule.conditions || {},
  } : initialFormData);

  // Temporary states for adding items to arrays
  const [newVehicle, setNewVehicle] = useState<string>("");
  const [newDriver, setNewDriver] = useState<string>("");
  const [newDepartment, setNewDepartment] = useState<string>("");

  const handleChange = (field: keyof AutomationRuleFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConditionChange = (field: keyof RuleConditions, value: number | null | string[]) => {
    setFormData(prev => ({
      ...prev,
      conditions: { ...prev.conditions, [field]: value }
    }));
  };

  const addToArray = (field: keyof RuleConditions, value: string) => {
    if (!value.trim()) return;
    const currentArray = (formData.conditions[field] as string[] | undefined) || [];
    handleConditionChange(field, [...currentArray, value.trim()]);
  };

  const removeFromArray = (field: keyof RuleConditions, index: number) => {
    const currentArray = (formData.conditions[field] as string[] | undefined) || [];
    handleConditionChange(field, currentArray.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const showFuelConditions = formData.type === 'fuel_auto_approval';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom de la regle *</Label>
          <Input
            placeholder="Ex: Auto-approuver essence < 50k"
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(v: RuleType) => handleChange('type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fuel_auto_approval">Approbation auto carburant</SelectItem>
              <SelectItem value="reminder">Rappels automatiques</SelectItem>
              <SelectItem value="invoice_generation">Generation factures</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Decrivez le fonctionnement de cette regle..."
          value={formData.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
          className="h-20"
        />
      </div>

      {/* Fuel Auto-Approval Conditions */}
      {showFuelConditions && (
        <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <h4 className="font-medium text-slate-800">Conditions d&apos;approbation</h4>

          <div className="space-y-2">
            <Label>Montant maximum (FCFA)</Label>
            <Input
              type="number"
              placeholder="50000"
              value={formData.conditions.max_amount || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleConditionChange('max_amount', parseFloat(e.target.value) || null)}
            />
            <p className="text-xs text-slate-500">
              Les demandes inferieures a ce montant seront approuvees automatiquement
            </p>
          </div>

          <div className="space-y-2">
            <Label>Vehicules approuves</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: DK-1234-AB"
                value={newVehicle}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewVehicle(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('approved_vehicles', newVehicle);
                    setNewVehicle("");
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  addToArray('approved_vehicles', newVehicle);
                  setNewVehicle("");
                }}
                disabled={!newVehicle.trim()}
              >
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.conditions.approved_vehicles || []).map((vehicle, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {vehicle}
                  <button
                    type="button"
                    onClick={() => removeFromArray('approved_vehicles', index)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conducteurs approuves</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nom du conducteur"
                value={newDriver}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewDriver(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('approved_drivers', newDriver);
                    setNewDriver("");
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  addToArray('approved_drivers', newDriver);
                  setNewDriver("");
                }}
                disabled={!newDriver.trim()}
              >
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.conditions.approved_drivers || []).map((driver, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {driver}
                  <button
                    type="button"
                    onClick={() => removeFromArray('approved_drivers', index)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departements approuves</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nom du departement"
                value={newDepartment}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewDepartment(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('departments', newDepartment);
                    setNewDepartment("");
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  addToArray('departments', newDepartment);
                  setNewDepartment("");
                }}
                disabled={!newDepartment.trim()}
              >
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.conditions.departments || []).map((dept, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {dept}
                  <button
                    type="button"
                    onClick={() => removeFromArray('departments', index)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('is_active', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-700">Regle active</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Enregistrement...' : rule ? 'Modifier' : 'Creer'}
        </Button>
      </div>
    </form>
  );
}
