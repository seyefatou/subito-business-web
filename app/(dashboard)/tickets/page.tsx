'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  Send,
  ArrowRight,
  Hash,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { api, TicketResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

type StatusKey = 'all' | 'ouvert' | 'en_cours' | 'ferme';

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  ouvert: { label: 'Ouvert', bg: 'bg-[#E04A1F]', text: 'text-white' },
  en_cours: { label: 'En cours', bg: 'bg-amber-100', text: 'text-amber-700' },
  ferme: { label: 'Fermé', bg: 'bg-[#f0f4f8]', text: 'text-[#585e6c]' },
};

function StatusPill({ statut }: { statut: string }) {
  const cfg = statusConfig[statut] || { label: statut, bg: 'bg-[#f0f4f8]', text: 'text-[#585e6c]' };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ sujet: '', description: '' });
  const limit = 10;

  const { data: ticketsResponse, isLoading, error } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () =>
      api.tickets.list({
        statut: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { sujet: string; description: string }) =>
      api.tickets.create({
        subject: data.sujet,
        message: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket créé avec succès');
      setDialogOpen(false);
      setNewTicket({ sujet: '', description: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const raw = ticketsResponse as any;
  const tickets: TicketResponse[] = Array.isArray(raw) ? raw : (raw?.data?.data || raw?.data?.items || raw?.data || raw?.items || []);

  const sortedTickets = [...tickets].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  const filteredTickets = searchQuery
    ? sortedTickets.filter((t: TicketResponse) =>
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toString().includes(searchQuery)
      )
    : sortedTickets;

  const total = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedTickets = filteredTickets.slice((page - 1) * limit, page * limit);

  const handleCreateTicket = () => {
    if (!newTicket.sujet.trim() || !newTicket.description.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createMutation.mutate(newTicket);
  };

  const filters: { value: StatusKey; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'ouvert', label: 'Ouverts' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'ferme', label: 'Fermés' },
  ];

  return (
    <div className="-m-2 md:-m-4 lg:-m-6">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
          <div className="min-w-0 flex-1">
            <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              <span>Support</span>
              <span>/</span>
              <span className="text-[#E04A1F]">Tickets</span>
            </nav>
            <h1
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f] leading-tight"
              style={MANROPE}
            >
              Tickets
            </h1>
            <p className="text-[#585e6c] font-medium mt-1">
              Communiquez avec votre gestionnaire
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 px-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-3xl">
              <DialogHeader>
                <DialogTitle
                  className="text-2xl font-extrabold text-[#171c1f]"
                  style={MANROPE}
                >
                  Ouvrir un ticket
                </DialogTitle>
                <DialogDescription className="text-[#585e6c]">
                  Décrivez votre demande pour contacter votre gestionnaire.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="sujet" className="text-sm font-bold text-[#171c1f]">
                    Sujet
                  </Label>
                  <Input
                    id="sujet"
                    placeholder="Ex: Problème d'accès employés"
                    value={newTicket.sujet}
                    onChange={(e) => setNewTicket((p) => ({ ...p, sujet: e.target.value }))}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-bold text-[#171c1f]">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre demande en détail..."
                    rows={5}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                    className="mt-1.5 rounded-xl border-slate-200"
                  />
                </div>
                <Button
                  className="w-full bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2"
                  onClick={handleCreateTicket}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Envoyer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-5 mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#585e6c]" />
          <Input
            placeholder="Rechercher par sujet ou ID..."
            className="pl-11 h-11 rounded-xl border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition ${
                  active
                    ? 'bg-[#E04A1F] text-white shadow-md'
                    : 'bg-[#f0f4f8] text-[#585e6c] hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compteur */}
      {!isLoading && filteredTickets.length > 0 && (
        <div className="flex items-center justify-end mb-3">
          <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
            {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <p className="font-bold text-[#171c1f]" style={MANROPE}>
            Une erreur est survenue
          </p>
          <p className="text-sm text-[#585e6c] mt-1">{(error as Error).message}</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-[#E04A1F]" />
          </div>
          <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>
            Aucun ticket
          </p>
          <p className="text-sm text-[#585e6c] mt-1">
            Créez votre premier ticket pour contacter votre gestionnaire
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedTickets.map((ticket: TicketResponse, idx: number) => {
            const messagesCount =
              (ticket as any)._count?.messages ?? ticket.messages?.length ?? 0;
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link href={`/tickets/${ticket.id}`} className="block group">
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#ffdbd0] transition-all p-5 md:p-6 flex items-center gap-4 md:gap-6">
                    {/* ID circle */}
                    <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] text-[#E04A1F] flex items-center justify-center shrink-0 font-extrabold text-sm" style={MANROPE}>
                      <Hash className="w-4 h-4" />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          #{ticket.id}
                        </span>
                        <StatusPill statut={ticket.statut} />
                      </div>
                      <h3
                        className="text-base md:text-lg font-extrabold text-[#171c1f] leading-tight truncate group-hover:text-[#E04A1F] transition-colors"
                        style={MANROPE}
                      >
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-[#585e6c] mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {messagesCount} message{messagesCount > 1 ? 's' : ''}
                        </span>
                        {ticket.createdAt && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                        {ticket.updatedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Maj : {format(new Date(ticket.updatedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow CTA */}
                    <div className="w-10 h-10 rounded-full bg-[#f0f4f8] group-hover:bg-[#E04A1F] flex items-center justify-center transition-colors shrink-0">
                      <ArrowRight className="w-4 h-4 text-[#171c1f] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f4f8] text-[#171c1f] text-sm font-bold hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              <p className="text-sm text-[#585e6c] font-medium">
                Page <span className="font-bold text-[#171c1f]">{page}</span> sur{' '}
                <span className="font-bold text-[#171c1f]">{totalPages}</span>
                {total > 0 && (
                  <span className="hidden sm:inline"> · {total} tickets</span>
                )}
              </p>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E04A1F] text-white text-sm font-bold hover:bg-[#C8330F] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
