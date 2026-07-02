'use client';

import React, { useState } from 'react';
import { Loader2, Plane, Hotel, Compass, Building2, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateSeminaireDto, SeminairePays } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

export type SeminaireFormValues = CreateSeminaireDto;

const DEFAULT_VALUES: SeminaireFormValues = {
  nom: '',
  description: '',
  pays: 'senegal',
  dateDebut: '',
  dateFin: '',
  aller: true,
  retour: false,
  regrouper: true,
  maxPaxParVehicule: 4,
  autoConfirm: false,
  serviceNavette: true,
  serviceLogement: false,
  serviceActivite: false,
  serviceSalle: false,
};

interface ToggleRowProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon: Icon, title, subtitle, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#f0f4f8] border border-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="w-5 h-5 text-[#E04A1F]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-sm text-[#171c1f]">{title}</p>
          {subtitle && <p className="text-xs text-[#585e6c] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface SeminaireFormProps {
  initialValues?: Partial<SeminaireFormValues>;
  onSubmit: (values: SeminaireFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export default function SeminaireForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Enregistrer',
}: SeminaireFormProps) {
  const [values, setValues] = useState<SeminaireFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SeminaireFormValues>(key: K, value: SeminaireFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.nom.trim()) {
      setError('Le nom du séminaire est obligatoire.');
      return;
    }
    if (!values.dateDebut || !values.dateFin) {
      setError('Les dates de début et de fin sont obligatoires.');
      return;
    }
    if (new Date(values.dateFin) < new Date(values.dateDebut)) {
      setError('La date de fin doit être après la date de début.');
      return;
    }
    if (!values.aller && !values.retour) {
      setError('Sélectionnez au moins un trajet (aller ou retour).');
      return;
    }
    setError(null);
    onSubmit({ ...values, nom: values.nom.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Informations générales */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
          Informations générales
        </h4>

        <div>
          <Label htmlFor="nom" className="text-sm font-bold text-[#171c1f]">
            Nom du séminaire
          </Label>
          <Input
            id="nom"
            placeholder="Ex: Séminaire annuel ACME 2026"
            value={values.nom}
            onChange={(e) => set('nom', e.target.value)}
            className="mt-1.5 rounded-xl border-slate-200"
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-bold text-[#171c1f]">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Décrivez l'événement..."
            rows={3}
            value={values.description || ''}
            onChange={(e) => set('description', e.target.value)}
            className="mt-1.5 rounded-xl border-slate-200"
          />
        </div>

        <div>
          <Label className="text-sm font-bold text-[#171c1f]">Pays</Label>
          <Select value={values.pays} onValueChange={(v) => set('pays', v as SeminairePays)}>
            <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 h-11">
              <SelectValue placeholder="Sélectionner un pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="senegal">Sénégal (tarif fixe par ville)</SelectItem>
              <SelectItem value="cote_ivoire">Côte d&apos;Ivoire (tarif au km)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateDebut" className="text-sm font-bold text-[#171c1f]">
              Date de début
            </Label>
            <Input
              id="dateDebut"
              type="date"
              value={values.dateDebut ? values.dateDebut.slice(0, 10) : ''}
              onChange={(e) => set('dateDebut', e.target.value)}
              className="mt-1.5 rounded-xl border-slate-200"
            />
          </div>
          <div>
            <Label htmlFor="dateFin" className="text-sm font-bold text-[#171c1f]">
              Date de fin
            </Label>
            <Input
              id="dateFin"
              type="date"
              value={values.dateFin ? values.dateFin.slice(0, 10) : ''}
              onChange={(e) => set('dateFin', e.target.value)}
              className="mt-1.5 rounded-xl border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Trajets proposés */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
          Trajets proposés aux participants
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow
            title="Trajet aller"
            subtitle="Aéroport → lieu"
            checked={values.aller}
            onChange={(v) => set('aller', v)}
          />
          <ToggleRow
            title="Trajet retour"
            subtitle="Lieu → aéroport"
            checked={values.retour}
            onChange={(v) => set('retour', v)}
          />
        </div>
      </div>

      {/* Services activés */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
          Services activés
        </h4>
        <div className="grid grid-cols-1 gap-3">
          <ToggleRow
            icon={Bus}
            title="Navette"
            subtitle="Transferts des participants"
            checked={values.serviceNavette}
            onChange={(v) => set('serviceNavette', v)}
          />
          <ToggleRow
            icon={Hotel}
            title="Logement"
            subtitle="Hébergement des participants"
            checked={values.serviceLogement}
            onChange={(v) => set('serviceLogement', v)}
          />
          <ToggleRow
            icon={Compass}
            title="Activité"
            subtitle="Activités et excursions"
            checked={values.serviceActivite}
            onChange={(v) => set('serviceActivite', v)}
          />
          <ToggleRow
            icon={Building2}
            title="Salle"
            subtitle="Location de salle de séminaire"
            checked={values.serviceSalle}
            onChange={(v) => set('serviceSalle', v)}
          />
        </div>
      </div>

      {/* Options navette */}
      {values.serviceNavette && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
            Options de regroupement navette
          </h4>
          <ToggleRow
            icon={Plane}
            title="Regrouper les participants"
            subtitle="Optimiser les véhicules par trajet partagé"
            checked={values.regrouper}
            onChange={(v) => set('regrouper', v)}
          />
          {values.regrouper && (
            <div>
              <Label htmlFor="maxPax" className="text-sm font-bold text-[#171c1f]">
                Passagers maximum par véhicule
              </Label>
              <Input
                id="maxPax"
                type="number"
                min={1}
                max={20}
                value={values.maxPaxParVehicule}
                onChange={(e) => set('maxPaxParVehicule', Number(e.target.value) || 1)}
                className="mt-1.5 rounded-xl border-slate-200 max-w-[160px]"
              />
            </div>
          )}
          <ToggleRow
            title="Confirmation automatique"
            subtitle="Confirmer les transferts sans validation manuelle"
            checked={values.autoConfirm}
            onChange={(v) => set('autoConfirm', v)}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 px-6 rounded-2xl font-bold shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2"
          style={MANROPE}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
