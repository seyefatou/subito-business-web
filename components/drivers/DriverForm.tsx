'use client';

import React, { useState, ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, FileText } from "lucide-react";
import { base44 } from "@/lib/base44Client";
import { toast } from "sonner";

interface Driver {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  license_document_url?: string;
  assigned_vehicle?: string;
  department?: string;
  hire_date?: string;
  contract_type?: string;
  gender?: string;
  status?: string;
  certifications?: string[];
  infractions_count?: number;
  rating?: number | string;
  photo_url?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
}

interface DriverFormData {
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_type: string;
  license_expiry: string;
  license_document_url: string;
  assigned_vehicle: string;
  department: string;
  hire_date: string;
  contract_type: string;
  gender: string;
  status: string;
  certifications: string[];
  infractions_count: number;
  rating: string;
  photo_url: string;
}

interface DriverFormProps {
  driver?: Driver | null;
  departments: Department[];
  vehicles: Vehicle[];
  onSubmit: (data: DriverFormData & { infractions_count: number; rating: number | null }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function DriverForm({
  driver,
  departments,
  vehicles,
  onSubmit,
  onCancel,
  isSubmitting
}: DriverFormProps) {
  const [formData, setFormData] = useState<DriverFormData>({
    full_name: driver?.full_name || "",
    email: driver?.email || "",
    phone: driver?.phone || "",
    license_number: driver?.license_number || "",
    license_type: driver?.license_type || "B",
    license_expiry: driver?.license_expiry || "",
    license_document_url: driver?.license_document_url || "",
    assigned_vehicle: driver?.assigned_vehicle || "",
    department: driver?.department || "",
    hire_date: driver?.hire_date || "",
    contract_type: driver?.contract_type || "",
    gender: driver?.gender || "",
    status: driver?.status || "active",
    certifications: driver?.certifications || [],
    infractions_count: driver?.infractions_count || 0,
    rating: driver?.rating?.toString() || "",
    photo_url: driver?.photo_url || "",
  });

  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [newCert, setNewCert] = useState("");

  const handleChange = (field: keyof DriverFormData, value: string | string[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCertification = () => {
    if (!newCert.trim()) return;
    handleChange('certifications', [...formData.certifications, newCert.trim()]);
    setNewCert("");
  };

  const removeCertification = (index: number) => {
    handleChange('certifications', formData.certifications.filter((_, i) => i !== index));
  };

  const handleLicenseUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLicense(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('license_document_url', file_url);
      toast.success('Permis uploade avec succes');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      infractions_count: parseInt(String(formData.infractions_count)) || 0,
      rating: formData.rating ? parseFloat(formData.rating) : null,
    } as DriverFormData & { infractions_count: number; rating: number | null };
    onSubmit(submitData);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCertification();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Informations personnelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom complet *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Telephone *</Label>
            <PhoneInput
              value={formData.phone}
              onChange={(val) => handleChange('phone', val)}
              defaultCountryCode="+221"
              placeholder="77 123 45 67"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date d&apos;embauche</Label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => handleChange('hire_date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type de contrat</Label>
            <Select value={formData.contract_type} onValueChange={(v) => handleChange('contract_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cdi">CDI</SelectItem>
                <SelectItem value="cdd">CDD</SelectItem>
                <SelectItem value="interim">Interim</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sexe</Label>
            <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculin">Masculin</SelectItem>
                <SelectItem value="feminin">Feminin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Permis de conduire</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Numero de permis *</Label>
            <Input
              value={formData.license_number}
              onChange={(e) => handleChange('license_number', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type de permis</Label>
            <Select value={formData.license_type} onValueChange={(v) => handleChange('license_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B">B (vehicules legers)</SelectItem>
                <SelectItem value="C">C (poids lourds)</SelectItem>
                <SelectItem value="D">D (transport passagers)</SelectItem>
                <SelectItem value="E">E (remorque)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date d&apos;expiration</Label>
            <Input
              type="date"
              value={formData.license_expiry}
              onChange={(e) => handleChange('license_expiry', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Joindre le permis de conduire</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleLicenseUpload}
              disabled={uploadingLicense}
              className="flex-1"
            />
            {formData.license_document_url && (
              <a
                href={formData.license_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-subito hover:underline"
              >
                <FileText className="w-4 h-4" />
                Voir
              </a>
            )}
          </div>
          {uploadingLicense && <p className="text-xs text-slate-500">Upload en cours...</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Affectation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Vehicule assigne</Label>
            <Select value={formData.assigned_vehicle} onValueChange={(v) => handleChange('assigned_vehicle', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.registration}>
                    {v.registration} - {v.brand} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Departement</Label>
            <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="on_leave">En conge</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="terminated">Termine</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note (sur 5)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.rating}
              onChange={(e) => handleChange('rating', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Certifications</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Formation securite routiere"
            value={newCert}
            onChange={(e) => setNewCert(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="button" onClick={addCertification}>
            Ajouter
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.certifications.map((cert, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {cert}
              <button
                type="button"
                onClick={() => removeCertification(index)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
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
          {isSubmitting ? 'Enregistrement...' : driver ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
