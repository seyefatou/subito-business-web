'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  User,
  Shield,
} from 'lucide-react';
import { api, TicketResponse, TicketMessageResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string }> = {
  ouvert: { label: 'Ouvert', color: 'bg-blue-100 text-blue-700' },
  en_cours: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  ferme: { label: 'Fermé', color: 'bg-gray-100 text-gray-500' },
};

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
      toast.success('Message envoyé');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // La réponse peut être { data: ticket } ou directement le ticket
  const raw = ticketResponse as any;
  const ticket: TicketResponse | undefined = raw?.data?.id ? raw.data : raw?.id ? raw : undefined;
  const messages: TicketMessageResponse[] = ticket?.messages || [];
  const isClosed = ticket?.statut === 'ferme';
  const managerName = (ticket as any)?.manager
    ? `${(ticket as any).manager.prenom || ''} ${(ticket as any).manager.nom || ''}`.trim()
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>{(error as Error)?.message || 'Ticket introuvable'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/tickets')}>
          Retour aux tickets
        </Button>
      </div>
    );
  }

  const statusCfg = statusConfig[ticket.statut] || { label: ticket.statut, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tickets')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">{ticket.subject}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Ticket #{ticket.id} &middot; Ouvert le{' '}
            {format(new Date(ticket.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MessageSquare className="w-4 h-4" />
            <span>{messages.length} message{messages.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2" />
              <p>Aucun message</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isCompany = msg.senderType === 'company';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex ${isCompany ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isCompany
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isCompany ? (
                        <User className="w-3.5 h-3.5 opacity-70" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className={`text-xs font-medium ${isCompany ? 'text-white/80' : 'text-slate-500'}`}>
                        {isCompany ? 'Vous' : managerName}
                      </span>
                      <span className={`text-xs ${isCompany ? 'text-white/60' : 'text-slate-400'}`}>
                        {format(new Date(msg.createdAt), 'dd/MM HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply form */}
        {isClosed ? (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center text-sm text-slate-500">
            Ce ticket est fermé. Vous ne pouvez plus envoyer de messages.
          </div>
        ) : (
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-3">
              <Textarea
                placeholder="Votre réponse..."
                rows={2}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 resize-none"
              />
              <Button
                className="self-end bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={handleSend}
                disabled={sendMutation.isPending || !messageContent.trim()}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne</p>
          </div>
        )}
      </div>
    </div>
  );
}
