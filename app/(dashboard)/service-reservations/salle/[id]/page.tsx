'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Users, DollarSign, AlertCircle, Loader2, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function SalleDetailPage() {
  return (
    <Suspense fallback={null}>
      <SalleDetailInner />
    </Suspense>
  );
}

function SalleDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const salleId = parseInt(params.id as string);

  const { data: salle, isLoading, error } = useQuery({
    queryKey: ['salle-detail', salleId],
    queryFn: async () => {
      // Fetch salle from all lieux
      const response = await api.lieux.list(100, 1);
      const lieux = Array.isArray(response) ? response : response?.data || [];
      for (const lieu of lieux) {
        const found = lieu.salles?.find((s: any) => s.id === salleId);
        if (found) return { ...found, lieu };
      }
      return null;
    },
  });

  // Contexte séminaire
  const seminaireId = searchParams.get('seminaireId');
  const returnTo = searchParams.get('returnTo') || '/location-salle';
  const addToSeminaireMutation = useMutation({
    mutationFn: async () => {
      if (!seminaireId || !salle) throw new Error('Contexte séminaire manquant');
      return api.seminaires.addSalle(Number(seminaireId), {
        salleId: salle.id,
        nom: salle.lieu?.nom ? `${salle.nom} — ${salle.lieu.nom}` : salle.nom,
        prix: salle.prixParHeure || salle.prixParJour,
      });
    },
    onSuccess: () => {
      toast.success('Salle ajoutée au séminaire');
      router.push(returnTo);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (error || !salle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-600">Salle non trouvée</p>
          <Link href="/service-reservations">
            <Button variant="outline">Retour</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Bandeau contexte séminaire */}
      {seminaireId && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#ffdbd0] border border-[#E04A1F]/20 px-4 py-3">
          <Building2 className="w-5 h-5 text-[#E04A1F] shrink-0" />
          <p className="text-sm text-[#171c1f]">
            <span className="font-bold">Ajout à un séminaire</span> — consultez les détails, puis cliquez sur
            « Ajouter au séminaire ».
          </p>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => (seminaireId ? router.push(returnTo) : router.back())}
        className="flex items-center gap-2 text-[#E04A1F] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">{salle.nom}</h1>
        <p className="text-slate-600">{salle.lieu?.nom}</p>
      </div>

      {/* Image */}
      {salle.images?.[0] && (
        <div className="rounded-2xl overflow-hidden h-96 bg-slate-100">
          <img
            src={`https://dev.api.mysubito.net/api/catalog/uploads/salles/${salle.images[0]}`}
            alt={salle.nom}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-[#E04A1F]" />
            <p className="text-sm text-slate-600">Capacité</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{salle.capacite} personnes</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-[#E04A1F]" />
            <p className="text-sm text-slate-600">Prix par heure</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{salle.prixParHeure.toLocaleString()} FCFA</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-[#E04A1F]" />
            <p className="text-sm text-slate-600">Prix par jour</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{salle.prixParJour.toLocaleString()} FCFA</p>
        </div>
      </div>

      {/* Description */}
      {salle.description && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Description</h2>
          <p className="text-slate-600">{salle.description}</p>
        </div>
      )}

      {/* Equipements */}
      {salle.equipements && salle.equipements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Équipements</h2>
          <div className="flex flex-wrap gap-2">
            {salle.equipements.map((eq: string, idx: number) => (
              <span key={idx} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                {eq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {seminaireId ? (
        <Button
          onClick={() => addToSeminaireMutation.mutate()}
          disabled={addToSeminaireMutation.isPending}
          className="w-full bg-[#E04A1F] hover:bg-[#d4421a] h-14 text-lg gap-2"
        >
          {addToSeminaireMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
          Ajouter au séminaire
        </Button>
      ) : (
        <Link href={`/service-reservations/salle/${salleId}/wizard`}>
          <Button className="w-full bg-[#E04A1F] hover:bg-[#d4421a] h-14 text-lg">
            Réserver maintenant
          </Button>
        </Link>
      )}
    </div>
  );
}
