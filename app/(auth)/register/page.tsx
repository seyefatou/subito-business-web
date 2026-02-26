'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Building2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  FileText,
  Users,
  Briefcase,
} from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nomEntreprise: '',
    ninea: '',
    nomResponsable: '',
    emailEntreprise: '',
    telephone: '',
    utilisateursEstimes: '',
    secteurActivite: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomEntreprise.trim()) {
      toast.error("Veuillez entrer le nom de l'entreprise");
      return;
    }
    if (!formData.ninea.trim()) {
      toast.error('Veuillez entrer le numero NINEA');
      return;
    }
    if (!formData.nomResponsable.trim()) {
      toast.error('Veuillez entrer le nom du responsable');
      return;
    }
    if (!formData.emailEntreprise.trim()) {
      toast.error("Veuillez entrer l'email de l'entreprise");
      return;
    }
    if (!formData.telephone.trim()) {
      toast.error('Veuillez entrer le numero de telephone');
      return;
    }
    if (!formData.utilisateursEstimes || Number(formData.utilisateursEstimes) < 1) {
      toast.error("Veuillez entrer le nombre d'utilisateurs estimes");
      return;
    }
    if (!formData.secteurActivite.trim()) {
      toast.error("Veuillez entrer le secteur d'activite");
      return;
    }

    setIsLoading(true);

    try {
      await api.companyRegistration.create({
        ...formData,
        utilisateursEstimes: Number(formData.utilisateursEstimes),
      });
      setSuccess(true);
      toast.success('Demande soumise avec succes');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const secteurs = [
    'Transport & Logistique',
    'BTP & Construction',
    'Commerce & Distribution',
    'Services & Conseil',
    'Industrie & Production',
    'Technologie & IT',
    'Sante & Pharmacie',
    'Education & Formation',
    'Hotellerie & Restauration',
    'Agriculture & Agroalimentaire',
    'Finance & Assurance',
    'Immobilier',
    'Energie & Mines',
    'Telecommunication',
    'Autre',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <style>{`
        .gradient-subito {
          background: linear-gradient(135deg, #FF6B35 0%, #FF7B7B 100%);
        }
        .text-subito {
          color: #FF6B35;
        }
      `}</style>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/logo-subito.jpeg"
              alt="Subito"
              className="h-12 w-auto"
            />
            <div className="text-left">
              <span className="font-bold text-2xl text-slate-800">Subito</span>
              <span className="block text-sm text-slate-500 font-medium -mt-1">Business</span>
            </div>
          </div>
          <p className="text-slate-500">Demande d&apos;inscription entreprise</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Demande soumise</h2>
              <p className="text-sm text-slate-500">
                Votre demande d&apos;inscription a ete soumise avec succes. Notre equipe l&apos;examinera et vous contactera par email.
              </p>
              <Link href="/login">
                <Button className="w-full h-12 gradient-subito text-white border-0 text-base font-medium mt-2">
                  Retour a la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-7 h-7 text-orange-600" />
                </div>
                <p className="text-sm text-slate-500">
                  Remplissez le formulaire pour soumettre votre demande d&apos;inscription.
                </p>
              </div>

              {/* Nom entreprise */}
              <div className="space-y-1.5">
                <Label htmlFor="nomEntreprise">Nom de l&apos;entreprise</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="nomEntreprise"
                    name="nomEntreprise"
                    placeholder="Transport Senegal SA"
                    value={formData.nomEntreprise}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {/* NINEA */}
              <div className="space-y-1.5">
                <Label htmlFor="ninea">Numero NINEA</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="ninea"
                    name="ninea"
                    placeholder="123456789"
                    value={formData.ninea}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {/* Nom responsable */}
              <div className="space-y-1.5">
                <Label htmlFor="nomResponsable">Nom du responsable</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="nomResponsable"
                    name="nomResponsable"
                    placeholder="Mamadou Diallo"
                    value={formData.nomResponsable}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="emailEntreprise">Email de l&apos;entreprise</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="emailEntreprise"
                    name="emailEntreprise"
                    type="email"
                    placeholder="contact@entreprise.sn"
                    value={formData.emailEntreprise}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {/* Telephone */}
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Telephone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    placeholder="+221 77 000 00 00"
                    value={formData.telephone}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {/* Grid: Utilisateurs + Secteur */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="utilisateursEstimes">Nb. utilisateurs</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="utilisateursEstimes"
                      name="utilisateursEstimes"
                      type="number"
                      min="1"
                      placeholder="50"
                      value={formData.utilisateursEstimes}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="secteurActivite">Secteur d&apos;activite</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <select
                      id="secteurActivite"
                      name="secteurActivite"
                      value={formData.secteurActivite}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="">Choisir...</option>
                      {secteurs.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 gradient-subito text-white border-0 text-base font-medium mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Soumettre la demande"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-subito hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Retour a la connexion
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          2024 Subito Business. Tous droits reserves.
        </p>
      </div>
    </div>
  );
}
