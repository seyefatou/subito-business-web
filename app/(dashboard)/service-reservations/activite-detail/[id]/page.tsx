'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, Activite } from '@/lib/api';
import { formatPrice } from '@/lib/booking-utils';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

export default function ActiviteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const activiteId = parseInt(id as string, 10);

  const { data: activiteResponse, isLoading, error } = useQuery({
    queryKey: ['activite-public', activiteId],
    queryFn: () => api.activites.getPublic(activiteId),
    enabled: !!activiteId,
  });

  const activite = activiteResponse?.data as Activite | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50">
        <p className="text-slate-600">Chargement de l&apos;activité...</p>
      </div>
    );
  }

  if (error || !activite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Activité introuvable</p>
          <button
            onClick={() => router.back()}
            className="text-[#E04A1F] hover:underline font-semibold"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#E04A1F] hover:text-[#C8330F] transition mb-8 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        {/* Image */}
        <div className="mb-8 rounded-3xl overflow-hidden shadow-lg h-96 bg-slate-200">
          {activite.images && activite.images.length > 0 ? (
            <img
              src={activite.images[0]}
              alt={activite.titre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-slate-600">Pas d&apos;image disponible</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="md:col-span-2 space-y-8">
            {/* Title */}
            <div>
              <h1
                className="text-3xl md:text-4xl font-extrabold text-[#171c1f] mb-4"
                style={MANROPE}
              >
                {activite.titre}
              </h1>

              {/* Key info */}
              <div className="flex flex-wrap gap-4">
                {activite.ville && (
                  <div className="flex items-center gap-2 text-[#585e6c]">
                    <MapPin className="w-4 h-4 text-[#E04A1F]" />
                    <span className="text-sm">{activite.ville}</span>
                  </div>
                )}
                {activite.duree && (
                  <div className="flex items-center gap-2 text-[#585e6c]">
                    <Clock className="w-4 h-4 text-[#E04A1F]" />
                    <span className="text-sm">{activite.duree}</span>
                  </div>
                )}
                {activite.maxParticipants && (
                  <div className="flex items-center gap-2 text-[#585e6c]">
                    <Users className="w-4 h-4 text-[#E04A1F]" />
                    <span className="text-sm">Jusqu&apos;à {activite.maxParticipants} pers.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {(activite.descriptionComplete || activite.descriptionCourte) && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-base font-extrabold text-[#171c1f] mb-3" style={MANROPE}>
                  À propos
                </h2>
                <p className="text-sm text-[#585e6c] leading-relaxed">
                  {activite.descriptionComplete || activite.descriptionCourte}
                </p>
              </div>
            )}

            {/* Inclus / Non inclus */}
            <div className="grid md:grid-cols-2 gap-6">
              {activite.inclus && activite.inclus.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                    Inclus
                  </h3>
                  <ul className="space-y-2">
                    {(Array.isArray(activite.inclus) ? activite.inclus : (activite.inclus as string).split(',')).map(
                      (item, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm text-[#585e6c]">
                          <div className="w-2 h-2 rounded-full bg-[#E04A1F]" />
                          {item.trim()}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {activite.nonInclus && activite.nonInclus.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-base font-extrabold text-[#171c1f] mb-4" style={MANROPE}>
                    Non inclus
                  </h3>
                  <ul className="space-y-2">
                    {(Array.isArray(activite.nonInclus)
                      ? activite.nonInclus
                      : (activite.nonInclus as string).split(',')).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-[#585e6c]">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        {item.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 sticky top-24">
              {/* Prix */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-[#585e6c] uppercase tracking-widest mb-2">
                  À partir de
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-3xl font-extrabold text-[#E04A1F]"
                    style={MANROPE}
                  >
                    {formatPrice(activite.prix || 0)} FCFA
                  </span>
                </div>
              </div>

              {/* Button */}
              <Button
                onClick={() => router.push(`/service-reservations/activite/${activiteId}/wizard`)}
                className="w-full bg-[#E04A1F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Réserver maintenant
                <ChevronRight className="w-4 h-4" />
              </Button>

              <p className="text-xs text-[#585e6c] text-center mt-4">
                Vous pouvez modifier vos sélections à chaque étape
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
