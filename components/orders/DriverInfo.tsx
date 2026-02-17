'use client';

import React from "react";
import { motion } from "framer-motion";
import { User, Phone, CheckCircle2, Navigation, MapPin, Clock, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DriverStatus = 'assigned' | 'en_route' | 'arrived' | 'completed';

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const driverStatusConfig: Record<DriverStatus, StatusConfig> = {
  assigned: { label: "Assigne", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  en_route: { label: "En route", color: "bg-orange-100 text-orange-700", icon: Navigation },
  arrived: { label: "Arrive", color: "bg-green-100 text-green-700", icon: MapPin },
  completed: { label: "Termine", color: "bg-slate-100 text-slate-700", icon: CheckCircle2 },
};

interface Order {
  id: string;
  driver_name?: string;
  driver_phone?: string;
  driver_photo?: string;
  driver_status?: DriverStatus | string;
}

interface DriverInfoProps {
  order: Order;
}

export default function DriverInfo({ order }: DriverInfoProps) {
  if (!order.driver_name) {
    return null;
  }

  const status = driverStatusConfig[order.driver_status as DriverStatus] || driverStatusConfig.assigned;
  const StatusIcon = status.icon;

  const handleCall = () => {
    if (order.driver_phone) {
      window.location.href = `tel:${order.driver_phone}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-subito" />
        <h3 className="font-semibold text-slate-800">Chauffeur assigne</h3>
      </div>

      <div className="flex items-center gap-4">
        {/* Driver Photo */}
        <div className="relative">
          {order.driver_photo ? (
            <img
              src={order.driver_photo}
              alt={order.driver_name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-orange-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full gradient-subito flex items-center justify-center text-white font-bold text-xl">
              {order.driver_name.charAt(0)}
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
            <StatusIcon className="w-3.5 h-3.5 text-subito" />
          </div>
        </div>

        {/* Driver Info */}
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-lg">{order.driver_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4 text-slate-400" />
            <a
              href={`tel:${order.driver_phone}`}
              className="text-sm text-subito hover:underline"
            >
              {order.driver_phone}
            </a>
          </div>
          <Badge className={`${status.color} border-0 mt-2`}>
            {status.label}
          </Badge>
        </div>

        {/* Call Button */}
        <Button
          size="icon"
          className="gradient-subito text-white border-0 h-12 w-12 rounded-full"
          onClick={handleCall}
        >
          <Phone className="w-5 h-5" />
        </Button>
      </div>

      {/* Timeline */}
      {order.driver_status && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-600">
              {order.driver_status === 'assigned' && 'Le chauffeur a ete notifie'}
              {order.driver_status === 'en_route' && 'Le chauffeur est en route vers vous'}
              {order.driver_status === 'arrived' && 'Le chauffeur est arrive'}
              {order.driver_status === 'completed' && 'Service termine avec succes'}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
