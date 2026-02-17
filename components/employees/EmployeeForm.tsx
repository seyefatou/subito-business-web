'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  company?: string;
  role?: string;
  monthly_limit?: number | string;
  is_active?: boolean;
}

interface Department {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  is_active: boolean;
}

interface EmployeeFormData {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  company: string;
  role: string;
  monthly_limit: string;
  is_active: boolean;
}

interface EmployeeSubmitData extends Omit<EmployeeFormData, 'monthly_limit'> {
  monthly_limit: number | null;
}

interface EmployeeFormProps {
  employee?: Employee | null;
  departments: Department[];
  onSubmit: (data: EmployeeSubmitData) => void;
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
    full_name: employee?.full_name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    department: employee?.department || "",
    company: employee?.company || "",
    role: employee?.role || "user",
    monthly_limit: employee?.monthly_limit?.toString() || "",
    is_active: employee?.is_active !== undefined ? employee.is_active : true,
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.filter({ is_active: true }),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const submitData: EmployeeSubmitData = {
      ...formData,
      monthly_limit: formData.monthly_limit ? parseFloat(formData.monthly_limit) : null,
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
          <Label htmlFor="full_name">Nom complet *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            placeholder="Jean Dupont"
            required
          />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telephone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+221 77 123 45 67"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Departement</Label>
          <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un departement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">General</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
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
              <SelectItem value="user">Employe</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin Entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly_limit">Plafond mensuel (FCFA)</Label>
          <Input
            id="monthly_limit"
            type="number"
            value={formData.monthly_limit}
            onChange={(e) => handleChange('monthly_limit', e.target.value)}
            placeholder="50000"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('is_active', e.target.checked)}
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
