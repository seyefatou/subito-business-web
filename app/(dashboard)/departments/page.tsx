'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, DepartmentResponse, CreateDepartmentDto } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Building2,
  Users,
  Wallet,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FormData {
  nom: string;
  centreDeCouts: string;
  budgetMensuel: number;
  emailResponsable: string;
}

export default function Departments() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nom: "",
    centreDeCouts: "",
    budgetMensuel: 100000,
    emailResponsable: "",
  });

  // Fetch departments
  const { data: departmentsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(1, 100),
  });

  console.log('[DEPARTMENTS] Raw API response:', JSON.stringify(departmentsResponse).substring(0, 500));
  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];

  // Create department
  const createDepartment = useMutation({
    mutationFn: (data: CreateDepartmentDto) => api.departments.create(data),
    onSuccess: (response) => {
      console.log('[DEPARTMENTS] Create response:', JSON.stringify(response).substring(0, 500));
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departement cree avec succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de la creation");
    },
  });

  // Update department
  const updateDepartment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateDepartmentDto }) =>
      api.departments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departement modifie avec succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de la modification");
    },
  });

  // Delete department
  const deleteDepartment = useMutation({
    mutationFn: (id: number) => api.departments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departement supprime");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de la suppression");
    },
  });

  const resetForm = () => {
    setFormData({
      nom: "",
      centreDeCouts: "",
      budgetMensuel: 100000,
      emailResponsable: "",
    });
    setEditingDepartment(null);
  };

  const handleEdit = (department: DepartmentResponse) => {
    setEditingDepartment(department);
    setFormData({
      nom: department.nom || "",
      centreDeCouts: department.centreDeCouts || "",
      budgetMensuel: department.budgetMensuel || 100000,
      emailResponsable: department.emailResponsable || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const dto: CreateDepartmentDto = {
      nom: formData.nom,
      centreDeCouts: formData.centreDeCouts || undefined,
      budgetMensuel: Number(formData.budgetMensuel) || 0,
      emailResponsable: formData.emailResponsable || undefined,
    };
    if (editingDepartment) {
      updateDepartment.mutate({ id: editingDepartment.id, data: dto });
    } else {
      createDepartment.mutate(dto);
    }
  };

  // Overall stats
  const totalBudget = departments.reduce((sum, d) => sum + (Number(d.budgetMensuel) || 0), 0);
  const totalEmployees = departments.reduce((sum, d) => sum + (d._count?.employees || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Departements</h1>
          <p className="text-slate-500 mt-1">Organisez vos centres de couts</p>
        </div>
        <Button
          className="gradient-subito text-white border-0 gap-2"
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Nouveau departement
        </Button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-100">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-slate-600">Departements</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{departments.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-slate-600">Budget total</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalBudget.toLocaleString()} FCFA</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-100">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-slate-600">Employes</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalEmployees}</p>
        </motion.div>
      </div>

      {/* Departments grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {departments.map((department, index) => (
            <motion.div
              key={department.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{department.nom}</h3>
                    {department.centreDeCouts && (
                      <p className="text-xs text-slate-500">CC: {department.centreDeCouts}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(department)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => deleteDepartment.mutate(department.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800">{department._count?.employees || 0}</p>
                  <p className="text-xs text-slate-500">Membres</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-subito">
                    {((department.budgetMensuel || 0) / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-slate-500">Budget FCFA</p>
                </div>
              </div>

              {department.emailResponsable && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500">Responsable: {department.emailResponsable}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {departments.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun departement</p>
            <p className="text-sm">Creez votre premier departement pour commencer</p>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Modifier le departement' : 'Nouveau departement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du departement</Label>
              <Input
                placeholder="Direction Generale"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Centre de couts (optionnel)</Label>
              <Input
                placeholder="CC-001"
                value={formData.centreDeCouts}
                onChange={(e) => setFormData({ ...formData, centreDeCouts: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Budget mensuel (FCFA)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={formData.budgetMensuel}
                onChange={(e) => setFormData({ ...formData, budgetMensuel: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email du responsable (optionnel)</Label>
              <Input
                type="email"
                placeholder="manager@entreprise.com"
                value={formData.emailResponsable}
                onChange={(e) => setFormData({ ...formData, emailResponsable: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="gradient-subito text-white border-0"
              onClick={handleSubmit}
              disabled={createDepartment.isPending || updateDepartment.isPending}
            >
              {editingDepartment ? 'Enregistrer' : 'Creer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
