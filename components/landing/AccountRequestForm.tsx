"use client"

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle2, Building2, User, Phone, Mail, Car, Users, FileText, Briefcase } from "lucide-react";

const sectors = [
  "Transport & Logistique",
  "BTP & Construction",
  "Mines & Énergie",
  "Banque & Assurance",
  "Télécommunications",
  "Santé & Pharma",
  "Commerce & Distribution",
  "ONG & Organisations internationales",
  "Administration publique",
  "Autre",
];

interface FormData {
  company_name: string;
  ninea: string;
  sector: string;
  contact_name: string;
  phone: string;
  email: string;
  estimated_vehicles: string;
  estimated_users: string;
}

export default function AccountRequestForm() {
  const [form, setForm] = useState<FormData>({
    company_name: "",
    ninea: "",
    sector: "",
    contact_name: "",
    phone: "",
    email: "",
    estimated_vehicles: "",
    estimated_users: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.mysubito.net/v1';
      const res = await fetch(`${API_BASE}/company-registration-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomEntreprise: form.company_name,
          ninea: form.ninea,
          nomResponsable: form.contact_name,
          emailEntreprise: form.email,
          telephone: form.phone,
          utilisateursEstimes: form.estimated_users ? Number(form.estimated_users) : 1,
          secteurActivite: form.sector || 'Autre',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || "Une erreur est survenue";
        alert(Array.isArray(msg) ? msg.join(', ') : msg);
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      alert("Erreur réseau, veuillez réessayer.");
    }
    setLoading(false);
  };

  return (
    <section id="request-form" className="py-24 lg:py-32 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">
              Rejoignez-nous
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4 leading-tight">
              Demandez l&apos;ouverture de votre compte
            </h2>
            <p className="text-slate-400 mt-6 text-lg leading-relaxed">
              Remplissez le formulaire ci-contre. Notre équipe validera votre demande et créera votre espace entreprise sous 48h.
            </p>

            <div className="mt-10 space-y-5">
              {[
                "Validation en moins de 48h ouvrées",
                "Configuration assistée par notre équipe",
                "Formation incluse pour les administrateurs",
                "Support dédié entreprise",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-slate-300">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-10 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Demande envoyée avec succès !</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Nous avons reçu votre demande et un email de confirmation a été envoyé à <span className="text-white font-medium">{form.email}</span>.
                    Notre équipe vous contactera sous 48h.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 lg:p-10 space-y-5"
                >
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Nom de l&apos;entreprise *
                      </Label>
                      <Input
                        required
                        value={form.company_name}
                        onChange={(e) => handleChange("company_name", e.target.value)}
                        className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                        placeholder="Ex: Senegal Logistics SA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" /> NINEA / Registre de commerce
                      </Label>
                      <Input
                        value={form.ninea}
                        onChange={(e) => handleChange("ninea", e.target.value)}
                        className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                        placeholder="Numéro NINEA"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Secteur d&apos;activité
                    </Label>
                    <Select value={form.sector} onValueChange={(v) => handleChange("sector", v)}>
                      <SelectTrigger className="bg-slate-900/60 border-slate-700 text-white h-12 focus:border-orange-500 focus:ring-orange-500/20">
                        <SelectValue placeholder="Sélectionnez votre secteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-2">
                        <User className="w-4 h-4" /> Nom du responsable *
                      </Label>
                      <Input
                        required
                        value={form.contact_name}
                        onChange={(e) => handleChange("contact_name", e.target.value)}
                        className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                        placeholder="Prénom et Nom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Téléphone *
                      </Label>
                      <Input
                        required
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                        placeholder="+221 7X XXX XX XX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email professionnel *
                    </Label>
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                      placeholder="responsable@entreprise.sn"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-2">
                        <Car className="w-4 h-4" /> Véhicules estimés
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.estimated_vehicles}
                        onChange={(e) => handleChange("estimated_vehicles", e.target.value)}
                        className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                        placeholder="Ex: 25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" /> Utilisateurs estimés
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.estimated_users}
                        onChange={(e) => handleChange("estimated_users", e.target.value)}
                        className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20 h-12"
                        placeholder="Ex: 50"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 text-base font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all mt-4"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Soumettre la demande
                      </div>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
