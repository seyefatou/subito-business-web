'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, Circuit } from '@/lib/api';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';

export default function CircuitWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const circuitId = parseInt(id as string, 10);

  const { data: circuitResponse, isLoading } = useQuery({
    queryKey: ['circuit-public', circuitId],
    queryFn: () => api.circuits.getPublic(circuitId),
    enabled: !!circuitId,
  });

  const circuit = circuitResponse?.data as Circuit | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement du circuit...</p>
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Circuit introuvable</p>
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
      productType="circuit"
      productId={circuitId}
      productName={circuit.titre}
      pensions={[]}
      priceOptions={circuit.priceOptions}
      capacite={circuit.maxParticipants || 99}
      productImage={circuit.images?.[0]}
      productDescription={circuit.descriptionComplete || circuit.descriptionCourte}
      onCancel={() => router.back()}
    />
  );
}
