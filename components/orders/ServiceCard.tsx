'use client';

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

type ColorType = 'orange' | 'blue' | 'green' | 'purple' | 'amber' | 'slate';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: string;
  services?: string[];
  color?: ColorType;
  onSelect?: () => void;
  delay?: number;
}

const colorClasses: Record<ColorType, string> = {
  orange: "from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-orange-200",
  blue: "from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200",
  green: "from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200",
  purple: "from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200",
  amber: "from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border-amber-200",
  slate: "from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border-slate-200",
};

export default function ServiceCard({
  title,
  description,
  icon,
  services = [],
  color = "orange",
  onSelect,
  delay = 0
}: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`
        rounded-2xl border p-6 cursor-pointer
        bg-gradient-to-br ${colorClasses[color]}
        transition-all duration-300 hover:shadow-lg
      `}
      onClick={() => onSelect && onSelect()}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{description}</p>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <span
              key={service}
              className="text-xs px-2.5 py-1 bg-white/60 rounded-full text-slate-600 font-medium"
            >
              {service}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
