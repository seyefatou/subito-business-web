'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Presentation,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Map as MapIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddressAutocomplete, countryNameToCode } from '@/components/ui/address-autocomplete';
import { cn } from '@/lib/utils';
import { api, RegisterParticipantDto, Ville } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

// Palette Subito (rôles de couleur Material 3 du mockup mappés sur la marque)
const PRIMARY = '#E04A1F';
const PRIMARY_DARK = '#C8330F';
const TERTIARY_CONTAINER = '#16A34A'; // état « envoyé »

// Champ de saisie : fond doux, devient blanc au focus.
const fieldInput = 'bg-[#f1f2f9] border-transparent rounded-lg h-11 focus-visible:bg-white transition-colors';

const paysLabels: Record<string, string> = {
  senegal: 'Sénégal',
  cote_ivoire: "Côte d'Ivoire",
};

function unwrapPublic(response: unknown): any {
  const raw = response as any;
  if (raw?.data && typeof raw.data === 'object' && 'nom' in raw.data) return raw.data;
  return raw;
}

/**
 * Champ de formulaire avec micro-interaction : le label passe en couleur
 * primaire quand un élément à l'intérieur (input, select, autocomplete) est actif.
 */
function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={cn('min-w-0', className)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <Label
        htmlFor={htmlFor}
        className="text-sm font-semibold transition-colors"
        style={{ color: focused ? PRIMARY : '#171c1f' }}
      >
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
    </div>
  );
}

/** Section de formulaire en carte, avec pastille numérotée (style mockup). */
function SectionCard({
  n,
  title,
  delay = 0,
  children,
}: {
  n: number;
  title: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="animate-fade-up bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(23,28,31,0.03)] p-6 md:p-7"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
          style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
        >
          {n}
        </span>
        <h3 className="text-lg font-extrabold text-[#171c1f]" style={MANROPE}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export default function InscriptionSeminairePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';

  const destSectionRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

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

  // Ville de destination par défaut : Dakar (séminaires Sénégal uniquement)
  useEffect(() => {
    if (form.destVilleId || !sem || allVilles.length === 0) return;
    const paysCode = sem.pays === 'cote_ivoire' ? 'CI' : 'SN';
    const paysNames =
      sem.pays === 'cote_ivoire' ? ["côte d'ivoire", "cote d'ivoire"] : ['sénégal', 'senegal'];
    const inCountry = (v: any) =>
      v?.paysInfo?.code === paysCode || paysNames.includes(String(v?.pays || '').toLowerCase());
    const nameOf = (v: any) => v.name || v.nom || '';
    const dakar = allVilles.find(
      (v) => inCountry(v) && !v.isAeroport && nameOf(v).toLowerCase().includes('dakar'),
    );
    if (dakar) {
      setForm((p) => ({ ...p, destVilleId: Number(dakar.id), destVille: nameOf(dakar) }));
    }
  }, [allVilles, sem, form.destVilleId]);

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

  // FAB « carte » : décoratif — défile vers la section adresse.
  const handleMapFab = () => {
    const target = destSectionRef.current || formRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // --- Loading / error states ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: PRIMARY }} />
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
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${TERTIARY_CONTAINER}1A` }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: TERTIARY_CONTAINER }} />
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
  // Ordre d'affichage : Dakar en premier, Saly en deuxième, puis les autres villes
  const villeRank = (v: Ville) => {
    const n = villeName(v).toLowerCase();
    if (n.includes('dakar')) return 0;
    if (n.includes('saly')) return 1;
    return 2;
  };
  const destinations = allVilles
    .filter((v) => inCountry(v) && !v.isAeroport)
    .sort((a, b) => villeRank(a) - villeRank(b));

  // Numérotation des sections (les trajets sont conditionnels)
  const allerNo = 3;
  const retourNo = sem.aller ? 4 : 3;
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50" style={MANROPE}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] items-start min-h-screen">
        {/* Panneau latéral séminaire (gauche, fixe au scroll ; seul le formulaire défile) */}
        <aside
          className="relative text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
          style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}
        >
          <div className="flex flex-col min-h-full px-6 sm:px-8 py-8 lg:py-12">
            <div className="flex-1 animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
                <Presentation className="w-3.5 h-3.5" />
                Inscription au séminaire
              </span>
              <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                {sem.nom}
              </h1>
              <div className="mt-6 h-px bg-white/20" />
              <div className="mt-6 space-y-5">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Dates</p>
                    <p className="font-semibold">
                      {format(new Date(sem.dateDebut), 'dd MMM', { locale: fr })} →{' '}
                      {format(new Date(sem.dateFin), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Lieu</p>
                    <p className="font-semibold">{paysLabels[sem.pays] || sem.pays}</p>
                  </div>
                </div>
              </div>
              {sem.description && (
                <div className="mt-8 rounded-2xl bg-white/10 border border-white/10 p-5 text-sm text-white/85 leading-relaxed">
                  {sem.description}
                </div>
              )}
            </div>
            <p className="mt-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/60">
              <MapIcon className="w-3.5 h-3.5" />
              Propulsé par Subito Business
            </p>
          </div>
        </aside>

        {/* Colonne formulaire */}
        <main className="px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
          {!isOuvert ? (
            <div className="animate-fade-up bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(23,28,31,0.03)] p-8 text-center">
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
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="animate-fade-up bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}

              {/* 1 — Code de validation */}
              <SectionCard n={1} title="Code de validation" delay={0}>
                <Field htmlFor="code" label="Entrez votre code d'invitation" hint="Veuillez utiliser le code envoyé par email par l'organisation.">
                  <Input
                    id="code"
                    placeholder="EX-2026-XXXX"
                    value={form.validationCode}
                    onChange={(e) => set('validationCode', e.target.value)}
                    className={cn(fieldInput, 'tracking-widest uppercase')}
                  />
                </Field>
              </SectionCard>

              {/* 2 — Vos informations */}
              <SectionCard n={2} title="Vos informations" delay={60}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field htmlFor="prenom" label="Prénom">
                    <Input
                      id="prenom"
                      placeholder="Jean"
                      value={form.prenom}
                      onChange={(e) => set('prenom', e.target.value)}
                      className={fieldInput}
                    />
                  </Field>
                  <Field htmlFor="nom" label="Nom">
                    <Input
                      id="nom"
                      placeholder="Dupont"
                      value={form.nom}
                      onChange={(e) => set('nom', e.target.value)}
                      className={fieldInput}
                    />
                  </Field>
                  <Field htmlFor="email" label="Email professionnel">
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean.dupont@entreprise.com"
                      value={form.email || ''}
                      onChange={(e) => set('email', e.target.value)}
                      className={fieldInput}
                    />
                  </Field>
                  <Field htmlFor="tel" label="Téléphone">
                    <Input
                      id="tel"
                      placeholder="+221 77 000 00 00"
                      value={form.telephone || ''}
                      onChange={(e) => set('telephone', e.target.value)}
                      className={fieldInput}
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* 3 — Arrivée (si proposé) */}
              {sem.aller && (
                <SectionCard n={allerNo} title="Arrivée — Vol & Destination" delay={120}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Numéro de vol arrivée">
                      <Input
                        placeholder="ex: AF718"
                        value={form.arrFlightNumber || ''}
                        onChange={(e) => set('arrFlightNumber', e.target.value)}
                        className={fieldInput}
                      />
                    </Field>
                    <Field label="Date et heure d'arrivée">
                      <Input
                        type="datetime-local"
                        value={form.arrDateTime || ''}
                        onChange={(e) => set('arrDateTime', e.target.value)}
                        className={fieldInput}
                      />
                    </Field>
                    <Field label="Compagnie aérienne">
                      <Input
                        placeholder="ex: Air France"
                        value={form.arrAirline || ''}
                        onChange={(e) => set('arrAirline', e.target.value)}
                        className={fieldInput}
                      />
                    </Field>
                    <Field label="Aéroport d'arrivée">
                      <Select
                        value={form.arrAirportId ? String(form.arrAirportId) : ''}
                        onValueChange={(val) => {
                          const a = aeroports.find((x) => String(x.id) === val);
                          setForm((p) => ({ ...p, arrAirportId: Number(val), arrAirport: a ? villeName(a) : '' }));
                        }}
                      >
                        <SelectTrigger className={fieldInput}>
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
                    </Field>
                    <Field label="Ville de destination">
                      <Select
                        value={form.destVilleId ? String(form.destVilleId) : ''}
                        onValueChange={(val) => {
                          const v = destinations.find((x) => String(x.id) === val);
                          setForm((p) => ({ ...p, destVilleId: Number(val), destVille: v ? villeName(v) : '' }));
                        }}
                      >
                        <SelectTrigger className={fieldInput}>
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
                    </Field>
                    <Field label="Adresse de destination">
                      <div ref={destSectionRef}>
                        <AddressAutocomplete
                          value={form.destAdresse || ''}
                          onChange={(val) => set('destAdresse', val)}
                          onSelect={(address, lat, lng) =>
                            setForm((p) => ({ ...p, destAdresse: address, destLat: lat, destLng: lng }))
                          }
                          placeholder="Ex: Hôtel Radisson Blu"
                          countryCode={countryCode}
                          iconColor="text-[#E04A1F]"
                        />
                      </div>
                    </Field>
                  </div>
                </SectionCard>
              )}

              {/* 4 — Départ (si proposé) */}
              {sem.retour && (
                <SectionCard n={retourNo} title="Départ — Vol Retour" delay={180}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Numéro de vol retour">
                      <Input
                        placeholder="ex: AF719"
                        value={form.depFlightNumber || ''}
                        onChange={(e) => set('depFlightNumber', e.target.value)}
                        className={fieldInput}
                      />
                    </Field>
                    <Field label="Date et heure de départ">
                      <Input
                        type="datetime-local"
                        value={form.depDateTime || ''}
                        onChange={(e) => set('depDateTime', e.target.value)}
                        className={fieldInput}
                      />
                    </Field>
                    <Field label="Compagnie aérienne">
                      <Input
                        placeholder="ex: Air France"
                        value={form.depAirline || ''}
                        onChange={(e) => set('depAirline', e.target.value)}
                        className={fieldInput}
                      />
                    </Field>
                    <Field label="Aéroport de départ">
                      <Select
                        value={form.depAirportId ? String(form.depAirportId) : ''}
                        onValueChange={(val) => {
                          const a = aeroports.find((x) => String(x.id) === val);
                          setForm((p) => ({ ...p, depAirportId: Number(val), depAirport: a ? villeName(a) : '' }));
                        }}
                      >
                        <SelectTrigger className={fieldInput}>
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
                    </Field>
                    <Field label="Ville de départ">
                      <Select
                        value={form.depVilleId ? String(form.depVilleId) : ''}
                        onValueChange={(val) => setForm((p) => ({ ...p, depVilleId: Number(val) }))}
                      >
                        <SelectTrigger className={fieldInput}>
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
                    </Field>
                    <Field label="Adresse de prise en charge (retour)">
                      <AddressAutocomplete
                        value={form.depPickupAdresse || ''}
                        onChange={(val) => set('depPickupAdresse', val)}
                        onSelect={(address, lat, lng) =>
                          setForm((p) => ({ ...p, depPickupAdresse: address, depPickupLat: lat, depPickupLng: lng }))
                        }
                        placeholder="Lieu où vous récupérer pour le retour"
                        countryCode={countryCode}
                        iconColor="text-[#E04A1F]"
                      />
                    </Field>
                  </div>
                </SectionCard>
              )}

              {/* Disclaimer + soumission */}
              <div className="animate-fade-up pt-2" style={{ animationDelay: '240ms' }}>
                <p className="text-center text-sm text-slate-500 max-w-md mx-auto mb-5">
                  En confirmant votre inscription, vous acceptez les conditions de participation et la
                  politique de confidentialité de l&apos;événement.
                </p>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-14 rounded-xl text-white border-0 font-bold text-base gap-2 active:scale-[0.99] transition-all disabled:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
                    boxShadow: `0 10px 20px -6px ${PRIMARY}66`,
                  }}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Traitement…
                    </>
                  ) : (
                    <>
                      Confirmer mon inscription
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Pied de page (décoratif, contenu neutre) */}
          <footer className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span className="text-center sm:text-left">
              © {year} {sem.nom} · Propulsé par Subito Business
            </span>
            <div className="flex items-center gap-5">
              <span>Confidentialité</span>
              <span>Conditions</span>
              <span>Contact</span>
            </div>
          </footer>
        </main>
      </div>

      {/* FAB « carte » flottant (décoratif : défile vers l'adresse) */}
      {isOuvert && (
        <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-30">
          <div className="group relative">
            <div
              className="absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_DARK})` }}
            />
            <button
              type="button"
              onClick={handleMapFab}
              aria-label="Voir la section adresse"
              className="relative w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
              style={{ color: PRIMARY }}
            >
              <MapIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
