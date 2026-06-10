'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Mail, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, Logement } from '@/lib/api';
import { PriceCalculator } from '@/components/reservations/PriceCalculator';
import { OptionsSelector } from '@/components/reservations/OptionsSelector';
import Image from 'next/image';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

interface ConfirmationPageParams {
  params: {
    id: string;
  };
}

export default function ConfirmationPage({ params }: ConfirmationPageParams) {
  const logementId = parseInt(params.id, 10);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Récupérer les params
  const dates = searchParams.get('dates')?.split('_').map(d => new Date(d)) || [undefined, undefined];
  const nombrePersonnes = parseInt(searchParams.get('persons') || '1', 10);
  const selectedPensions = searchParams.get('pensions')?.split(',').map(p => parseInt(p, 10)).filter(p => !isNaN(p)) || [];
  const selectedPriceOptions = searchParams.get('options')?.split(',').map(o => parseInt(o, 10)).filter(o => !isNaN(o)) || [];

  const { data: logementResponse } = useQuery({
    queryKey: ['logement-public', logementId],
    queryFn: () => api.logements.getPublic(logementId),
    enabled: !!logementId,
  });

  const logement = logementResponse?.data as Logement | undefined;

  if (!logement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!nom || !email || !telephone || !dates[0] || !dates[1]) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      // Créer la réservation
      await api.serviceReservations.create({
        serviceType: 'LOGEMENT',
        logementId,
        clientName: nom,
        clientEmail: email,
        clientPhone: telephone,
        dateDebut: dates[0].toISOString(),
        dateFin: dates[1].toISOString(),
        nombrePersonnes,
        priceOptions: selectedPriceOptions.map(id => ({
          code: logement.priceOptions?.find(p => p.id === id)?.code || '',
          quantite: 1,
        })),
        formuleRepas: selectedPensions.length > 0 ? 'PENSION' : 'NUIT_SIMPLE',
      });

      // Rediriger vers page success
      router.push(`/service-reservations?success=true`);
    } catch (error) {
      console.error('Erreur lors de la création de la réservation:', error);
      alert('Erreur lors de la création de la réservation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6 text-[#171c1f]" />
          </button>
          <div>
            <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
              Étape 4 sur 4
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#171c1f]" style={MANROPE}>
              Confirmation de réservation
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Récapitulatif produit */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
              Votre réservation
            </h2>
            <div className="space-y-4">
              {/* Produit */}
              <div className="flex gap-4">
                {logement.images?.[0] && (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={logement.images[0]}
                      alt={logement.nom}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-[#171c1f]">{logement.nom}</h3>
                  <p className="text-sm text-[#585e6c] mt-1">{logement.description}</p>
                </div>
              </div>

              {/* Détails */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#585e6c]">Arrivée</span>
                  <span className="font-semibold text-[#171c1f]">{dates[0]?.toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#585e6c]">Départ</span>
                  <span className="font-semibold text-[#171c1f]">{dates[1]?.toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#585e6c]">Personnes</span>
                  <span className="font-semibold text-[#171c1f]">{nombrePersonnes}</span>
                </div>
              </div>

              {/* Options */}
              {(selectedPensions.length > 0 || selectedPriceOptions.length > 0) && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="font-semibold text-[#171c1f] mb-2 text-sm">Options sélectionnées</h4>
                  <OptionsSelector
                    pensions={logement.pensions?.filter(p => selectedPensions.includes(p.id))}
                    priceOptions={logement.priceOptions?.filter(opt => selectedPriceOptions.includes(opt.id))}
                    interactive={false}
                  />
                </div>
              )}

              {/* Prix */}
              <div className="border-t border-slate-100 pt-4">
                <PriceCalculator
                  productType="logement"
                  productId={logementId}
                  dateDebut={dates[0]}
                  dateFin={dates[1]}
                  nombrePersonnes={nombrePersonnes}
                  pensionIds={selectedPensions}
                  priceOptionIds={selectedPriceOptions}
                />
              </div>
            </div>
          </div>

          {/* Formulaire client */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
              Informations client
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-[#171c1f] flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  Nom complet
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E04A1F] transition"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#171c1f] flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E04A1F] transition"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#171c1f] flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+221 77 123 45 67"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E04A1F] transition"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => router.back()}
              className="flex-1 bg-[#f0f4f8] text-[#171c1f] border-0 py-6 rounded-2xl font-bold text-base hover:bg-slate-200 active:scale-[0.98] transition-all"
            >
              Retour
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-2" />
              {isLoading ? 'Création...' : 'Confirmer la réservation'}
            </Button>
          </div>

          {/* Info */}
          <div className="text-center text-xs text-[#585e6c]">
            <p>Annulation flexible · Paiement sécurisé</p>
          </div>
        </div>
      </div>
    </div>
  );
}
