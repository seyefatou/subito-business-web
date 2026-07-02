'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Plus,
  Presentation,
  Calendar,
  Users,
  Bus,
  Loader2,
  AlertCircle,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, SeminaireListItem, CreateSeminaireDto } from '@/lib/api';
import SeminaireForm from '@/components/seminaires/SeminaireForm';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const statutLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-600' },
  open: { label: 'Ouvert', color: 'bg-green-100 text-green-700' },
  published: { label: 'Publié', color: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Fermé', color: 'bg-red-100 text-red-700' },
};

const paysLabels: Record<string, string> = {
  senegal: 'Sénégal',
  cote_ivoire: "Côte d'Ivoire",
};

function extractList(response: unknown): SeminaireListItem[] {
  const raw = response as any;
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload as SeminaireListItem[];
  if (Array.isArray(payload?.data)) return payload.data as SeminaireListItem[];
  if (Array.isArray(payload?.items)) return payload.items as SeminaireListItem[];
  return [];
}

export default function SeminairesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['seminaires'],
    queryFn: () => api.seminaires.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSeminaireDto) => api.seminaires.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seminaires'] });
      toast.success('Séminaire créé avec succès');
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const seminaires = extractList(response);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Événements</span>
            <span>/</span>
            <span className="text-[#E04A1F]">Séminaires</span>
          </nav>
          <h1
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f] leading-tight"
            style={MANROPE}
          >
            Séminaires
          </h1>
          <p className="text-[#585e6c] font-medium mt-1">
            Organisez vos événements d&apos;entreprise et gérez les inscriptions
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 px-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2">
              <Plus className="w-4 h-4" />
              Nouveau séminaire
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-[#171c1f]" style={MANROPE}>
                Créer un séminaire
              </DialogTitle>
              <DialogDescription className="text-[#585e6c]">
                Configurez votre événement. Un lien d&apos;inscription et un code seront générés automatiquement.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <SeminaireForm
                onSubmit={(values) => createMutation.mutate(values)}
                onCancel={() => setDialogOpen(false)}
                isSubmitting={createMutation.isPending}
                submitLabel="Créer le séminaire"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <p className="font-bold text-[#171c1f]" style={MANROPE}>
            Une erreur est survenue
          </p>
          <p className="text-sm text-[#585e6c] mt-1">{(error as Error).message}</p>
        </div>
      ) : seminaires.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
            <Presentation className="w-10 h-10 text-[#E04A1F]" />
          </div>
          <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>
            Aucun séminaire
          </p>
          <p className="text-sm text-[#585e6c] mt-1 mb-6">
            Créez votre premier séminaire pour démarrer
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 rounded-2xl font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau séminaire
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {seminaires.map((sem) => {
            const statut = statutLabels[sem.statut] || { label: sem.statut, color: 'bg-slate-100 text-slate-600' };
            const services = [
              sem.serviceNavette && 'Navette',
              sem.serviceLogement && 'Logement',
              sem.serviceActivite && 'Activité',
              sem.serviceSalle && 'Salle',
            ].filter(Boolean) as string[];
            return (
              <Link key={sem.id} href={`/seminaires/${sem.id}`}>
                <div className="bg-white rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-[0_8px_24px_rgba(23,28,31,0.08)] transition-all overflow-hidden cursor-pointer h-full flex flex-col group">
                  {/* Top */}
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
                        <Presentation className="w-6 h-6 text-[#E04A1F]" />
                      </div>
                      <Badge className={`${statut.color} border-0 px-3 py-1`}>{statut.label}</Badge>
                    </div>

                    <div>
                      <h3
                        className="font-extrabold text-lg text-[#171c1f] line-clamp-2 group-hover:text-[#E04A1F] transition-colors"
                        style={MANROPE}
                      >
                        {sem.nom}
                      </h3>
                      {sem.description && (
                        <p className="text-sm text-[#585e6c] mt-1 line-clamp-2">{sem.description}</p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-[#585e6c]">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>
                          {format(new Date(sem.dateDebut), 'dd MMM', { locale: fr })} →{' '}
                          {format(new Date(sem.dateFin), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#585e6c]">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{paysLabels[sem.pays] || sem.pays}</span>
                      </div>
                    </div>

                    {services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {services.map((s) => (
                          <span
                            key={s}
                            className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-[#585e6c]">
                        <Users className="w-4 h-4" />
                        <span className="font-bold text-[#171c1f]">{sem._count?.participants ?? 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[#585e6c]">
                        <Bus className="w-4 h-4" />
                        <span className="font-bold text-[#171c1f]">{sem._count?.transferts ?? 0}</span>
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#E04A1F] transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
