'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  FileText,
  CreditCard,
  Users,
  Building2,
  Car,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Package,
  Fuel,
  Zap,
  Wrench,
  Clock,
  LucideIcon,
  Loader2,
  ClipboardCheck,
  Copy,
  Share2,
  Compass,
  Hotel,
  Shield,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";
import CriticalAlert from "@/components/notifications/CriticalAlert";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { onForegroundMessage } from "@/lib/firebase";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Navette Aéroport", href: "/airport-shuttle", icon: MapPin },
  { name: "Livraisons de courrier", href: "/deliveries", icon: Package },
  { name: "VTC à l'Heure", href: "/hourly-vtc", icon: Clock },
  { name: "Inter-villes", href: "/inter-city", icon: Car },
  { name: "Documents Voyage", href: "/travel-documents", icon: FileText },
  { name: "Activite", href: "/service-reservations?type=ACTIVITE", icon: Compass },
  { name: "Logement", href: "/service-reservations?type=LOGEMENT", icon: Hotel },
  { name: "Location de vehicule", href: "/location-vehicule", icon: Car },
  { name: "Assurance", href: "/assurance", icon: Shield },
  { name: "Tickets", href: "/tickets", icon: MessageSquare },
  { name: "Prises en charge", href: "/pending-validations", icon: ClipboardCheck },
  // { name: "Flotte", href: "/fleet", icon: Car },
  // { name: "Carburant", href: "/fuel-management", icon: Fuel },
  // { name: "Devis Entretien", href: "/maintenance-quotes", icon: Wrench },
  { name: "Suivi commandes", href: "/tracking", icon: MapPin },
  { name: "Rapports", href: "/reports", icon: FileText },
  { name: "Facturation", href: "/billing", icon: CreditCard },
  // { name: "Automatisations", href: "/automation", icon: Zap },
  { name: "Employés", href: "/employees", icon: Users },
  { name: "Départements", href: "/departments", icon: Building2 },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Hydrate collapsed state from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('subito_sidebar_collapsed');
      if (stored === '1') setSidebarCollapsed(true);
    } catch { /* localStorage may be unavailable */ }
  }, []);

  // Persist collapsed state on change
  useEffect(() => {
    try {
      window.localStorage.setItem('subito_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadTickets, setUnreadTickets] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Poll notification unread count
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = async () => {
      try {
        const response = await api.notifications.unreadCount();
        const raw = response as any;
        const inner = raw?.data ?? raw;
        const count = typeof inner === 'number' ? inner : (inner?.unreadCount ?? inner?.count ?? 0);
        setUnreadCount(count);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Poll ticket unread count
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchTickets = async () => {
      try {
        const response = await api.tickets.list({ page: 1, limit: 50 });
        const raw = response as any;
        const tickets = raw?.data?.data || raw?.data || [];
        if (!Array.isArray(tickets)) { setUnreadTickets(0); return; }
        const count = tickets.filter((t: any) =>
          t.messages?.some((m: any) => m.senderType === 'manager' && !m.lu)
        ).length;
        setUnreadTickets(count);
      } catch { /* silent */ }
    };
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Écouter les notifications push foreground
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] Message foreground:', payload);
      const title = payload?.notification?.title || payload?.data?.title || 'Notification';
      const body = payload?.notification?.body || payload?.data?.body || '';
      toast(title, { description: body });
      // Rafraîchir les compteurs
      setUnreadCount((c) => c + 1);
      if (payload?.data?.type === 'ticket' || payload?.data?.type === 'ticket_message') {
        setUnreadTickets((c) => c + 1);
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials
  const getUserInitials = () => {
    if (!user) return 'AB';
    const name = user.nomCompagny || user.raisonSociale;
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    const prenom = user.prenom || '';
    const nom = user.nom || '';
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'AB';
  };

  const getUserDisplayName = () => {
    if (!user) return 'Admin Business';
    const name = user.nomCompagny || user.raisonSociale;
    if (name) return name;
    return `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Admin Business';
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isActive = (href: string): boolean => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // Handle hrefs with query params (e.g. /service-reservations?type=ACTIVITE)
    if (href.includes('?')) {
      const [hrefPath, hrefQuery] = href.split('?');
      if (pathname !== hrefPath) return false;
      const expectedParams = new URLSearchParams(hrefQuery);
      const keys = Array.from(expectedParams.keys());
      return keys.every(key => searchParams.get(key) === expectedParams.get(key));
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200
        transform transition-all duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`h-20 flex items-center border-b border-slate-100 relative ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-6'}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:gap-0' : ''}`}>
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo-subito.jpeg`}
                alt="Subito"
                className="h-10 w-auto"
              />
              <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
                <span className="font-bold text-xl text-slate-800">Subito</span>
                <span className="block text-xs text-slate-500 font-medium -mt-1">Business</span>
              </div>
            </div>
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors ${sidebarCollapsed ? 'lg:absolute lg:-right-3 lg:top-7 lg:bg-white lg:border lg:border-slate-200 lg:shadow-sm lg:z-10' : ''}`}
              onClick={() => setSidebarCollapsed(c => !c)}
              aria-label={sidebarCollapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`
                    relative flex items-center gap-3 rounded-xl text-sm
                    transition-all duration-200
                    ${sidebarCollapsed ? 'lg:justify-center lg:px-2 px-4 py-3' : 'px-4 py-3'}
                    ${active
                      ? 'bg-white border-l-4 border-[#FF7842] text-[#FF7842] font-semibold shadow-sm pl-3'
                      : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#FF7842]' : ''}`} />
                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.name}</span>
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-red-500 ${sidebarCollapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-[16px] lg:h-4 lg:px-1 lg:text-[9px] ml-auto' : 'ml-auto'}`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.href === '/tickets' && unreadTickets > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white animate-pulse bg-orange-500 ${sidebarCollapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-[16px] lg:h-4 lg:px-1 lg:text-[9px] ml-auto' : 'ml-auto'}`}>
                      {unreadTickets > 99 ? '99+' : unreadTickets}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className={`p-4 border-t border-slate-100 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <div className="rounded-xl gradient-subito p-4 text-white">
              <p className="text-sm font-medium mb-1">Besoin d&apos;aide ?</p>
              <p className="text-xs opacity-90 mb-3">Support disponible 24/7</p>
              <Button
                size="sm"
                className="w-full bg-white text-subito hover:bg-slate-100"
              >
                Contacter le support
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-slate-500 hover:text-slate-700"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2.5 w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une commande, un employé..."
                  className="bg-transparent border-none outline-none text-sm text-slate-600 placeholder:text-slate-400 w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <NotificationBell />

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <div className="w-9 h-9 rounded-xl gradient-subito flex items-center justify-center text-white font-semibold text-sm">
                      {getUserInitials()}
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-800">{getUserDisplayName()}</p>
                      <p className="text-xs text-slate-500">{user?.role || 'Compagnie'}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {user?.companyCode && (
                    <>
                      <div className="px-3 py-2">
                        <p className="text-xs text-slate-500 mb-1">Code entreprise</p>
                        <p className="text-sm font-bold text-slate-800 font-mono">{user.companyCode}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(user.companyCode!);
                              toast.success('Code copie');
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier
                          </button>
                          <button
                            onClick={() => {
                              const text = `Rejoignez notre entreprise sur Subito Business avec le code : ${user.companyCode}`;
                              if (navigator.share) {
                                navigator.share({ title: 'Code Subito Business', text });
                              } else {
                                navigator.clipboard.writeText(text);
                                toast.success('Lien copie');
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-orange-500 to-red-400 hover:opacity-90 rounded-lg transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Partager
                          </button>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>

        {/* Critical Alerts */}
        <CriticalAlert />
      </div>
    </div>
  );
}
