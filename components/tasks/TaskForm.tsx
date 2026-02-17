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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

type TaskCategory = 'vehicle' | 'maintenance' | 'document' | 'fuel' | 'driver' | 'other';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id?: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string;
  due_date: string;
  vehicle_registration: string;
  notes: string;
}

interface Employee {
  id: string;
  email: string;
  full_name: string;
}

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string;
  due_date: string;
  vehicle_registration: string;
  notes: string;
}

interface TaskFormProps {
  task?: Task | null;
  employees: Employee[];
  vehicles: Vehicle[];
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const initialFormData: TaskFormData = {
  title: "",
  description: "",
  category: "vehicle",
  priority: "medium",
  status: "todo",
  assigned_to: "",
  due_date: "",
  vehicle_registration: "",
  notes: "",
};

export default function TaskForm({ task, employees, vehicles, onSubmit, onCancel, isSubmitting }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>(task ? {
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    assigned_to: task.assigned_to,
    due_date: task.due_date,
    vehicle_registration: task.vehicle_registration,
    notes: task.notes,
  } : initialFormData);

  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          placeholder="Ex: Verifier l'assurance du vehicule"
          value={formData.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('title', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Description detaillee de la tache..."
          value={formData.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
          className="h-24"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categorie *</Label>
          <Select value={formData.category} onValueChange={(v: TaskCategory) => handleChange('category', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle">Vehicule</SelectItem>
              <SelectItem value="maintenance">Entretien</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="fuel">Carburant</SelectItem>
              <SelectItem value="driver">Conducteur</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priorite *</Label>
          <Select value={formData.priority} onValueChange={(v: TaskPriority) => handleChange('priority', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Basse</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={formData.status} onValueChange={(v: TaskStatus) => handleChange('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">A faire</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Terminee</SelectItem>
              <SelectItem value="cancelled">Annulee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Assigner a</Label>
          <Select value={formData.assigned_to} onValueChange={(v: string) => handleChange('assigned_to', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un employe" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.email}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date d&apos;echeance</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.due_date ? format(new Date(formData.due_date), 'PPP', { locale: fr }) : 'Selectionner une date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.due_date ? new Date(formData.due_date) : undefined}
                onSelect={(date) => handleChange('due_date', date ? date.toISOString().split('T')[0] : '')}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        {(formData.category === 'vehicle' || formData.category === 'maintenance') && (
          <div className="space-y-2">
            <Label>Vehicule concerne</Label>
            <Select value={formData.vehicle_registration} onValueChange={(v: string) => handleChange('vehicle_registration', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.registration}>
                    {v.registration} - {v.brand} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Notes additionnelles..."
          value={formData.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
          className="h-20"
        />
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
          {isSubmitting ? 'Enregistrement...' : task ? 'Mettre a jour' : 'Creer la tache'}
        </Button>
      </div>
    </form>
  );
}
