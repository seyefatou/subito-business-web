'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Hotel,
  Plus,
  Trash2,
  Loader2,
  Users,
  CheckCircle2,
  Bed,
  MapPin,
  Star,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  api,
  SeminaireLogement,
  SeminaireParticipant,
  Logement,
  AddSeminaireLogementDto,
} from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };
const FCFA = (n?: number | string | null) => (n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—');

function extractArray<T>(response: unknown): T[] {
  const raw = response as any;
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  return [];
}

interface LogementsManagerProps {
  seminaireId: number;
  participants: SeminaireParticipant[];
  dateDebut?: string;
  dateFin?: string;
}

// Nombre de nuits entre deux dates (arrivée → départ)
function nombreNuits(debut?: string, fin?: string): number {
  if (!debut || !fin) return 1;
  const d1 = new Date(debut.slice(0, 10));
  const d2 = new Date(fin.slice(0, 10));
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export default function LogementsManager({ seminaireId, participants, dateDebut, dateFin }: LogementsManagerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddSeminaireLogementDto>({ logementId: 0, nom: '', capacite: 2, prix: undefined });

  const { data: logementsResp, isLoading } = useQuery({
    queryKey: ['seminaire-logements', seminaireId],
    queryFn: () => api.seminaires.listLogements(seminaireId),
  });

  const { data: catalogResp } = useQuery({
    queryKey: ['catalog-logements'],
    queryFn: () => api.logements.listPublic(1, 100),
    enabled: addOpen,
  });

  const logements = extractArray<SeminaireLogement>(logementsResp);
  const catalog = extractArray<Logement>(catalogResp);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['seminaire-logements', seminaireId] });
    queryClient.invalidateQueries({ queryKey: ['seminaire-detail', seminaireId] });
  };

  const addMutation = useMutation({
    mutationFn: (data: AddSeminaireLogementDto) => api.seminaires.addLogement(seminaireId, data),
    onSuccess: () => {
      toast.success('Logement ajouté');
      setAddOpen(false);
      setForm({ logementId: 0, nom: '', capacite: 2, prix: undefined });
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (rowId: number) => api.seminaires.removeLogement(seminaireId, rowId),
    onSuccess: () => {
      toast.success('Logement retiré');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.seminaires.generateLogementReservations(seminaireId),
    onSuccess: (res: any) => {
      const data = res?.data ?? res;
      toast.success(data?.message || 'Réservations de logement générées');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: ({ participantId, logementRowId }: { participantId: number; logementRowId: number | null }) =>
      api.seminaires.assignParticipantLogement(seminaireId, participantId, logementRowId),
    onSuccess: () => {
      toast.success('Affectation mise à jour');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePickCatalog = (val: string) => {
    const item = catalog.find((l) => String(l.id) === val);
    if (item) {
      // prix calculé automatiquement (prix/nuit × nuits) — pas de saisie manuelle
      setForm({
        logementId: item.id,
        nom: item.nom,
        capacite: item.capacite || 2,
        prix: undefined,
      });
    }
  };

  const nuits = nombreNuits(dateDebut, dateFin);
  const pickedLogement = catalog.find((l) => l.id === form.logementId);
  // Prix estimé : prix/nuit × nombre de nuits du séminaire
  const prixCalcule: number | undefined = pickedLogement?.prixParNuit
    ? pickedLogement.prixParNuit * nuits
    : undefined;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.logementId || !form.nom.trim()) {
      toast.error('Sélectionnez un logement du catalogue.');
      return;
    }
    addMutation.mutate({ ...form, prix: prixCalcule });
  };

  const logementName = (rowId?: number | null) => {
    if (!rowId) return null;
    return logements.find((l) => l.id === rowId)?.nom;
  };

  return (
    <div className="space-y-6">
      {/* En-tête + actions */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">
            Logements du séminaire
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || logements.length === 0}
              className="gap-2 rounded-xl"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Générer les réservations
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 rounded-xl font-bold gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter un logement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-extrabold text-[#171c1f]" style={MANROPE}>
                    Ajouter un logement
                  </DialogTitle>
                  <DialogDescription className="text-[#585e6c]">
                    Parcourez le catalogue partenaire, choisissez un hébergement puis définissez la capacité pour le séminaire.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-5 mt-4">
                  {/* Grille de cartes logement */}
                  {catalog.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-7 h-7 animate-spin text-[#E04A1F]" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[42vh] overflow-y-auto pr-1">
                      {catalog.map((l) => {
                        const selected = form.logementId === l.id;
                        const img = l.images?.[0];
                        return (
                          <div
                            key={l.id}
                            className={`rounded-2xl border-2 overflow-hidden transition-all ${
                              selected
                                ? 'border-[#E04A1F] ring-2 ring-[#E04A1F]/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handlePickCatalog(String(l.id))}
                              className="w-full text-left block"
                            >
                            <div className="h-28 bg-slate-100 relative">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt={l.nom} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Hotel className="w-8 h-8 text-slate-300" />
                                </div>
                              )}
                              {selected && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E04A1F] flex items-center justify-center shadow">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {l.nbreEtoiles ? (
                                <div className="absolute bottom-2 left-2 flex items-center gap-0.5 bg-black/60 rounded-full px-2 py-0.5">
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                  <span className="text-[11px] font-bold text-white">{l.nbreEtoiles}</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="p-3">
                              <p className="font-bold text-sm text-[#171c1f] truncate">{l.nom}</p>
                              {l.ville && (
                                <p className="text-xs text-[#585e6c] flex items-center gap-1 mt-0.5 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {l.ville}
                                  {l.pays ? `, ${l.pays}` : ''}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="text-xs text-[#585e6c] flex items-center gap-2">
                                  {l.capacite ? (
                                    <span className="flex items-center gap-0.5">
                                      <Users className="w-3 h-3" />
                                      {l.capacite}
                                    </span>
                                  ) : null}
                                  {l.nbreChambres ? (
                                    <span className="flex items-center gap-0.5">
                                      <Bed className="w-3 h-3" />
                                      {l.nbreChambres}
                                    </span>
                                  ) : null}
                                </span>
                                {l.prixParNuit ? (
                                  <span className="text-xs font-bold text-[#E04A1F]">
                                    {FCFA(l.prixParNuit)}
                                    <span className="text-[#585e6c] font-normal">/nuit</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            </button>
                            <div className="px-3 pb-3">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/service-reservations/logement/${l.id}?seminaireId=${seminaireId}&returnTo=${encodeURIComponent(
                                      `/seminaires/${seminaireId}?tab=logement`
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

                  {/* Configuration (une fois un logement choisi) */}
                  {form.logementId > 0 && (
                    <div className="rounded-2xl bg-[#f0f4f8] border border-slate-100 p-4 space-y-4">
                      <p className="text-sm font-bold text-[#171c1f]">
                        Sélectionné : <span className="text-[#E04A1F]">{form.nom}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-bold text-[#171c1f]">Capacité (participants)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.capacite}
                            onChange={(e) => setForm((p) => ({ ...p, capacite: Number(e.target.value) || 1 }))}
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
                      {pickedLogement?.prixParNuit ? (
                        <p className="text-xs text-[#585e6c]">
                          Calculé automatiquement : {FCFA(pickedLogement.prixParNuit)} × {nuits} nuit
                          {nuits > 1 ? 's' : ''}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={addMutation.isPending || !form.logementId}
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
        ) : logements.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Hotel className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm text-[#585e6c]">Aucun logement ajouté</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {logements.map((l) => (
              <div key={l.id} className="rounded-2xl bg-[#f0f4f8] border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <Bed className="w-4 h-4 text-[#E04A1F]" />
                    </div>
                    <p className="font-bold text-sm text-[#171c1f] truncate">{l.nom}</p>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(l.id)}
                    disabled={removeMutation.isPending}
                    className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
                  <Badge className="bg-white text-slate-600 border border-slate-200 gap-1">
                    <Users className="w-3 h-3" />
                    {l.affectes ?? l.capacite - l.placesRestantes}/{l.capacite} occupées
                  </Badge>
                  {l.placesRestantes <= 0 ? (
                    <Badge className="bg-red-100 text-red-700 border-0">Complet</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      {l.placesRestantes} place{l.placesRestantes > 1 ? 's' : ''} restante{l.placesRestantes > 1 ? 's' : ''}
                    </Badge>
                  )}
                  <span className="font-semibold text-[#E04A1F]">{FCFA(l.prix)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Affectation des participants */}
      {logements.length > 0 && participants.length > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-6">
            Affectation des participants
          </h3>
          <div className="space-y-3">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#f0f4f8] border border-slate-100"
              >
                <div className="w-9 h-9 rounded-xl gradient-subito flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {`${p.prenom?.[0] || ''}${p.nom?.[0] || ''}`.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-[#171c1f] truncate">
                    {p.prenom} {p.nom}
                  </p>
                  {p.seminaireLogementId && (
                    <p className="text-xs text-emerald-600">{logementName(p.seminaireLogementId)}</p>
                  )}
                </div>
                <Select
                  value={p.seminaireLogementId ? String(p.seminaireLogementId) : 'none'}
                  onValueChange={(val) =>
                    assignMutation.mutate({
                      participantId: p.id,
                      logementRowId: val === 'none' ? null : Number(val),
                    })
                  }
                >
                  <SelectTrigger className="w-[200px] rounded-xl border-slate-200 h-10 bg-white shrink-0">
                    <SelectValue placeholder="Non affecté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non affecté</SelectItem>
                    {logements.map((l) => (
                      <SelectItem
                        key={l.id}
                        value={String(l.id)}
                        disabled={l.placesRestantes <= 0 && p.seminaireLogementId !== l.id}
                      >
                        {l.nom} —{' '}
                        {l.placesRestantes > 0
                          ? `${l.placesRestantes} place${l.placesRestantes > 1 ? 's' : ''} restante${l.placesRestantes > 1 ? 's' : ''}`
                          : 'complet'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
