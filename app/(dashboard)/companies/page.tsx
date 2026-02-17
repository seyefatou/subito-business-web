'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  DollarSign,
  CheckCircle,
  XCircle,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import CompanyForm from "@/components/companies/CompanyForm";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  address?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  monthly_budget?: number;
  created_date: string;
}

interface Employee {
  id: string;
  company?: string;
  full_name?: string;
  email?: string;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function Companies() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list('-created_date'),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createCompany = useMutation({
    mutationFn: (data: Partial<Company>) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowForm(false);
      toast.success("Societe creee avec succes");
    },
    onError: () => {
      toast.error("Erreur lors de la creation");
    }
  });

  const updateCompany = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowForm(false);
      setEditingCompany(null);
      toast.success("Societe mise a jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise a jour");
    }
  });

  const deleteCompany = useMutation({
    mutationFn: (id: string) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeletingCompany(null);
      toast.success("Societe supprimee");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  const handleSubmit = (data: Partial<Company>) => {
    if (editingCompany) {
      updateCompany.mutate({ id: editingCompany.id, data });
    } else {
      createCompany.mutate(data);
    }
  };

  const getEmployeeCount = (companyName?: string) => {
    if (!companyName) return 0;
    return employees.filter(e => e.company === companyName).length;
  };

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.is_active).length,
    totalEmployees: employees.length,
    totalBudget: companies.reduce((sum, c) => sum + (c.monthly_budget || 0), 0),
  };

  const statItems: StatItem[] = [
    { label: "Total societes", value: stats.total, icon: Building2, color: "bg-blue-50" },
    { label: "Actives", value: stats.active, icon: CheckCircle, color: "bg-green-50" },
    { label: "Employes", value: stats.totalEmployees, icon: Users, color: "bg-purple-50" },
    { label: "Budget total", value: `${stats.totalBudget.toLocaleString()} FCFA`, icon: DollarSign, color: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Societes</h1>
          <p className="text-slate-500 mt-1">
            {filteredCompanies.length} societe{filteredCompanies.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCompany(null);
            setShowForm(true);
          }}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle societe
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">{stat.label}</p>
              <stat.icon className="w-5 h-5 text-slate-500" />
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
            placeholder="Rechercher par nom ou code..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Companies grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredCompanies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200"
            >
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune societe trouvee</p>
            </motion.div>
          ) : (
            filteredCompanies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-3 rounded-xl gradient-subito">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{company.name}</h3>
                        <Badge variant={company.is_active ? "default" : "secondary"}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {company.code && (
                        <p className="text-sm text-slate-500">Code: {company.code}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingCompany(company);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingCompany(company)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-3">
                  {company.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600">{company.address}</span>
                    </div>
                  )}

                  {company.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{company.contact_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    {company.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{company.contact_email}</span>
                      </div>
                    )}
                    {company.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{company.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {getEmployeeCount(company.name)} employe{getEmployeeCount(company.name) > 1 ? 's' : ''}
                    </span>
                  </div>
                  {company.monthly_budget && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800">
                        {company.monthly_budget.toLocaleString()} FCFA/mois
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Modifier la societe' : 'Nouvelle societe'}
            </DialogTitle>
          </DialogHeader>
          <CompanyForm
            company={editingCompany}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingCompany(null);
            }}
            isSubmitting={createCompany.isPending || updateCompany.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer la societe "{deletingCompany?.name}" ?
              Cette action est irreversible.
              {deletingCompany && getEmployeeCount(deletingCompany.name) > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-800 text-sm font-medium">
                    Attention: {getEmployeeCount(deletingCompany.name)} employe(s) sont associes a cette societe.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCompany && deleteCompany.mutate(deletingCompany.id)}
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
