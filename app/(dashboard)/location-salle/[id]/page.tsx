'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Salle } from '@/lib/api';
import { MapPin, Users, DollarSign, ArrowLeft, Phone, Mail, Clock, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function LieuDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const lieuId = parseInt(id as string);

  const { data: lieu, isLoading, error } = useQuery({
    queryKey: ['lieu', lieuId],
    queryFn: () => api.lieux.detail(lieuId),
    select: (response: any) => response?.data || response,
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

  const imageUrl = lieu.images?.[0] ? `https://dev.api.mysubito.net/api/catalog/uploads/lieux/${lieu.images[0]}` : null;

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
            <div className="w-full h-96 bg-slate-100 relative flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={lieu.nom}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <p className="text-slate-400">Pas d&apos;image</p>
              )}
            </div>

            {/* Thumbs */}
            {lieu.images && lieu.images.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {lieu.images.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={`https://dev.api.mysubito.net/api/catalog/uploads/lieux/${img}`}
                    alt={`${lieu.nom} ${idx + 1}`}
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{lieu.nom}</h1>
              {lieu.description && (
                <p className="text-slate-600 mt-2">{lieu.description}</p>
              )}
              <div className="flex items-center gap-2 text-slate-600 mt-3">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div>{lieu.adresseExacte}</div>
                  <div className="text-sm">{lieu.ville}, {lieu.pays}</div>
                </div>
              </div>
            </div>

            {/* Equipements */}
            {lieu.equipements && lieu.equipements.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-sm font-semibold text-slate-700">Équipements du lieu</p>
                <div className="flex flex-wrap gap-2">
                  {lieu.equipements.map((eq: string, idx: number) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Partner Info */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">Partenaire</p>
              <p className="font-semibold text-slate-900 mt-1">{lieu.partner.nomPartner}</p>
            </div>
          </div>

          {/* Salles */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Salles disponibles ({lieu.salles.length})</h2>
            <div className="space-y-6">
              {lieu.salles.map((salle: Salle) => {
                const salleImageUrl = salle.images?.[0] ? `https://dev.api.mysubito.net/api/catalog/uploads/salles/${salle.images[0]}` : null;
                return (
                  <div key={salle.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Salle Image */}
                    {salleImageUrl && (
                      <div className="w-full h-48 bg-slate-100 overflow-hidden">
                        <img
                          src={salleImageUrl}
                          alt={salle.nom}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="p-5 space-y-4">
                      {/* Title & Description */}
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{salle.nom}</h3>
                        {salle.description && (
                          <p className="text-slate-600 text-sm mt-1">{salle.description}</p>
                        )}
                      </div>

                      {/* Capacity & Basic Info */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="w-4 h-4" />
                          <span><strong>{salle.capacite}</strong> personnes</span>
                        </div>
                        {salle.acompteRequis && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>Acompte requis</span>
                          </div>
                        )}
                      </div>

                      {/* Equipements Salle */}
                      {salle.equipements && salle.equipements.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-700">Équipements de la salle</p>
                          <div className="flex flex-wrap gap-2">
                            {salle.equipements.map((eq: string, idx: number) => (
                              <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                {eq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="bg-orange-50 rounded-lg p-4 space-y-3 border border-orange-100">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">Par jour</span>
                            <span className="font-bold text-2xl text-[#E04A1F]">
                              {salle.prixParJour.toLocaleString()} FCFA
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">Par heure</span>
                            <span className="font-bold text-2xl text-[#E04A1F]">
                              {salle.prixParHeure.toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>

                        {/* Acompte Info */}
                        {salle.acompteRequis && salle.acompteValeur && (
                          <div className="pt-3 border-t border-orange-200">
                            <p className="text-xs text-slate-600 mb-1">Acompte requis ({salle.acompteType}):</p>
                            <p className="font-bold text-[#E04A1F]">{salle.acompteValeur.toLocaleString()} FCFA</p>
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      {salle.priceOptions && salle.priceOptions.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-700">Options disponibles</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {salle.priceOptions.filter(opt => opt.isActive).map((opt) => (
                              <div key={opt.id} className="flex items-start justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-800 text-sm">{opt.titre}</p>
                                  {opt.description && (
                                    <p className="text-xs text-slate-600 mt-0.5">{opt.description}</p>
                                  )}
                                </div>
                                <p className="font-bold text-slate-900 ml-2 flex-shrink-0">
                                  {(opt.prix ?? 0).toLocaleString()} FCFA
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CTA */}
                      <Button
                        className="w-full bg-[#E04A1F] hover:bg-[#d4421a]"
                        onClick={() => router.push(`/service-reservations/salle/${salle.id}/wizard`)}
                      >
                        Réserver cette salle
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 sticky top-20">
            <h3 className="font-bold text-slate-900">Résumé</h3>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 font-semibold">NOMBRE DE SALLES</p>
                <p className="font-bold text-2xl text-slate-900 mt-1">{lieu.salles.length}</p>
              </div>

              {lieu.salles.length > 0 && (
                <>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 font-semibold">CAPACITÉ MAX</p>
                    <p className="font-bold text-2xl text-slate-900 mt-1">
                      {Math.max(...lieu.salles.map((s: Salle) => s.capacite))} personnes
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 font-semibold">PRIX MIN/HEURE</p>
                    <p className="font-bold text-2xl text-[#E04A1F] mt-1">
                      {Math.min(...lieu.salles.map((s: Salle) => s.prixParHeure)).toLocaleString()} FCFA
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Contact */}
            <div className="pt-5 border-t border-slate-200 space-y-3">
              <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider">Contact Partenaire</p>
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

            {/* Metadata */}
            <div className="pt-5 border-t border-slate-200 space-y-2 text-xs text-slate-600">
              <div>
                <p className="font-semibold">Publié</p>
                <p>{new Date(lieu.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="font-semibold">Mis à jour</p>
                <p>{new Date(lieu.updatedAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
