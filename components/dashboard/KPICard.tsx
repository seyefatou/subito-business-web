'use client';

import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  gradient?: boolean;
  delay?: number;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  gradient = false,
  delay = 0
}: KPICardProps) {
  const isPositive = trend === "up";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        ${gradient
          ? 'gradient-subito text-white'
          : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg'
        }
        transition-all duration-300
      `}
    >
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full transform translate-x-8 -translate-y-8 ${gradient ? 'bg-white/10' : 'bg-slate-50'}`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`
            p-3 rounded-xl
            ${gradient ? 'bg-white/20' : 'bg-orange-50'}
          `}>
            <Icon className={`w-5 h-5 ${gradient ? 'text-white' : 'text-subito'}`} />
          </div>

          {trendValue && (
            <div className={`
              flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
              ${gradient
                ? 'bg-white/20 text-white'
                : isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }
            `}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>

        <p className={`text-sm font-medium mb-1 ${gradient ? 'text-white/80' : 'text-slate-500'}`}>
          {title}
        </p>
        <p className={`text-xl font-bold mb-1 truncate ${gradient ? 'text-white' : 'text-slate-800'}`}>
          {value}
        </p>
        {subtitle && (
          <p className={`text-xs ${gradient ? 'text-white/70' : 'text-slate-400'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
