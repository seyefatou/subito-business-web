'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  MoreVertical,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Wallet
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Employee {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: 'admin' | 'manager' | 'user';
  monthly_limit?: number;
  is_active?: boolean;
  created_date: string;
}

interface Department {
  id: string;
  name: string;
}

interface Order {
  id: string;
  beneficiary_email?: string;
  final_cost?: number;
  estimated_cost?: number;
}

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  monthly_limit: number;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  user: "bg-slate-100 text-slate-700",
};

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  user: "Utilisateur",
};

export default function Team() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    role: "user",
    monthly_limit: 50000,
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
  });

  const createEmployee = useMutation({
    mutationFn: (data: Partial<Employee>) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Employe ajoute avec succes");
    },
  });

  const updateEmployee = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
      toast.success("Employe modifie avec succes");
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: (id: string) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Employe supprime");
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      department: "",
      role: "user",
      monthly_limit: 50000,
    });
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      role: employee.role || "user",
      monthly_limit: employee.monthly_limit || 50000,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingEmployee) {
      updateEmployee.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createEmployee.mutate(formData);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate spending per employee
  const getEmployeeSpending = (email?: string) => {
    if (!email) return 0;
    return orders
      .filter(o => o.beneficiary_email === email)
      .reduce((sum, o) => sum + (o.final_cost || o.estimated_cost || 0), 0);
  };

  // Stats
  const stats = {
    total: employees.length,
    admins: employees.filter(e => e.role === 'admin').length,
    active: employees.filter(e => e.is_active !== false).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
          <p className="text-slate-500 mt-1">Gerez les utilisateurs et leurs acces</p>
        </div>
        <Button
          className="gradient-subito text-white border-0 gap-2"
          onClick={() => {
            setEditingEmployee(null);
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Ajouter un membre
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total membres</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Administrateurs</p>
          <p className="text-2xl font-bold text-slate-800">{stats.admins}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Actifs</p>
          <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un membre..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredEmployees.map((employee, index) => {
            const spending = getEmployeeSpending(employee.email);
            const limitPercent = employee.monthly_limit
              ? Math.min((spending / employee.monthly_limit) * 100, 100)
              : 0;

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-subito flex items-center justify-center text-white font-semibold">
                      {employee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NN'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{employee.full_name}</h3>
                      <Badge className={`${roleColors[employee.role || 'user']} border-0 text-xs`}>
                        {roleLabels[employee.role || 'user']}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(employee)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteEmployee.mutate(employee.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="w-4 h-4" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-4 h-4" />
                    <span>{employee.department || 'Non assigne'}</span>
                  </div>
                </div>

                {/* Spending progress */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500">Consommation</span>
                    <span className="font-medium text-slate-700">
                      {spending.toLocaleString()} / {(employee.monthly_limit || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        limitPercent > 80 ? 'bg-red-500' : limitPercent > 50 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${limitPercent}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredEmployees.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun membre trouve</p>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Modifier le membre' : 'Ajouter un membre'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                placeholder="Jean Dupont"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="jean@entreprise.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  placeholder="+225 00 00 00 00"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departement</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => setFormData({ ...formData, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="Direction">Direction</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="RH">Ressources Humaines</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Plafond mensuel (FCFA)</Label>
              <Input
                type="number"
                placeholder="50000"
                value={formData.monthly_limit}
                onChange={(e) => setFormData({ ...formData, monthly_limit: parseInt(e.target.value) || 0 })}
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
              disabled={createEmployee.isPending || updateEmployee.isPending}
            >
              {editingEmployee ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
