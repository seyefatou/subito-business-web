'use client';

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Car,
  MapPin,
  Navigation,
  Clock,
  User,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  status?: string;
  department?: string;
  tracking_enabled?: boolean;
  primary_driver?: string;
}

interface VehicleWithPosition extends Vehicle {
  position: [number, number];
  speed: number;
  heading: number;
  lastUpdate: Date;
}

interface Department {
  id: string;
  name: string;
}

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// Custom vehicle icon
const createVehicleIcon = (status?: string) => {
  const color = status === 'active' ? '#10B981' : status === 'maintenance' ? '#F59E0B' : '#EF4444';
  return L.divIcon({
    html: `<div style="background: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 11l1.5-4.5h11L19 11m-1.5 5h-11L5 11h14l-1.5 5M7 16v2m10-2v2M3 12h18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </div>`,
    className: 'vehicle-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function LiveTracking() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: vehicles = [], refetch } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30s
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  // Filter tracked vehicles
  const trackedVehicles = vehicles.filter(v => v.tracking_enabled);

  const filteredVehicles = trackedVehicles.filter(v => {
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesDept = departmentFilter === "all" || v.department === departmentFilter;
    return matchesStatus && matchesDept;
  });

  // Generate random positions for demo (replace with real GPS data)
  const vehiclesWithPositions: VehicleWithPosition[] = filteredVehicles.map(v => ({
    ...v,
    position: [
      14.6928 + (Math.random() - 0.5) * 0.1, // Dakar latitude +/- random
      -17.4467 + (Math.random() - 0.5) * 0.1  // Dakar longitude +/- random
    ] as [number, number],
    speed: Math.floor(Math.random() * 80),
    heading: Math.floor(Math.random() * 360),
    lastUpdate: new Date(Date.now() - Math.random() * 3600000),
  }));

  const mapCenter: [number, number] = selectedVehicle
    ? vehiclesWithPositions.find(v => v.id === selectedVehicle)?.position || [14.6928, -17.4467]
    : [14.6928, -17.4467];

  const stats = {
    total: trackedVehicles.length,
    active: trackedVehicles.filter(v => v.status === 'active').length,
    moving: vehiclesWithPositions.filter(v => v.speed > 5).length,
    stopped: vehiclesWithPositions.filter(v => v.speed <= 5).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Navigation className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tracking en temps reel</h1>
            <p className="text-slate-500">Suivi GPS de {trackedVehicles.length} vehicule{trackedVehicles.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Auto 30s
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Trackes</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">Actifs</p>
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-700 mb-1">En mouvement</p>
          <p className="text-2xl font-bold text-blue-800">{stats.moving}</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p className="text-sm text-orange-700 mb-1">A l&apos;arret</p>
          <p className="text-2xl font-bold text-orange-800">{stats.stopped}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Departement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden h-[600px]">
          {trackedVehicles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <MapPin className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium mb-2">Aucun vehicule tracke</p>
              <p className="text-sm text-slate-400 text-center">
                Activez le tracking GPS sur vos vehicules pour les voir apparaitre ici
              </p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenter center={mapCenter} />
              {vehiclesWithPositions.map(vehicle => (
                <Marker
                  key={vehicle.id}
                  position={vehicle.position}
                  icon={createVehicleIcon(vehicle.status)}
                  eventHandlers={{
                    click: () => setSelectedVehicle(vehicle.id),
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="font-bold text-slate-800">{vehicle.registration}</p>
                      <p className="text-xs text-slate-600">{vehicle.brand} {vehicle.model}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs"><strong>Vitesse:</strong> {vehicle.speed} km/h</p>
                        <p className="text-xs"><strong>Direction:</strong> {vehicle.heading} deg</p>
                        <p className="text-xs"><strong>Conducteur:</strong> {vehicle.primary_driver || '-'}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Vehicle List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">
            Vehicules ({filteredVehicles.length})
          </h3>
          <div className="space-y-3 max-h-[550px] overflow-y-auto">
            {vehiclesWithPositions.map((vehicle) => {
              const isMoving = vehicle.speed > 5;
              const minutesAgo = Math.floor((Date.now() - vehicle.lastUpdate.getTime()) / 60000);

              return (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    selectedVehicle === vehicle.id
                      ? 'border-orange-300 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isMoving ? 'bg-green-50' : 'bg-slate-50'}`}>
                        <Car className={`w-4 h-4 ${isMoving ? 'text-green-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{vehicle.registration}</p>
                        <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={isMoving ? 'text-green-600 border-green-200' : 'text-slate-600'}
                    >
                      {vehicle.speed} km/h
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    {vehicle.primary_driver && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-3 h-3" />
                        {vehicle.primary_driver}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-3 h-3" />
                      {vehicle.department || 'General'}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Mis a jour il y a {minutesAgo}min
                    </div>
                  </div>

                  {vehicle.speed > 5 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Direction</span>
                        <span className="font-medium text-slate-700">{vehicle.heading} deg</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
