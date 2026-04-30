'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
  ExternalLink,
  LayoutDashboard,
  Car,
  Truck,
  Bus,
  FileText,
  Receipt,
  CircleCheck,
  Headphones,
  LucideIcon,
} from "lucide-react";
import { api, CompagnyNotification } from "@/lib/api";
import { toast } from "sonner";

type CategoryKey = "all" | "bookings" | "validations" | "documents" | "invoices" | "other";

const CATEGORIES: { key: CategoryKey; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "Toutes", icon: LayoutDashboard },
  { key: "bookings", label: "Reservations", icon: Car },
  { key: "validations", label: "Validations", icon: CircleCheck },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "invoices", label: "Facturation", icon: Receipt },
  { key: "other", label: "Autres", icon: Bell },
];

function getCategory(notif: CompagnyNotification): CategoryKey {
  const text = `${notif.type || ''} ${notif.title || ''} ${notif.message || ''}`.toLowerCase();
  if (text.includes('prise en charge') || text.includes('payment_request') || text.includes('payment-request') || text.includes('validation') || text.includes('paiement')) {
    return 'validations';
  }
  if (text.includes('booking') || text.includes('reservation') || text.includes('course') || text.includes('vtc') || text.includes('navette')) {
    return 'bookings';
  }
  if (text.includes('invoice') || text.includes('facture')) {
    return 'invoices';
  }
  if (text.includes('travel') || text.includes('document') || text.includes('voyage')) {
    return 'documents';
  }
  return 'other';
}

function getNotifIcon(notif: CompagnyNotification): LucideIcon {
  const text = `${notif.type || ''} ${notif.title || ''} ${notif.message || ''}`.toLowerCase();
  if (text.includes('vtc')) return Car;
  if (text.includes('navette') || text.includes('shuttle')) return Bus;
  if (text.includes('livraison') || text.includes('delivery') || text.includes('colis')) return Truck;
  if (text.includes('facture') || text.includes('invoice')) return Receipt;
  if (text.includes('document') || text.includes('voyage')) return FileText;
  if (text.includes('validation') || text.includes('prise en charge') || text.includes('paiement')) return CircleCheck;
  return Bell;
}

function getNotificationRoute(notif: CompagnyNotification): string | null {
  const type = (notif.type || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();
  const text = `${type} ${title} ${message}`;

  if (text.includes('prise en charge') || text.includes('payment_request') || text.includes('payment-request')) {
    return '/pending-validations';
  }
  if (type.includes('booking') || text.includes('réservation') || text.includes('reservation')) {
    return '/tracking';
  }
  if (type.includes('travel') || text.includes('document') || text.includes('voyage')) {
    return '/travel-documents';
  }
  if (type.includes('invoice') || text.includes('facture')) {
    return '/billing';
  }
  return null;
}

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<CompagnyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.notifications.list();
      const data = response.data;
      const items = Array.isArray(data) ? data : (data?.data || []);
      setNotifications(items);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error("Erreur lors du marquage");
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("Toutes les notifications marquees comme lues");
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast.error("Erreur lors du marquage");
    } finally {
      setMarkingAll(false);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: notifications.length,
      bookings: 0,
      validations: 0,
      documents: 0,
      invoices: 0,
      other: 0,
    };
    notifications.forEach(n => {
      const c = getCategory(n);
      counts[c]++;
    });
    return counts;
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    if (activeCategory === "all") return notifications;
    return notifications.filter(n => getCategory(n) === activeCategory);
  }, [notifications, activeCategory]);

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const unread: CompagnyNotification[] = [];
    const today: CompagnyNotification[] = [];
    const yesterday: CompagnyNotification[] = [];
    const earlier: CompagnyNotification[] = [];

    filteredNotifications.forEach(n => {
      if (!n.isRead) {
        unread.push(n);
        return;
      }
      const d = new Date(n.createdAt);
      if (d >= startOfToday) today.push(n);
      else if (d >= startOfYesterday) yesterday.push(n);
      else earlier.push(n);
    });

    return { unread, today, yesterday, earlier };
  }, [filteredNotifications]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatClockTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleClick = (notif: CompagnyNotification) => {
    if (!notif.isRead) handleMarkAsRead(notif.id);
    const route = getNotificationRoute(notif);
    if (route) router.push(route);
  };

  const renderUnread = (notif: CompagnyNotification) => {
    const Icon = getNotifIcon(notif);
    const route = getNotificationRoute(notif);
    return (
      <div
        key={notif.id}
        onClick={() => handleClick(notif)}
        className="group bg-orange-100/60 border-l-4 border-orange-600 p-5 rounded-2xl flex gap-5 transition-all hover:shadow-md hover:bg-orange-100 cursor-pointer"
      >
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-600">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-3 mb-1">
            <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
              {notif.title}
            </h4>
            <span className="text-[11px] font-bold text-orange-600 uppercase bg-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
              {formatTime(notif.createdAt)}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            {notif.message}
          </p>
          <div className="flex gap-2 flex-wrap">
            {route && (
              <button
                onClick={(e) => { e.stopPropagation(); handleClick(notif); }}
                className="text-xs font-bold bg-white text-slate-900 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Voir le detail
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
              className="text-xs font-bold text-slate-500 px-4 py-2 hover:text-slate-800 transition-colors"
            >
              Marquer comme lu
            </button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-orange-600 rounded-full" />
        </div>
      </div>
    );
  };

  const renderRead = (notif: CompagnyNotification) => {
    const Icon = getNotifIcon(notif);
    const route = getNotificationRoute(notif);
    return (
      <div
        key={notif.id}
        onClick={() => handleClick(notif)}
        className={`group bg-white p-5 rounded-2xl flex gap-5 transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100 ${route ? 'cursor-pointer' : ''}`}
      >
        <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-3 mb-1">
            <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
              {notif.title}
            </h4>
            <span className="text-[11px] font-bold text-slate-400 uppercase whitespace-nowrap">
              {formatClockTime(notif.createdAt)}
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            {notif.message}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Portail</span>
            <span>/</span>
            <span className="text-orange-600">Notifications</span>
          </nav>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Notifications</h2>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''} sur {notifications.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Tout marquer comme lu
          </button>
        </div>
      </div>

      {/* Bento layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Filters sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Categories</h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                const count = categoryCounts[cat.key];
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-white shadow-sm text-orange-600 font-bold'
                        : 'text-slate-600 hover:bg-white/60 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-xs ${
                      isActive ? 'bg-orange-100 text-orange-600' : 'text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-2 leading-tight">Besoin d&apos;aide urgente ?</h4>
              <p className="text-slate-400 text-xs mb-4">
                Notre equipe support est disponible 24/7 pour tout probleme operationnel.
              </p>
              <button
                onClick={() => router.push('/support')}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Contacter le support
              </button>
            </div>
            <Headphones className="absolute -right-4 -bottom-4 w-28 h-28 text-white/5" />
          </div>
        </aside>

        {/* Notifications list */}
        <section className="lg:col-span-9 space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Loader2 className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-3" />
              <p className="text-slate-500">Chargement des notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-100">
              <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <BellOff className="w-14 h-14 text-slate-300" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Tout est a jour !</h3>
              <p className="text-slate-500 max-w-xs">
                {activeCategory !== "all"
                  ? "Aucune notification dans cette categorie."
                  : "Vous n'avez aucune notification pour le moment."}
              </p>
            </div>
          ) : (
            <>
              {groupedNotifications.unread.map(renderUnread)}

              {groupedNotifications.today.length > 0 && (
                <>
                  <div className="py-4 flex items-center gap-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                      Aujourd&apos;hui
                    </span>
                    <div className="h-px w-full bg-slate-200" />
                  </div>
                  {groupedNotifications.today.map(renderRead)}
                </>
              )}

              {groupedNotifications.yesterday.length > 0 && (
                <>
                  <div className="py-4 flex items-center gap-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                      Hier
                    </span>
                    <div className="h-px w-full bg-slate-200" />
                  </div>
                  {groupedNotifications.yesterday.map(renderRead)}
                </>
              )}

              {groupedNotifications.earlier.length > 0 && (
                <>
                  <div className="py-4 flex items-center gap-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                      Plus anciennes
                    </span>
                    <div className="h-px w-full bg-slate-200" />
                  </div>
                  {groupedNotifications.earlier.map(renderRead)}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
