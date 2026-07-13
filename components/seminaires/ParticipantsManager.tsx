'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users,
  PlaneTakeoff,
  PlaneLanding,
  Search,
  Clock,
  Hotel,
  X,
  Plane,
  Maximize2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SeminaireParticipant } from '@/lib/api';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const NO_DATE = 'zzzz-99-99'; // trie les lignes sans date en dernier

interface FlightRow {
  id: number;
  dt?: string;
  dateKey: string;
  flight?: string;
  airline?: string;
  airport?: string;
  ville?: string;
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  loge: boolean;
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function dateKeyOf(value?: string): string {
  const d = toDate(value);
  return d ? format(d, 'yyyy-MM-dd') : NO_DATE;
}

function fmtDay(dateKey: string): string {
  if (dateKey === NO_DATE) return 'Date à préciser';
  const d = new Date(dateKey);
  if (isNaN(d.getTime())) return 'Date à préciser';
  const label = format(d, 'EEEE dd MMM yyyy', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fmtTime(value?: string): string {
  const d = toDate(value);
  return d ? format(d, 'HH:mm') : '—';
}

function hourOf(value?: string): string | null {
  const d = toDate(value);
  return d ? format(d, 'HH') : null;
}

/** Construit une ligne "arrivée" à partir d'un participant, ou null si aucune info d'arrivée. */
function toArrivalRow(p: SeminaireParticipant): FlightRow | null {
  const has = p.arrFlightNumber || p.arrAirport || p.arrDateTime || p.destVille || p.destAdresse;
  if (!has) return null;
  return {
    id: p.id,
    dt: p.arrDateTime,
    dateKey: dateKeyOf(p.arrDateTime),
    flight: p.arrFlightNumber,
    airline: p.arrAirline,
    airport: p.arrAirport,
    ville: p.destVille || p.destAdresse,
    prenom: p.prenom,
    nom: p.nom,
    email: p.email,
    telephone: p.telephone,
    loge: !!p.seminaireLogementId,
  };
}

/** Construit une ligne "retour" à partir d'un participant, ou null si aucune info de départ. */
function toReturnRow(p: SeminaireParticipant): FlightRow | null {
  const a = p as any;
  const has = a.depFlightNumber || a.depAirport || a.depDateTime || a.depPickupAdresse;
  if (!has) return null;
  return {
    id: p.id,
    dt: a.depDateTime,
    dateKey: dateKeyOf(a.depDateTime),
    flight: a.depFlightNumber,
    airline: a.depAirline,
    airport: a.depAirport,
    ville: a.depPickupAdresse,
    prenom: p.prenom,
    nom: p.nom,
    email: p.email,
    telephone: p.telephone,
    loge: !!p.seminaireLogementId,
  };
}

function sortRows(rows: FlightRow[]): FlightRow[] {
  return [...rows].sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return (a.dt || '').localeCompare(b.dt || '');
  });
}

/** Regroupe des lignes triées par clé de date, en conservant l'ordre chronologique. */
function groupByDate(rows: FlightRow[]): { dateKey: string; rows: FlightRow[] }[] {
  const groups: { dateKey: string; rows: FlightRow[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.dateKey === row.dateKey) last.rows.push(row);
    else groups.push({ dateKey: row.dateKey, rows: [row] });
  }
  return groups;
}

function FlightTable({
  title,
  icon: Icon,
  rows,
  emptyText,
  locationLabel,
  full = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: FlightRow[];
  emptyText: string;
  locationLabel: string;
  full?: boolean;
}) {
  const groups = useMemo(() => groupByDate(sortRows(rows)), [rows]);
  const cols = ['Date', 'Horaire', locationLabel, 'Passagers', 'Compagnie', 'N° de vol'];

  // Rendu du tableau, réutilisé dans la vue compacte et dans la vue plein écran « Agrandir ».
  // En-tête collant pour rester visible pendant le défilement vertical.
  const renderTable = () => (
    <table className="w-full min-w-[1200px] text-sm border-collapse">
      <thead className="sticky top-0 z-10">
        <tr>
          {cols.map((c) => (
            <th
              key={c}
              className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[#585e6c] whitespace-nowrap bg-[#f0f4f8]"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((group, gi) => (
          <React.Fragment key={group.dateKey}>
            {group.rows.map((row, ri) => (
              <tr
                key={`${row.id}-${ri}`}
                className={`hover:bg-slate-50/70 transition-colors ${
                  gi > 0 && ri === 0 ? 'border-t-2 border-slate-100' : 'border-t border-slate-50'
                }`}
              >
                {/* Date : affichée une seule fois par groupe (fusion type Excel) */}
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  {ri === 0 && (
                    <span className="font-bold text-[#171c1f]" style={MANROPE}>
                      {fmtDay(group.dateKey)}
                    </span>
                  )}
                </td>

                {/* Horaire */}
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#171c1f]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {fmtTime(row.dt)}
                  </span>
                </td>

                {/* Départ / Arrivée (aéroport + ville) */}
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-[#171c1f]">{row.airport || '—'}</p>
                  {row.ville && <p className="text-xs text-[#585e6c] truncate max-w-[220px]">{row.ville}</p>}
                </td>

                {/* Passagers */}
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#171c1f]">
                      {row.prenom} {row.nom}
                    </p>
                    {row.loge && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 shrink-0">
                        <Hotel className="w-3 h-3" />
                        Logé
                      </Badge>
                    )}
                  </div>
                  {(row.email || row.telephone) && (
                    <p className="text-xs text-[#585e6c] truncate max-w-[220px]">
                      {row.email || row.telephone}
                    </p>
                  )}
                </td>

                {/* Compagnie */}
                <td className="px-4 py-3 align-top whitespace-nowrap text-[#171c1f]">
                  {row.airline || '—'}
                </td>

                {/* N° de vol */}
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  {row.flight ? (
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#171c1f] bg-slate-100 rounded-lg px-2 py-1 text-xs">
                      <Plane className="w-3 h-3 text-slate-400" />
                      {row.flight}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#E04A1F]" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">{title}</h4>
        <Badge className="bg-slate-100 text-slate-600 border-0">{rows.length}</Badge>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
          <p className="text-sm text-[#585e6c]" style={MANROPE}>
            {emptyText}
          </p>
        </div>
      ) : (
        <div
          className={`table-scroll overflow-x-scroll overflow-y-auto rounded-2xl border border-slate-100 ${
            full ? '' : 'max-h-[420px]'
          }`}
        >
          {renderTable()}
        </div>
      )}
    </div>
  );
}

export default function ParticipantsManager({ participants }: { participants: SeminaireParticipant[] }) {
  const [flightQuery, setFlightQuery] = useState('');
  const [hourFilter, setHourFilter] = useState('all');

  const arrivals = useMemo(
    () => participants.map(toArrivalRow).filter((r): r is FlightRow => r !== null),
    [participants],
  );
  const returns = useMemo(
    () => participants.map(toReturnRow).filter((r): r is FlightRow => r !== null),
    [participants],
  );

  // Heures distinctes présentes dans les deux tableaux, pour le filtre
  const hours = useMemo(() => {
    const set = new Set<string>();
    [...arrivals, ...returns].forEach((r) => {
      const h = hourOf(r.dt);
      if (h) set.add(h);
    });
    return Array.from(set).sort();
  }, [arrivals, returns]);

  const applyFilters = useCallback(
    (rows: FlightRow[]) => {
      const q = flightQuery.trim().toLowerCase();
      return rows.filter((r) => {
        const matchFlight = !q || (r.flight || '').toLowerCase().includes(q);
        const matchHour = hourFilter === 'all' || hourOf(r.dt) === hourFilter;
        return matchFlight && matchHour;
      });
    },
    [flightQuery, hourFilter],
  );

  const filteredArrivals = useMemo(() => applyFilters(arrivals), [arrivals, applyFilters]);
  const filteredReturns = useMemo(() => applyFilters(returns), [returns, applyFilters]);

  const hasFilters = flightQuery.trim() !== '' || hourFilter !== 'all';

  const resetFilters = () => {
    setFlightQuery('');
    setHourFilter('all');
  };

  const [expanded, setExpanded] = useState(false);
  const hasRows = arrivals.length > 0 || returns.length > 0;

  // Vue plein écran (les deux tableaux) : fermeture par Échap + blocage du défilement de fond.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  return (
    <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-slate-100">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#E04A1F]">Participants inscrits</h3>
        <Badge className="bg-slate-100 text-slate-600 border-0">{participants.length}</Badge>
        {hasRows && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-auto flex items-center gap-1.5 px-3 h-9 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0"
          >
            <Maximize2 className="w-4 h-4" />
            Agrandir
          </button>
        )}
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
        <>
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={flightQuery}
                onChange={(e) => setFlightQuery(e.target.value)}
                placeholder="Rechercher un numéro de vol…"
                className="pl-9 rounded-xl border-slate-200 h-10 bg-white"
              />
            </div>
            <Select value={hourFilter} onValueChange={setHourFilter}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl border-slate-200 h-10 bg-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Toutes les heures" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les heures</SelectItem>
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}h00 – {h}h59
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 h-10 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="space-y-8">
            <FlightTable
              title="Arrivée des participants"
              icon={PlaneTakeoff}
              locationLabel="Arrivée"
              rows={filteredArrivals}
              emptyText={
                hasFilters
                  ? 'Aucune arrivée ne correspond aux filtres.'
                  : 'Aucune information d’arrivée renseignée.'
              }
            />
            <FlightTable
              title="Retour des participants"
              icon={PlaneLanding}
              locationLabel="Retour"
              rows={filteredReturns}
              emptyText={
                hasFilters
                  ? 'Aucun retour ne correspond aux filtres.'
                  : 'Aucune information de retour renseignée.'
              }
            />
          </div>
        </>
      )}

      {/* Vue plein écran : les DEUX tableaux (Arrivée + Retour) dans une seule vue */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-base sm:text-lg font-extrabold text-[#171c1f] truncate" style={MANROPE}>
              Participants — vols
            </h3>
            <Badge className="bg-slate-100 text-slate-600 border-0">{participants.length}</Badge>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-auto flex items-center gap-1.5 px-3 h-9 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-8">
            <FlightTable
              title="Arrivée des participants"
              icon={PlaneTakeoff}
              locationLabel="Arrivée"
              rows={filteredArrivals}
              emptyText={
                hasFilters
                  ? 'Aucune arrivée ne correspond aux filtres.'
                  : 'Aucune information d’arrivée renseignée.'
              }
              full
            />
            <FlightTable
              title="Retour des participants"
              icon={PlaneLanding}
              locationLabel="Retour"
              rows={filteredReturns}
              emptyText={
                hasFilters
                  ? 'Aucun retour ne correspond aux filtres.'
                  : 'Aucune information de retour renseignée.'
              }
              full
            />
          </div>
        </div>
      )}
    </section>
  );
}
