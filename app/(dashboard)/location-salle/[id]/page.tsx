'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MapPin, Users, DollarSign, ArrowLeft, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LieuDetailPage() {
  const { id } = useParams();
  const lieuId = parseInt(id as string);

  const { data: lieu, isLoading, error } = useQuery({
    queryKey: ['lieu', lieuId],
    queryFn: () => api.lieux.detail(lieuId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  if (error || !lieu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-600">Salle non trouvée</p>
          <Link href="/location-salle">
            <Button variant="outline">Retour aux salles</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/location-salle">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </Link>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="w-full h-96 bg-slate-100 relative">
              {lieu.images && lieu.images.length > 0 ? (
                <img
                  src={lieu.images[0]}
                  alt={lieu.nom}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  Pas d'image disponible
                </div>
              )}
            </div>

            {/* Thumbs */}
            {lieu.images && lieu.images.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {lieu.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`${lieu.nom} ${idx + 1}`}
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{lieu.nom}</h1>
              <div className="flex items-center gap-2 text-slate-600 mt-2">
                <MapPin className="w-5 h-5" />
                {lieu.adresseExacte}
              </div>
            </div>

            {/* Partner Info */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">Partenaire</p>
              <p className="font-semibold text-slate-900">{lieu.partner.nomPartner}</p>
            </div>
          </div>

          {/* Salles */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Salles disponibles</h2>
            <div className="space-y-4">
              {lieu.salles.map((salle) => (
                <div key={salle.id} className="border border-slate-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{salle.nom}</h3>
                      <div className="flex items-center gap-2 text-slate-600 mt-1">
                        <Users className="w-4 h-4" />
                        Capacité: <span className="font-semibold">{salle.capacite} personnes</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-orange-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Prix par jour</span>
                      <span className="font-bold text-[#E04A1F]">{salle.prixParJour.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Prix par heure</span>
                      <span className="font-bold text-[#E04A1F]">{salle.prixParHeure.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  {/* Options */}
                  {salle.priceOptions && salle.priceOptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Options disponibles</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {salle.priceOptions.map((opt) => (
                          <div key={opt.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-800">{opt.nom}</p>
                              {opt.description && <p className="text-xs text-slate-600">{opt.description}</p>}
                            </div>
                            <p className="font-bold text-slate-900">{opt.prix.toLocaleString()} FCFA</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <Button className="w-full bg-[#E04A1F] hover:bg-[#d4421a]">
                    Réserver cette salle
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div>
          {/* Quick Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 sticky top-20">
            <h3 className="font-bold text-slate-900">Informations</h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider">Ville</p>
                <p className="font-semibold text-slate-900 mt-1">{lieu.ville}</p>
              </div>

              <div>
                <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider">Adresse</p>
                <p className="font-semibold text-slate-900 mt-1 text-sm">{lieu.adresseExacte}</p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider mb-3">Contact partenaire</p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  <Button variant="outline" className="w-full justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
