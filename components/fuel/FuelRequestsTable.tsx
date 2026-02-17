'use client';

import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Fuel, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const statusConfig: Record<string, StatusConfig> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approuvee", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "Refusee", color: "bg-red-100 text-red-700", icon: XCircle },
  dispensed: { label: "Distribuee", color: "bg-blue-100 text-blue-700", icon: Fuel },
  completed: { label: "Completee", color: "bg-slate-100 text-slate-700", icon: CheckCircle2 },
};

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  vehicle_type?: string;
  driver_name: string;
  department?: string;
  fuel_type: string;
  quantity_liters: number;
  actual_cost?: number;
  estimated_cost?: number;
  status: string;
  created_date: string;
}

interface FuelRequestsTableProps {
  requests: FuelRequest[];
}

export default function FuelRequestsTable({ requests }: FuelRequestsTableProps) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Fuel className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-400">Aucune demande de carburant</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Vehicule
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Conducteur
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Carburant
              </th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Quantite
              </th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Cout
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Statut
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((request, index) => {
              const status = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-50">
                        <Fuel className="w-4 h-4 text-subito" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{request.vehicle_registration}</p>
                        {request.vehicle_type && (
                          <p className="text-xs text-slate-500">{request.vehicle_type}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-700">{request.driver_name}</p>
                        {request.department && (
                          <p className="text-xs text-slate-500">{request.department}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="capitalize">
                      {request.fuel_type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-medium text-slate-800">{request.quantity_liters} L</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-medium text-slate-800">
                      {(request.actual_cost || request.estimated_cost || 0).toLocaleString()} FCFA
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${status.color} border-0 gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-500">
                      {format(new Date(request.created_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
