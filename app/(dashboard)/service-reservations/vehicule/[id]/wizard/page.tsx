'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, VehiculeLocation } from '@/lib/api';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';

export default function VehiculeWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const vehiculeId = parseInt(id as string, 10);

  const { data: vehiculeResponse, isLoading } = useQuery({
    queryKey: ['vehicule-public', vehiculeId],
    queryFn: () => api.vehiculesLocation.getPublic(vehiculeId),
    enabled: !!vehiculeId,
  });

  const vehicule = vehiculeResponse?.data as VehiculeLocation | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement du véhicule...</p>
      </div>
    );
  }

  if (!vehicule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Véhicule introuvable</p>
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

  const productName = `${vehicule.marque || ''} ${vehicule.modele || ''}`.trim() || 'Véhicule';

  return (
    <ReservationWizard
      productType="vehicule"
      productId={vehiculeId}
      productName={productName}
      pensions={[]}
      priceOptions={vehicule.priceOptions}
      capacite={vehicule.places || 5}
      productImage={vehicule.images?.[0]}
      productDescription={`${vehicule.type || 'Véhicule'} - ${vehicule.annee || 'année'}`}
      onCancel={() => router.back()}
    />
  );
}
