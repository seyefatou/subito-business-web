'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, Logement } from '@/lib/api';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';

export default function LogementWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const logementId = parseInt(id as string, 10);

  const { data: logementResponse, isLoading } = useQuery({
    queryKey: ['logement-public', logementId],
    queryFn: () => api.logements.getPublic(logementId),
    enabled: !!logementId,
  });

  const logement = logementResponse?.data as Logement | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement du logement...</p>
      </div>
    );
  }

  if (!logement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Logement introuvable</p>
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
      productType="logement"
      productId={logementId}
      productName={logement.nom}
      pensions={logement.pensions}
      priceOptions={logement.priceOptions}
      capacite={logement.capacite}
      productImage={logement.images?.[0]}
      productDescription={logement.description}
      onCancel={() => router.back()}
    />
  );
}
