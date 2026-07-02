'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  Bus,
  Hotel,
  Compass,
  Building2,
  Pencil,
  Copy,
  Share2,
  Link2,
  KeyRound,
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plane,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { api, SeminaireDetail, UpdateSeminaireDto } from '@/lib/api';
import SeminaireForm from '@/components/seminaires/SeminaireForm';
import ParticipantsManager from '@/components/seminaires/ParticipantsManager';
import NavetteManager from '@/components/seminaires/NavetteManager';
import LogementsManager from '@/components/seminaires/LogementsManager';
import ActivitesManager from '@/components/seminaires/ActivitesManager';
import SallesManager from '@/components/seminaires/SallesManager';

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

function unwrap(response: unknown): SeminaireDetail | undefined {
  const raw = response as any;
  if (raw?.data && typeof raw.data === 'object' && 'id' in raw.data) return raw.data as SeminaireDetail;
  if (raw && typeof raw === 'object' && 'id' in raw) return raw as SeminaireDetail;
  return undefined;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shrink-0"
    >
      <Copy className="w-3.5 h-3.5" />
      Copier
    </button>
  );
}

const TAB_TRIGGER =
  'data-[state=active]:bg-white data-[state=active]:text-[#E04A1F] data-[state=active]:font-bold rounded-lg px-4 gap-2';

export default function SeminaireDetailPage() {
  return (
    <Suspense fallback={null}>
      <SeminaireDetailInner />
    </Suspense>
  );
}

function SeminaireDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const id = parseInt(params?.id || '', 10);
  const initialTab = searchParams.get('tab') || 'overview';

  const [editOpen, setEditOpen] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      setOrigin(window.location.origin + basePath);
    }
  }, []);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['seminaire-detail', id],
    queryFn: () => api.seminaires.get(id),
    enabled: !isNaN(id),
  });

  const sem = unwrap(response);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSeminaireDto) => api.seminaires.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seminaire-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['seminaires'] });
      toast.success('Séminaire mis à jour');
      setEditOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isNaN(id)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Identifiant invalide</p>
        <Button variant="outline" onClick={() => router.push('/seminaires')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (error || !sem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Séminaire introuvable</p>
        <Button variant="outline" onClick={() => router.push('/seminaires')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  const statut = statutLabels[sem.statut] || { label: sem.statut, color: 'bg-slate-100 text-slate-600' };
  const publicLink = sem.publicSlug ? `${origin}/inscription/${sem.publicSlug}` : '';
  const isOpen = sem.statut === 'open' || sem.statut === 'published';

  const services = [
    { active: sem.serviceNavette, icon: Bus, label: 'Navette' },
    { active: sem.serviceLogement, icon: Hotel, label: 'Logement' },
    { active: sem.serviceActivite, icon: Compass, label: 'Activité' },
    { active: sem.serviceSalle, icon: Building2, label: 'Salle' },
  ];

  const participants = sem.participants || [];
  const transferts = sem.transferts || [];

  const toggleStatut = () => {
    updateMutation.mutate({ statut: isOpen ? 'closed' : 'open' });
  };

  const handleShareLink = () => {
    if (!publicLink) return;
    const text = `Inscrivez-vous au séminaire "${sem.nom}".\nLien : ${publicLink}\nCode de validation : ${sem.validationCode}`;
    if (navigator.share) {
      navigator.share({ title: sem.nom, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Invitation copiée');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 -ml-2 text-slate-600 hover:text-[#E04A1F]"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/seminaires" className="hover:text-[#E04A1F] font-medium transition-colors">
              Séminaires
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#E04A1F] font-semibold truncate">{sem.nom}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f]" style={MANROPE}>
              {sem.nom}
            </h1>
            <Badge className={`${statut.color} border-0 px-3 py-1`}>{statut.label}</Badge>
          </div>
          {sem.description && <p className="text-[#585e6c] font-medium mt-2">{sem.description}</p>}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={toggleStatut}
            disabled={updateMutation.isPending}
            className="gap-2 rounded-xl"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOpen ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            {isOpen ? 'Fermer les inscriptions' : 'Ouvrir les inscriptions'}
          </Button>
          <Button
            onClick={() => setEditOpen(true)}
            className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 rounded-xl font-bold gap-2"
          >
            <Pencil className="w-4 h-4" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="bg-[#f0f4f8] p-1.5 rounded-xl flex-wrap h-auto justify-start">
          <TabsTrigger value="overview" className={TAB_TRIGGER}>
            Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="participants" className={TAB_TRIGGER}>
            <Users className="w-4 h-4" />
            Participants
            <Badge className="bg-slate-200 text-slate-600 border-0 ml-1">{participants.length}</Badge>
          </TabsTrigger>
          {sem.serviceNavette && (
            <TabsTrigger value="navette" className={TAB_TRIGGER}>
              <Bus className="w-4 h-4" />
              Navette
            </TabsTrigger>
          )}
          {sem.serviceLogement && (
            <TabsTrigger value="logement" className={TAB_TRIGGER}>
              <Hotel className="w-4 h-4" />
              Logement
            </TabsTrigger>
          )}
          {sem.serviceActivite && (
            <TabsTrigger value="activites" className={TAB_TRIGGER}>
              <Compass className="w-4 h-4" />
              Activités
            </TabsTrigger>
          )}
          {sem.serviceSalle && (
            <TabsTrigger value="salles" className={TAB_TRIGGER}>
              <Building2 className="w-4 h-4" />
              Salles
            </TabsTrigger>
          )}
        </TabsList>

        {/* ---- Vue d'ensemble ---- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Share */}
            <div className="lg:col-span-7">
              <section className="bg-gradient-to-br from-[#E04A1F] to-[#C8330F] rounded-3xl p-6 md:p-8 text-white shadow-[0_8px_24px_rgba(224,74,31,0.25)]">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-5 h-5" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Inscription des participants</h3>
                </div>
                <p className="text-white/80 text-sm mb-6">
                  Partagez ce lien et ce code à vos participants pour qu&apos;ils s&apos;inscrivent.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                      <Link2 className="w-3.5 h-3.5" />
                      Lien d&apos;inscription
                    </label>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-2 pl-4">
                      <p className="flex-1 text-sm font-medium truncate text-white/95">
                        {publicLink || 'Lien indisponible'}
                      </p>
                      {publicLink && <CopyButton value={publicLink} label="Lien" />}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                      <KeyRound className="w-3.5 h-3.5" />
                      Code de validation
                    </label>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-2 pl-4">
                      <p className="flex-1 text-xl font-extrabold tracking-[0.2em] font-mono text-white">
                        {sem.validationCode || '—'}
                      </p>
                      {sem.validationCode && <CopyButton value={sem.validationCode} label="Code" />}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleShareLink}
                  disabled={!publicLink}
                  className="w-full mt-6 bg-white text-[#E04A1F] hover:bg-white/90 border-0 rounded-2xl font-bold py-6 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Partager l&apos;invitation
                </Button>

                {!isOpen && (
                  <p className="text-xs text-white/80 mt-4 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Les inscriptions sont fermées. Ouvrez-les pour accepter de nouveaux participants.
                  </p>
                )}
              </section>
            </div>

            {/* Config */}
            <div className="lg:col-span-5">
              <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100 space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Configuration</h3>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-0.5">Dates</p>
                      <p className="font-semibold text-[#171c1f]">
                        {format(new Date(sem.dateDebut), 'dd MMM yyyy', { locale: fr })} →{' '}
                        {format(new Date(sem.dateFin), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-0.5">Pays</p>
                      <p className="font-semibold text-[#171c1f]">{paysLabels[sem.pays] || sem.pays}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Plane className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-0.5">Trajets</p>
                      <p className="font-semibold text-[#171c1f]">
                        {[sem.aller && 'Aller', sem.retour && 'Retour'].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-3">Services</p>
                  <div className="space-y-2">
                    {services.map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-[#171c1f]">
                          <s.icon className="w-4 h-4 text-slate-400" />
                          {s.label}
                        </span>
                        {s.active ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-xs text-slate-400">Désactivé</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {sem.serviceNavette && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-[#585e6c] uppercase tracking-widest mb-2">
                      Options navette
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#585e6c]">Regroupement</span>
                      <span className="font-semibold text-[#171c1f]">{sem.regrouper ? 'Oui' : 'Non'}</span>
                    </div>
                    {sem.regrouper && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#585e6c]">Max / véhicule</span>
                        <span className="font-semibold text-[#171c1f]">{sem.maxPaxParVehicule}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#585e6c]">Confirmation auto</span>
                      <span className="font-semibold text-[#171c1f]">{sem.autoConfirm ? 'Oui' : 'Non'}</span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </TabsContent>

        {/* ---- Participants ---- */}
        <TabsContent value="participants">
          <ParticipantsManager participants={participants} />
        </TabsContent>

        {/* ---- Navette ---- */}
        {sem.serviceNavette && (
          <TabsContent value="navette">
            <NavetteManager
              seminaireId={id}
              transferts={transferts}
              participants={participants}
              autoConfirm={sem.autoConfirm}
            />
          </TabsContent>
        )}

        {/* ---- Logement ---- */}
        {sem.serviceLogement && (
          <TabsContent value="logement">
            <LogementsManager
              seminaireId={id}
              participants={participants}
              dateDebut={sem.dateDebut}
              dateFin={sem.dateFin}
            />
          </TabsContent>
        )}

        {/* ---- Activités ---- */}
        {sem.serviceActivite && (
          <TabsContent value="activites">
            <ActivitesManager
              seminaireId={id}
              defaultPax={participants.length || undefined}
              showCombinedGenerate={true}
            />
          </TabsContent>
        )}

        {/* ---- Salles ---- */}
        {sem.serviceSalle && (
          <TabsContent value="salles">
            <SallesManager seminaireId={id} showCombinedGenerate={true} />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-[#171c1f]" style={MANROPE}>
              Modifier le séminaire
            </DialogTitle>
            <DialogDescription className="text-[#585e6c]">
              Mettez à jour la configuration de votre événement.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <SeminaireForm
              initialValues={{
                nom: sem.nom,
                description: sem.description,
                pays: sem.pays,
                dateDebut: sem.dateDebut,
                dateFin: sem.dateFin,
                aller: sem.aller,
                retour: sem.retour,
                regrouper: sem.regrouper,
                maxPaxParVehicule: sem.maxPaxParVehicule,
                autoConfirm: sem.autoConfirm,
                serviceNavette: sem.serviceNavette,
                serviceLogement: sem.serviceLogement,
                serviceActivite: sem.serviceActivite,
                serviceSalle: sem.serviceSalle,
              }}
              onSubmit={(values) => updateMutation.mutate(values)}
              onCancel={() => setEditOpen(false)}
              isSubmitting={updateMutation.isPending}
              submitLabel="Enregistrer les modifications"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
