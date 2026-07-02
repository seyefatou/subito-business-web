'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users,
  Mail,
  Phone,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  MapPin,
  Luggage,
  Baby,
  PawPrint,
  ChevronDown,
  Hotel,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SeminaireParticipant } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

function fmtDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return format(d, 'dd MMM yyyy · HH:mm', { locale: fr });
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-[#585e6c] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#171c1f]">{value}</p>
    </div>
  );
}

function ParticipantCard({ p }: { p: SeminaireParticipant }) {
  const [open, setOpen] = useState(false);

  const hasArrivee = p.arrFlightNumber || p.arrAirport || p.arrDateTime || p.destVille || p.destAdresse;
  const hasDepart =
    (p as any).depFlightNumber || (p as any).depAirport || (p as any).depDateTime || (p as any).depPickupAdresse;
  const bags = (p.smallBags || 0) + (p.largeBags || 0);

  return (
    <div className="rounded-2xl bg-[#f0f4f8] border border-slate-100 overflow-hidden">
      {/* Header (cliquable) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl gradient-subito flex items-center justify-center text-white font-bold text-sm shrink-0">
          {`${p.prenom?.[0] || ''}${p.nom?.[0] || ''}`.toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[#171c1f] truncate">
            {p.prenom} {p.nom}
          </p>
          <p className="text-xs text-[#585e6c] truncate">
            {p.email || p.telephone || '—'}
            {p.destVille ? ` · ${p.destVille}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.arrFlightNumber && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Plane className="w-3.5 h-3.5" />
              {p.arrFlightNumber}
            </span>
          )}
          {p.seminaireLogementId && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
              <Hotel className="w-3 h-3" />
              Logé
            </Badge>
          )}
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Détails (dépliables) */}
      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-slate-200/60 pt-4">
          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {p.email && (
              <div className="flex items-center gap-2 text-sm text-[#171c1f]">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{p.email}</span>
              </div>
            )}
            {p.telephone && (
              <div className="flex items-center gap-2 text-sm text-[#171c1f]">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                {p.telephone}
              </div>
            )}
          </div>

          {/* Arrivée */}
          {hasArrivee && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-3">
                <PlaneTakeoff className="w-3.5 h-3.5" />
                Arrivée & destination
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white rounded-xl p-3 border border-slate-100">
                <Field label="N° vol" value={p.arrFlightNumber} />
                <Field label="Compagnie" value={p.arrAirline} />
                <Field label="Aéroport" value={p.arrAirport} />
                <Field label="Arrivée" value={fmtDate(p.arrDateTime)} />
                <Field label="Ville" value={p.destVille} />
                <Field label="Adresse" value={p.destAdresse} />
              </div>
            </div>
          )}

          {/* Départ */}
          {hasDepart && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-3">
                <PlaneLanding className="w-3.5 h-3.5" />
                Départ (retour)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white rounded-xl p-3 border border-slate-100">
                <Field label="N° vol" value={(p as any).depFlightNumber} />
                <Field label="Compagnie" value={(p as any).depAirline} />
                <Field label="Aéroport" value={(p as any).depAirport} />
                <Field label="Départ" value={fmtDate((p as any).depDateTime)} />
                <Field label="Prise en charge" value={(p as any).depPickupAdresse} />
              </div>
            </div>
          )}

          {/* Bagages & options */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E04A1F] mb-3">
              <Luggage className="w-3.5 h-3.5" />
              Bagages & options
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white text-slate-600 border border-slate-200 gap-1">
                <Luggage className="w-3 h-3" />
                {bags} bagage{bags > 1 ? 's' : ''} ({p.smallBags || 0} petit / {p.largeBags || 0} grand)
              </Badge>
              {(p.siegeBebes || 0) > 0 && (
                <Badge className="bg-white text-slate-600 border border-slate-200 gap-1">
                  <Baby className="w-3 h-3" />
                  {p.siegeBebes} siège bébé
                </Badge>
              )}
              {p.animalDeCompagnie && (
                <Badge className="bg-white text-slate-600 border border-slate-200 gap-1">
                  <PawPrint className="w-3 h-3" />
                  Animal
                </Badge>
              )}
            </div>
          </div>

          {p.createdAt && (
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              Inscrit le {fmtDate(p.createdAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ParticipantsManager({ participants }: { participants: SeminaireParticipant[] }) {
  return (
    <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Participants inscrits</h3>
        <Badge className="bg-slate-100 text-slate-600 border-0">{participants.length}</Badge>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm text-[#585e6c]" style={MANROPE}>
            Aucun participant inscrit pour le moment
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Partagez le lien d&apos;inscription depuis l&apos;onglet « Vue d&apos;ensemble ».
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((p) => (
            <ParticipantCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}
