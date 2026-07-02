'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Presentation,
  Calendar,
  MapPin,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Luggage,
  Baby,
  PawPrint,
  KeyRound,
  User,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddressAutocomplete, countryNameToCode } from '@/components/ui/address-autocomplete';
import { api, RegisterParticipantDto, Ville } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const paysLabels: Record<string, string> = {
  senegal: 'Sénégal',
  cote_ivoire: "Côte d'Ivoire",
};

function unwrapPublic(response: unknown): any {
  const raw = response as any;
  if (raw?.data && typeof raw.data === 'object' && 'nom' in raw.data) return raw.data;
  return raw;
}

export default function InscriptionSeminairePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['seminaire-public', slug],
    queryFn: () => api.seminaires.getPublic(slug),
    enabled: !!slug,
  });

  const { data: villesResp } = useQuery({
    queryKey: ['public-villes'],
    queryFn: () => api.seminaires.getVilles(),
  });

  const sem = unwrapPublic(response);

  const allVilles: Ville[] = (() => {
    const raw = villesResp as any;
    const payload = raw?.data ?? raw;
    return Array.isArray(payload) ? (payload as Ville[]) : [];
  })();

  const [form, setForm] = useState<RegisterParticipantDto>({
    validationCode: '',
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    smallBags: 0,
    largeBags: 0,
    siegeBebes: 0,
    animalDeCompagnie: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof RegisterParticipantDto>(key: K, value: RegisterParticipantDto[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const registerMutation = useMutation({
    mutationFn: (data: RegisterParticipantDto) => api.seminaires.register(slug, data),
    onError: (err: Error) => setFormError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.validationCode.trim()) {
      setFormError('Le code de validation est obligatoire.');
      return;
    }
    if (!form.prenom.trim() || !form.nom.trim()) {
      setFormError('Le prénom et le nom sont obligatoires.');
      return;
    }
    registerMutation.mutate({
      ...form,
      validationCode: form.validationCode.trim(),
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
    });
  };

  // --- Loading / error states ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (error || !sem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-extrabold text-[#171c1f]" style={MANROPE}>
            Séminaire introuvable
          </h1>
          <p className="text-[#585e6c] mt-2">
            Ce lien d&apos;inscription n&apos;est pas valide ou a expiré.
          </p>
        </div>
      </div>
    );
  }

  // --- Success state ---
  if (registerMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.08)] border border-slate-100 p-8 md:p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#171c1f]" style={MANROPE}>
            Inscription confirmée !
          </h1>
          <p className="text-[#585e6c] mt-3">
            Merci {form.prenom}, votre participation au séminaire{' '}
            <span className="font-semibold text-[#171c1f]">{sem.nom}</span> a bien été enregistrée.
          </p>
          <p className="text-sm text-[#585e6c] mt-4">
            L&apos;organisateur reviendra vers vous pour les détails logistiques.
          </p>
        </div>
      </div>
    );
  }

  const isOuvert = sem.ouvert !== false;
  const countryCode = countryNameToCode(sem.pays || 'senegal');

  // Filtrer villes & aéroports selon le pays du séminaire (robuste : code pays OU nom)
  const paysCode = sem.pays === 'cote_ivoire' ? 'CI' : 'SN';
  const paysNames = sem.pays === 'cote_ivoire' ? ["côte d'ivoire", "cote d'ivoire"] : ['sénégal', 'senegal'];
  const inCountry = (v: any) =>
    v?.paysInfo?.code === paysCode || paysNames.includes(String(v?.pays || '').toLowerCase());
  const villeName = (v: Ville) => v.name || v.nom || '';
  const aeroports = allVilles.filter((v) => inCountry(v) && v.isAeroport);
  const destinations = allVilles.filter((v) => inCountry(v) && !v.isAeroport);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* En-tête séminaire */}
        <div className="bg-gradient-to-br from-[#E04A1F] to-[#C8330F] rounded-3xl p-6 md:p-8 text-white shadow-[0_8px_24px_rgba(224,74,31,0.25)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Presentation className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              Inscription au séminaire
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={MANROPE}>
            {sem.nom}
          </h1>
          {sem.description && <p className="text-white/85 mt-2 text-sm">{sem.description}</p>}
          <div className="flex flex-wrap gap-4 mt-5 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {format(new Date(sem.dateDebut), 'dd MMM', { locale: fr })} →{' '}
              {format(new Date(sem.dateFin), 'dd MMM yyyy', { locale: fr })}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {paysLabels[sem.pays] || sem.pays}
            </span>
          </div>
        </div>

        {/* Inscriptions fermées */}
        {!isOuvert ? (
          <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-extrabold text-[#171c1f]" style={MANROPE}>
              Inscriptions fermées
            </h2>
            <p className="text-[#585e6c] mt-2">
              Les inscriptions à ce séminaire ne sont pas ouvertes actuellement.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 p-6 md:p-8 space-y-8"
          >
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {formError}
              </div>
            )}

            {/* Code de validation */}
            <div>
              <Label htmlFor="code" className="flex items-center gap-1.5 text-sm font-bold text-[#171c1f]">
                <KeyRound className="w-4 h-4 text-[#E04A1F]" />
                Code de validation
              </Label>
              <p className="text-xs text-[#585e6c] mb-2 mt-1">
                Saisissez le code communiqué par votre entreprise.
              </p>
              <Input
                id="code"
                placeholder="Ex: ACME26"
                value={form.validationCode}
                onChange={(e) => set('validationCode', e.target.value)}
                className="rounded-xl border-slate-200 font-mono tracking-widest uppercase"
              />
            </div>

            {/* Identité */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Vos informations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenom" className="text-sm font-bold text-[#171c1f]">Prénom</Label>
                  <Input
                    id="prenom"
                    value={form.prenom}
                    onChange={(e) => set('prenom', e.target.value)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label htmlFor="nom" className="text-sm font-bold text-[#171c1f]">Nom</Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => set('nom', e.target.value)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-1 text-sm font-bold text-[#171c1f]">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => set('email', e.target.value)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label htmlFor="tel" className="flex items-center gap-1 text-sm font-bold text-[#171c1f]">
                    <Phone className="w-3.5 h-3.5" /> Téléphone
                  </Label>
                  <Input
                    id="tel"
                    value={form.telephone || ''}
                    onChange={(e) => set('telephone', e.target.value)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Trajet aller (si proposé) */}
            {sem.aller && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] flex items-center gap-1.5">
                  <PlaneTakeoff className="w-3.5 h-3.5" />
                  Arrivée — vol & destination
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">N° de vol</Label>
                    <Input
                      placeholder="Ex: AF718"
                      value={form.arrFlightNumber || ''}
                      onChange={(e) => set('arrFlightNumber', e.target.value)}
                      className="mt-1.5 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Compagnie aérienne</Label>
                    <Input
                      placeholder="Ex: Air France"
                      value={form.arrAirline || ''}
                      onChange={(e) => set('arrAirline', e.target.value)}
                      className="mt-1.5 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Aéroport d&apos;arrivée</Label>
                    <Select
                      value={form.arrAirportId ? String(form.arrAirportId) : ''}
                      onValueChange={(val) => {
                        const a = aeroports.find((x) => String(x.id) === val);
                        setForm((p) => ({ ...p, arrAirportId: Number(val), arrAirport: a ? villeName(a) : '' }));
                      }}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 h-11">
                        <SelectValue placeholder="Sélectionner un aéroport" />
                      </SelectTrigger>
                      <SelectContent>
                        {aeroports.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {villeName(a)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Date & heure d&apos;arrivée</Label>
                    <Input
                      type="datetime-local"
                      value={form.arrDateTime || ''}
                      onChange={(e) => set('arrDateTime', e.target.value)}
                      className="mt-1.5 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Ville de destination</Label>
                    <Select
                      value={form.destVilleId ? String(form.destVilleId) : ''}
                      onValueChange={(val) => {
                        const v = destinations.find((x) => String(x.id) === val);
                        setForm((p) => ({ ...p, destVilleId: Number(val), destVille: v ? villeName(v) : '' }));
                      }}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 h-11">
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {villeName(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Adresse de destination</Label>
                    <AddressAutocomplete
                      value={form.destAdresse || ''}
                      onChange={(val) => set('destAdresse', val)}
                      onSelect={(address, lat, lng) =>
                        setForm((p) => ({ ...p, destAdresse: address, destLat: lat, destLng: lng }))
                      }
                      placeholder="Ex: Hôtel Radisson Blu"
                      countryCode={countryCode}
                      iconColor="text-[#E04A1F]"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Trajet retour (si proposé) */}
            {sem.retour && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] flex items-center gap-1.5">
                  <PlaneLanding className="w-3.5 h-3.5" />
                  Départ — vol retour
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">N° de vol</Label>
                    <Input
                      value={form.depFlightNumber || ''}
                      onChange={(e) => set('depFlightNumber', e.target.value)}
                      className="mt-1.5 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Compagnie aérienne</Label>
                    <Input
                      value={form.depAirline || ''}
                      onChange={(e) => set('depAirline', e.target.value)}
                      className="mt-1.5 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Aéroport de départ</Label>
                    <Select
                      value={form.depAirportId ? String(form.depAirportId) : ''}
                      onValueChange={(val) => {
                        const a = aeroports.find((x) => String(x.id) === val);
                        setForm((p) => ({ ...p, depAirportId: Number(val), depAirport: a ? villeName(a) : '' }));
                      }}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 h-11">
                        <SelectValue placeholder="Sélectionner un aéroport" />
                      </SelectTrigger>
                      <SelectContent>
                        {aeroports.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {villeName(a)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Date & heure de départ</Label>
                    <Input
                      type="datetime-local"
                      value={form.depDateTime || ''}
                      onChange={(e) => set('depDateTime', e.target.value)}
                      className="mt-1.5 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Ville de départ</Label>
                    <Select
                      value={form.depVilleId ? String(form.depVilleId) : ''}
                      onValueChange={(val) => setForm((p) => ({ ...p, depVilleId: Number(val) }))}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 h-11">
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {villeName(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-bold text-[#171c1f]">Adresse de prise en charge (retour)</Label>
                    <AddressAutocomplete
                      value={form.depPickupAdresse || ''}
                      onChange={(val) => set('depPickupAdresse', val)}
                      onSelect={(address, lat, lng) =>
                        setForm((p) => ({ ...p, depPickupAdresse: address, depPickupLat: lat, depPickupLng: lng }))
                      }
                      placeholder="Lieu où vous récupérer pour le retour"
                      countryCode={countryCode}
                      iconColor="text-[#E04A1F]"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bagages & options */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] flex items-center gap-1.5">
                <Luggage className="w-3.5 h-3.5" />
                Bagages & options
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-bold text-[#171c1f]">Petits bagages</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.smallBags ?? 0}
                    onChange={(e) => set('smallBags', Number(e.target.value) || 0)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold text-[#171c1f]">Grands bagages</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.largeBags ?? 0}
                    onChange={(e) => set('largeBags', Number(e.target.value) || 0)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1 text-sm font-bold text-[#171c1f]">
                    <Baby className="w-3.5 h-3.5" /> Sièges bébé
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.siegeBebes ?? 0}
                    onChange={(e) => set('siegeBebes', Number(e.target.value) || 0)}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#f0f4f8] border border-slate-100">
                <div className="flex items-center gap-3">
                  <PawPrint className="w-5 h-5 text-[#E04A1F]" />
                  <p className="font-bold text-sm text-[#171c1f]">Animal de compagnie</p>
                </div>
                <Switch
                  checked={!!form.animalDeCompagnie}
                  onCheckedChange={(v) => set('animalDeCompagnie', v)}
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2"
              style={MANROPE}
            >
              {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmer mon inscription
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-slate-400">
          Propulsé par Subito Business
        </p>
      </div>
    </div>
  );
}
