'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  Fuel,
  Bell,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import AutomationRuleForm from "@/components/automation/AutomationRuleForm";

interface AutomationRule {
  id: string;
  name: string;
  type: 'fuel_auto_approval' | 'reminder' | 'invoice_generation';
  description?: string;
  is_active: boolean;
  conditions?: {
    max_amount?: number;
    approved_vehicles?: string[];
    approved_drivers?: string[];
    departments?: string[];
  };
  created_date: string;
}

interface RuleTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}

const ruleTypeConfig: Record<string, RuleTypeConfig> = {
  fuel_auto_approval: {
    icon: Fuel,
    label: "Approbation auto carburant",
    color: "bg-orange-100 text-orange-700"
  },
  reminder: {
    icon: Bell,
    label: "Rappels automatiques",
    color: "bg-blue-100 text-blue-700"
  },
  invoice_generation: {
    icon: Receipt,
    label: "Generation factures",
    color: "bg-purple-100 text-purple-700"
  }
};

export default function Automation() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<AutomationRule | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);

  const { data: rules = [] } = useQuery<AutomationRule[]>({
    queryKey: ['automationRules'],
    queryFn: () => base44.entities.AutomationRule.list('-created_date', 100),
  });

  const createRule = useMutation({
    mutationFn: (data: Partial<AutomationRule>) => base44.entities.AutomationRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      setShowDialog(false);
      setEditingRule(null);
      toast.success("Regle creee avec succes");
    },
    onError: () => {
      toast.error("Erreur lors de la creation");
    }
  });

  const updateRule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AutomationRule> }) => base44.entities.AutomationRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      setShowDialog(false);
      setEditingRule(null);
      toast.success("Regle mise a jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise a jour");
    }
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => base44.entities.AutomationRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      setDeletingRule(null);
      toast.success("Regle supprimee");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => base44.entities.AutomationRule.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      toast.success("Statut mis a jour");
    },
  });

  const testRule = async (rule: AutomationRule) => {
    setTestingRule(rule.id);
    try {
      let functionName = '';
      switch (rule.type) {
        case 'fuel_auto_approval':
          functionName = 'autoApproveFuelRequests';
          break;
        case 'reminder':
          functionName = 'sendPendingReminders';
          break;
        case 'invoice_generation':
          functionName = 'generateMonthlyInvoices';
          break;
      }

      if (functionName) {
        const response = await base44.functions.invoke(functionName, {});
        toast.success(response.data.message || "Test execute avec succes");
      }
    } catch (error) {
      toast.error("Erreur lors du test");
    } finally {
      setTestingRule(null);
    }
  };

  const handleSubmit = (data: Partial<AutomationRule>) => {
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data });
    } else {
      createRule.mutate(data);
    }
  };

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    fuel: rules.filter(r => r.type === 'fuel_auto_approval').length,
    reminders: rules.filter(r => r.type === 'reminder').length,
  };

  const statItems = [
    { label: "Total regles", value: stats.total, icon: Zap, color: "bg-slate-100" },
    { label: "Actives", value: stats.active, icon: CheckCircle2, color: "bg-green-100" },
    { label: "Carburant", value: stats.fuel, icon: Fuel, color: "bg-orange-100" },
    { label: "Rappels", value: stats.reminders, icon: Bell, color: "bg-blue-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Automatisations</h1>
            <p className="text-slate-500">Regles et taches automatiques</p>
          </div>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle regle
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

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Aucune regle d'automatisation</p>
            <Button
              onClick={() => setShowDialog(true)}
              className="mt-4"
              variant="outline"
            >
              Creer votre premiere regle
            </Button>
          </div>
        ) : (
          rules.map((rule, index) => {
            const config = ruleTypeConfig[rule.type] || ruleTypeConfig.fuel_auto_approval;
            const Icon = config.icon;

            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${config.color.replace('text-', 'bg-').split(' ')[0]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{rule.name}</h3>
                        <Badge className={`${config.color} border-0`}>
                          {config.label}
                        </Badge>
                        {!rule.is_active && (
                          <Badge variant="outline" className="text-slate-500">
                            Desactivee
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) =>
                        toggleRule.mutate({ id: rule.id, is_active: checked })
                      }
                    />
                  </div>
                </div>

                {/* Conditions Preview */}
                {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2">Conditions:</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.conditions.max_amount && (
                        <Badge variant="outline" className="text-xs">
                          Montant &le; {rule.conditions.max_amount.toLocaleString()} FCFA
                        </Badge>
                      )}
                      {rule.conditions.approved_vehicles && rule.conditions.approved_vehicles.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {rule.conditions.approved_vehicles.length} vehicule(s)
                        </Badge>
                      )}
                      {rule.conditions.approved_drivers && rule.conditions.approved_drivers.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {rule.conditions.approved_drivers.length} conducteur(s)
                        </Badge>
                      )}
                      {rule.conditions.departments && rule.conditions.departments.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {rule.conditions.departments.length} departement(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testRule(rule)}
                    disabled={testingRule === rule.id || !rule.is_active}
                    className="gap-2"
                  >
                    {testingRule === rule.id ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Test...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Tester
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingRule(rule);
                      setShowDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingRule(rule)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Modifier la regle' : 'Nouvelle regle d\'automatisation'}
            </DialogTitle>
          </DialogHeader>
          <AutomationRuleForm
            rule={editingRule}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowDialog(false);
              setEditingRule(null);
            }}
            isSubmitting={createRule.isPending || updateRule.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la regle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer "{deletingRule?.name}" ?
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRule && deleteRule.mutate(deletingRule.id)}
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
