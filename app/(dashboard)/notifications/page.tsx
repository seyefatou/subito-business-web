'use client';

import React, { useState } from "react";
import {
  Bell,
  BellOff,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Notifications() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");

  // TODO: Integrate with API notifications endpoint when available
  const notifications: unknown[] = [];
  const unreadCount = 0;
  const readCount = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
            <p className="text-slate-500">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''} sur {notifications.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={true}
            className="gap-2"
          >
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-800">{notifications.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-700 mb-1">Non lues</p>
          <p className="text-2xl font-bold text-amber-800">{unreadCount}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">Lues</p>
          <p className="text-2xl font-bold text-green-800">{readCount}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-700 mb-1">Aujourd'hui</p>
          <p className="text-2xl font-bold text-blue-800">0</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="validation_request">Validation</SelectItem>
                <SelectItem value="order_accepted">Acceptee</SelectItem>
                <SelectItem value="order_rejected">Rejetee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={filterRead} onValueChange={setFilterRead}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="unread">Non lues</SelectItem>
              <SelectItem value="read">Lues</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Aucune notification</p>
        <p className="text-sm text-slate-400 mt-1">
          Les notifications seront disponibles prochainement
        </p>
      </div>
    </div>
  );
}
