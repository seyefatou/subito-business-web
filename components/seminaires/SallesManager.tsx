'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  MapPin,
  Users,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, SeminaireSalle, Lieu, Salle, AddSeminaireSalleDto } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };
const FCFA = (n?: number | null) => (n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—');

function extractArray<T>(response: unknown): T[] {
  const raw = response as any;
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  return [];
}

// Même jour = facturation à l'heure (nombre d'heures requis). Jours différents = facturation à la journée.
function isSameDay(debut?: string, fin?: string): boolean {
  if (!debut || !fin) return true;
  return debut.slice(0, 10) === fin.slice(0, 10);
}

function nombreJours(debut?: string, fin?: string): number {
  if (!debut || !fin) return 1;
  const d1 = new Date(debut.slice(0, 10));
  const d2 = new Date(fin.slice(0, 10));
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

interface SallesManagerProps {
  seminaireId: number;
  showCombinedGenerate?: boolean;
}

type SalleOption = Salle & { lieuNom: string; lieuVille: string };

export default function SallesManager({ seminaireId, showCombinedGenerate }: SallesManagerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddSeminaireSalleDto>({
    salleId: 0,
    nom: '',
    dateDebut: '',
    dateFin: '',
    nombreHeures: undefined,
    prix: undefined,
  });

  const { data: listResp, isLoading } = useQuery({
    queryKey: ['seminaire-salles', seminaireId],
    queryFn: () => api.seminaires.listSalles(seminaireId),
  });

  const { data: lieuxResp } = useQuery({
    queryKey: ['catalog-lieux'],
    queryFn: () => api.lieux.list(100, 1),
    enabled: addOpen,
  });

  const salles = extractArray<SeminaireSalle>(listResp);
  const lieux = extractArray<Lieu>(lieuxResp);
  const salleOptions: SalleOption[] = lieux.flatMap((lieu) =>
    (lieu.salles || []).map((s) => ({ ...s, lieuNom: lieu.nom, lieuVille: lieu.ville }))
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['seminaire-salles', seminaireId] });
    queryClient.invalidateQueries({ queryKey: ['seminaire-detail', seminaireId] });
  };

  const addMutation = useMutation({
    mutationFn: (data: AddSeminaireSalleDto) => api.seminaires.addSalle(seminaireId, data),
    onSuccess: () => {
      toast.success('Salle ajoutée');
      setAddOpen(false);
      setForm({ salleId: 0, nom: '', dateDebut: '', dateFin: '', nombreHeures: undefined, prix: undefined });
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (rowId: number) => api.seminaires.removeSalle(seminaireId, rowId),
    onSuccess: () => {
      toast.success('Salle retirée');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.seminaires.generateActivitesSallesReservations(seminaireId),
    onSuccess: (res: any) => {
      const data = res?.data ?? res;
      toast.success(data?.message || 'Réservations générées');
      queryClient.invalidateQueries({ queryKey: ['seminaire-detail', seminaireId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePick = (val: string) => {
    const item = salleOptions.find((s) => String(s.id) === val);
    if (item) {
      // prix calculé automatiquement au submit (tarif × durée) — pas de saisie manuelle
      setForm((p) => ({ ...p, salleId: item.id, nom: `${item.nom} — ${item.lieuNom}`, prix: undefined }));
    }
  };

  const memeJour = isSameDay(form.dateDebut, form.dateFin);
  const pickedSalle = salleOptions.find((s) => s.id === form.salleId);
  // Prix calculé automatiquement : tarif horaire × heures (même jour) ou tarif journalier × jours
  const prixCalcule: number | undefined = (() => {
    if (!pickedSalle) return undefined;
    if (memeJour) return (pickedSalle.prixParHeure || 0) * (form.nombreHeures || 0);
    return (pickedSalle.prixParJour || 0) * nombreJours(form.dateDebut, form.dateFin);
  })();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.salleId || !form.nom.trim()) {
      toast.error('Sélectionnez une salle du catalogue.');
      return;
    }
    if (memeJour && !form.nombreHeures) {
      toast.error('Indiquez le nombre d’heures.');
      return;
    }
    addMutation.mutate({
      ...form,
      nombreHeures: memeJour ? form.nombreHeures : undefined,
      prix: prixCalcule,
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Salles du séminaire</h3>
        <div className="flex gap-2 flex-wrap">
          {showCombinedGenerate && (
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-2 rounded-xl"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Générer réservations (activités + salles)
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 rounded-xl font-bold gap-2">
                <Plus className="w-4 h-4" />
                Ajouter une salle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold text-[#171c1f]" style={MANROPE}>
                  Ajouter une salle
                </DialogTitle>
                <DialogDescription className="text-[#585e6c]">
                  Parcourez le catalogue partenaire, choisissez une salle puis définissez le créneau.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-5 mt-4">
                {/* Grille de cartes salle */}
                {salleOptions.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-7 h-7 animate-spin text-[#E04A1F]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[42vh] overflow-y-auto pr-1">
                    {salleOptions.map((s) => {
                      const selected = form.salleId === s.id;
                      const img = s.images?.[0]
                        ? `https://dev.api.mysubito.net/api/catalog/uploads/salles/${s.images[0]}`
                        : null;
                      return (
                        <div
                          key={s.id}
                          className={`rounded-2xl border-2 overflow-hidden transition-all ${
                            selected ? 'border-[#E04A1F] ring-2 ring-[#E04A1F]/20' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <button type="button" onClick={() => handlePick(String(s.id))} className="w-full text-left block">
                            <div className="h-28 bg-slate-100 relative">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={img}
                                  alt={s.nom}
                                  className="w-full h-full object-cover"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2 className="w-8 h-8 text-slate-300" />
                                </div>
                              )}
                              {selected && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E04A1F] flex items-center justify-center shadow">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="font-bold text-sm text-[#171c1f] truncate">{s.nom}</p>
                              <p className="text-xs text-[#585e6c] flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {s.lieuNom}
                                {s.lieuVille ? `, ${s.lieuVille}` : ''}
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-2">
                                {s.capacite ? (
                                  <span className="text-xs text-[#585e6c] flex items-center gap-0.5">
                                    <Users className="w-3 h-3" />
                                    {s.capacite}
                                  </span>
                                ) : (
                                  <span />
                                )}
                                <span className="text-xs font-bold text-[#E04A1F]">
                                  {FCFA(s.prixParHeure || s.prixParJour)}
                                  <span className="text-[#585e6c] font-normal">{s.prixParHeure ? '/h' : '/j'}</span>
                                </span>
                              </div>
                            </div>
                          </button>
                          <div className="px-3 pb-3">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/service-reservations/salle/${s.id}?seminaireId=${seminaireId}&returnTo=${encodeURIComponent(
                                    `/seminaires/${seminaireId}?tab=salles`
                                  )}`
                                )
                              }
                              className="w-full flex items-center justify-center gap-1 text-xs font-bold text-[#E04A1F] hover:underline py-1.5"
                            >
                              Voir la fiche complète
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Créneau (une fois choisie) */}
                {form.salleId > 0 && (
                  <div className="rounded-2xl bg-[#f0f4f8] border border-slate-100 p-4 space-y-4">
                    <p className="text-sm font-bold text-[#171c1f]">
                      Sélectionnée : <span className="text-[#E04A1F]">{form.nom}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-[#171c1f]">Début</Label>
                        <Input
                          type="datetime-local"
                          value={form.dateDebut || ''}
                          onChange={(e) => setForm((p) => ({ ...p, dateDebut: e.target.value }))}
                          className="mt-1.5 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-[#171c1f]">Fin</Label>
                        <Input
                          type="datetime-local"
                          value={form.dateFin || ''}
                          onChange={(e) => setForm((p) => ({ ...p, dateFin: e.target.value }))}
                          className="mt-1.5 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      {memeJour ? (
                        <div>
                          <Label className="text-sm font-bold text-[#171c1f]">Nombre d&apos;heures</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.nombreHeures ?? ''}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, nombreHeures: e.target.value ? Number(e.target.value) : undefined }))
                            }
                            className="mt-1.5 rounded-xl border-slate-200 bg-white"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-sm font-bold text-[#171c1f]">Durée</Label>
                          <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11 flex items-center text-sm font-semibold text-[#171c1f]">
                            {nombreJours(form.dateDebut, form.dateFin)} jour
                            {nombreJours(form.dateDebut, form.dateFin) > 1 ? 's' : ''} · facturation à la journée
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-bold text-[#171c1f]">Prix estimé</Label>
                        <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11 flex items-center text-sm font-bold text-[#E04A1F]">
                          {prixCalcule ? FCFA(prixCalcule) : '—'}
                        </div>
                      </div>
                    </div>
                    {pickedSalle && (
                      <p className="text-xs text-[#585e6c]">
                        Calculé automatiquement :{' '}
                        {memeJour
                          ? `${FCFA(pickedSalle.prixParHeure)} × ${form.nombreHeures || 0} h`
                          : `${FCFA(pickedSalle.prixParJour)} × ${nombreJours(form.dateDebut, form.dateFin)} jour${
                              nombreJours(form.dateDebut, form.dateFin) > 1 ? 's' : ''
                            }`}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={addMutation.isPending || !form.salleId}
                  className="w-full bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 rounded-2xl font-bold gap-2 disabled:opacity-50"
                >
                  {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ajouter au séminaire
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F]" />
        </div>
      ) : salles.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm text-[#585e6c]">Aucune salle réservée</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {salles.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[#f0f4f8] border border-slate-100"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#E04A1F]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#171c1f] truncate">{s.nom}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#585e6c]">
                  {s.dateDebut && (
                    <span>
                      {format(new Date(s.dateDebut), 'dd MMM · HH:mm', { locale: fr })}
                      {s.dateFin ? ` → ${format(new Date(s.dateFin), 'HH:mm', { locale: fr })}` : ''}
                    </span>
                  )}
                  {s.nombreHeures != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.nombreHeures}h
                    </span>
                  )}
                  <span className="font-semibold text-[#E04A1F]">{FCFA(s.prix)}</span>
                </div>
              </div>
              <button
                onClick={() => removeMutation.mutate(s.id)}
                disabled={removeMutation.isPending}
                className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
