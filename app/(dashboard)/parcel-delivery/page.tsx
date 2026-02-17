'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import {
  Package,
  MapPin,
  User,
  FileText,
  CreditCard,
  Check,
  CheckCircle2,
  Navigation,
  Truck,
  Clock,
  Zap,
  Loader2,
  X,
  ChevronRight,
  ArrowLeft,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Contact {
  id: number;
  name: string;
  phone: string;
}

interface Department {
  id: string;
  name: string;
}

interface FormData {
  pickupAddress: string;
  deliveryAddress: string;
  description: string;
  instructions: string;
  scheduledDate: string;
  receiverType: string;
  selectedContact: Contact | null;
  receiverName: string;
  receiverPhone: string;
  receiverCountryCode: string;
  senderType: string;
  senderName: string;
  senderPhone: string;
  senderCountryCode: string;
  packageSize: string;
  speed: string;
  insurance: boolean;
  paymentMethod: string;
  department: string;
}

interface CalculatedData {
  distance: number;
  price: number;
  estimatedTime: string;
}

const steps: Step[] = [
  { id: 1, title: "Adresses", icon: MapPin },
  { id: 2, title: "Destinataire", icon: User },
  { id: 3, title: "Expediteur", icon: User },
  { id: 4, title: "Details", icon: Package },
  { id: 5, title: "Paiement", icon: CreditCard },
];

const mockContacts: Contact[] = [
  { id: 1, name: "Marie Diop", phone: "+221 77 123 45 67" },
  { id: 2, name: "Amadou Seck", phone: "+221 76 234 56 78" },
  { id: 3, name: "Fatou Ndiaye", phone: "+221 78 345 67 89" },
];

const calculateDistance = (addr1: string, addr2: string): number => {
  if (!addr1 || !addr2) return 0;
  return Math.floor(Math.random() * 30) + 5;
};

const calculatePrice = (size: string, distance: number, speed: string): number => {
  if (!size) return 0;
  const basePrice: Record<string, number> = {
    small: 3000,
    medium: 5000,
    large: 8000,
  };

  const distancePrice = distance * 200;
  const speedMultiplier: Record<string, number> = {
    economy: 0.8,
    standard: 1,
    express: 1.5,
  };

  return Math.round((basePrice[size] + distancePrice) * speedMultiplier[speed]);
};

const getDeliveryEstimate = (speed: string, distance: number): string => {
  const baseTime = distance * 2;
  const speedFactor: Record<string, number> = {
    economy: 1.5,
    standard: 1,
    express: 0.6,
  };

  const minutes = Math.round(baseTime * speedFactor[speed]);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
};

export default function ParcelDelivery() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [searching, setSearching] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const createOrder = useMutation({
    mutationFn: (data: Record<string, unknown>) => base44.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setSuccess(true);
    },
  });

  const [formData, setFormData] = useState<FormData>({
    pickupAddress: "",
    deliveryAddress: "",
    description: "",
    instructions: "",
    scheduledDate: "",
    receiverType: "myself",
    selectedContact: null,
    receiverName: "",
    receiverPhone: "",
    receiverCountryCode: "+221",
    senderType: "myself",
    senderName: "",
    senderPhone: "",
    senderCountryCode: "+221",
    packageSize: "",
    speed: "standard",
    insurance: false,
    paymentMethod: "",
    department: "",
  });

  const [calculatedData, setCalculatedData] = useState<CalculatedData>({
    distance: 0,
    price: 0,
    estimatedTime: "",
  });

  useEffect(() => {
    const distance = calculateDistance(formData.pickupAddress, formData.deliveryAddress);
    const price = calculatePrice(formData.packageSize, distance, formData.speed);
    const estimatedTime = getDeliveryEstimate(formData.speed, distance);

    setCalculatedData({ distance, price, estimatedTime });
  }, [formData.pickupAddress, formData.deliveryAddress, formData.packageSize, formData.speed]);

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.pickupAddress && formData.deliveryAddress);
      case 2:
        if (formData.receiverType === "myself") return true;
        if (formData.receiverType === "contact") return !!formData.selectedContact;
        return !!(formData.receiverName && formData.receiverPhone);
      case 3:
        if (formData.senderType === "myself") return true;
        return !!(formData.senderName && formData.senderPhone);
      case 4:
        return !!formData.packageSize;
      case 5:
        return !!formData.paymentMethod;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    setSearching(true);

    setTimeout(() => {
      const orderData = {
        service_type: "livraison_colis",
        service_category: "livraison",
        status: "confirmed",
        departure_address: formData.pickupAddress,
        arrival_address: formData.deliveryAddress,
        beneficiary_name: formData.receiverType === "myself" ? "Moi-meme" :
                         formData.receiverType === "contact" ? formData.selectedContact?.name :
                         formData.receiverName,
        beneficiary_email: formData.receiverType === "contact" ? formData.selectedContact?.phone :
                          formData.receiverPhone,
        department: formData.department,
        package_type: formData.packageSize === "small" ? "small_package" :
                     formData.packageSize === "medium" ? "medium_package" : "large_package",
        urgency: formData.speed === "economy" ? "standard" :
                formData.speed === "standard" ? "standard" : "express",
        estimated_cost: calculatedData.price + (formData.insurance ? 1000 : 0),
        notes: `Description: ${formData.description}\nInstructions: ${formData.instructions}`,
        payment_method: formData.paymentMethod === "cash" ? "immediate" :
                       formData.paymentMethod === "mobile_money" ? "immediate" : "invoice",
        tracking_number: `COL-${Date.now().toString().slice(-8)}`,
        scheduled_date: formData.scheduledDate || null,
      };

      createOrder.mutate(orderData);
      setSearching(false);
    }, 3000);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-16"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Livreur trouve ! 🎉
        </h1>
        <p className="text-slate-500 mb-8">
          Votre colis sera recupere sous peu
        </p>

        <Button
          className="w-full gradient-subito text-white border-0 py-6"
          onClick={() => router.push("/")}
        >
          Retour a l'accueil
        </Button>
      </motion.div>
    );
  }

  if (searching) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto text-center py-16"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-12 h-12 text-subito animate-spin" />
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Recherche en cours...
          </h2>
          <p className="text-slate-500 mb-6">
            Nous trouvons un livreur disponible
          </p>

          <Button
            variant="outline"
            onClick={() => {
              setSearching(false);
              setFormData({
                pickupAddress: "",
                deliveryAddress: "",
                description: "",
                instructions: "",
                scheduledDate: "",
                receiverType: "myself",
                selectedContact: null,
                receiverName: "",
                receiverPhone: "",
                receiverCountryCode: "+221",
                senderType: "myself",
                senderName: "",
                senderPhone: "",
                senderCountryCode: "+221",
                packageSize: "",
                speed: "standard",
                insurance: false,
                paymentMethod: "",
                department: "",
              });
              setCurrentStep(1);
            }}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Annuler
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl gradient-subito">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Livraison Express</h1>
          <p className="text-slate-500">Rapide, securise et fiable</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all
                ${currentStep >= step.id
                  ? 'gradient-subito text-white scale-110'
                  : 'bg-slate-200 text-slate-400'
                }
              `}>
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span className={`font-medium text-sm hidden sm:block ${
                currentStep >= step.id ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${
                currentStep > step.id ? 'bg-orange-400' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Addresses */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Route Card */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500">Adresse de depart</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-100" />
                    <Input
                      placeholder="Adresse de depart..."
                      className="pl-10 bg-slate-50"
                      value={formData.pickupAddress}
                      onChange={(e) => handleChange('pickupAddress', e.target.value)}
                    />
                  </div>
                </div>

                {/* Connection line */}
                <div className="relative h-8 flex items-center justify-center">
                  <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 to-orange-300" />
                  {calculatedData.distance > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Badge className="bg-gradient-to-r from-orange-50 to-red-50 text-subito border-orange-200">
                        {calculatedData.distance} km
                      </Badge>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500">Adresse de destination</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                    <Input
                      placeholder="Adresse de destination..."
                      className="pl-10 bg-slate-50"
                      value={formData.deliveryAddress}
                      onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description du colis</Label>
                <Textarea
                  placeholder="Decrivez le contenu..."
                  className="min-h-[80px] bg-slate-50"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions (optionnel)</Label>
                <Textarea
                  placeholder="Ex: Laisser devant la porte, Appeler avant..."
                  className="min-h-[64px] bg-slate-50"
                  value={formData.instructions}
                  onChange={(e) => handleChange('instructions', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date et heure de livraison souhaitee</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="datetime-local"
                    className="pl-10 bg-slate-50"
                    value={formData.scheduledDate}
                    onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Choisissez quand vous souhaitez que le colis soit livre
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Receiver */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="font-semibold text-slate-800">Destinataire</h3>

              <RadioGroup value={formData.receiverType} onValueChange={(v) => handleChange('receiverType', v)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Label
                    htmlFor="receiver-myself"
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.receiverType === "myself"
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value="myself" id="receiver-myself" className="sr-only" />
                    <div className="text-center">
                      <User className="w-6 h-6 mx-auto mb-2 text-subito" />
                      <p className="font-medium text-slate-800">Moi-meme</p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="receiver-contact"
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.receiverType === "contact"
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value="contact" id="receiver-contact" className="sr-only" />
                    <div className="text-center">
                      <FileText className="w-6 h-6 mx-auto mb-2 text-subito" />
                      <p className="font-medium text-slate-800">Repertoire</p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="receiver-new"
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.receiverType === "new"
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value="new" id="receiver-new" className="sr-only" />
                    <div className="text-center">
                      <User className="w-6 h-6 mx-auto mb-2 text-subito" />
                      <p className="font-medium text-slate-800">Nouveau</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {formData.receiverType === "myself" && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <p className="text-slate-700">Vous recevrez le colis</p>
                </div>
              )}

              {formData.receiverType === "contact" && (
                <div className="space-y-2">
                  {mockContacts.map(contact => (
                    <motion.div
                      key={contact.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChange('selectedContact', contact)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.selectedContact?.id === contact.id
                          ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-subito flex items-center justify-center text-white font-semibold">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{contact.name}</p>
                          <p className="text-sm text-slate-500">{contact.phone}</p>
                        </div>
                        {formData.selectedContact?.id === contact.id && (
                          <CheckCircle2 className="w-5 h-5 text-subito" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {formData.receiverType === "new" && (
                <div className="space-y-4 bg-slate-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input
                      placeholder="Ex: Jean Dupont"
                      value={formData.receiverName}
                      onChange={(e) => handleChange('receiverName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telephone</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.receiverCountryCode}
                        onValueChange={(v) => handleChange('receiverCountryCode', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+221">🇸🇳 +221</SelectItem>
                          <SelectItem value="+33">🇫🇷 +33</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="77 123 45 67"
                        className="flex-1"
                        value={formData.receiverPhone}
                        onChange={(e) => handleChange('receiverPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Sender */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="font-semibold text-slate-800">Expediteur</h3>

              <RadioGroup value={formData.senderType} onValueChange={(v) => handleChange('senderType', v)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Label
                    htmlFor="sender-myself"
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.senderType === "myself"
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value="myself" id="sender-myself" className="sr-only" />
                    <div className="text-center">
                      <User className="w-6 h-6 mx-auto mb-2 text-subito" />
                      <p className="font-medium text-slate-800">Moi-meme</p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="sender-other"
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.senderType === "other"
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value="other" id="sender-other" className="sr-only" />
                    <div className="text-center">
                      <User className="w-6 h-6 mx-auto mb-2 text-subito" />
                      <p className="font-medium text-slate-800">Une autre personne</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {formData.senderType === "myself" && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <p className="text-slate-700">Vous etes l'expediteur</p>
                </div>
              )}

              {formData.senderType === "other" && (
                <div className="space-y-4 bg-slate-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input
                      placeholder="Nom de l'expediteur"
                      value={formData.senderName}
                      onChange={(e) => handleChange('senderName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telephone</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.senderCountryCode}
                        onValueChange={(v) => handleChange('senderCountryCode', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+221">🇸🇳 +221</SelectItem>
                          <SelectItem value="+33">🇫🇷 +33</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="77 123 45 67"
                        className="flex-1"
                        value={formData.senderPhone}
                        onChange={(e) => handleChange('senderPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Details & Price */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Package Size */}
              <div className="space-y-3">
                <Label>Taille du colis</Label>
                <RadioGroup value={formData.packageSize} onValueChange={(v) => handleChange('packageSize', v)}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: "small", label: "Petit", desc: "Jusqu'a 5kg" },
                      { value: "medium", label: "Moyen", desc: "5-15kg" },
                      { value: "large", label: "Grand", desc: "15-30kg" },
                    ].map(option => (
                      <Label
                        key={option.value}
                        htmlFor={`size-${option.value}`}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.packageSize === option.value
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={`size-${option.value}`} className="sr-only" />
                        <p className="font-semibold text-slate-800">{option.label}</p>
                        <p className="text-sm text-slate-500">{option.desc}</p>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Speed */}
              {formData.packageSize && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <Label>Rapidite de livraison</Label>
                  <RadioGroup value={formData.speed} onValueChange={(v) => handleChange('speed', v)}>
                    <div className="space-y-3">
                      {[
                        { value: "economy", label: "Economique", icon: Truck, badge: "-20%", badgeColor: "bg-green-100 text-green-700" },
                        { value: "standard", label: "Standard", icon: Clock, badge: "Recommande", badgeColor: "bg-blue-100 text-blue-700" },
                        { value: "express", label: "Express", icon: Zap, badge: "+50%", badgeColor: "bg-amber-100 text-amber-700" },
                      ].map(option => (
                        <Label
                          key={option.value}
                          htmlFor={`speed-${option.value}`}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.speed === option.value
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <RadioGroupItem value={option.value} id={`speed-${option.value}`} className="sr-only" />
                          <div className="flex items-center gap-3">
                            <option.icon className="w-5 h-5 text-subito" />
                            <div>
                              <p className="font-semibold text-slate-800">{option.label}</p>
                              {formData.speed === option.value && (
                                <p className="text-xs text-slate-500">⏱️ {calculatedData.estimatedTime}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${option.badgeColor} border-0`}>
                            {option.badge}
                          </Badge>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </motion.div>
              )}

              {/* Price Display */}
              {calculatedData.price > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden p-6 rounded-2xl gradient-subito text-white"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Tarif calcule</p>
                      <p className="text-3xl font-bold">{calculatedData.price.toLocaleString()} FCFA</p>
                      <p className="text-sm opacity-75 mt-1">
                        {formData.packageSize === "small" ? "Petit" : formData.packageSize === "medium" ? "Moyen" : "Grand"} • {calculatedData.distance} km
                      </p>
                    </div>
                    <Package className="w-16 h-16 opacity-20" />
                  </div>
                </motion.div>
              )}

              {/* Insurance */}
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-subito" />
                  <div>
                    <p className="font-medium text-slate-800">Assurance colis</p>
                    <p className="text-sm text-slate-500">+1 000 FCFA</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.insurance}
                  onChange={(e) => handleChange('insurance', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
              </div>
            </motion.div>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="font-semibold text-slate-800">Mode de paiement</h3>

              <RadioGroup value={formData.paymentMethod} onValueChange={(v) => handleChange('paymentMethod', v)}>
                <div className="space-y-3">
                  {[
                    { value: "cash", label: "Especes", desc: "Au livreur", icon: "💵" },
                    { value: "mobile_money", label: "Mobile Money", desc: "Orange Money, Wave, Free Money", icon: "📱" },
                    { value: "company_account", label: "Compte entreprise", desc: "Facturation sur le compte", icon: "🏢" },
                  ].map(option => (
                    <Label
                      key={option.value}
                      htmlFor={`payment-${option.value}`}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.paymentMethod === option.value
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={`payment-${option.value}`} className="sr-only" />
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-800">{option.label}</p>
                          <p className="text-sm text-slate-500">{option.desc}</p>
                        </div>
                      </div>
                      {formData.paymentMethod === option.value && (
                        <CheckCircle2 className="w-5 h-5 text-subito" />
                      )}
                    </Label>
                  ))}
                </div>
              </RadioGroup>

              {/* Department */}
              <div className="space-y-2">
                <Label>Departement (optionnel)</Label>
                <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="Selectionner un departement" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Prix de base</span>
                  <span className="font-medium text-slate-800">{calculatedData.price.toLocaleString()} FCFA</span>
                </div>
                {formData.insurance && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Assurance</span>
                    <span className="font-medium text-slate-800">1 000 FCFA</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="font-bold text-subito text-lg">
                    {(calculatedData.price + (formData.insurance ? 1000 : 0)).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canContinue()}
          className="gradient-subito text-white border-0 gap-2"
        >
          {currentStep === 5 ? "Lancer la recherche" : "Continuer"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
