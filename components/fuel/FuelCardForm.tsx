'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
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
  id: string;
  email: string;
  full_name: string;
  department?: string;
}

interface FuelCardFormData {
  card_number: string;
  card_type: string;
  holder_name: string;
  holder_email: string;
  balance: number;
  monthly_limit: string;
  department: string;
  status: string;
}

interface FuelCardFormProps {
  employees: Employee[];
  onSubmit: (data: FuelCardFormData & { monthly_limit: number | null }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function FuelCardForm({ employees, onSubmit, onCancel, isSubmitting }: FuelCardFormProps) {
  const [formData, setFormData] = useState<FuelCardFormData>({
    card_number: `CARD-${Date.now()}`,
    card_type: "employee",
    holder_name: "",
    holder_email: "",
    balance: 0,
    monthly_limit: "",
    department: "",
    status: "active",
  });

  const handleEmployeeSelect = (employeeEmail: string): void => {
    const employee = employees.find(e => e.email === employeeEmail);
    if (employee) {
      setFormData({
        ...formData,
        holder_name: employee.full_name,
        holder_email: employee.email,
        department: employee.department || "",
      });
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit({
      ...formData,
      monthly_limit: parseFloat(formData.monthly_limit) || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Employe *</Label>
        <Select value={formData.holder_email} onValueChange={handleEmployeeSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un employe" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.email}>
                {emp.full_name} - {emp.department || 'Sans departement'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Numero de carte</Label>
          <Input
            value={formData.card_number}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, card_number: e.target.value })}
            disabled
            className="bg-slate-50"
          />
        </div>
        <div className="space-y-2">
          <Label>Plafond mensuel (FCFA)</Label>
          <Input
            type="number"
            value={formData.monthly_limit}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, monthly_limit: e.target.value })}
            placeholder="Ex: 100000"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          La carte sera creee avec un solde initial de 0 FCFA. Vous pourrez l&apos;alimenter depuis la carte principale apres creation.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !formData.holder_email}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Creation...' : 'Creer la carte'}
        </Button>
      </div>
    </form>
  );
}
