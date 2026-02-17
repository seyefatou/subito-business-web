'use client';

import { motion } from "framer-motion";
import { MapPin, Navigation, Package, Car, Clock } from "lucide-react";

type ServiceCategory = 'transport' | 'livraison' | 'administratif' | 'carburant' | 'flotte' | 'assistance';
type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface Order {
  id: string | number;
  status: OrderStatus;
  service_category?: ServiceCategory;
}

interface LiveMapProps {
  orders?: Order[];
}

export default function LiveMap({ orders = [] }: LiveMapProps) {
  const activeOrders = orders.filter(o => o.status === 'in_progress');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Carte temps réel</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeOrders.length} opération{activeOrders.length > 1 ? 's' : ''} en cours
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Map placeholder with gradient */}
      <div className="relative h-80 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #cbd5e1 1px, transparent 1px),
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Animated location markers */}
        {activeOrders.length > 0 ? (
          activeOrders.slice(0, 5).map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.15, type: "spring" }}
              className="absolute"
              style={{
                left: `${20 + (index * 15) + Math.random() * 10}%`,
                top: `${25 + (index * 12) + Math.random() * 10}%`
              }}
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-orange-400/30 rounded-full -m-3 w-12 h-12"
                />
                <div className="relative w-10 h-10 gradient-subito rounded-full flex items-center justify-center shadow-lg">
                  {order.service_category === 'livraison' ? (
                    <Package className="w-5 h-5 text-white" />
                  ) : (
                    <Car className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Aucune opération en cours</p>
              <p className="text-sm text-slate-400 mt-1">Les trajets actifs apparaîtront ici</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 gradient-subito rounded-full" />
              <span className="text-slate-600">Transport</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-slate-600">Livraison</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
