'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Car,
  Package,
  FileText,
  Fuel,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plane,
  Hotel,
  MapPin,
  Compass,
  Route,
  LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Activity {
  id: string | number;
  service_category?: string;
  service_type?: string;
  beneficiary_name?: string;
  department?: string;
  status: string;
  created_date?: string;
  final_cost?: number;
  estimated_cost?: number;
}

interface ActivityTimelineProps {
  activities?: Activity[];
}

const serviceIcons: Record<string, LucideIcon> = {
  airport_shuttle: Car,
  inter_city: Car,
  intercity: Car,
  vtc_hourly: Clock,
  travel_document: FileText,
  flight_reservation: Plane,
  hotel_reservation: Hotel,
  flight_and_hotel: Plane,
  transport: Car,
  livraison: Package,
  administratif: FileText,
  carburant: Fuel,
  flotte: Wrench,
  assistance: AlertTriangle,
  CIRCUIT: Route,
  LOGEMENT: MapPin,
  FLOTTE: Car,
};

const serviceLabels: Record<string, string> = {
  airport_shuttle: "Navette Aeroport",
  inter_city: "Inter-ville",
  intercity: "Inter-ville",
  vtc_hourly: "VTC Horaire",
  travel_document: "Document de voyage",
  flight_reservation: "Navette Aeroport",
  hotel_reservation: "Logement",
  flight_and_hotel: "Vol + Hotel",
  transport: "Transport",
  livraison: "Livraison",
  carburant: "Carburant",
  flotte: "Location vehicule",
  CIRCUIT: "Circuit touristique",
  LOGEMENT: "Logement",
  FLOTTE: "Location vehicule",
  assistance: "Assistance",
  administratif: "Administratif",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-600",
  confirmed: "bg-blue-100 text-blue-600",
  in_progress: "bg-orange-100 text-subito",
  completed: "bg-green-100 text-green-600",
  cancelled: "bg-red-100 text-red-600",
  processing: "bg-indigo-100 text-indigo-600",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  in_progress: "En cours",
  completed: "Terminee",
  cancelled: "Annulee",
  processing: "En traitement",
};

export default function ActivityTimeline({ activities = [] }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Activites recentes</h3>
        <div className="text-center py-8 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Aucune activite recente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Activites recentes</h3>
        <Link href="/tracking" className="text-sm text-subito font-medium hover:underline flex items-center gap-1">
          Voir tout <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {activities.slice(0, 5).map((activity, index) => {
          const Icon = (activity.service_category && serviceIcons[activity.service_category])
            ? serviceIcons[activity.service_category]
            : Package;

          const label = (activity.service_category && serviceLabels[activity.service_category])
            ? serviceLabels[activity.service_category]
            : activity.service_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Commande';

          const cost = activity.final_cost || activity.estimated_cost || 0;

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-50 to-red-50">
                <Icon className="w-5 h-5 text-subito" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800 truncate">
                      {label}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {activity.beneficiary_name || 'Non assigne'}
                      {cost > 0 && <span className="ml-1">• {cost.toLocaleString()} FCFA</span>}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[activity.status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabels[activity.status] || activity.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  {activity.created_date && format(new Date(activity.created_date), "d MMM 'a' HH:mm", { locale: fr })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
