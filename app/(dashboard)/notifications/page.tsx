'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  BellOff,
  Filter,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, CompagnyNotification } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<CompagnyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filterRead, setFilterRead] = useState<string>("all");

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api.notificationsCompagny.getAll(token);
      const data = response.data || response;
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
    } catch {
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    if (!token) return;
    try {
      await api.notificationsCompagny.markAsRead(token, id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch {
      toast.error("Erreur lors du marquage");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    try {
      await api.notificationsCompagny.markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("Toutes les notifications marquees comme lues");
    } catch {
      toast.error("Erreur lors du marquage");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;
  const todayCount = notifications.filter(n => {
    const d = new Date(n.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterRead === "unread") return !n.isRead;
    if (filterRead === "read") return n.isRead;
    return true;
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

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
            onClick={fetchNotifications}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="gap-2"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
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
          <p className="text-sm text-blue-700 mb-1">Aujourd&apos;hui</p>
          <p className="text-2xl font-bold text-blue-800">{todayCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-full md:w-48">
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
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-3" />
          <p className="text-slate-500">Chargement des notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucune notification</p>
          <p className="text-sm text-slate-400 mt-1">
            {filterRead !== "all"
              ? "Aucune notification avec ce filtre"
              : "Vous n'avez pas encore de notifications"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${
                !notif.isRead ? 'bg-orange-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                  notif.isRead ? 'bg-slate-300' : 'bg-orange-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm ${notif.isRead ? 'text-slate-600' : 'text-slate-800 font-semibold'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {notif.message}
                      </p>
                      {notif.type && (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {notif.type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatTime(notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marquer comme lu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
