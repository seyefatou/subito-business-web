'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ClipboardCheck
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

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Navette Aéroport", href: "/airport-shuttle", icon: MapPin },
  { name: "VTC à l'Heure", href: "/hourly-vtc", icon: Clock },
  { name: "Inter-villes", href: "/inter-city", icon: Car },
  { name: "Documents Voyage", href: "/travel-documents", icon: FileText },
  { name: "Prises en charge", href: "/pending-validations", icon: ClipboardCheck },
  // { name: "Livraison Colis", href: "/parcel-delivery", icon: Package },
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

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
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --subito-orange: #FF6B35;
          --subito-coral: #FF8B6A;
          --subito-pink: #FF7B7B;
        }

        .gradient-subito {
          background: linear-gradient(135deg, #FF6B35 0%, #FF7B7B 100%);
        }

        .text-subito {
          color: #FF6B35;
        }

        .bg-subito {
          background-color: #FF6B35;
        }

        .border-subito {
          border-color: #FF6B35;
        }

        .hover\\:bg-subito:hover {
          background-color: #e55a2b;
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src="/logo-subito.jpeg"
                alt="Subito"
                className="h-10 w-auto"
              />
              <div>
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
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-orange-50 to-red-50 text-subito border border-orange-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'text-subito' : ''}`} />
                  {item.name}
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-slate-100">
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
      <div className="lg:pl-72">
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
                <DropdownMenuContent align="end" className="w-56">
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
