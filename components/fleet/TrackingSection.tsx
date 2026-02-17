'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, Navigation, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  tracking_enabled?: boolean;
}

interface VehicleWithPosition extends Vehicle {
  lat: number;
  lng: number;
  speed: number;
  lastUpdate: string;
}

async function fetchVehicles(): Promise<Vehicle[]> {
  // Note: Implement actual API call in Next.js
  // const response = await fetch('/api/vehicles');
  // return response.json();
  return [];
}

export default function TrackingSection() {
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
  });

  const trackedVehicles = vehicles.filter(v => v.tracking_enabled);

  // Positions simulees pour la demonstration
  const vehiclePositions: VehicleWithPosition[] = trackedVehicles.map((v) => ({
    ...v,
    lat: 14.7167 + (Math.random() - 0.5) * 0.1,
    lng: -17.4677 + (Math.random() - 0.5) * 0.1,
    speed: Math.floor(Math.random() * 80) + 20,
    lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Tracking GPS en temps reel</h3>

        {trackedVehicles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 rounded-xl overflow-hidden border border-slate-200">
              <MapContainer
                center={[14.7167, -17.4677]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {vehiclePositions.map((vehicle) => (
                  <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]}>
                    <Popup>
                      <div className="p-2">
                        <p className="font-bold">{vehicle.registration}</p>
                        <p className="text-sm">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Vitesse: {vehicle.speed} km/h
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="space-y-3">
              {vehiclePositions.map((vehicle) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800">{vehicle.registration}</p>
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <Navigation className="w-3 h-3 mr-1" />
                      {vehicle.speed} km/h
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    Mis a jour il y a {Math.floor((Date.now() - new Date(vehicle.lastUpdate).getTime()) / 60000)} min
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Aucun vehicule tracke</p>
            <p className="text-sm text-slate-400 mt-1">Activez le tracking pour vos vehicules</p>
          </div>
        )}
      </div>
    </div>
  );
}
