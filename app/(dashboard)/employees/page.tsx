'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  Shield,
  DollarSign,
  UserCheck,
  UserX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import EmployeeForm from "@/components/employees/EmployeeForm";

interface Employee {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  department?: string;
  role?: 'admin' | 'manager' | 'user';
  monthly_limit?: number;
  current_month_spent?: number;
  is_active?: boolean;
  created_date: string;
}

interface Department {
  id: string;
  name: string;
}

interface RoleInfo {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleLabels: Record<string, RoleInfo> = {
  admin: { label: "Admin Entreprise", color: "bg-purple-100 text-purple-700", icon: Shield },
  manager: { label: "Manager", color: "bg-blue-100 text-blue-700", icon: UserCheck },
  user: { label: "Employe", color: "bg-slate-100 text-slate-700", icon: Users },
};

export default function Employees() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date', 200),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const createEmployee = useMutation({
    mutationFn: (data: Partial<Employee>) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setEditingEmployee(null);
      toast.success("Employe ajoute avec succes");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout");
    }
  });

  const updateEmployee = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setEditingEmployee(null);
      toast.success("Employe modifie avec succes");
    },
    onError: () => {
      toast.error("Erreur lors de la modification");
    }
  });

  const deleteEmployee = useMutation({
    mutationFn: (id: string) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeletingEmployee(null);
      toast.success("Employe supprime");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => base44.entities.Employee.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Statut mis a jour");
    },
  });

  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    admins: employees.filter(e => e.role === 'admin').length,
    managers: employees.filter(e => e.role === 'manager').length,
  };

  const handleSubmit = (data: Partial<Employee>) => {
    if (editingEmployee) {
      updateEmployee.mutate({ id: editingEmployee.id, data });
    } else {
      createEmployee.mutate(data);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowDialog(true);
  };

  const statItems = [
    { label: "Total", value: stats.total, icon: Users, color: "bg-slate-100" },
    { label: "Actifs", value: stats.active, icon: UserCheck, color: "bg-green-100" },
    { label: "Administrateurs", value: stats.admins, icon: Shield, color: "bg-purple-100" },
    { label: "Managers", value: stats.managers, icon: UserCheck, color: "bg-blue-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des employes</h1>
          <p className="text-slate-500 mt-1">
            {filteredEmployees.length} employe{filteredEmployees.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleAdd} className="gradient-subito text-white border-0 gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un employe
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, email ou departement..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Employees List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Employe
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Societe
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Departement
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Plafond mensuel
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                  Statut
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Aucun employe trouve
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee, index) => {
                  const roleInfo = roleLabels[employee.role || 'user'] || roleLabels.user;
                  const RoleIcon = roleInfo.icon;

                  return (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full gradient-subito flex items-center justify-center text-white font-semibold">
                            {employee.full_name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{employee.full_name}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </div>
                            {employee.phone && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="w-3 h-3" />
                                {employee.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {employee.company || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">
                          {employee.department || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`${roleInfo.color} border-0 gap-1`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {employee.monthly_limit?.toLocaleString() || '-'} FCFA
                          </p>
                          {employee.monthly_limit && (
                            <p className="text-xs text-slate-500">
                              Depense: {(employee.current_month_spent || 0).toLocaleString()} FCFA
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive.mutate({
                            id: employee.id,
                            is_active: !employee.is_active
                          })}
                          className={employee.is_active ? 'text-green-600' : 'text-slate-400'}
                        >
                          {employee.is_active ? (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-1" />
                              Inactif
                            </>
                          )}
                        </Button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingEmployee(employee)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Modifier l\'employe' : 'Ajouter un employe'}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Modifiez les informations de l\'employe'
                : 'Ajoutez un nouvel employe a votre entreprise'
              }
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            departments={departments}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowDialog(false);
              setEditingEmployee(null);
            }}
            isSubmitting={createEmployee.isPending || updateEmployee.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={() => setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'employe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer {deletingEmployee?.full_name} ?
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEmployee && deleteEmployee.mutate(deletingEmployee.id)}
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
