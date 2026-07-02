'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Compass,
  Plus,
  Trash2,
  Loader2,
  Users,
  Calendar,
  CheckCircle2,
  MapPin,
  Clock,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { api, SeminaireActivite, Activite, AddSeminaireActiviteDto } from '@/lib/api';

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

interface ActivitesManagerProps {
  seminaireId: number;
  defaultPax?: number;
  showCombinedGenerate?: boolean;
}

export default function ActivitesManager({ seminaireId, defaultPax, showCombinedGenerate }: ActivitesManagerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddSeminaireActiviteDto>({
    activiteId: 0,
    nom: '',
    dateDebut: '',
    nombrePersonnes: defaultPax,
    prix: undefined,
  });

  const { data: listResp, isLoading } = useQuery({
    queryKey: ['seminaire-activites', seminaireId],
    queryFn: () => api.seminaires.listActivites(seminaireId),
  });

  const { data: catalogResp } = useQuery({
    queryKey: ['catalog-activites'],
    queryFn: () => api.activites.listPublic(1, 100),
    enabled: addOpen,
  });

  const activites = extractArray<SeminaireActivite>(listResp);
  const catalog = extractArray<Activite>(catalogResp);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['seminaire-activites', seminaireId] });
    queryClient.invalidateQueries({ queryKey: ['seminaire-detail', seminaireId] });
  };

  const addMutation = useMutation({
    mutationFn: (data: AddSeminaireActiviteDto) => api.seminaires.addActivite(seminaireId, data),
    onSuccess: () => {
      toast.success('Activité ajoutée');
      setAddOpen(false);
      setForm({ activiteId: 0, nom: '', dateDebut: '', nombrePersonnes: defaultPax, prix: undefined });
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (rowId: number) => api.seminaires.removeActivite(seminaireId, rowId),
    onSuccess: () => {
      toast.success('Activité retirée');
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
    const item = catalog.find((a) => String(a.id) === val);
    if (item) {
      // prix calculé automatiquement (forfait ou prix × personnes) — pas de saisie manuelle
      setForm((p) => ({ ...p, activiteId: item.id, nom: item.titre, prix: undefined }));
    }
  };

  const pickedActivite = catalog.find((a) => a.id === form.activiteId);
  // Prix estimé : × personnes si tarif par personne, sinon forfait
  const prixCalcule: number | undefined = (() => {
    if (!pickedActivite?.prix) return undefined;
    if (pickedActivite.typeTarification === 'PAR_PERSONNE') {
      return pickedActivite.prix * (form.nombrePersonnes || 1);
    }
    return pickedActivite.prix;
  })();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activiteId || !form.nom.trim()) {
      toast.error('Sélectionnez une activité du catalogue.');
      return;
    }
    addMutation.mutate({ ...form, prix: prixCalcule });
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Activités du séminaire</h3>
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
              Ajouter une activité
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-[#171c1f]" style={MANROPE}>
                Ajouter une activité
              </DialogTitle>
              <DialogDescription className="text-[#585e6c]">
                Parcourez le catalogue partenaire, choisissez une activité puis programmez-la.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-5 mt-4">
              {/* Grille de cartes activité */}
              {catalog.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-7 h-7 animate-spin text-[#E04A1F]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[42vh] overflow-y-auto pr-1">
                  {catalog.map((a) => {
                    const selected = form.activiteId === a.id;
                    const img = a.images?.[0];
                    return (
                      <div
                        key={a.id}
                        className={`rounded-2xl border-2 overflow-hidden transition-all ${
                          selected ? 'border-[#E04A1F] ring-2 ring-[#E04A1F]/20' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <button type="button" onClick={() => handlePick(String(a.id))} className="w-full text-left block">
                          <div className="h-28 bg-slate-100 relative">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={a.titre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Compass className="w-8 h-8 text-slate-300" />
                              </div>
                            )}
                            {selected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E04A1F] flex items-center justify-center shadow">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-bold text-sm text-[#171c1f] truncate">{a.titre}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[#585e6c]">
                              {a.ville && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {a.ville}
                                </span>
                              )}
                              {a.duree && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {a.duree}
                                </span>
                              )}
                            </div>
                            {a.prix ? <p className="text-xs font-bold text-[#E04A1F] mt-1">{FCFA(a.prix)}</p> : null}
                          </div>
                        </button>
                        <div className="px-3 pb-3">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/service-reservations/activite-detail/${a.id}?seminaireId=${seminaireId}&returnTo=${encodeURIComponent(
                                  `/seminaires/${seminaireId}?tab=activites`
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

              {/* Programmation (une fois choisie) */}
              {form.activiteId > 0 && (
                <div className="rounded-2xl bg-[#f0f4f8] border border-slate-100 p-4 space-y-4">
                  <p className="text-sm font-bold text-[#171c1f]">
                    Sélectionnée : <span className="text-[#E04A1F]">{form.nom}</span>
                  </p>
                  <div>
                    <Label className="text-sm font-bold text-[#171c1f]">Date & heure</Label>
                    <Input
                      type="datetime-local"
                      value={form.dateDebut || ''}
                      onChange={(e) => setForm((p) => ({ ...p, dateDebut: e.target.value }))}
                      className="mt-1.5 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-bold text-[#171c1f]">Nombre de personnes</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.nombrePersonnes ?? ''}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, nombrePersonnes: e.target.value ? Number(e.target.value) : undefined }))
                        }
                        className="mt-1.5 rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-[#171c1f]">Prix estimé</Label>
                      <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11 flex items-center text-sm font-bold text-[#E04A1F]">
                        {prixCalcule ? FCFA(prixCalcule) : '—'}
                      </div>
                    </div>
                  </div>
                  {pickedActivite?.prix ? (
                    <p className="text-xs text-[#585e6c]">
                      Calculé automatiquement :{' '}
                      {pickedActivite.typeTarification === 'PAR_PERSONNE'
                        ? `${FCFA(pickedActivite.prix)} × ${form.nombrePersonnes || 1} pers.`
                        : `${FCFA(pickedActivite.prix)} (forfait)`}
                    </p>
                  ) : null}
                </div>
              )}

              <Button
                type="submit"
                disabled={addMutation.isPending || !form.activiteId}
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
      ) : activites.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <Compass className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm text-[#585e6c]">Aucune activité programmée</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {activites.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[#f0f4f8] border border-slate-100"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-[#E04A1F]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#171c1f] truncate">{a.nom}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#585e6c]">
                  {a.dateDebut && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(a.dateDebut), 'dd MMM yyyy · HH:mm', { locale: fr })}
                    </span>
                  )}
                  {a.nombrePersonnes != null && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {a.nombrePersonnes} pers.
                    </span>
                  )}
                  <span className="font-semibold text-[#E04A1F]">{FCFA(a.prix)}</span>
                </div>
              </div>
              <button
                onClick={() => removeMutation.mutate(a.id)}
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
