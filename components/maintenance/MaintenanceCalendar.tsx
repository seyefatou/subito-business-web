'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type MaintenanceStatus = 'scheduled' | 'completed' | 'cancelled';

interface Vehicle {
  id: string;
  registration: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_registration?: string;
  status: MaintenanceStatus;
  type: string;
  created_date?: string;
  next_service_date?: string;
}

interface MaintenanceCalendarProps {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  onEdit: (record: MaintenanceRecord) => void;
}

const statusColors: Record<MaintenanceStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200"
};

const statusIcons: Record<MaintenanceStatus, LucideIcon> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle
};

export default function MaintenanceCalendar({ records, vehicles, onEdit }: MaintenanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getRecordsForDay = (day: Date): MaintenanceRecord[] => {
    return records.filter(record => {
      if (record.status === 'scheduled' && record.created_date) {
        return isSameDay(new Date(record.created_date), day);
      }
      if (record.status === 'completed' && record.created_date) {
        return isSameDay(new Date(record.created_date), day);
      }
      if (record.next_service_date) {
        return isSameDay(new Date(record.next_service_date), day);
      }
      return false;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
            {day}
          </div>
        ))}

        {/* Days */}
        {daysInMonth.map((day) => {
          const dayRecords = getRecordsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <motion.div
              key={day.toString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                min-h-24 p-2 rounded-lg border transition-all
                ${isToday ? 'border-orange-300 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}
                ${!isSameMonth(day, currentDate) && 'opacity-50'}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                </span>
                {dayRecords.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {dayRecords.length}
                  </Badge>
                )}
              </div>

              {/* Records for this day */}
              <div className="space-y-1">
                {dayRecords.slice(0, 2).map((record) => {
                  const Icon = statusIcons[record.status];
                  const vehicle = vehicles.find(v => v.registration === record.vehicle_registration);
                  return (
                    <div
                      key={record.id}
                      onClick={() => onEdit(record)}
                      className={`
                        ${statusColors[record.status]}
                        px-2 py-1 rounded text-xs cursor-pointer
                        hover:opacity-80 transition-opacity border
                      `}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        <span className="font-medium truncate">
                          {record.vehicle_registration || vehicle?.registration}
                        </span>
                      </div>
                      <p className="text-xs truncate opacity-80">
                        {record.type}
                      </p>
                    </div>
                  );
                })}
                {dayRecords.length > 2 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{dayRecords.length - 2}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span className="text-xs text-slate-600">Planifiee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span className="text-xs text-slate-600">Realisee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          <span className="text-xs text-slate-600">Annulee</span>
        </div>
      </div>
    </div>
  );
}
