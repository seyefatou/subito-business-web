'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Building2,
  Users,
  Wallet,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  cost_center?: string;
  monthly_budget?: number;
  manager_email?: string;
  created_date: string;
}

interface Employee {
  id: string;
  department?: string;
}

interface Order {
  id: string;
  department?: string;
  final_cost?: number;
  estimated_cost?: number;
}

interface FormData {
  name: string;
  cost_center: string;
  monthly_budget: number;
  manager_email: string;
}

interface DepartmentStats {
  employees: number;
  orders: number;
  spending: number;
}

export default function Departments() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    cost_center: "",
    monthly_budget: 100000,
    manager_email: "",
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
  });

  const createDepartment = useMutation({
    mutationFn: (data: Partial<Department>) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Departement cree avec succes");
    },
  });

  const updateDepartment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDialogOpen(false);
      setEditingDepartment(null);
      resetForm();
      toast.success("Departement modifie avec succes");
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: (id: string) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departement supprime");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      cost_center: "",
      monthly_budget: 100000,
      manager_email: "",
    });
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name || "",
      cost_center: department.cost_center || "",
      monthly_budget: department.monthly_budget || 100000,
      manager_email: department.manager_email || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingDepartment) {
      updateDepartment.mutate({ id: editingDepartment.id, data: formData });
    } else {
      createDepartment.mutate(formData);
    }
  };

  // Calculate stats per department
  const getDepartmentStats = (deptName: string): DepartmentStats => {
    const deptOrders = orders.filter(o => o.department === deptName);
    const deptEmployees = employees.filter(e => e.department === deptName);
    const totalSpending = deptOrders.reduce((sum, o) => sum + (o.final_cost || o.estimated_cost || 0), 0);
    return {
      employees: deptEmployees.length,
      orders: deptOrders.length,
      spending: totalSpending,
    };
  };

  // Overall stats
  const totalBudget = departments.reduce((sum, d) => sum + (d.monthly_budget || 0), 0);
  const totalSpent = orders.reduce((sum, o) => sum + (o.final_cost || o.estimated_cost || 0), 0);

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
            setEditingDepartment(null);
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
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-slate-600">Consommation</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0}%
          </p>
        </motion.div>
      </div>

      {/* Departments grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {departments.map((department, index) => {
            const stats = getDepartmentStats(department.name);
            const budgetPercent = department.monthly_budget
              ? Math.min((stats.spending / department.monthly_budget) * 100, 100)
              : 0;

            return (
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
                      <h3 className="font-semibold text-slate-800">{department.name}</h3>
                      {department.cost_center && (
                        <p className="text-xs text-slate-500">CC: {department.cost_center}</p>
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

                <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{stats.employees}</p>
                    <p className="text-xs text-slate-500">Membres</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{stats.orders}</p>
                    <p className="text-xs text-slate-500">Commandes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-subito">
                      {(stats.spending / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-slate-500">FCFA</p>
                  </div>
                </div>

                {/* Budget progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500">Budget mensuel</span>
                    <span className="font-medium text-slate-700">
                      {stats.spending.toLocaleString()} / {(department.monthly_budget || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Centre de couts (optionnel)</Label>
              <Input
                placeholder="CC-001"
                value={formData.cost_center}
                onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Budget mensuel (FCFA)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={formData.monthly_budget}
                onChange={(e) => setFormData({ ...formData, monthly_budget: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email du responsable (optionnel)</Label>
              <Input
                type="email"
                placeholder="manager@entreprise.com"
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
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
