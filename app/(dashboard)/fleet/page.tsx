"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Car,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Fuel,
  Wrench,
  MapPin,
  ArrowRight,
  DollarSign,
  Activity,
  User,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FleetKPICards from "@/components/fleet/FleetKPICards";
import FleetCostChart from "@/components/fleet/FleetCostChart";
import VehicleHealthCards from "@/components/fleet/VehicleHealthCards";
import SmartSuggestions from "@/components/fleet/SmartSuggestions";
import FuelConsumptionTab from "@/components/fleet/FuelConsumptionTab";
import DriversSection from "@/components/fleet/DriversSection";
import MaintenanceSection from "@/components/fleet/MaintenanceSection";
import TrackingSection from "@/components/fleet/TrackingSection";
import StatisticsSection from "@/components/fleet/StatisticsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  status: string;
  tracking_enabled?: boolean;
  department?: string;
  odometer?: number;
  fuel_type?: string;
  year?: number;
  last_service_km?: number;
  next_service_km?: number;
  tracking_device_id?: string;
}

interface FuelRequest {
  id: string;
  created_date: string;
  status: string;
  actual_cost?: number;
  estimated_cost?: number;
}

interface MaintenanceRecord {
  id: string;
  created_date: string;
  status: string;
  cost?: number;
}

interface VehicleAlert {
  id: string;
  vehicle_registration: string;
  is_resolved: boolean;
  title: string;
  message: string;
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
  created_date: string;
}

export default function Fleet() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeSection, setActiveSection] = useState("overview");

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

  const { data: alerts = [] } = useQuery<VehicleAlert[]>({
    queryKey: ['vehicleAlerts'],
    queryFn: () => base44.entities.VehicleAlert.list(),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: documents = [] } = useQuery<VehicleDocument[]>({
    queryKey: ['vehicleDocuments'],
    queryFn: () => base44.entities.VehicleDocument.list('-created_date'),
  });

  // Calculate stats
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const trackingEnabled = vehicles.filter(v => v.tracking_enabled).length;

  const currentMonth = new Date().getMonth();
  const thisMonthFuel = fuelRequests.filter(r => {
    const d = new Date(r.created_date);
    return d.getMonth() === currentMonth && (r.status === 'completed' || r.status === 'dispensed');
  });
  const totalFuelCost = thisMonthFuel.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);

  const thisMonthMaintenance = maintenanceRecords.filter(r => {
    const d = new Date(r.created_date);
    return d.getMonth() === currentMonth && r.status === 'completed';
  });
  const totalMaintenanceCost = thisMonthMaintenance.reduce((sum, r) => sum + (r.cost || 0), 0);

  const totalFleetCost = totalFuelCost + totalMaintenanceCost;

  const unresolvedAlerts = alerts.filter(a => !a.is_resolved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Flotte & Mobilite</h1>
            <p className="text-slate-500">Vue d&apos;ensemble et pilotage</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeSection === "vehicles" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveSection("vehicles")}
          >
            <Car className="w-4 h-4" />
            Vehicules
          </Button>
          <Button
            variant={activeSection === "drivers" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveSection("drivers")}
          >
            <User className="w-4 h-4" />
            Conducteurs
          </Button>
          <Button
            variant={activeSection === "maintenance" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveSection("maintenance")}
          >
            <Wrench className="w-4 h-4" />
            Entretien
          </Button>
          <Button
            variant={activeSection === "tracking" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveSection("tracking")}
          >
            <MapPin className="w-4 h-4" />
            Tracking GPS
          </Button>
          <Button
            variant={activeSection === "statistics" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveSection("statistics")}
          >
            <Activity className="w-4 h-4" />
            Statistiques
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <FleetKPICards
        activeVehicles={activeVehicles}
        trackingEnabled={trackingEnabled}
        totalCost={totalFleetCost}
        fuelCost={totalFuelCost}
        maintenanceCost={totalMaintenanceCost}
        unresolvedAlerts={unresolvedAlerts}
      />

      {/* Smart Suggestions */}
      <SmartSuggestions
        vehicles={vehicles}
        fuelRequests={fuelRequests}
        maintenanceRecords={maintenanceRecords}
        trackingEnabled={trackingEnabled}
      />

      {/* Content based on active section */}
      {activeSection === "overview" && (
        <>
          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="gap-2">
                <Activity className="w-4 h-4" />
                Vue d&apos;ensemble
              </TabsTrigger>
              <TabsTrigger value="consumption" className="gap-2">
                <Fuel className="w-4 h-4" />
                Consommations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cost Chart */}
            <div className="lg:col-span-2">
              <FleetCostChart
                fuelRequests={fuelRequests}
                maintenanceRecords={maintenanceRecords}
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <Link href="/fuel-supply-requests">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                          <Fuel className="w-5 h-5 text-subito" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">Demande d&apos;appro</p>
                          <p className="text-xs text-slate-500">Carburant Subito</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-subito transition-colors" />
                    </div>
                  </motion.div>
                </Link>

                <Link href="/maintenance">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                          <Wrench className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">Planifier entretien</p>
                          <p className="text-xs text-slate-500">Maintenance preventive</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </motion.div>
                </Link>

                <Link href="/vehicles">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                          <Car className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">Ajouter vehicule</p>
                          <p className="text-xs text-slate-500">Gestion flotte</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>

          {/* Vehicle Health */}
          <VehicleHealthCards
            vehicles={vehicles}
            maintenanceRecords={maintenanceRecords}
            alerts={alerts}
          />
        </TabsContent>

            <TabsContent value="consumption">
              <FuelConsumptionTab
                vehicles={vehicles}
                fuelRequests={fuelRequests}
                departments={departments}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Alerts Summary */}
      {unresolvedAlerts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                {unresolvedAlerts} alerte{unresolvedAlerts > 1 ? 's' : ''} necessitent votre attention
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                Des vehicules necessitent une intervention ou sont hors des parametres normaux
              </p>
              <Link href="/vehicles">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Voir les alertes
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {activeSection === "vehicles" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <Tabs defaultValue="vehicles" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Vehicules</h3>
                <p className="text-sm text-slate-500 mt-1">{vehicles.length + documents.length} elements au total</p>
              </div>
              <TabsList>
                <TabsTrigger value="vehicles" className="gap-2">
                  <Car className="w-4 h-4" />
                  Vehicules ({vehicles.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({documents.length})
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="vehicles" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehicles.slice(0, 8).map((vehicle) => {
                const vehicleAlerts = alerts.filter(a => a.vehicle_registration === vehicle.registration && !a.is_resolved);
                return (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${vehicle.status === 'active' ? 'bg-green-100' : 'bg-orange-100'}`}>
                          <Car className={`w-4 h-4 ${vehicle.status === 'active' ? 'text-green-600' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{vehicle.registration}</p>
                          <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                        </div>
                      </div>
                      {vehicle.tracking_enabled && (
                        <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-200">
                          <MapPin className="w-3 h-3" />
                          GPS
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Statut</span>
                        <Badge className={`text-xs ${vehicle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} border-0`}>
                          {vehicle.status === 'active' ? 'Actif' : vehicle.status === 'maintenance' ? 'Maintenance' : 'Hors service'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Departement</span>
                        <span className="font-medium text-slate-700">{vehicle.department || 'General'}</span>
                      </div>
                      {vehicle.odometer && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Km</span>
                          <span className="font-medium text-slate-700">{vehicle.odometer.toLocaleString()}</span>
                        </div>
                      )}
                      {vehicleAlerts.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-200">
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            <span className="font-medium">{vehicleAlerts.length} alerte{vehicleAlerts.length > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {vehicles.length === 0 && (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Aucun vehicule</p>
                <p className="text-sm text-slate-400 mt-1">Ajoutez votre premier vehicule pour commencer</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <div className="space-y-3">
              {documents.slice(0, 10).map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{doc.document_name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.vehicle_registration} - {doc.document_type}
                      </p>
                    </div>
                  </div>
                  {doc.expiry_date && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Expire le</p>
                      <p className="text-sm font-medium text-slate-800">
                        {new Date(doc.expiry_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}

              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Aucun document</p>
                  <p className="text-sm text-slate-400 mt-1">Ajoutez des documents pour vos vehicules</p>
                </div>
              )}
            </div>
          </TabsContent>
          </Tabs>
        </div>
      )}

      {activeSection === "drivers" && <DriversSection />}
      {activeSection === "maintenance" && <MaintenanceSection />}
      {activeSection === "tracking" && <TrackingSection />}
      {activeSection === "statistics" && <StatisticsSection />}

      {/* Vehicle Detail Sheet */}
      <Sheet open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedVehicle && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedVehicle.status === 'active' ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <Car className={`w-5 h-5 ${selectedVehicle.status === 'active' ? 'text-green-600' : 'text-orange-600'}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{selectedVehicle.registration}</p>
                    <p className="text-sm font-normal text-slate-500">
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800">Informations generales</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Statut</p>
                      <Badge className={`${selectedVehicle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} border-0`}>
                        {selectedVehicle.status === 'active' ? 'Actif' : selectedVehicle.status === 'maintenance' ? 'Maintenance' : 'Hors service'}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Annee</p>
                      <p className="font-semibold text-slate-800">{selectedVehicle.year || '--'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Carburant</p>
                      <p className="font-semibold text-slate-800 capitalize">{selectedVehicle.fuel_type}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Departement</p>
                      <p className="font-semibold text-slate-800">{selectedVehicle.department || 'General'}</p>
                    </div>
                  </div>
                </div>

                {/* Kilometrage */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800">Kilometrage</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-xs text-blue-600 mb-1">Actuel</p>
                      <p className="font-bold text-blue-800">
                        {selectedVehicle.odometer ? `${selectedVehicle.odometer.toLocaleString()} km` : '--'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Dernier service</p>
                      <p className="font-semibold text-slate-800">
                        {selectedVehicle.last_service_km ? `${selectedVehicle.last_service_km.toLocaleString()} km` : '--'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Prochain service</p>
                      <p className="font-semibold text-slate-800">
                        {selectedVehicle.next_service_km ? `${selectedVehicle.next_service_km.toLocaleString()} km` : '--'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tracking */}
                {selectedVehicle.tracking_enabled && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <p className="font-semibold text-blue-800">Tracking GPS active</p>
                    </div>
                    <p className="text-sm text-blue-700">
                      Balise: {selectedVehicle.tracking_device_id || 'Non renseigne'}
                    </p>
                  </div>
                )}

                {/* Alertes */}
                {alerts.filter(a => a.vehicle_registration === selectedVehicle.registration && !a.is_resolved).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-800">Alertes actives</h3>
                    <div className="space-y-2">
                      {alerts
                        .filter(a => a.vehicle_registration === selectedVehicle.registration && !a.is_resolved)
                        .map(alert => (
                          <div key={alert.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="font-medium text-amber-800 text-sm">{alert.title}</p>
                            <p className="text-xs text-amber-700 mt-1">{alert.message}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800">Documents</h3>
                  <div className="space-y-2">
                    {documents
                      .filter(doc => doc.vehicle_registration === selectedVehicle.registration)
                      .slice(0, 5)
                      .map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{doc.document_name}</p>
                            <p className="text-xs text-slate-500 capitalize">{doc.document_type}</p>
                          </div>
                          {doc.expiry_date && (
                            <p className="text-xs text-slate-600">
                              {new Date(doc.expiry_date).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      ))}
                    {documents.filter(doc => doc.vehicle_registration === selectedVehicle.registration).length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">Aucun document</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Link href="/vehicles" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Modifier
                    </Button>
                  </Link>
                  <Link href="/live-tracking" className="flex-1">
                    <Button className="w-full gradient-subito text-white border-0">
                      Voir sur la carte
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
