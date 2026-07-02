'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bus, RefreshCw, ShieldCheck, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, SeminaireTransfert, SeminaireParticipant } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

interface NavetteManagerProps {
  seminaireId: number;
  transferts: SeminaireTransfert[];
  participants: SeminaireParticipant[];
  autoConfirm?: boolean;
}

export default function NavetteManager({ seminaireId, transferts, participants }: NavetteManagerProps) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['seminaire-detail', seminaireId] });
  };

  const regenerateMutation = useMutation({
    mutationFn: () => api.seminaires.regenerateTransferts(seminaireId),
    onSuccess: (res: any) => {
      const data = res?.data ?? res;
      toast.success(data?.message || 'Transferts recalculés');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const validateMutation = useMutation({
    mutationFn: () => api.seminaires.validateTransferts(seminaireId),
    onSuccess: (res: any) => {
      const data = res?.data ?? res;
      toast.success(data?.message || 'Transferts verrouillés et réservations générées');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const participantName = (id: number) => {
    const p = participants.find((x) => x.id === id);
    return p ? `${p.prenom} ${p.nom}` : `Participant #${id}`;
  };

  const statutColor = (statut: string) => {
    const k = (statut || '').toLowerCase();
    if (k === 'draft') return 'bg-slate-100 text-slate-600';
    if (k === 'locked' || k === 'verrouille' || k === 'confirmed') return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  };

  const sensLabel = (sens: string) => {
    const k = (sens || '').toLowerCase();
    if (k === 'aller' || k === 'arrival') return 'Aller';
    if (k === 'retour' || k === 'departure') return 'Retour';
    return sens;
  };

  const statutLabel = (statut: string) => {
    const k = (statut || '').toLowerCase();
    const map: Record<string, string> = {
      draft: 'Brouillon',
      locked: 'Verrouillé',
      verrouille: 'Verrouillé',
      confirmed: 'Confirmé',
      reserved: 'Réservé',
      booked: 'Réservé',
      pending: 'En attente',
      cancelled: 'Annulé',
    };
    return map[k] || statut;
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-2">
          Regroupement & génération navette
        </h3>
        <p className="text-sm text-[#585e6c] mb-6">
          Recalculez les transferts pour regrouper les participants partageant le même vol et la même
          destination, puis verrouillez-les pour générer les réservations navette.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="gap-2 rounded-xl"
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Recalculer les transferts
          </Button>
          <Button
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending || transferts.length === 0}
            className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 rounded-xl font-bold gap-2"
          >
            {validateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Verrouiller & générer les réservations
          </Button>
        </div>
      </div>

      {/* Transferts */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Transferts</h3>
          <Badge className="bg-slate-100 text-slate-600 border-0">{transferts.length}</Badge>
        </div>

        {transferts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Bus className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm text-[#585e6c]">
              Aucun transfert. Cliquez sur « Recalculer les transferts » une fois les participants inscrits.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transferts.map((t) => (
              <div key={t.id} className="rounded-2xl bg-[#f0f4f8] border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-white/60">
                  <span className="flex items-center gap-2 font-bold text-sm text-[#171c1f]" style={MANROPE}>
                    <Bus className="w-4 h-4 text-[#E04A1F]" />
                    Trajet {sensLabel(t.sens)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statutColor(t.statut)} border-0`}>{statutLabel(t.statut)}</Badge>
                    {t.bookingId && (
                      <Badge className="bg-green-100 text-green-700 border-0">Réservé #{t.bookingId}</Badge>
                    )}
                  </div>
                </div>
                {t.arrets?.length > 0 && (
                  <ol className="p-4 space-y-2">
                    {[...t.arrets]
                      .sort((a, b) => a.ordre - b.ordre)
                      .map((arret) => (
                        <li key={arret.id} className="flex items-start gap-3 text-sm">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              arret.type === 'pickup'
                                ? 'bg-[#ffdbd0] text-[#E04A1F]'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {arret.ordre}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#171c1f]">
                              {arret.type === 'pickup' ? 'Prise en charge' : 'Dépose'} ·{' '}
                              {participantName(arret.participantId)}
                            </p>
                            <p className="text-xs text-[#585e6c] flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {arret.adresse}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
