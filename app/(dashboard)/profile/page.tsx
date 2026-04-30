'use client';

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ChangePasswordCompagnyDto, UpdateCompagnyProfileDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Phone,
  MapPin,
  Key,
  Bell,
  Globe,
  Save,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  BadgeCheck,
  Users,
  Building2,
  Wallet,
  Edit,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Settings {
  emailNotifications: boolean;
  orderNotifications: boolean;
  fuelAlerts: boolean;
  maintenanceAlerts: boolean;
  language: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileData {
  nomCompagny: string;
  emailCompagny: string;
  telephoneCompagny: string;
  adresseCompagny: string;
}

const formatFCFA = (n?: number) =>
  typeof n === "number" ? `${n.toLocaleString("fr-FR")} FCFA` : "—";

export default function Profile() {
  const { user, token, logout, refreshProfile } = useAuth();

  const [profileData, setProfileData] = useState<ProfileData>({
    nomCompagny: "",
    emailCompagny: "",
    telephoneCompagny: "",
    adresseCompagny: "",
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    orderNotifications: true,
    fuelAlerts: true,
    maintenanceAlerts: true,
    language: "fr",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        nomCompagny: user.nomCompagny || user.raisonSociale || user.nom || "",
        emailCompagny: user.emailCompagny || user.email || "",
        telephoneCompagny: user.telephoneCompagny || user.telephone || "",
        adresseCompagny: user.adresseCompagny || user.adresse || "",
      });
    }
  }, [user]);

  // Stats: employees + departments counts
  const { data: employeesResponse } = useQuery({
    queryKey: ["profile-employees"],
    queryFn: () => api.employees.list({ page: 1, limit: 100 }),
  });
  const { data: departmentsResponse } = useQuery({
    queryKey: ["profile-departments"],
    queryFn: () => api.departments.list(1, 100),
  });

  const empData = employeesResponse?.data;
  const empNested = (empData as any)?.data || empData;
  const employees = Array.isArray(empNested)
    ? empNested
    : (empNested as any)?.items || (empNested as any)?.list || [];
  const empMeta = (empData as any)?.meta || {};
  const totalEmployees = empMeta.total || (empData as any)?.total || employees.length;
  const totalBudget = employees.reduce(
    (sum: number, e: any) => sum + (e.plafondMensuel || 0),
    0
  );

  const deptData = departmentsResponse?.data;
  const departments = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];
  const totalDepartments = departments.length;

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateCompagnyProfileDto) => {
      if (!token) throw new Error("Non authentifie");
      return api.authCompagny.updateProfile(token, data);
    },
    onSuccess: () => {
      refreshProfile();
      toast.success("Profil mis a jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise a jour");
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: ChangePasswordCompagnyDto) => {
      if (!token) throw new Error("Non authentifie");
      return api.authCompagny.changePassword(token, data);
    },
    onSuccess: () => {
      toast.success("Mot de passe modifie avec succes");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      nomCompagny: profileData.nomCompagny,
      emailCompagny: profileData.emailCompagny,
      telephoneCompagny: profileData.telephoneCompagny,
      adresseCompagny: profileData.adresseCompagny,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }
    changePassword.mutate({
      oldPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const name = user.nomCompagny || user.raisonSociale;
    if (name) return name.substring(0, 2).toUpperCase();
    const prenom = user.prenom || "";
    const nom = user.nom || "";
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || "U";
  };

  const getUserDisplayName = () => {
    if (!user) return "";
    const name = user.nomCompagny || user.raisonSociale;
    if (name) return name;
    return `${user.prenom || ""} ${user.nom || ""}`.trim();
  };

  const isActive =
    user?.statut?.toLowerCase() === "active" || user?.statut?.toLowerCase() === "actif";

  return (
    <div className="space-y-12 -m-2 md:-m-4 lg:-m-6 max-w-7xl">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row gap-8 items-start md:items-center">
        <div className="relative">
          <div className="h-32 w-32 rounded-[2rem] overflow-hidden shadow-xl rotate-3 bg-white p-1">
            <div
              className="h-full w-full rounded-[1.8rem] flex items-center justify-center text-white text-4xl font-extrabold"
              style={{
                backgroundColor: "#E04A1F",
                fontFamily: "Manrope, system-ui, sans-serif",
              }}
            >
              {getUserInitials()}
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#E04A1F] text-white p-2 rounded-full shadow-lg">
            <BadgeCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
            <h2
              className="text-4xl font-black text-[#171c1f] tracking-tight"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {getUserDisplayName() || "Compagnie"}
            </h2>
            {user?.companyCode && (
              <span className="px-4 py-1 bg-[#ffdbd0] text-[#3a0a00] rounded-full text-xs font-bold tracking-widest uppercase font-mono">
                {user.companyCode}
              </span>
            )}
          </div>
          <p className="text-xl font-medium text-[#585e6c] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#E04A1F]" />
            {user?.role || "Compagnie"} —{" "}
            <span className={isActive ? "text-emerald-600" : "text-red-500"}>
              {isActive ? "Actif" : user?.statut || "Inactif"}
            </span>
          </p>
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-[#59413a]">
              <Mail className="w-4 h-4 text-[#E04A1F]" />
              {user?.emailCompagny || user?.email || "—"}
            </div>
            {(user?.telephoneCompagny || user?.telephone) && (
              <div className="flex items-center gap-2 text-sm text-[#59413a]">
                <Phone className="w-4 h-4 text-[#E04A1F]" />
                {user?.telephoneCompagny || user?.telephone}
              </div>
            )}
            {(user?.adresseCompagny || user?.adresse) && (
              <div className="flex items-center gap-2 text-sm text-[#59413a]">
                <MapPin className="w-4 h-4 text-[#E04A1F]" />
                {user?.adresseCompagny || user?.adresse}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() =>
              document
                .getElementById("profile-form-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="bg-[#E04A1F] text-white px-6 py-6 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#E04A1F]/20 active:scale-95 transition-all"
          >
            <Edit className="w-4 h-4" />
            Modifier Profil
          </Button>
        </div>
      </section>

      {/* Stats Bento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-white/50">
          <p className="text-sm font-bold text-[#585e6c] uppercase tracking-widest mb-4">
            Employes inscrits
          </p>
          <div className="flex items-end justify-between">
            <h3
              className="text-5xl font-black text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {totalEmployees}
            </h3>
            <Users className="w-10 h-10 text-[#E04A1F]/20" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-white/50">
          <p className="text-sm font-bold text-[#585e6c] uppercase tracking-widest mb-4">
            Departements
          </p>
          <div className="flex items-end justify-between">
            <h3
              className="text-5xl font-black text-[#171c1f]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {totalDepartments}
            </h3>
            <Building2 className="w-10 h-10 text-[#E04A1F]/20" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_24px_rgba(23,28,31,0.04)] border border-white/50">
          <p className="text-sm font-bold text-[#585e6c] uppercase tracking-widest mb-4">
            Plafond cumule
          </p>
          <div className="flex items-end justify-between">
            <h3
              className="text-3xl font-black text-[#E04A1F]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              {formatFCFA(totalBudget)}
            </h3>
            <Wallet className="w-10 h-10 text-[#E04A1F]/20" />
          </div>
        </div>
      </section>

      {/* Tabs / Settings */}
      <div id="profile-form-section" className="bg-white rounded-[2rem] shadow-[0_8px_32px_rgba(23,28,31,0.03)] p-8 lg:p-10">
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="bg-[#f0f4f8] p-1.5 rounded-xl">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-white data-[state=active]:text-[#E04A1F] data-[state=active]:font-bold rounded-lg px-5"
            >
              Informations
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-white data-[state=active]:text-[#E04A1F] data-[state=active]:font-bold rounded-lg px-5"
            >
              Parametres
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-white data-[state=active]:text-[#E04A1F] data-[state=active]:font-bold rounded-lg px-5"
            >
              Securite
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleProfileSubmit} className="space-y-8">
              <section className="bg-[#f0f4f8] p-8 rounded-[1.5rem]">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-5 h-5 text-[#E04A1F]" />
                  <h2
                    className="text-xl font-bold text-[#171c1f]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Informations de l&apos;entreprise
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold text-slate-700">
                      Nom de la compagnie
                    </Label>
                    <Input
                      value={profileData.nomCompagny}
                      onChange={(e) =>
                        setProfileData({ ...profileData, nomCompagny: e.target.value })
                      }
                      placeholder="Nom de la compagnie"
                      className="bg-white border-none rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold text-slate-700">
                      Email professionnel
                    </Label>
                    <Input
                      type="email"
                      value={profileData.emailCompagny}
                      onChange={(e) =>
                        setProfileData({ ...profileData, emailCompagny: e.target.value })
                      }
                      placeholder="contact@entreprise.com"
                      className="bg-white border-none rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Telephone
                    </Label>
                    <Input
                      value={profileData.telephoneCompagny}
                      onChange={(e) =>
                        setProfileData({ ...profileData, telephoneCompagny: e.target.value })
                      }
                      placeholder="+221 77 123 45 67"
                      className="bg-white border-none rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Adresse
                    </Label>
                    <Input
                      value={profileData.adresseCompagny}
                      onChange={(e) =>
                        setProfileData({ ...profileData, adresseCompagny: e.target.value })
                      }
                      placeholder="Adresse de la compagnie"
                      className="bg-white border-none rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="bg-[#E04A1F] text-white border-0 rounded-xl px-6 py-6 font-bold shadow-lg shadow-[#E04A1F]/20 active:scale-95 transition-all"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-8">
            <section className="bg-[#f0f4f8] p-8 rounded-[1.5rem]">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-[#E04A1F]" />
                <h2
                  className="text-xl font-bold text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Notifications
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    key: "emailNotifications" as const,
                    title: "Notifications par email",
                    desc: "Recevoir les notifications importantes par email",
                  },
                  {
                    key: "orderNotifications" as const,
                    title: "Commandes",
                    desc: "Notifications sur le statut des commandes",
                  },
                  {
                    key: "fuelAlerts" as const,
                    title: "Alertes carburant",
                    desc: "Recevoir les alertes liees au carburant",
                  },
                  {
                    key: "maintenanceAlerts" as const,
                    title: "Alertes maintenance",
                    desc: "Recevoir les rappels de maintenance",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-xl bg-white"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <Switch
                      checked={settings[item.key]}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, [item.key]: v })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#f0f4f8] p-8 rounded-[1.5rem]">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-5 h-5 text-[#E04A1F]" />
                <h2
                  className="text-xl font-bold text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Preferences
                </h2>
              </div>
              <div className="space-y-2 max-w-md">
                <Label className="text-sm font-semibold text-slate-700">Langue</Label>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    setSettings({ ...settings, language: e.target.value })
                  }
                  className="w-full bg-white border-none rounded-xl p-3 focus:ring-2 focus:ring-[#E04A1F]/40 outline-none"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                onClick={() => toast.success("Parametres enregistres")}
                className="bg-[#E04A1F] text-white border-0 rounded-xl px-6 py-6 font-bold shadow-lg shadow-[#E04A1F]/20 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-8">
            <section className="bg-[#f0f4f8] p-8 rounded-[1.5rem]">
              <div className="flex items-center gap-3 mb-6">
                <Key className="w-5 h-5 text-[#E04A1F]" />
                <h2
                  className="text-xl font-bold text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Changer le mot de passe
                </h2>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Mot de passe actuel
                  </Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      placeholder="Votre mot de passe actuel"
                      className="bg-white border-none rounded-xl p-3 pr-10 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="Votre nouveau mot de passe"
                      className="bg-white border-none rounded-xl p-3 pr-10 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Confirmer le nouveau mot de passe
                  </Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirmez le nouveau mot de passe"
                    className="bg-white border-none rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-[#E04A1F]/40"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    changePassword.isPending ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword
                  }
                  className="bg-[#E04A1F] text-white border-0 rounded-xl px-6 py-6 font-bold shadow-lg shadow-[#E04A1F]/20 active:scale-95 transition-all"
                >
                  {changePassword.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  {changePassword.isPending ? "Modification..." : "Modifier le mot de passe"}
                </Button>
              </form>
            </section>

            <section className="bg-gradient-to-br from-[#2c3134] to-[#171c1f] text-white p-8 rounded-[1.5rem]">
              <h3
                className="text-lg font-black mb-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Sessions actives
              </h3>
              <p className="text-sm opacity-70 mb-4">
                Vous etes actuellement connecte sur cet appareil.
              </p>
              <Button
                onClick={logout}
                className="bg-white text-[#ba1a1a] hover:bg-slate-50 border-0 rounded-xl px-5 font-bold"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Se deconnecter
              </Button>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
