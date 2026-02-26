'use client';

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, CompagnyNotification } from "@/lib/api";

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

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<CompagnyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.notifications.unreadCount();
      // response may be { data: { unreadCount: N } } or { unreadCount: N } or { count: N }
      const raw = response as any;
      const inner = raw?.data ?? raw;
      let count = 0;
      if (typeof inner === 'number') {
        count = inner;
      } else if (typeof inner === 'object' && inner !== null) {
        count = inner.unreadCount ?? inner.count ?? 0;
      }
      setUnreadCount(count);
    } catch {
      // Silently fail for polling
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.notifications.list();
      const data = response.data;
      const items = Array.isArray(data) ? data : (data?.data || []);
      setNotifications(items);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

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
    return `Il y a ${diffD}j`;
  };

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-colors ${
          hasUnread
            ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Bell className={`w-5 h-5 ${hasUnread ? 'animate-[bell-ring_4s_ease-in-out_infinite]' : ''}`} />
        {hasUnread && (
          <>
            <span
              className="absolute -top-1.5 -right-1.5 z-10 min-w-[22px] h-[22px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md ring-2 ring-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-red-500 rounded-full animate-[badge-ping_2s_ease-out_infinite]"
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Notifications</h3>
                {hasUnread && (
                  <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-slate-400 mx-auto animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-orange-50/50' : ''
                      }`}
                      onClick={() => {
                        if (!notif.isRead) handleMarkAsRead(notif.id);
                        const route = getNotificationRoute(notif);
                        if (route) {
                          setIsOpen(false);
                          router.push(route);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notif.isRead ? 'bg-slate-300' : 'bg-orange-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notif.isRead ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notif.id);
                            }}
                            className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                            title="Marquer comme lu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/notifications');
                    }}
                    className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Voir toutes les notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
