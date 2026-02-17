'use client';

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  created_date: string;
  status?: string;
  actual_cost?: number;
  estimated_cost?: number;
  quantity_liters?: number;
}

interface VehicleConsumption {
  totalLiters: number;
  totalCost: number;
  count: number;
}

type Period = 'week' | 'month' | 'year';

interface FuelConsumptionAlertsProps {
  vehicles: Vehicle[];
  fuelRequests: FuelRequest[];
  period: Period;
}

export default function FuelConsumptionAlerts({ vehicles, fuelRequests, period }: FuelConsumptionAlertsProps) {
  // Calculate consumption by vehicle for the period
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const startDate = new Date();

    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getDateRange();

  // Calculate consumption per vehicle
  const vehicleConsumption: Record<string, VehicleConsumption> = {};
  const completedRequests = fuelRequests.filter(r =>
    (r.status === 'completed' || r.status === 'dispensed') &&
    new Date(r.created_date) >= startDate &&
    new Date(r.created_date) <= endDate
  );

  completedRequests.forEach(request => {
    if (!vehicleConsumption[request.vehicle_registration]) {
      vehicleConsumption[request.vehicle_registration] = {
        totalLiters: 0,
        totalCost: 0,
        count: 0
      };
    }
    vehicleConsumption[request.vehicle_registration].totalLiters += request.quantity_liters || 0;
    vehicleConsumption[request.vehicle_registration].totalCost += request.actual_cost || request.estimated_cost || 0;
    vehicleConsumption[request.vehicle_registration].count += 1;
  });

  // Calculate fleet average
  const totalVehicles = Object.keys(vehicleConsumption).length;
  const totalLiters = Object.values(vehicleConsumption).reduce((sum, v) => sum + v.totalLiters, 0);
  const fleetAverage = totalVehicles > 0 ? totalLiters / totalVehicles : 0;

  // Find vehicles with high consumption (>20% above average)
  const highConsumptionVehicles = Object.entries(vehicleConsumption)
    .filter(([_, data]) => data.totalLiters > fleetAverage * 1.2)
    .sort((a, b) => b[1].totalLiters - a[1].totalLiters);

  if (highConsumptionVehicles.length === 0) {
    return null;
  }

  return (
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
            {highConsumptionVehicles.length} vehicule{highConsumptionVehicles.length > 1 ? 's en' : ' en'} surconsommation
          </h3>
          <p className="text-sm text-amber-700 mb-4">
            Ces vehicules consomment plus de 20% au-dessus de la moyenne de la flotte ({fleetAverage.toFixed(0)} L)
          </p>
          <div className="space-y-2">
            {highConsumptionVehicles.slice(0, 5).map(([registration, data]) => {
              const vehicle = vehicles.find(v => v.registration === registration);
              const percentAboveAverage = ((data.totalLiters - fleetAverage) / fleetAverage * 100).toFixed(0);

              return (
                <div key={registration} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-slate-800">{registration}</p>
                      <p className="text-xs text-slate-600">
                        {vehicle?.brand} {vehicle?.model}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{data.totalLiters.toFixed(0)} L</p>
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                      +{percentAboveAverage}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
