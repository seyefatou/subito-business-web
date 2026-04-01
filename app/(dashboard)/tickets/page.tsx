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
  Eye,
  Loader2,
  AlertCircle,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { api, TicketResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  ouvert: { label: 'Ouvert', variant: 'default', color: 'bg-blue-100 text-blue-700' },
  en_cours: { label: 'En cours', variant: 'secondary', color: 'bg-yellow-100 text-yellow-700' },
  ferme: { label: 'Fermé', variant: 'outline', color: 'bg-gray-100 text-gray-500' },
};

function getStatusBadge(statut: string) {
  const config = statusConfig[statut] || { label: statut, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const limit = 10;

  const { data: ticketsResponse, isLoading, error } = useQuery({
    queryKey: ['tickets', page, statusFilter],
    queryFn: () =>
      api.tickets.list({
        page,
        limit,
        statut: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject: string; message: string }) => api.tickets.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket créé avec succès');
      setDialogOpen(false);
      setNewTicket({ subject: '', message: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // La réponse peut être wrappée ou directe
  const raw = ticketsResponse as any;
  const tickets: TicketResponse[] =
    raw?.data?.data || raw?.data?.items || raw?.data || raw?.items || [];
  const total: number = raw?.data?.total ?? raw?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const sortedTickets = [...tickets].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  const filteredTickets = searchQuery
    ? sortedTickets.filter((t: TicketResponse) =>
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toString().includes(searchQuery)
      )
    : sortedTickets;

  const handleCreateTicket = () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createMutation.mutate(newTicket);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Communiquez avec votre gestionnaire
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ouvrir un ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  placeholder="Ex: Problème d'accès employés"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Décrivez votre demande en détail..."
                  rows={5}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={handleCreateTicket}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par sujet ou ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ouvert">Ouvert</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="ferme">Fermé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p>{(error as Error).message}</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">Aucun ticket</p>
          <p className="text-sm">Créez votre premier ticket pour contacter votre gestionnaire</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Sujet</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Messages</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Mise à jour</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket: TicketResponse, idx: number) => (
                  <motion.tr
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">#{ticket.id}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(ticket.statut)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {(ticket as any)._count?.messages ?? ticket.messages?.length ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {ticket.createdAt
                        ? format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: fr })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {ticket.updatedAt
                        ? format(new Date(ticket.updatedAt), 'dd MMM yyyy HH:mm', { locale: fr })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Page {page} sur {totalPages} ({total} tickets)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600">{page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
