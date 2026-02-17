'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wrench, Calendar, DollarSign, CheckCircle2, Clock, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MaintenanceRecord {
  id: string;
  vehicle_registration: string;
  description?: string;
  type?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  cost?: number;
  created_date?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

async function fetchMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  // Note: Implement actual API call in Next.js
  // const response = await fetch('/api/maintenance?sort=-created_date&limit=20');
  // return response.json();
  return [];
}

export default function MaintenanceSection() {
  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenanceRecords'],
    queryFn: fetchMaintenanceRecords,
  });

  const statusConfig: Record<string, StatusConfig> = {
    scheduled: { label: "Planifie", color: "bg-blue-100 text-blue-700", icon: Clock },
    completed: { label: "Termine", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    cancelled: { label: "Annule", color: "bg-red-100 text-red-700", icon: Clock },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Entretien & Maintenance</h3>
        <div className="space-y-3">
          {maintenanceRecords.map((record) => {
            const status = statusConfig[record.status || 'scheduled'] || statusConfig.scheduled;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-orange-50">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-800">{record.vehicle_registration}</p>
                      <Badge className={`${status.color} border-0 text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{record.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="capitalize">{record.type}</span>
                      {record.cost && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {record.cost.toLocaleString()} FCFA
                        </span>
                      )}
                      {record.created_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(record.created_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {maintenanceRecords.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Aucun entretien</p>
          </div>
        )}
      </div>
    </div>
  );
}
