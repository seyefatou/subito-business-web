'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  User,
  Shield,
  Hash,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { api, TicketResponse, TicketMessageResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  ouvert:   { label: 'Ouvert',   bg: 'bg-[#E04A1F]',    text: 'text-white',        icon: Circle },
  en_cours: { label: 'En cours', bg: 'bg-amber-100',     text: 'text-amber-700',    icon: RefreshCw },
  ferme:    { label: 'Fermé',    bg: 'bg-[#f0f4f8]',     text: 'text-[#585e6c]',    icon: CheckCircle2 },
};

function StatusPill({ statut }: { statut: string }) {
  const cfg = statusConfig[statut] || { label: statut, bg: 'bg-[#f0f4f8]', text: 'text-[#585e6c]', icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticketResponse, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.tickets.get(id),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.tickets.sendMessage(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setMessageContent('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const raw = ticketResponse as any;
  const ticket: TicketResponse | undefined = raw?.data?.id ? raw.data : raw?.id ? raw : undefined;
  const messages: TicketMessageResponse[] = ticket?.messages || [];
  const isClosed = ticket?.statut === 'ferme';
  const managerName = (ticket as any)?.manager
    ? `${(ticket as any).manager.prenom || ''} ${(ticket as any).manager.nom || ''}`.trim() || 'Gestionnaire'
    : 'Gestionnaire';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = messageContent.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>Ticket introuvable</p>
        <p className="text-sm text-[#585e6c]">{(error as Error)?.message || 'Ce ticket n\'existe pas ou n\'est plus accessible.'}</p>
        <Button className="bg-[#E04A1F] hover:bg-[#C8330F] text-white rounded-2xl px-6 py-5 font-bold mt-2" onClick={() => router.push('/tickets')}>
          Retour aux tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="-m-2 md:-m-4 lg:-m-6 space-y-6">

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-100 px-6 md:px-10 lg:px-16 xl:px-24 py-8">
        <button
          onClick={() => router.push('/tickets')}
          className="flex items-center gap-2 text-sm font-bold text-[#585e6c] hover:text-[#E04A1F] transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour aux tickets
        </button>

        <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
          <div className="min-w-0 flex-1">
            <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              <span>Support</span>
              <span>/</span>
              <span>Tickets</span>
              <span>/</span>
              <span className="text-[#E04A1F]">#{ticket.id}</span>
            </nav>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <StatusPill statut={ticket.statut} />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#171c1f] leading-tight" style={MANROPE}>
              {ticket.subject}
            </h1>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-5 mt-6 text-sm text-[#585e6c]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ffdbd0] flex items-center justify-center">
              <Hash className="w-3.5 h-3.5 text-[#E04A1F]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ticket</p>
              <p className="font-extrabold text-[#171c1f] text-xs" style={MANROPE}>#{ticket.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f0f4f8] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-[#585e6c]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Messages</p>
              <p className="font-extrabold text-[#171c1f] text-xs" style={MANROPE}>{messages.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f0f4f8] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-[#585e6c]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ouvert le</p>
              <p className="font-extrabold text-[#171c1f] text-xs" style={MANROPE}>
                {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          {ticket.updatedAt && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#f0f4f8] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-[#585e6c]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dernière maj</p>
                <p className="font-extrabold text-[#171c1f] text-xs" style={MANROPE}>
                  {format(new Date(ticket.updatedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="px-6 md:px-10 lg:px-16 xl:px-24">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-[#f0f4f8]/50">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E04A1F] to-[#C8330F] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-[#171c1f] text-sm" style={MANROPE}>{managerName}</p>
              <p className="text-[10px] text-[#585e6c] font-semibold uppercase tracking-wider">Gestionnaire Subito</p>
            </div>
            <div className="ml-auto">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                En ligne
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: '480px' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-[#E04A1F]" />
                </div>
                <p className="font-bold text-[#171c1f]" style={MANROPE}>Aucun message</p>
                <p className="text-sm text-[#585e6c] mt-1">Envoyez votre premier message ci-dessous</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isCompany = msg.senderType === 'compagny';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-end gap-3 ${isCompany ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompany
                          ? 'bg-gradient-to-br from-[#E04A1F] to-[#C8330F]'
                          : 'bg-[#f0f4f8]'
                      }`}>
                        {isCompany
                          ? <User className="w-4 h-4 text-white" />
                          : <Shield className="w-4 h-4 text-[#585e6c]" />
                        }
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[70%] md:max-w-[60%] ${isCompany ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`flex items-center gap-2 px-1 ${isCompany ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] font-bold text-[#585e6c] uppercase tracking-wider">
                            {isCompany ? 'Vous' : managerName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                          isCompany
                            ? 'bg-gradient-to-br from-[#E04A1F] to-[#C8330F] text-white rounded-br-sm'
                            : 'bg-[#f0f4f8] text-[#171c1f] rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-300 px-1">
                          {format(new Date(msg.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {isClosed ? (
            <div className="px-6 py-5 bg-[#f0f4f8]/70 border-t border-slate-100 flex items-center justify-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#585e6c]" />
              <p className="text-sm font-semibold text-[#585e6c]">Ce ticket est fermé — aucun nouveau message possible</p>
            </div>
          ) : (
            <div className="px-6 py-5 border-t border-slate-100 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-[#f0f4f8] rounded-2xl px-4 py-3">
                  <Textarea
                    placeholder="Écrivez votre message… (Entrée pour envoyer)"
                    rows={2}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent border-none shadow-none resize-none p-0 text-sm text-[#171c1f] placeholder:text-slate-400 focus-visible:ring-0"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || !messageContent.trim()}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E04A1F] to-[#C8330F] flex items-center justify-center text-white shadow-lg shadow-[#E04A1F]/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {sendMutation.isPending
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Send className="w-5 h-5" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Entrée pour envoyer · Shift+Entrée pour un saut de ligne
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
