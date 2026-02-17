"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  Download,
  Car
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface VehicleDocument {
  id: string;
  document_name: string;
  vehicle_registration: string;
  document_type: string;
  expiry_date?: string;
  created_date: string;
}

const documentTypeLabels: Record<string, string> = {
  carte_grise: "Carte grise",
  assurance: "Assurance",
  controle_technique: "Controle technique",
  facture_entretien: "Facture entretien",
  contrat_location: "Contrat location",
  autre: "Autre"
};

export default function VehicleDocuments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: documents = [] } = useQuery<VehicleDocument[]>({
    queryKey: ['vehicleDocuments'],
    queryFn: () => base44.entities.VehicleDocument.list('-created_date'),
  });

  const getDocumentStatus = (doc: VehicleDocument) => {
    if (!doc.expiry_date) return 'ok';
    const expiryDate = new Date(doc.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'ok';
  };

  const getVehicleDocumentStatus = (registration: string) => {
    const vehicleDocs = documents.filter(d => d.vehicle_registration === registration);
    const requiredTypes = ['carte_grise', 'assurance', 'controle_technique'];

    const hasExpired = vehicleDocs.some(d => getDocumentStatus(d) === 'expired');
    const hasExpiringSoon = vehicleDocs.some(d => getDocumentStatus(d) === 'expiring_soon');
    const missingRequired = requiredTypes.filter(type =>
      !vehicleDocs.some(d => d.document_type === type)
    );

    if (hasExpired || missingRequired.length > 0) return 'critical';
    if (hasExpiringSoon) return 'warning';
    return 'ok';
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.brand?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const vehicleDocs = documents.filter(d => d.vehicle_registration === v.registration);

    if (docTypeFilter !== 'all') {
      const hasDocType = vehicleDocs.some(d => d.document_type === docTypeFilter);
      if (!hasDocType) return false;
    }

    if (statusFilter !== 'all') {
      const vehicleStatus = getVehicleDocumentStatus(v.registration);
      if (statusFilter === 'critical' && vehicleStatus !== 'critical') return false;
      if (statusFilter === 'warning' && vehicleStatus !== 'warning') return false;
      if (statusFilter === 'ok' && vehicleStatus !== 'ok') return false;
    }

    return true;
  });

  const stats = {
    total: vehicles.length,
    critical: vehicles.filter(v => getVehicleDocumentStatus(v.registration) === 'critical').length,
    warning: vehicles.filter(v => getVehicleDocumentStatus(v.registration) === 'warning').length,
    ok: vehicles.filter(v => getVehicleDocumentStatus(v.registration) === 'ok').length,
  };

  const upcomingExpirations = documents
    .filter(d => {
      const status = getDocumentStatus(d);
      return status === 'expiring_soon' || status === 'expired';
    })
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Documents vehicules</h1>
            <p className="text-slate-500">Gestion centralisee des documents</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total vehicules</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-sm text-red-700 mb-1">Critique</p>
          <p className="text-2xl font-bold text-red-800">{stats.critical}</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p className="text-sm text-orange-700 mb-1">Attention</p>
          <p className="text-2xl font-bold text-orange-800">{stats.warning}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">A jour</p>
          <p className="text-2xl font-bold text-green-800">{stats.ok}</p>
        </div>
      </div>

      {/* Upcoming Expirations */}
      {upcomingExpirations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                Documents arrivant a expiration
              </h3>
              <div className="space-y-2">
                {upcomingExpirations.map((doc) => {
                  const status = getDocumentStatus(doc);
                  const expiryDate = new Date(doc.expiry_date!);
                  const daysUntil = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">{doc.vehicle_registration}</p>
                        <p className="text-sm text-slate-600">{documentTypeLabels[doc.document_type]}</p>
                      </div>
                      <Badge className={status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                        {status === 'expired' ? 'Expire' : `${daysUntil} jours`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un vehicule..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Type de document" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="carte_grise">Carte grise</SelectItem>
              <SelectItem value="assurance">Assurance</SelectItem>
              <SelectItem value="controle_technique">Controle technique</SelectItem>
              <SelectItem value="facture_entretien">Factures</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="warning">Attention</SelectItem>
              <SelectItem value="ok">A jour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => {
          const vehicleDocs = documents.filter(d => d.vehicle_registration === vehicle.registration);
          const status = getVehicleDocumentStatus(vehicle.registration);
          const requiredTypes = ['carte_grise', 'assurance', 'controle_technique'];
          const missingDocs = requiredTypes.filter(type =>
            !vehicleDocs.some(d => d.document_type === type)
          );

          return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
                status === 'critical' ? 'border-red-200' :
                status === 'warning' ? 'border-orange-200' :
                'border-slate-200'
              }`}
            >
              <Link href={`/vehicle-documents/${vehicle.registration}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      status === 'critical' ? 'bg-red-50' :
                      status === 'warning' ? 'bg-orange-50' :
                      'bg-green-50'
                    }`}>
                      <Car className={`w-5 h-5 ${
                        status === 'critical' ? 'text-red-600' :
                        status === 'warning' ? 'text-orange-600' :
                        'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{vehicle.registration}</p>
                      <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                    </div>
                  </div>
                  {status === 'critical' ? (
                    <Badge className="bg-red-100 text-red-700 border-0">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critique
                    </Badge>
                  ) : status === 'warning' ? (
                    <Badge className="bg-orange-100 text-orange-700 border-0">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Attention
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      A jour
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Documents</span>
                    <span className="font-medium text-slate-800">{vehicleDocs.length}</span>
                  </div>
                  {missingDocs.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs font-medium text-red-800 mb-1">Documents manquants:</p>
                      <div className="flex flex-wrap gap-1">
                        {missingDocs.map(type => (
                          <Badge key={type} variant="outline" className="text-xs text-red-600 border-red-300">
                            {documentTypeLabels[type]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <FileText className="w-4 h-4" />
                  Voir les documents
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
