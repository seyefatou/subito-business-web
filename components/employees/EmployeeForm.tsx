'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { CreateEmployeeDto, EmployeeResponse, DepartmentResponse } from "@/lib/api";
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
import {
  ArrowLeft,
  User,
  Briefcase,
  Wallet,
  Info,
  Shield,
  Loader2,
} from "lucide-react";

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
  mode?: "create" | "edit";
}

export default function EmployeeForm({
  employee,
  departments,
  onSubmit,
  onCancel,
  isSubmitting,
  mode = "create",
}: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    nom: employee?.nom || "",
    prenom: employee?.prenom || "",
    email: employee?.email || "",
    telephone: employee?.telephone || "",
    adresse: employee?.adresse || "",
    departementId:
      employee?.departementId?.toString() ||
      employee?.departement?.id?.toString() ||
      "",
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
      adresse: formData.adresse || undefined,
      departementId:
        formData.departementId && formData.departementId !== "none"
          ? parseInt(formData.departementId)
          : undefined,
      role: formData.role || undefined,
      plafondMensuel: formData.plafondMensuel
        ? parseFloat(formData.plafondMensuel)
        : undefined,
      actif: formData.actif,
    };
    onSubmit(submitData);
  };

  const handleChange = (field: keyof EmployeeFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass =
    "w-full bg-[#f0f4f8] border-none rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40 transition-all outline-none";

  return (
    <div className="space-y-10 -m-2 md:-m-4 lg:-m-6 max-w-6xl pb-24 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/employees"
            className="flex items-center gap-2 text-[#E04A1F] hover:gap-3 transition-all duration-200 mb-2 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour a la liste
          </Link>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[#171c1f]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {mode === "edit" ? "Modifier l'employe" : "Ajouter un employe"}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Informations personnelles */}
          <section className="bg-white p-8 rounded-[1.5rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-[#E04A1F]" />
              <h2
                className="text-xl font-bold text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Informations personnelles
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Prenom *</Label>
                <Input
                  value={formData.prenom}
                  onChange={(e) => handleChange("prenom", e.target.value)}
                  placeholder="Jean"
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Nom *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => handleChange("nom", e.target.value)}
                  placeholder="Dupont"
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Email professionnel *
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="j.dupont@entreprise.com"
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700">Telephone</Label>
                <PhoneInput
                  value={formData.telephone}
                  onChange={(val) => handleChange("telephone", val)}
                  defaultCountryCode="+221"
                  placeholder="77 123 45 67"
                />
              </div>
            </div>
          </section>

          {/* Affectation */}
          <section className="bg-white p-8 rounded-[1.5rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <Briefcase className="w-5 h-5 text-[#E04A1F]" />
              <h2
                className="text-xl font-bold text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Affectation
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Departement</Label>
                <Select
                  value={formData.departementId}
                  onValueChange={(v) => handleChange("departementId", v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Selectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => handleChange("role", v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employe">Voyageur</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Parametres budgetaires */}
          <section className="bg-white p-8 rounded-[1.5rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="w-5 h-5 text-[#E04A1F]" />
              <h2
                className="text-xl font-bold text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Parametres budgetaires
              </h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 max-w-md">
                <Label className="text-sm font-semibold text-slate-700">
                  Plafond mensuel (FCFA)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.plafondMensuel}
                    onChange={(e) => handleChange("plafondMensuel", e.target.value)}
                    placeholder="50000"
                    className={`${inputClass} pl-14`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                    FCFA
                  </span>
                </div>
              </div>
              <div className="bg-[#ffdbd0]/40 p-4 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-[#E04A1F] shrink-0 mt-0.5" />
                <p className="text-sm text-[#e55a2b]">
                  Ce plafond limite les depenses totales de reservation (vols, hotels,
                  trains) autorisees pour cet employe chaque mois. Une notification sera
                  envoyee a l&apos;administrateur si le seuil est atteint.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChange("actif", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#E04A1F] focus:ring-[#E04A1F]"
                />
                <span className="text-sm text-slate-700">Employe actif</span>
              </label>
            </div>
          </section>
        </div>

        {/* Right column — sticky sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#e4e9ed] p-8 rounded-[1.5rem] flex flex-col gap-6 lg:sticky lg:top-24">
            <div className="space-y-2">
              <h3
                className="font-bold text-lg text-[#171c1f]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Resume de l&apos;action
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {mode === "edit" ? (
                  <>
                    Vous etes sur le point de mettre a jour les informations de cet
                    employe dans <strong>Subito Business</strong>. Les changements
                    seront appliques immediatement.
                  </>
                ) : (
                  <>
                    Vous etes sur le point d&apos;inviter un nouveau membre a rejoindre
                    votre espace <strong>Subito Business</strong>. Un email
                    d&apos;activation lui sera envoye immediatement apres la creation.
                  </>
                )}
              </p>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#E04A1F] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#E04A1F]/20 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting
                  ? "Enregistrement..."
                  : mode === "edit"
                  ? "Enregistrer les modifications"
                  : "Creer l'employe"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full bg-white text-[#171c1f] py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors duration-200"
              >
                Annuler
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl">
              <div className="w-12 h-12 bg-[#00acbb]/10 rounded-full flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#006972]" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-700">Securite des donnees</p>
                <p className="text-slate-500">Conforme RGPD &amp; chiffrement AES-256</p>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile sticky submit bar (visible quand la sidebar lg:sticky est hors écran) */}
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex gap-3 shadow-[0_-4px_16px_rgba(23,28,31,0.08)]">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-slate-100 text-[#171c1f] py-3 rounded-xl font-bold text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] bg-[#E04A1F] text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-[#E04A1F]/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting
              ? "Enregistrement..."
              : mode === "edit"
              ? "Enregistrer"
              : "Creer l'employe"}
          </button>
        </div>
      </form>
    </div>
  );
}
