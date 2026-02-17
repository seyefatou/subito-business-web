'use client';

import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  odometer?: number;
  status: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface MaintenanceRecord {
  id?: string;
  vehicle_registration: string;
  type: string;
  description: string;
  odometer_at_service: string | number;
  cost: string | number;
  service_provider: string;
  next_service_km: string | number;
  next_service_date: string | Date;
  status: string;
  invoice_url: string;
  notes: string;
}

interface MaintenanceFormData {
  vehicle_registration: string;
  type: string;
  description: string;
  odometer_at_service: string | number;
  cost: string | number;
  service_provider: string;
  next_service_km: string | number;
  next_service_date: string | Date;
  status: string;
  invoice_url: string;
  notes: string;
}

interface MaintenanceFormProps {
  record?: MaintenanceRecord | null;
  vehicles: Vehicle[];
  serviceProviders: ServiceProvider[];
  onSubmit: (data: MaintenanceFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

type MaintenanceType = 'vidange' | 'filtres' | 'freins' | 'pneus' | 'batterie' | 'revision' | 'reparation' | 'autre';

const serviceIntervals: Record<string, number> = {
  vidange: 5000,
  filtres: 10000,
  freins: 20000,
  pneus: 30000,
  batterie: 50000,
  revision: 15000
};

export default function MaintenanceForm({
  record,
  vehicles,
  serviceProviders,
  onSubmit,
  onCancel,
  isSubmitting
}: MaintenanceFormProps) {
  const [formData, setFormData] = useState<MaintenanceFormData>(record || {
    vehicle_registration: '',
    type: 'vidange',
    description: '',
    odometer_at_service: '',
    cost: '',
    service_provider: '',
    next_service_km: '',
    next_service_date: '',
    status: 'scheduled',
    invoice_url: '',
    notes: ''
  });

  const selectedVehicle = vehicles.find(v => v.registration === formData.vehicle_registration);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      odometer_at_service: formData.odometer_at_service ? parseFloat(String(formData.odometer_at_service)) : null,
      cost: formData.cost ? parseFloat(String(formData.cost)) : null,
      next_service_km: formData.next_service_km ? parseFloat(String(formData.next_service_km)) : null,
    };

    onSubmit(submitData as MaintenanceFormData);
  };

  // Auto-calculate next service based on type
  const calculateNextService = (type: string, currentKm: number): number => {
    return currentKm + (serviceIntervals[type] || 10000);
  };

  const handleVehicleChange = (registration: string) => {
    const vehicle = vehicles.find(v => v.registration === registration);
    setFormData({
      ...formData,
      vehicle_registration: registration,
      odometer_at_service: vehicle?.odometer || ''
    });
  };

  const handleTypeChange = (type: string) => {
    setFormData({
      ...formData,
      type,
      next_service_km: formData.odometer_at_service
        ? calculateNextService(type, parseFloat(String(formData.odometer_at_service)))
        : ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vehicle Selection */}
      <div>
        <Label>Vehicule *</Label>
        <Select
          value={formData.vehicle_registration}
          onValueChange={handleVehicleChange}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un vehicule" />
          </SelectTrigger>
          <SelectContent>
            {vehicles
              .filter(v => v.status === 'active')
              .map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.registration}>
                  {vehicle.registration} - {vehicle.brand} {vehicle.model}
                  {vehicle.odometer && ` (${vehicle.odometer.toLocaleString()} km)`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type */}
      <div>
        <Label>Type d&apos;intervention *</Label>
        <Select
          value={formData.type}
          onValueChange={handleTypeChange}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vidange">Vidange</SelectItem>
            <SelectItem value="filtres">Filtres</SelectItem>
            <SelectItem value="freins">Freins</SelectItem>
            <SelectItem value="pneus">Pneus</SelectItem>
            <SelectItem value="batterie">Batterie</SelectItem>
            <SelectItem value="revision">Revision complete</SelectItem>
            <SelectItem value="reparation">Reparation</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <Label>Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Details de l'intervention..."
          rows={3}
          required
        />
      </div>

      {/* Grid for numeric fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Kilometrage actuel</Label>
          <Input
            type="number"
            value={formData.odometer_at_service}
            onChange={(e) => setFormData({ ...formData, odometer_at_service: e.target.value })}
            placeholder="Ex: 45000"
          />
          {selectedVehicle?.odometer && (
            <p className="text-xs text-slate-500 mt-1">
              Actuel: {selectedVehicle.odometer.toLocaleString()} km
            </p>
          )}
        </div>

        <div>
          <Label>Cout (FCFA)</Label>
          <Input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="Ex: 50000"
          />
        </div>
      </div>

      {/* Service Provider */}
      <div>
        <Label>Prestataire</Label>
        <Select
          value={formData.service_provider}
          onValueChange={(value) => setFormData({ ...formData, service_provider: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un prestataire" />
          </SelectTrigger>
          <SelectContent>
            {serviceProviders
              .filter(p => p.is_active)
              .map((provider) => (
                <SelectItem key={provider.id} value={provider.name}>
                  {provider.name} - {provider.type}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Next Service */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prochain entretien (km)</Label>
          <Input
            type="number"
            value={formData.next_service_km}
            onChange={(e) => setFormData({ ...formData, next_service_km: e.target.value })}
            placeholder="Ex: 50000"
          />
        </div>

        <div>
          <Label>Prochain entretien (date)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.next_service_date
                  ? format(new Date(formData.next_service_date), "d MMMM yyyy", { locale: fr })
                  : "Selectionner"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.next_service_date ? new Date(formData.next_service_date) : undefined}
                onSelect={(date) => setFormData({ ...formData, next_service_date: date || '' })}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Status */}
      <div>
        <Label>Statut *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Planifiee</SelectItem>
            <SelectItem value="completed">Realisee</SelectItem>
            <SelectItem value="cancelled">Annulee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes additionnelles..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          className="gradient-subito text-white border-0"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enregistrement...' : record ? 'Mettre a jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}
