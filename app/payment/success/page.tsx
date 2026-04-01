'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const serviceLabels: Record<string, string> = {
  booking: 'Réservation',
  invoice: 'Facture',
  travel_document: 'Document de voyage',
  service_reservation: 'Réservation de service',
  insurance: 'Assurance',
};

function getReturnUrl(type?: string | null, id?: string | null): string {
  switch (type) {
    case 'booking':
      return '/deliveries';
    case 'invoice':
      return '/billing';
    case 'travel_document':
      return '/travel-documents';
    case 'service_reservation':
      return '/service-reservations';
    case 'insurance':
      return '/insurance';
    default:
      return '/dashboard';
  }
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  const label = type ? serviceLabels[type] || type : 'Service';
  const returnUrl = getReturnUrl(type, id);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Paiement réussi</h1>
          <p className="text-slate-500">
            Votre paiement pour <span className="font-medium text-slate-700">{label}</span>
            {id && <> (#{id})</>} a été traité avec succès.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          {type && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Type</span>
              <span className="font-medium text-slate-900">{label}</span>
            </div>
          )}
          {id && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Référence</span>
              <span className="font-mono font-medium text-slate-900">#{id}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Statut</span>
            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmé
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href={returnUrl}>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
              Continuer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
