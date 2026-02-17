'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckSquare,
  Plus,
  Filter,
  Calendar,
  User,
  Car,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import TaskForm from "@/components/tasks/TaskForm";
import TaskCard from "@/components/tasks/TaskCard";
import { toast } from "sonner";

interface Task {
  id: string;
  title?: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
  vehicle_id?: string;
  created_date: string;
}

interface Employee {
  id: string;
  full_name?: string;
  email?: string;
}

interface Vehicle {
  id: string;
  registration_number?: string;
  brand?: string;
  model?: string;
}

interface User {
  email?: string;
}

interface CategoryConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface PriorityConfig {
  label: string;
  color: string;
}

const categoryConfig: Record<string, CategoryConfig> = {
  vehicle: { label: "Vehicule", icon: Car, color: "bg-blue-100 text-blue-700" },
  maintenance: { label: "Entretien", icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  document: { label: "Document", icon: Calendar, color: "bg-purple-100 text-purple-700" },
  fuel: { label: "Carburant", icon: Clock, color: "bg-green-100 text-green-700" },
  driver: { label: "Conducteur", icon: User, color: "bg-pink-100 text-pink-700" },
  other: { label: "Autre", icon: CheckSquare, color: "bg-slate-100 text-slate-700" },
};

const priorityConfig: Record<string, PriorityConfig> = {
  low: { label: "Basse", color: "bg-slate-100 text-slate-600" },
  medium: { label: "Moyenne", color: "bg-blue-100 text-blue-700" },
  high: { label: "Haute", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-700" },
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: user } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const createTask = useMutation({
    mutationFn: (data: Partial<Task>) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowDialog(false);
      toast.success("Tache creee");
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowDialog(false);
      setEditingTask(null);
      toast.success("Tache mise a jour");
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tache supprimee");
    },
  });

  const handleSubmit = (data: Partial<Task>) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data });
    } else {
      createTask.mutate(data);
    }
  };

  const handleStatusChange = (task: Task, newStatus: Task['status']) => {
    const updateData: Partial<Task> = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }
    updateTask.mutate({ id: task.id, data: updateData });
  };

  // Filtrer les taches
  const filteredTasks = tasks.filter(task => {
    const categoryMatch = categoryFilter === "all" || task.category === categoryFilter;
    const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
    return categoryMatch && priorityMatch;
  });

  // Grouper par statut
  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  // Stats
  const myTasks = tasks.filter(t => t.assigned_to === user?.email && t.status !== 'completed');
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < new Date();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl gradient-subito">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestion des taches</h1>
            <p className="text-slate-500">{tasks.length} tache{tasks.length > 1 ? 's' : ''} au total</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setShowDialog(true);
          }}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle tache
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-blue-700" />
            <p className="text-xs text-slate-600">Mes taches</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{myTasks.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-orange-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-700" />
            <p className="text-xs text-slate-600">En cours</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{inProgressTasks.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-red-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-700" />
            <p className="text-xs text-slate-600">En retard</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{overdueTasks.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-green-100 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <p className="text-xs text-slate-600">Completees</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{completedTasks.length}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filtres:</span>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Priorite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kanban" className="space-y-6">
        <TabsList>
          <TabsTrigger value="kanban">Vue Kanban</TabsTrigger>
          <TabsTrigger value="list">Vue Liste</TabsTrigger>
          <TabsTrigger value="my-tasks">Mes taches</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* A faire */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">A faire</h3>
                <Badge className="bg-slate-100 text-slate-700 border-0">
                  {todoTasks.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {todoTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employees={employees}
                    vehicles={vehicles}
                    categoryConfig={categoryConfig}
                    priorityConfig={priorityConfig}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setShowDialog(true);
                    }}
                    onDelete={(id) => deleteTask.mutate(id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {todoTasks.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-sm">
                    Aucune tache
                  </p>
                )}
              </div>
            </div>

            {/* En cours */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">En cours</h3>
                <Badge className="bg-orange-100 text-orange-700 border-0">
                  {inProgressTasks.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {inProgressTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employees={employees}
                    vehicles={vehicles}
                    categoryConfig={categoryConfig}
                    priorityConfig={priorityConfig}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setShowDialog(true);
                    }}
                    onDelete={(id) => deleteTask.mutate(id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {inProgressTasks.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-sm">
                    Aucune tache
                  </p>
                )}
              </div>
            </div>

            {/* Terminees */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Terminees</h3>
                <Badge className="bg-green-100 text-green-700 border-0">
                  {completedTasks.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {completedTasks.slice(0, 10).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employees={employees}
                    vehicles={vehicles}
                    categoryConfig={categoryConfig}
                    priorityConfig={priorityConfig}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setShowDialog(true);
                    }}
                    onDelete={(id) => deleteTask.mutate(id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {completedTasks.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-sm">
                    Aucune tache
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  employees={employees}
                  vehicles={vehicles}
                  categoryConfig={categoryConfig}
                  priorityConfig={priorityConfig}
                  onEdit={(task) => {
                    setEditingTask(task);
                    setShowDialog(true);
                  }}
                  onDelete={(id) => deleteTask.mutate(id)}
                  onStatusChange={handleStatusChange}
                  viewMode="list"
                />
              ))}
              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Aucune tache trouvee</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="my-tasks">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="space-y-3">
              {tasks
                .filter(t => t.assigned_to === user?.email)
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employees={employees}
                    vehicles={vehicles}
                    categoryConfig={categoryConfig}
                    priorityConfig={priorityConfig}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setShowDialog(true);
                    }}
                    onDelete={(id) => deleteTask.mutate(id)}
                    onStatusChange={handleStatusChange}
                    viewMode="list"
                  />
                ))}
              {tasks.filter(t => t.assigned_to === user?.email).length === 0 && (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Aucune tache assignee</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Modifier la tache' : 'Nouvelle tache'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            employees={employees}
            vehicles={vehicles}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowDialog(false);
              setEditingTask(null);
            }}
            isSubmitting={createTask.isPending || updateTask.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
