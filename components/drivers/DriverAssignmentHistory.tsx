'use client';

import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Car, Calendar, CheckCircle2, XCircle, Clock, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Driver {
  id: string;
  full_name: string;
}

interface Assignment {
  id: string;
  vehicle_registration: string;
  assignment_type: 'permanent' | 'temporary' | 'mission' | string;
  status: 'active' | 'completed' | 'cancelled' | string;
  start_date: string;
  end_date?: string;
  notes?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

interface DriverAssignmentHistoryProps {
  driver: Driver;
  assignments: Assignment[];
}

export default function DriverAssignmentHistory({ driver, assignments }: DriverAssignmentHistoryProps) {
  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'active':
        return { label: 'Actif', color: 'bg-slate-100 text-slate-700', icon: Clock };
      case 'completed':
        return { label: 'Termine', color: 'bg-slate-100 text-slate-700', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Annule', color: 'bg-slate-100 text-slate-700', icon: XCircle };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700', icon: Clock };
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'permanent': return 'Permanent';
      case 'temporary': return 'Temporaire';
      case 'mission': return 'Mission';
      default: return type;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Historique des affectations</h3>
      {assignments.length === 0 ? (
        <p className="text-slate-400 text-center py-8">Aucune affectation</p>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const statusConfig = getStatusConfig(assignment.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={assignment.id} className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Car className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{assignment.vehicle_registration}</p>
                      <p className="text-sm text-slate-500">{getTypeLabel(assignment.assignment_type)}</p>
                    </div>
                  </div>
                  <Badge className={`${statusConfig.color} border-0 gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Debut: {format(new Date(assignment.start_date), 'd MMM yyyy', { locale: fr })}</span>
                  </div>
                  {assignment.end_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Fin: {format(new Date(assignment.end_date), 'd MMM yyyy', { locale: fr })}</span>
                    </div>
                  )}
                </div>

                {assignment.notes && (
                  <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-2 rounded">{assignment.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
