'use client';

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FuelConsumptionByVehicle from "./FuelConsumptionByVehicle";
import FuelConsumptionByDriver from "./FuelConsumptionByDriver";
import FuelConsumptionByDepartment from "./FuelConsumptionByDepartment";
import FuelConsumptionAlerts from "./FuelConsumptionAlerts";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  driver_name?: string;
  department?: string;
  created_date: string;
  status?: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface Department {
  id: string;
  name: string;
}

type Period = 'week' | 'month' | 'year';

interface FuelConsumptionTabProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  departments: Department[];
}

export default function FuelConsumptionTab({ vehicles, fuelRequests, departments }: FuelConsumptionTabProps) {
  const [period, setPeriod] = useState<Period>("month");

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Analyse des consommations</h3>
        <div className="flex gap-2">
          <Button
            variant={period === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("week")}
          >
            Semaine
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("month")}
          >
            Mois
          </Button>
          <Button
            variant={period === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("year")}
          >
            Annee
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <FuelConsumptionAlerts
        vehicles={vehicles}
        fuelRequests={fuelRequests}
        period={period}
      />

      {/* Tabs */}
      <Tabs defaultValue="vehicles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vehicles">Par vehicule</TabsTrigger>
          <TabsTrigger value="drivers">Par chauffeur</TabsTrigger>
          <TabsTrigger value="departments">Par departement</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <FuelConsumptionByVehicle
            vehicles={vehicles}
            fuelRequests={fuelRequests}
            period={period}
          />
        </TabsContent>

        <TabsContent value="drivers">
          <FuelConsumptionByDriver
            fuelRequests={fuelRequests}
            period={period}
          />
        </TabsContent>

        <TabsContent value="departments">
          <FuelConsumptionByDepartment
            fuelRequests={fuelRequests}
            departments={departments}
            period={period}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
