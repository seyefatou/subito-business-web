'use client';

import React, { useState, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Filter, Edit, CheckCircle2, Clock, XCircle, LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MaintenanceStatus = 'scheduled' | 'completed' | 'cancelled';
type MaintenanceType = 'vidange' | 'filtres' | 'freins' | 'pneus' | 'batterie' | 'revision' | 'reparation' | 'autre';

interface StatusConfigItem {
  label: string;
  icon: LucideIcon;
  color: string;
}

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_registration?: string;
  description?: string;
  service_provider?: string;
  status: MaintenanceStatus;
  type: MaintenanceType;
  cost?: number;
  created_date?: string;
}

interface MaintenanceHistoryProps {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  onEdit: (record: MaintenanceRecord) => void;
}

const statusConfig: Record<MaintenanceStatus, StatusConfigItem> = {
  scheduled: { label: "Planifiee", icon: Clock, color: "bg-blue-100 text-blue-700" },
  completed: { label: "Realisee", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulee", icon: XCircle, color: "bg-red-100 text-red-700" }
};

const typeIcons: Record<MaintenanceType, string> = {
  vidange: "Oil",
  filtres: "Wrench",
  freins: "Stop",
  pneus: "Circle",
  batterie: "Battery",
  revision: "Check",
  reparation: "Hammer",
  autre: "Settings"
};

export default function MaintenanceHistory({ records, vehicles, onEdit }: MaintenanceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.service_provider?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesType = typeFilter === "all" || record.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par vehicule, description..."
              className="pl-10"
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="scheduled">Planifiee</SelectItem>
              <SelectItem value="completed">Realisee</SelectItem>
              <SelectItem value="cancelled">Annulee</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="vidange">Vidange</SelectItem>
              <SelectItem value="filtres">Filtres</SelectItem>
              <SelectItem value="freins">Freins</SelectItem>
              <SelectItem value="pneus">Pneus</SelectItem>
              <SelectItem value="batterie">Batterie</SelectItem>
              <SelectItem value="revision">Revision</SelectItem>
              <SelectItem value="reparation">Reparation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Vehicule
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Description
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Prestataire
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Cout
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Statut
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Date
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Aucune intervention trouvee
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const status = statusConfig[record.status];
                  const StatusIcon = status.icon;
                  const vehicle = vehicles.find(v => v.registration === record.vehicle_registration);

                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => onEdit(record)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{record.vehicle_registration}</p>
                          <p className="text-xs text-slate-500">
                            {vehicle?.brand} {vehicle?.model}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm capitalize">{record.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 max-w-xs truncate">
                          {record.description}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">
                          {record.service_provider || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {record.cost ? `${record.cost.toLocaleString()} FCFA` : '—'}
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
                          {record.created_date && format(new Date(record.created_date), "d MMM yyyy", { locale: fr })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(record);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
