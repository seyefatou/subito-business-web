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

interface Department {
  id: string;
  name: string;
}

interface Vehicle {
  id?: string;
  registration?: string;
  brand?: string;
  model?: string;
  year?: number | string;
  fuel_type?: string;
  department?: string;
  primary_driver?: string;
  monthly_fuel_limit?: number | string;
  status?: string;
  odometer?: number | string;
  last_service_km?: number | string;
  next_service_km?: number | string;
  tracking_enabled?: boolean;
  tracking_device_id?: string;
  tracking_device_serial?: string;
  insurance_expiry?: string;
  technical_control_expiry?: string;
  notes?: string;
}

interface VehicleFormData {
  registration: string;
  brand: string;
  model: string;
  year: string;
  fuel_type: string;
  department: string;
  primary_driver: string;
  monthly_fuel_limit: string;
  status: string;
  odometer: string;
  last_service_km: string;
  next_service_km: string;
  tracking_enabled: boolean;
  tracking_device_id: string;
  tracking_device_serial: string;
  insurance_expiry: string;
  technical_control_expiry: string;
  notes: string;
}

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  departments: Department[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function VehicleForm({ vehicle, departments, onSubmit, onCancel, isSubmitting }: VehicleFormProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    registration: vehicle?.registration || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year?.toString() || "",
    fuel_type: vehicle?.fuel_type || "diesel",
    department: vehicle?.department || "",
    primary_driver: vehicle?.primary_driver || "",
    monthly_fuel_limit: vehicle?.monthly_fuel_limit?.toString() || "",
    status: vehicle?.status || "active",
    odometer: vehicle?.odometer?.toString() || "",
    last_service_km: vehicle?.last_service_km?.toString() || "",
    next_service_km: vehicle?.next_service_km?.toString() || "",
    tracking_enabled: vehicle?.tracking_enabled || false,
    tracking_device_id: vehicle?.tracking_device_id || "",
    tracking_device_serial: vehicle?.tracking_device_serial || "",
    insurance_expiry: vehicle?.insurance_expiry || "",
    technical_control_expiry: vehicle?.technical_control_expiry || "",
    notes: vehicle?.notes || "",
  });

  const handleChange = (field: keyof VehicleFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      year: formData.year ? parseInt(formData.year) : null,
      monthly_fuel_limit: formData.monthly_fuel_limit ? parseFloat(formData.monthly_fuel_limit) : null,
      odometer: formData.odometer ? parseInt(formData.odometer) : null,
      last_service_km: formData.last_service_km ? parseInt(formData.last_service_km) : null,
      next_service_km: formData.next_service_km ? parseInt(formData.next_service_km) : null,
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Informations generales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Immatriculation *</Label>
            <Input
              placeholder="DK-1234-AB"
              value={formData.registration}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('registration', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Marque</Label>
            <Input
              placeholder="Toyota, Renault..."
              value={formData.brand}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('brand', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Modele</Label>
            <Input
              placeholder="Corolla, Clio..."
              value={formData.model}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('model', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Annee</Label>
            <Input
              type="number"
              placeholder="2024"
              value={formData.year}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('year', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Fuel & Department */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Carburant et affectation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type de carburant *</Label>
            <Select value={formData.fuel_type} onValueChange={(v) => handleChange('fuel_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essence">Essence</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="super">Super</SelectItem>
                <SelectItem value="hybride">Hybride</SelectItem>
                <SelectItem value="electrique">Electrique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plafond carburant mensuel (FCFA)</Label>
            <Input
              type="number"
              placeholder="100000"
              value={formData.monthly_fuel_limit}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('monthly_fuel_limit', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Departement</Label>
            <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">General</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chauffeur principal</Label>
            <Input
              placeholder="Nom du chauffeur"
              value={formData.primary_driver}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('primary_driver', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Odometer & Maintenance */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Kilometrage et entretien</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Kilometrage actuel (km)</Label>
            <Input
              type="number"
              placeholder="50000"
              value={formData.odometer}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('odometer', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Derniere revision (km)</Label>
            <Input
              type="number"
              placeholder="45000"
              value={formData.last_service_km}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('last_service_km', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Prochaine revision (km)</Label>
            <Input
              type="number"
              placeholder="55000"
              value={formData.next_service_km}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('next_service_km', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tracking */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Tracking GPS Subito</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.tracking_enabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('tracking_enabled', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700">Activer le tracking</span>
          </label>
        </div>
        {formData.tracking_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numero de balise</Label>
              <Input
                placeholder="GPS-001"
                value={formData.tracking_device_id}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('tracking_device_id', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Numero de serie</Label>
              <Input
                placeholder="SN123456"
                value={formData.tracking_device_serial}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('tracking_device_serial', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Documents et statut</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Expiration assurance</Label>
            <Input
              type="date"
              value={formData.insurance_expiry}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('insurance_expiry', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expiration controle technique</Label>
            <Input
              type="date"
              value={formData.technical_control_expiry}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('technical_control_expiry', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Statut *</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="maintenance">En maintenance</SelectItem>
                <SelectItem value="out_of_service">Hors service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Informations complementaires..."
          value={formData.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
          className="h-20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Enregistrement...' : vehicle ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
