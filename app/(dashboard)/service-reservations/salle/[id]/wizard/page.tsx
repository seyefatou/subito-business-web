'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';

export default function SalleWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const salleId = parseInt(id as string, 10);

  const { data: salle, isLoading } = useQuery({
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
    enabled: !!salleId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement de la salle...</p>
      </div>
    );
  }

  if (!salle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Salle introuvable</p>
          <button
            onClick={() => router.back()}
            className="text-[#E04A1F] hover:underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReservationWizard
      productType="salle"
      productId={salleId}
      productName={salle.nom}
      pensions={[]}
      priceOptions={salle.priceOptions || []}
      capacite={salle.capacite || 1}
      productImage={salle.images?.[0]}
      productDescription={salle.description}
      onCancel={() => router.back()}
    />
  );
}
