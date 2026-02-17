'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Phone, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Driver {
  id: string;
  full_name: string;
  phone?: string;
  department?: string;
  status?: 'active' | 'on_leave' | 'suspended';
  photo_url?: string;
  assigned_vehicle?: string;
  license_type?: string;
}

async function fetchDrivers(): Promise<Driver[]> {
  // Note: Implement actual API call in Next.js
  // const response = await fetch('/api/drivers?sort=-created_date');
  // return response.json();
  return [];
}

export default function DriversSection() {
  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'on_leave':
        return 'Conge';
      case 'suspended':
        return 'Suspendu';
      default:
        return 'Actif';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Conducteurs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {driver.photo_url ? (
                    <img src={driver.photo_url} alt={driver.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{driver.full_name}</p>
                    <p className="text-xs text-slate-500">{driver.department || 'Non assigne'}</p>
                  </div>
                </div>
                <Badge className={`text-xs ${driver.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} border-0`}>
                  {getStatusLabel(driver.status)}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3 h-3" />
                  {driver.phone}
                </div>
                {driver.assigned_vehicle && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Car className="w-3 h-3" />
                    {driver.assigned_vehicle}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Permis</span>
                  <span className="font-medium text-slate-700">{driver.license_type}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {drivers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Aucun conducteur</p>
          </div>
        )}
      </div>
    </div>
  );
}
