'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Salle } from '@/lib/api';
import Link from 'next/link';
import { MapPin, Users, DollarSign, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function LocationSallePage() {
  const [search, setSearch] = useState('');
  const [ville, setVille] = useState('');

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['lieux', search, ville],
    queryFn: () => api.lieux.list(20, 1, { search: search || undefined, ville: ville || undefined }),
  });

  const lieux = Array.isArray(response) ? response : response?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Location de salles</h1>
        <p className="text-slate-600 mt-1">Découvrez nos espaces disponibles pour vos événements</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Rechercher</label>
            <Input
              placeholder="Nom du lieu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ville</label>
            <Input
              placeholder="Ex: Dakar, Abidjan..."
              value={ville}
              onChange={(e) => setVille(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-slate-600">Chargement des salles...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          Erreur lors du chargement des salles
        </div>
      )}

      {/* Lieux Grid */}
      {lieux && lieux.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lieux.map((lieu) => (
            <Link key={lieu.id} href={`/location-salle/${lieu.id}`}>
              <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all overflow-hidden cursor-pointer h-full flex flex-col">
                {/* Image */}
                <div className="w-full h-40 bg-slate-100 relative overflow-hidden">
                  {lieu.images && lieu.images.length > 0 ? (
                    <img
                      src={`https://dev.api.mysubito.net/api/catalog/uploads/lieux/${lieu.images[0]}`}
                      alt={lieu.nom}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col space-y-3">
                  {/* Lieu Info */}
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-2">{lieu.nom}</h3>
                    {lieu.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lieu.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{lieu.ville}, {lieu.pays}</span>
                    </div>
                  </div>

                  {/* Equipements */}
                  {lieu.equipements && lieu.equipements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {lieu.equipements.slice(0, 2).map((eq: string, idx: number) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {eq}
                        </span>
                      ))}
                      {lieu.equipements.length > 2 && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          +{lieu.equipements.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Partner */}
                  <div className="text-xs text-slate-600">
                    Partenaire: <span className="font-semibold">{lieu.partner.nomPartner}</span>
                  </div>

                  {/* Salles Preview */}
                  {lieu.salles && lieu.salles.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
                      {lieu.salles.slice(0, 1).map((salle: Salle) => (
                        <div key={salle.id} className="space-y-1">
                          <div className="font-semibold text-sm text-slate-800">{salle.nom}</div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {salle.capacite} pers.
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {salle.prixParHeure.toLocaleString()} FCFA/h
                            </div>
                          </div>
                        </div>
                      ))}
                      {lieu.salles.length > 1 && (
                        <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                          +{lieu.salles.length - 1} autre salle(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="p-5 border-t border-slate-100">
                  <Button className="w-full bg-[#E04A1F] hover:bg-[#d4421a]">
                    Voir détails
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !isLoading && (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <p className="text-slate-600">Aucune salle trouvée</p>
          </div>
        )
      )}
    </div>
  );
}
