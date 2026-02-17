'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Fuel,
  Plus,
  Search,
  TrendingUp,
  FileText,
  Check,
  Clock,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import FuelRequestForm from "@/components/fuel/FuelRequestForm";
import FuelRequestsTable from "@/components/fuel/FuelRequestsTable";
import FuelConsumptionChart from "@/components/fuel/FuelConsumptionChart";
import FuelValidationPanel from "@/components/fuel/FuelValidationPanel";
import FuelCardManagement from "@/components/fuel/FuelCardManagement";
import MainCardRechargeForm from "@/components/fuel/MainCardRechargeForm";

interface FuelRequest {
  id: string;
  created_date: string;
  status: string;
  quantity_liters?: number;
  actual_cost?: number;
  estimated_cost?: number;
  vehicle_registration?: string;
  driver_name?: string;
  fuel_type?: string;
  station_name?: string;
}

interface Department {
  id: string;
  name: string;
}

interface FuelCard {
  id: string;
  card_number: string;
  card_type: string;
  created_date: string;
}

interface User {
  id: string;
  email: string;
}

interface RechargeData {
  amount: number;
  payment_method: string;
  notes?: string;
}

export default function FuelManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("requests");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: fuelRequests = [] } = useQuery<FuelRequest[]>({
    queryKey: ['fuelRequests'],
    queryFn: () => base44.entities.FuelRequest.list('-created_date', 200),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: fuelCards = [] } = useQuery<FuelCard[]>({
    queryKey: ['fuelCards'],
    queryFn: () => base44.entities.FuelCard.list('-created_date'),
  });

  const { data: user } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const createRechargeRequest = useMutation({
    mutationFn: async (data: RechargeData) => {
      const mainCard = await base44.entities.FuelCard.list();
      const companyCard = mainCard.find((c: FuelCard) => c.card_type === 'company_main');

      await base44.entities.FuelCardTransaction.create({
        transaction_type: 'recharge_main',
        to_card: companyCard?.card_number || 'MAIN',
        amount: data.amount,
        status: 'pending',
        notes: `${data.payment_method} - ${data.notes || ''}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCardTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['fuelCards'] });
      setShowNewRequestDialog(false);
      toast.success("Demande d'approvisionnement creee");
    },
    onError: () => {
      toast.error("Erreur lors de la creation");
    }
  });

  // Stats
  const pendingRequests = fuelRequests.filter(r => r.status === 'pending').length;
  const approvedRequests = fuelRequests.filter(r => r.status === 'approved').length;
  const totalLiters = fuelRequests
    .filter(r => r.status === 'completed' || r.status === 'dispensed')
    .reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
  const totalCost = fuelRequests
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);

  const handleExportConsumption = () => {
    const headers = ['Date', 'Vehicule', 'Conducteur', 'Carburant', 'Quantite (L)', 'Cout', 'Station'];
    const rows = fuelRequests
      .filter(r => r.status === 'completed')
      .map(r => [
        format(new Date(r.created_date), 'dd/MM/yyyy'),
        r.vehicle_registration,
        r.driver_name,
        r.fuel_type,
        r.quantity_liters,
        r.actual_cost || r.estimated_cost,
        r.station_name || '-'
      ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consommation-carburant-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestion Carburant</h1>
            <p className="text-slate-500">Demandes, validation et suivi</p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewRequestDialog(true)}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Demande d&apos;approvisionnement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "En attente",
            value: pendingRequests,
            icon: Clock,
            color: "bg-amber-100",
            textColor: "text-amber-700"
          },
          {
            label: "Approuvees",
            value: approvedRequests,
            icon: Check,
            color: "bg-green-100",
            textColor: "text-green-700"
          },
          {
            label: "Total litres",
            value: totalLiters.toFixed(0) + " L",
            icon: Fuel,
            color: "bg-blue-100",
            textColor: "text-blue-700"
          },
          {
            label: "Cout total",
            value: totalCost.toLocaleString() + " FCFA",
            icon: TrendingUp,
            color: "bg-purple-100",
            textColor: "text-purple-700"
          },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.textColor}`} />
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="cards" className="gap-2">
            <Fuel className="w-4 h-4" />
            Cartes
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="w-4 h-4" />
            Demandes
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <Check className="w-4 h-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="consumption" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Consommations
          </TabsTrigger>
        </TabsList>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-4 mt-6">
          <FuelCardManagement
            cards={fuelCards}
            user={user}
          />
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par vehicule, conducteur..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <FuelRequestsTable
            requests={fuelRequests.filter(r =>
              r.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.driver_name?.toLowerCase().includes(searchTerm.toLowerCase())
            )}
          />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4 mt-6">
          <FuelValidationPanel
            requests={fuelRequests.filter(r => r.status === 'pending' || r.status === 'approved')}
          />
        </TabsContent>

        {/* Consumption Tab */}
        <TabsContent value="consumption" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button variant="outline" className="gap-2" onClick={handleExportConsumption}>
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>

          <FuelConsumptionChart
            requests={fuelRequests.filter(r => r.status === 'completed' || r.status === 'dispensed')}
          />

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Historique des consommations</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-3 px-4">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-3 px-4">Vehicule</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-3 px-4">Carburant</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase py-3 px-4">Quantite</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase py-3 px-4">Cout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuelRequests
                    .filter(r => r.status === 'completed')
                    .slice(0, 10)
                    .map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(req.created_date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-slate-800">{req.vehicle_registration}</p>
                          <p className="text-xs text-slate-500">{req.driver_name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {req.fuel_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-800">
                          {req.quantity_liters} L
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-800">
                          {(req.actual_cost || req.estimated_cost || 0).toLocaleString()} FCFA
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recharge Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demande d&apos;approvisionnement carte principale</DialogTitle>
          </DialogHeader>
          <MainCardRechargeForm
            onSubmit={(data: RechargeData) => createRechargeRequest.mutate(data)}
            onCancel={() => setShowNewRequestDialog(false)}
            isSubmitting={createRechargeRequest.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
