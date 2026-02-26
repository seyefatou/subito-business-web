'use client';

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  User,
  Clock,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  AlertCircle,
  UserPlus,
  LucideIcon
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import EmployeeForm from "@/components/employees/EmployeeForm";

interface Step {
  id: number;
  title: string;
  icon: LucideIcon;
}

const steps: Step[] = [
  { id: 1, title: "Details", icon: MapPin },
  { id: 2, title: "Beneficiaire", icon: User },
  { id: 3, title: "Confirmation", icon: Check },
];

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  email: string;
  name?: string;
}

interface User {
  email?: string;
}

interface OrderFormData {
  departure_address: string;
  arrival_address: string;
  scheduled_date: string;
  urgency: string;
  beneficiary_name: string;
  beneficiary_email: string;
  department: string;
  package_type: string;
  notes: string;
  payment_method: string;
}

interface OrderSubmitData extends OrderFormData {
  service_type: string;
  service_category: string;
  requested_by_employee: string;
}

interface OrderFormProps {
  serviceType: string;
  serviceCategory: string;
  onSubmit: (data: OrderSubmitData) => void;
  onCancel: () => void;
  departments?: Department[];
  isSubmitting: boolean;
}

interface EmployeeFormData {
  email: string;
  name?: string;
  department?: string;
  [key: string]: unknown;
}

export default function OrderForm({
  serviceType,
  serviceCategory,
  onSubmit,
  onCancel,
  departments = [],
  isSubmitting
}: OrderFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    departure_address: "",
    arrival_address: "",
    scheduled_date: "",
    urgency: "standard",
    beneficiary_name: "",
    beneficiary_email: "",
    department: "",
    package_type: "document",
    notes: "",
    payment_method: "invoice",
  });

  const { data: user } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const [isUnregisteredEmployee, setIsUnregisteredEmployee] = useState(false);

  useEffect(() => {
    if (formData.beneficiary_email && formData.payment_method === 'invoice') {
      const isRegistered = employees.some(emp =>
        emp.email.toLowerCase() === formData.beneficiary_email.toLowerCase()
      );
      setIsUnregisteredEmployee(!isRegistered);
    } else {
      setIsUnregisteredEmployee(false);
    }
  }, [formData.beneficiary_email, formData.payment_method, employees]);

  const handleChange = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      service_type: serviceType,
      service_category: serviceCategory,
      requested_by_employee: user?.email || formData.beneficiary_email,
    });
  };

  const handleAddEmployee = async (employeeData: EmployeeFormData) => {
    try {
      await base44.entities.Employee.create(employeeData);
      setShowAddEmployeeDialog(false);
      setIsUnregisteredEmployee(false);
    } catch (error) {
      console.error('Failed to add employee:', error);
    }
  };

  const estimatedCost = formData.urgency === "express" ? 15000 : formData.urgency === "urgent" ? 10000 : 5000;

  const isDelivery = serviceCategory === "livraison";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Progress header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all
                  ${currentStep >= step.id
                    ? 'gradient-subito text-white'
                    : 'bg-slate-200 text-slate-400'
                  }
                `}>
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`font-medium hidden sm:block ${
                  currentStep >= step.id ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 rounded ${
                  currentStep > step.id ? 'bg-orange-400' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Adresse de depart</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Ex: Plateau, Abidjan"
                      className="pl-10"
                      value={formData.departure_address}
                      onChange={(e) => handleChange('departure_address', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Adresse d&apos;arrivee</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subito" />
                    <Input
                      placeholder="Ex: Cocody, Abidjan"
                      className="pl-10"
                      value={formData.arrival_address}
                      onChange={(e) => handleChange('arrival_address', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Date & Heure</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="datetime-local"
                      className="pl-10"
                      value={formData.scheduled_date}
                      onChange={(e) => handleChange('scheduled_date', e.target.value)}
                    />
                  </div>
                </div>

                {isDelivery && (
                  <div className="space-y-2">
                    <Label>Type de colis</Label>
                    <Select
                      value={formData.package_type}
                      onValueChange={(v) => handleChange('package_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="small_package">Petit colis</SelectItem>
                        <SelectItem value="medium_package">Colis moyen</SelectItem>
                        <SelectItem value="large_package">Gros colis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Niveau d&apos;urgence</Label>
                <RadioGroup
                  value={formData.urgency}
                  onValueChange={(v) => handleChange('urgency', v)}
                  className="grid grid-cols-3 gap-3"
                >
                  {[
                    { value: "standard", label: "Standard", price: "5 000 FCFA", time: "2-4h" },
                    { value: "urgent", label: "Urgent", price: "10 000 FCFA", time: "1-2h" },
                    { value: "express", label: "Express", price: "15 000 FCFA", time: "< 1h" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={`
                        flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${formData.urgency === option.value
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                      <span className="font-semibold text-slate-800">{option.label}</span>
                      <span className="text-sm text-slate-500">{option.time}</span>
                      <span className="text-xs font-medium text-subito mt-1">{option.price}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Notes (optionnel)</Label>
                <Textarea
                  placeholder="Instructions speciales, precisions..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="h-20"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Beneficiary */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nom du beneficiaire</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Jean Dupont"
                      className="pl-10"
                      value={formData.beneficiary_name}
                      onChange={(e) => handleChange('beneficiary_name', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email du beneficiaire</Label>
                  <Input
                    type="email"
                    placeholder="jean.dupont@entreprise.com"
                    value={formData.beneficiary_email}
                    onChange={(e) => handleChange('beneficiary_email', e.target.value)}
                  />
                  {isUnregisteredEmployee && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mt-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 font-medium">
                          Employe non enregistre
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Cet email n&apos;est pas dans votre liste d&apos;employes.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                          onClick={() => setShowAddEmployeeDialog(true)}
                        >
                          <UserPlus className="w-3 h-3" />
                          Ajouter comme employe
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Departement</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => handleChange('department', v)}
                >
                  <SelectTrigger>
                    <Building2 className="w-4 h-4 text-slate-400 mr-2" />
                    <SelectValue placeholder="Selectionner un departement" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="direction">Direction Generale</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="rh">Ressources Humaines</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="logistique">Logistique</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Mode de paiement</Label>
                <RadioGroup
                  value={formData.payment_method}
                  onValueChange={(v) => handleChange('payment_method', v)}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  {[
                    { value: "invoice", label: "Facture mensuelle", icon: "facture" },
                    { value: "mobile_money", label: "Mobile Money", icon: "mobile" },
                    { value: "credit", label: "Credit entreprise", icon: "credit" },
                    { value: "immediate", label: "Paiement immediat", icon: "cash" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`payment-${option.value}`}
                      className={`
                        flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${formData.payment_method === option.value
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <RadioGroupItem value={option.value} id={`payment-${option.value}`} className="sr-only" />
                      <span className="text-2xl mb-2">
                        {option.value === 'invoice' ? '\u{1F4C4}' :
                         option.value === 'mobile_money' ? '\u{1F4F1}' :
                         option.value === 'credit' ? '\u{1F4B3}' : '\u{1F4B0}'}
                      </span>
                      <span className="text-sm text-slate-700 text-center">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="rounded-xl bg-slate-50 p-6 space-y-4">
                <h3 className="font-semibold text-slate-800">Recapitulatif de la commande</h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Service</span>
                    <p className="font-medium text-slate-800">{serviceType?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Urgence</span>
                    <p className="font-medium text-slate-800">{formData.urgency}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Depart</span>
                    <p className="font-medium text-slate-800">{formData.departure_address || '\u2014'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Arrivee</span>
                    <p className="font-medium text-slate-800">{formData.arrival_address || '\u2014'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Beneficiaire</span>
                    <p className="font-medium text-slate-800">{formData.beneficiary_name || '\u2014'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Departement</span>
                    <p className="font-medium text-slate-800">{formData.department || '\u2014'}</p>
                  </div>
                </div>
              </div>

              {/* Price summary */}
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600">Cout estimatif</span>
                  <span className="text-2xl font-bold text-subito">
                    {estimatedCost.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CreditCard className="w-4 h-4" />
                  <span>Paiement : {
                    formData.payment_method === 'invoice' ? 'Facture mensuelle' :
                    formData.payment_method === 'mobile_money' ? 'Mobile Money' :
                    formData.payment_method === 'credit' ? 'Credit entreprise' : 'Immediat'
                  }</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={currentStep === 1 ? onCancel : handleBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === 1 ? 'Annuler' : 'Retour'}
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={handleNext}
            className="gradient-subito text-white border-0 gap-2"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gradient-subito text-white border-0 gap-2"
          >
            {isSubmitting ? 'Validation...' : 'Confirmer la commande'}
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un employe</DialogTitle>
            <DialogDescription>
              Ajoutez {formData.beneficiary_email} a votre liste d&apos;employes pour faciliter les futures reservations
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            employee={{ email: formData.beneficiary_email } as any}
            departments={departments as any}
            onSubmit={handleAddEmployee as any}
            onCancel={() => setShowAddEmployeeDialog(false)}
            isSubmitting={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
