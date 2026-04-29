'use client';

import React, { useState, useMemo } from "react";
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
  Mail,
  Search,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

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
  const [searchQuery, setSearchQuery] = useState("");
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

  const departments: DepartmentResponse[] = useMemo(() => {
    const deptData = departmentsResponse?.data;
    if (Array.isArray(deptData)) return deptData;
    return (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];
  }, [departmentsResponse]);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.trim().toLowerCase();
    return departments.filter((d) =>
      (d.nom || '').toLowerCase().includes(q) ||
      (d.centreDeCouts || '').toLowerCase().includes(q) ||
      (d.emailResponsable || '').toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  // Create department
  const createDepartment = useMutation({
    mutationFn: (data: CreateDepartmentDto) => api.departments.create(data),
    onSuccess: (response) => {
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
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6 space-y-6">
      {/* Hero Header */}
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Organisation</span>
            <span>/</span>
            <span className="text-[#E04A1F]">Départements</span>
          </nav>
          <h1
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f] leading-tight"
            style={MANROPE}
          >
            Départements
          </h1>
          <p className="text-[#585e6c] font-medium mt-1">
            Organisez vos centres de coûts et budgets par équipe
          </p>
        </div>
        <Button
          className="bg-[#E04A1F] hover:bg-[#C8330F] text-white border-0 py-6 px-6 rounded-2xl font-bold text-base shadow-lg shadow-[#E04A1F]/20 active:scale-[0.98] transition-all gap-2"
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Nouveau département
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-[#E04A1F]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Départements</p>
            <p className="text-2xl font-extrabold text-[#171c1f] mt-0.5" style={MANROPE}>
              {departments.length}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#f0f4f8] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-[#585e6c]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Budget total</p>
            <p className="text-xl md:text-2xl font-extrabold text-[#171c1f] mt-0.5 truncate" style={MANROPE}>
              {totalBudget.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Employés</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5" style={MANROPE}>
              {totalEmployees}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#585e6c]" />
          <Input
            placeholder="Rechercher par nom, centre de coûts ou email..."
            className="pl-11 h-11 rounded-xl border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Compteur */}
      {filteredDepartments.length > 0 && (
        <div className="flex items-center justify-end">
          <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
            {filteredDepartments.length} département{filteredDepartments.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Liste */}
      {filteredDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-[#E04A1F]" />
          </div>
          <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>
            Aucun département
          </p>
          <p className="text-sm text-[#585e6c] mt-1 max-w-md text-center px-6">
            {searchQuery
              ? "Aucun département ne correspond à votre recherche."
              : "Créez votre premier département pour organiser vos employés et budgets."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredDepartments.map((department, index) => (
              <motion.div
                key={department.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#ffdbd0] transition-all p-5 md:p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-[#E04A1F]" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="font-extrabold text-[#171c1f] truncate"
                        style={MANROPE}
                      >
                        {department.nom}
                      </h3>
                      {department.centreDeCouts && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {department.centreDeCouts}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-[#585e6c] hover:bg-[#f0f4f8]"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem
                        onClick={() => handleEdit(department)}
                        className="cursor-pointer"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                        onClick={() => deleteDepartment.mutate(department.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Membres</p>
                    <p className="text-2xl font-extrabold text-[#171c1f] mt-1" style={MANROPE}>
                      {department._count?.employees || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Budget</p>
                    <p className="text-2xl font-extrabold text-[#E04A1F] mt-1" style={MANROPE}>
                      {((department.budgetMensuel || 0) / 1000).toFixed(0)}
                      <span className="text-base">k</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c] ml-1">FCFA</span>
                    </p>
                  </div>
                </div>

                {department.emailResponsable && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-[#585e6c]">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{department.emailResponsable}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-extrabold text-[#171c1f]"
              style={MANROPE}
            >
              {editingDepartment ? 'Modifier le département' : 'Nouveau département'}
            </DialogTitle>
            <DialogDescription className="text-[#585e6c]">
              {editingDepartment
                ? 'Mettez à jour les informations du département.'
                : 'Créez un département pour organiser vos employés et leur budget.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="dept-nom" className="text-sm font-bold text-[#171c1f]">
                Nom du département
              </Label>
              <Input
                id="dept-nom"
                placeholder="Direction Générale"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-cc" className="text-sm font-bold text-[#171c1f]">
                Centre de coûts <span className="text-[#585e6c] font-medium">(optionnel)</span>
              </Label>
              <Input
                id="dept-cc"
                placeholder="CC-001"
                value={formData.centreDeCouts}
                onChange={(e) => setFormData({ ...formData, centreDeCouts: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-budget" className="text-sm font-bold text-[#171c1f]">
                Budget mensuel (FCFA)
              </Label>
              <Input
                id="dept-budget"
                type="number"
                placeholder="100000"
                value={formData.budgetMensuel}
                onChange={(e) => setFormData({ ...formData, budgetMensuel: parseInt(e.target.value) || 0 })}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-email" className="text-sm font-bold text-[#171c1f]">
                Email du responsable <span className="text-[#585e6c] font-medium">(optionnel)</span>
              </Label>
              <Input
                id="dept-email"
                type="email"
                placeholder="manager@entreprise.com"
                value={formData.emailResponsable}
                onChange={(e) => setFormData({ ...formData, emailResponsable: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-4 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl border-slate-200 text-[#585e6c] font-bold"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createDepartment.isPending || updateDepartment.isPending}
              className="rounded-xl bg-[#E04A1F] hover:bg-[#C8330F] text-white font-bold shadow-md shadow-[#E04A1F]/20"
            >
              {editingDepartment ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
