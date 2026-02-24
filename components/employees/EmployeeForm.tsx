'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { CreateEmployeeDto, EmployeeResponse, DepartmentResponse } from "@/lib/api";
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

interface EmployeeFormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  departementId: string;
  role: string;
  plafondMensuel: string;
  actif: boolean;
}

interface EmployeeFormProps {
  employee?: EmployeeResponse | null;
  departments: DepartmentResponse[];
  onSubmit: (data: CreateEmployeeDto) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function EmployeeForm({
  employee,
  departments,
  onSubmit,
  onCancel,
  isSubmitting
}: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    nom: employee?.nom || "",
    prenom: employee?.prenom || "",
    email: employee?.email || "",
    telephone: employee?.telephone || "",
    adresse: employee?.adresse || "",
    departementId: employee?.departementId?.toString() || employee?.departement?.id?.toString() || "",
    role: employee?.role || "employe",
    plafondMensuel: employee?.plafondMensuel?.toString() || "",
    actif: employee?.actif !== undefined ? employee.actif : true,
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const submitData: CreateEmployeeDto = {
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email,
      telephone: formData.telephone || undefined,
      adresse: formData.adresse,
      departementId: formData.departementId && formData.departementId !== 'none' ? parseInt(formData.departementId) : undefined,
      role: formData.role || undefined,
      plafondMensuel: formData.plafondMensuel ? parseFloat(formData.plafondMensuel) : undefined,
      actif: formData.actif,
    };

    onSubmit(submitData);
  };

  const handleChange = (field: keyof EmployeeFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prenom">Prenom *</Label>
          <Input
            id="prenom"
            value={formData.prenom}
            onChange={(e) => handleChange('prenom', e.target.value)}
            placeholder="Jean"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input
            id="nom"
            value={formData.nom}
            onChange={(e) => handleChange('nom', e.target.value)}
            placeholder="Dupont"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="jean.dupont@entreprise.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adresse">Adresse *</Label>
        <Input
          id="adresse"
          value={formData.adresse}
          onChange={(e) => handleChange('adresse', e.target.value)}
          placeholder="123 Rue Example, Dakar"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telephone">Telephone</Label>
          <PhoneInput
            value={formData.telephone}
            onChange={(val) => handleChange('telephone', val)}
            defaultCountryCode="+221"
            placeholder="77 123 45 67"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="departement">Departement</Label>
          <Select value={formData.departementId} onValueChange={(v) => handleChange('departementId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un departement" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employe">Employe</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plafondMensuel">Plafond mensuel (FCFA)</Label>
          <Input
            id="plafondMensuel"
            type="number"
            value={formData.plafondMensuel}
            onChange={(e) => handleChange('plafondMensuel', e.target.value)}
            placeholder="50000"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.actif}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('actif', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-700">Employe actif</span>
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
          {isSubmitting ? 'Enregistrement...' : employee ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
