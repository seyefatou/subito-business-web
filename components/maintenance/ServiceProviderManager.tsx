'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import { Plus, Star, Phone, Mail, MapPin, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ProviderType = 'garage' | 'concessionnaire' | 'station_service' | 'carrosserie' | 'pneumatique' | 'autre';

interface ServiceProvider {
  id: string;
  name: string;
  type: ProviderType;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  rating: number;
  is_active: boolean;
  notes: string;
}

interface ServiceProviderFormData {
  name: string;
  type: ProviderType;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  rating: number;
  is_active: boolean;
  notes: string;
}

const typeLabels: Record<ProviderType, string> = {
  garage: "Garage",
  concessionnaire: "Concessionnaire",
  station_service: "Station service",
  carrosserie: "Carrosserie",
  pneumatique: "Pneumatique",
  autre: "Autre"
};

const initialFormData: ServiceProviderFormData = {
  name: '',
  type: 'garage',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  rating: 0,
  is_active: true,
  notes: ''
};

export default function ServiceProviderManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<ServiceProvider | null>(null);
  const [formData, setFormData] = useState<ServiceProviderFormData>(initialFormData);

  const { data: providers = [] } = useQuery<ServiceProvider[]>({
    queryKey: ['serviceProviders'],
    queryFn: () => base44.entities.ServiceProvider.list(),
  });

  const createProvider = useMutation({
    mutationFn: (data: ServiceProviderFormData) => base44.entities.ServiceProvider.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceProviders'] });
      setShowDialog(false);
      resetForm();
      toast.success("Fournisseur ajoute avec succes");
    },
  });

  const updateProvider = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServiceProviderFormData }) =>
      base44.entities.ServiceProvider.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceProviders'] });
      setShowDialog(false);
      setEditingProvider(null);
      resetForm();
      toast.success("Fournisseur mis a jour");
    },
  });

  const deleteProvider = useMutation({
    mutationFn: (id: string) => base44.entities.ServiceProvider.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceProviders'] });
      setDeletingProvider(null);
      toast.success("Fournisseur supprime");
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleEdit = (provider: ServiceProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      contact_name: provider.contact_name,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      rating: provider.rating,
      is_active: provider.is_active,
      notes: provider.notes
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingProvider) {
      updateProvider.mutate({ id: editingProvider.id, data: formData });
    } else {
      createProvider.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Fournisseurs d&apos;entretien</h3>
          <p className="text-sm text-slate-500">{providers.length} fournisseur{providers.length > 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={() => {
            setEditingProvider(null);
            resetForm();
            setShowDialog(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un fournisseur
        </Button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider, index) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-800">{provider.name}</h4>
                <Badge variant="outline" className="mt-1">
                  {typeLabels[provider.type]}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(provider)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  onClick={() => setDeletingProvider(provider)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {provider.rating > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < provider.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="space-y-2 text-sm">
              {provider.contact_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-medium">Contact:</span>
                  <span>{provider.contact_name}</span>
                </div>
              )}
              {provider.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{provider.phone}</span>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{provider.email}</span>
                </div>
              )}
              {provider.address && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span className="text-xs">{provider.address}</span>
                </div>
              )}
            </div>

            {!provider.is_active && (
              <Badge variant="outline" className="mt-3 text-red-600 border-red-200">
                Inactif
              </Badge>
            )}
          </motion.div>
        ))}
      </div>

      {/* Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du fournisseur *</Label>
                <Input
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Garage Moderne"
                  required
                />
              </div>

              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ProviderType) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(typeLabels) as [ProviderType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du contact</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div>
                <Label>Telephone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: +221 77 123 45 67"
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@garage.com"
              />
            </div>

            <div>
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complete"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createProvider.isPending || updateProvider.isPending}
              >
                {editingProvider ? 'Mettre a jour' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProvider} onOpenChange={() => setDeletingProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer <strong>{deletingProvider?.name}</strong> ?
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProvider && deleteProvider.mutate(deletingProvider.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
