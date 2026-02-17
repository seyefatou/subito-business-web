'use client';

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Mail, MessageCircle, Monitor, LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type ValidationChannel = 'email' | 'whatsapp' | 'dashboard';

const channelIcons: Record<ValidationChannel, LucideIcon> = {
  email: Mail,
  whatsapp: MessageCircle,
  dashboard: Monitor,
};

interface Order {
  id: string;
  status: string;
  validated_by?: string;
  validated_at?: string;
  validation_channel?: ValidationChannel | string;
  rejection_reason?: string;
}

interface ValidationHistoryProps {
  order: Order;
}

export default function ValidationHistory({ order }: ValidationHistoryProps) {
  if (!order.validated_by && order.status === 'pending_company_validation') {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-slate-800">En attente de validation</p>
            <p className="text-sm text-slate-600 mt-0.5">
              Cette commande doit etre approuvee par un administrateur
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === 'rejected_by_company') {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">Refusee par l&apos;entreprise</p>
            {order.validated_by && (
              <p className="text-sm text-slate-600 mt-1">
                Par {order.validated_by}
              </p>
            )}
            {order.validated_at && (
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(order.validated_at), "d MMMM yyyy 'a' HH:mm", { locale: fr })}
              </p>
            )}
            {order.rejection_reason && (
              <p className="text-sm text-slate-700 mt-2 p-2 bg-white rounded-lg">
                Raison : {order.rejection_reason}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!order.validated_by) return null;

  const ChannelIcon = channelIcons[order.validation_channel as ValidationChannel] || Monitor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 rounded-2xl border border-green-200 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-green-100">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-800">Validee par l&apos;entreprise</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-600">{order.validated_by}</p>
            <span className="text-slate-300">&bull;</span>
            <div className="flex items-center gap-1">
              <ChannelIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 capitalize">
                {order.validation_channel === 'email' ? 'Email' :
                 order.validation_channel === 'whatsapp' ? 'WhatsApp' : 'Dashboard'}
              </span>
            </div>
          </div>
          {order.validated_at && (
            <p className="text-xs text-slate-500 mt-1">
              {format(new Date(order.validated_at), "d MMMM yyyy 'a' HH:mm", { locale: fr })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
