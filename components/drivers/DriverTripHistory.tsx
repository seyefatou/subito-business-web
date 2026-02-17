'use client';

import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar } from "lucide-react";

interface Driver {
  id: string;
  full_name: string;
}

interface FuelRequest {
  id: string;
  vehicle_registration: string;
  quantity_liters?: number;
  actual_cost?: number;
  estimated_cost?: number;
  created_date: string;
  station_name?: string;
  odometer_reading?: number;
  purpose?: string;
}

interface DriverTripHistoryProps {
  driver: Driver;
  fuelRequests: FuelRequest[];
}

export default function DriverTripHistory({ driver, fuelRequests }: DriverTripHistoryProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Historique des trajets</h3>
      {fuelRequests.length === 0 ? (
        <p className="text-slate-400 text-center py-8">Aucun trajet enregistre</p>
      ) : (
        <div className="space-y-4">
          {fuelRequests.map((request) => (
            <div key={request.id} className="p-4 rounded-xl border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <MapPin className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{request.vehicle_registration}</p>
                    {request.station_name && (
                      <p className="text-sm text-slate-500">{request.station_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{request.quantity_liters} L</p>
                  <p className="text-sm text-slate-500">
                    {(request.actual_cost || request.estimated_cost || 0).toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(request.created_date), 'd MMM yyyy a HH:mm', { locale: fr })}</span>
                </div>
                {request.odometer_reading && (
                  <span>Kilometrage: {request.odometer_reading.toLocaleString()} km</span>
                )}
              </div>

              {request.purpose && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-2 rounded">{request.purpose}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
