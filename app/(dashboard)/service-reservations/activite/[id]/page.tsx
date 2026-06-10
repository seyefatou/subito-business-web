'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ActiviteDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the wizard immediately
    if (id) {
      router.replace(`/service-reservations/activite/${id}/wizard`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-600">Redirection en cours...</p>
    </div>
  );
}
