'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, Activite } from '@/lib/api';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';

export default function ActiviteWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const activiteId = parseInt(id as string, 10);

  const { data: activiteResponse, isLoading } = useQuery({
    queryKey: ['activite-public', activiteId],
    queryFn: () => api.activites.getPublic(activiteId),
    enabled: !!activiteId,
  });

  const activite = activiteResponse?.data as Activite | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement de l&apos;activité...</p>
      </div>
    );
  }

  if (!activite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Activité introuvable</p>
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
      productType="activite"
      productId={activiteId}
      productName={activite.titre}
      pensions={[]}
      priceOptions={activite.priceOptions}
      capacite={activite.maxParticipants || 99}
      productImage={activite.images?.[0]}
      productDescription={activite.descriptionComplete || activite.descriptionCourte}
      onCancel={() => router.back()}
    />
  );
}
