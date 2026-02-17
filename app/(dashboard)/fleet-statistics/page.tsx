"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Car,
  Fuel,
  Wrench,
  DollarSign,
  Calendar,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FleetKPIOverview from "@/components/fleet/FleetKPIOverview";
import CostBreakdownChart from "@/components/fleet/CostBreakdownChart";
import VehiclePerformanceTable from "@/components/fleet/VehiclePerformanceTable";
import DepartmentCostComparison from "@/components/fleet/DepartmentCostComparison";
import TrendAnalysisChart from "@/components/fleet/TrendAnalysisChart";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  status: string;
  department?: string;
}

interface FuelRequest {
  id: string;
  created_date: string;
  department?: string;
  status: string;
  actual_cost?: number;
  estimated_cost?: number;
}

interface MaintenanceRecord {
  id: string;
  created_date: string;
  vehicle_registration: string;
  status: string;
  cost?: number;
}

interface Department {
  id: string;
  name: string;
}

interface VehicleDocument {
  id: string;
  document_name: string;
  vehicle_registration: string;
  document_type: string;
  expiry_date?: string;
}

export default function FleetStatistics() {
  const [period, setPeriod] = useState("month");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: fuelRequests = [] } = useQuery<FuelRequest[]>({
    queryKey: ['fuelRequests'],
    queryFn: () => base44.entities.FuelRequest.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: documents = [] } = useQuery<VehicleDocument[]>({
    queryKey: ['vehicleDocuments'],
    queryFn: () => base44.entities.VehicleDocument.list(),
  });

  // Filter data by period
  const getDateRange = () => {
    const now = new Date();
    const start = new Date();

    if (period === "week") {
      start.setDate(now.getDate() - 7);
    } else if (period === "month") {
      start.setMonth(now.getMonth() - 1);
    } else if (period === "quarter") {
      start.setMonth(now.getMonth() - 3);
    } else if (period === "year") {
      start.setFullYear(now.getFullYear() - 1);
    }

    return { start, end: now };
  };

  const { start, end } = getDateRange();

  const filteredFuelRequests = fuelRequests.filter(f => {
    const date = new Date(f.created_date);
    const matchesPeriod = date >= start && date <= end;
    const matchesDept = departmentFilter === "all" || f.department === departmentFilter;
    return matchesPeriod && matchesDept;
  });

  const filteredMaintenance = maintenanceRecords.filter(m => {
    const date = new Date(m.created_date);
    const matchesPeriod = date >= start && date <= end;
    const vehicle = vehicles.find(v => v.registration === m.vehicle_registration);
    const matchesDept = departmentFilter === "all" || vehicle?.department === departmentFilter;
    return matchesPeriod && matchesDept;
  });

  const filteredVehicles = departmentFilter === "all"
    ? vehicles
    : vehicles.filter(v => v.department === departmentFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Statistiques Flotte</h1>
            <p className="text-slate-500">Analyse detaillee des couts et performances</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">Periode:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "week", label: "7 jours" },
              { value: "month", label: "Mois" },
              { value: "quarter", label: "Trimestre" },
              { value: "year", label: "Annee" }
            ].map(p => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p.value)}
                className={period === p.value ? "gradient-subito text-white border-0" : ""}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Building2 className="w-4 h-4 text-slate-400" />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous departements</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <FleetKPIOverview
        vehicles={filteredVehicles}
        fuelRequests={filteredFuelRequests}
        maintenanceRecords={filteredMaintenance}
        documents={documents}
        period={period}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="costs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="costs">Couts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostBreakdownChart
              fuelRequests={filteredFuelRequests}
              maintenanceRecords={filteredMaintenance}
              documents={documents}
              title="Repartition des couts"
            />
            <DepartmentCostComparison
              vehicles={vehicles}
              fuelRequests={filteredFuelRequests}
              maintenanceRecords={filteredMaintenance}
              departments={departments}
            />
          </div>

          <VehiclePerformanceTable
            vehicles={filteredVehicles}
            fuelRequests={filteredFuelRequests}
            maintenanceRecords={filteredMaintenance}
          />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <VehiclePerformanceTable
            vehicles={filteredVehicles}
            fuelRequests={filteredFuelRequests}
            maintenanceRecords={filteredMaintenance}
            detailed
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <TrendAnalysisChart
            fuelRequests={fuelRequests}
            maintenanceRecords={maintenanceRecords}
            period={period}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
