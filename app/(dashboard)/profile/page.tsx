'use client';

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ChangePasswordCompagnyDto, UpdateCompagnyProfileDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  User,
  Phone,
  MapPin,
  Key,
  Bell,
  Globe,
  Save,
  Shield,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateCompagnyProfileDto) => {
      if (!token) throw new Error('Non authentifie');
      return api.authCompagny.updateProfile(token, data);
    },
    onSuccess: () => {
      refreshProfile();
      toast.success("Profil mis a jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise a jour");
    }
  });

  const changePassword = useMutation({
    mutationFn: async (data: ChangePasswordCompagnyDto) => {
      if (!token) throw new Error('Non authentifie');
      return api.authCompagny.changePassword(token, data);
    },
    onSuccess: () => {
      toast.success("Mot de passe modifie avec succes");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    }
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
    if (!user) return 'U';
    const name = user.nomCompagny || user.raisonSociale;
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    const prenom = user.prenom || '';
    const nom = user.nom || '';
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    const name = user.nomCompagny || user.raisonSociale;
    if (name) return name;
    return `${user.prenom || ''} ${user.nom || ''}`.trim();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl gradient-subito">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mon Profil</h1>
          <p className="text-slate-500">Gerez vos informations personnelles et preferences</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-24 h-24 rounded-2xl gradient-subito flex items-center justify-center text-white text-3xl font-bold">
            {getUserInitials()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{getUserDisplayName()}</h2>
              {user?.companyCode && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-sm font-mono text-slate-600">{user.companyCode}</span>
              )}
            </div>
            <p className="text-slate-600 mb-2">{user?.emailCompagny || user?.email}</p>
            <div className="flex items-center gap-2">
              <Badge className="gradient-subito text-white border-0">
                <Shield className="w-3 h-3 mr-1" />
                {user?.role || 'Compagnie'}
              </Badge>
              <Badge variant="outline" className={
                user?.statut?.toLowerCase() === 'active' || user?.statut?.toLowerCase() === 'actif'
                  ? 'text-green-600 border-green-200'
                  : 'text-red-600 border-red-200'
              }>
                {user?.statut?.toLowerCase() === 'active' || user?.statut?.toLowerCase() === 'actif' ? 'Actif' : (user?.statut || 'Inactif')}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Informations personnelles</TabsTrigger>
            <TabsTrigger value="settings">Parametres</TabsTrigger>
            <TabsTrigger value="security">Securite</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nom de la compagnie</Label>
                    <Input
                      value={profileData.nomCompagny}
                      onChange={(e) => setProfileData({ ...profileData, nomCompagny: e.target.value })}
                      placeholder="Nom de la compagnie"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={profileData.emailCompagny}
                      onChange={(e) => setProfileData({ ...profileData, emailCompagny: e.target.value })}
                      placeholder="Email de la compagnie"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Telephone
                    </Label>
                    <Input
                      value={profileData.telephoneCompagny}
                      onChange={(e) => setProfileData({ ...profileData, telephoneCompagny: e.target.value })}
                      placeholder="Telephone de la compagnie"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Adresse
                    </Label>
                    <Input
                      value={profileData.adresseCompagny}
                      onChange={(e) => setProfileData({ ...profileData, adresseCompagny: e.target.value })}
                      placeholder="Adresse de la compagnie"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="gradient-subito text-white border-0 gap-2"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-800">Notifications par email</p>
                    <p className="text-sm text-slate-500">Recevoir les notifications importantes par email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-800">Commandes</p>
                    <p className="text-sm text-slate-500">Notifications sur le statut des commandes</p>
                  </div>
                  <Switch
                    checked={settings.orderNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, orderNotifications: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-800">Alertes carburant</p>
                    <p className="text-sm text-slate-500">Recevoir les alertes liees au carburant</p>
                  </div>
                  <Switch
                    checked={settings.fuelAlerts}
                    onCheckedChange={(v) => setSettings({ ...settings, fuelAlerts: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-800">Alertes maintenance</p>
                    <p className="text-sm text-slate-500">Recevoir les rappels de maintenance</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceAlerts}
                    onCheckedChange={(v) => setSettings({ ...settings, maintenanceAlerts: v })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Preferences
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  >
                    <option value="fr">Francais</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => toast.success("Parametres enregistres")}
                className="gradient-subito text-white border-0 gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer les parametres
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Changer le mot de passe
              </h3>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Votre mot de passe actuel"
                      className="pr-10"
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
                  <Label>Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Votre nouveau mot de passe"
                      className="pr-10"
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
                  <Label>Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirmez le nouveau mot de passe"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={changePassword.isPending || !passwordData.currentPassword || !passwordData.newPassword}
                  className="gradient-subito text-white border-0 gap-2"
                >
                  {changePassword.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {changePassword.isPending ? 'Modification...' : 'Modifier le mot de passe'}
                </Button>
              </form>

              <div className="pt-6 border-t border-slate-200">
                <div className="p-4 rounded-xl border border-slate-200">
                  <p className="font-medium text-slate-800 mb-2">Sessions actives</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Vous etes actuellement connecte sur cet appareil.
                  </p>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={logout}
                  >
                    Se deconnecter
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
