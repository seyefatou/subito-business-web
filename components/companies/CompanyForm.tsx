'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PhoneInput } from "@/components/ui/phone-input";

interface Company {
  id?: string;
  name: string;
  code: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  monthly_budget: string | number | null;
  is_active: boolean;
  notes: string;
}

interface CompanyFormData {
  name: string;
  code: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  monthly_budget: string | number;
  is_active: boolean;
  notes: string;
}

interface CompanyFormProps {
  company?: Company | null;
  onSubmit: (data: CompanyFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function CompanyForm({ company, onSubmit, onCancel, isSubmitting }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company?.name || "",
    code: company?.code || "",
    address: company?.address || "",
    contact_name: company?.contact_name || "",
    contact_email: company?.contact_email || "",
    contact_phone: company?.contact_phone || "",
    monthly_budget: company?.monthly_budget || "",
    is_active: company?.is_active !== undefined ? company.is_active : true,
    notes: company?.notes || "",
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_budget: formData.monthly_budget ? parseFloat(String(formData.monthly_budget)) : null,
    };
    onSubmit(data as CompanyFormData);
  };

  const handleChange = (field: keyof CompanyFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom de la societe *</Label>
          <Input
            placeholder="Ex: Entreprise ABC"
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Code societe</Label>
          <Input
            placeholder="Ex: ABC-001"
            value={formData.code}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('code', e.target.value)}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Textarea
          placeholder="Adresse complete de la societe"
          value={formData.address}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('address', e.target.value)}
          className="h-20"
        />
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Contact principal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom du contact</Label>
            <Input
              placeholder="Nom et prenom"
              value={formData.contact_name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('contact_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Telephone</Label>
            <PhoneInput
              value={formData.contact_phone}
              onChange={(val) => handleChange('contact_phone', val)}
              defaultCountryCode="+221"
              placeholder="XX XXX XX XX"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="contact@entreprise.com"
            value={formData.contact_email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('contact_email', e.target.value)}
          />
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <Label>Budget mensuel (FCFA)</Label>
        <Input
          type="number"
          placeholder="0"
          value={formData.monthly_budget}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('monthly_budget', e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Notes additionnelles..."
          value={formData.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
          className="h-20"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
        <div>
          <p className="font-medium text-slate-800">Societe active</p>
          <p className="text-sm text-slate-500">Autoriser les reservations pour cette societe</p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(v: boolean) => handleChange('is_active', v)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Enregistrement...' : company ? 'Modifier' : 'Creer'}
        </Button>
      </div>
    </form>
  );
}
