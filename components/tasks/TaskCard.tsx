'use client';

import React, { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MoreVertical, Trash2, Edit, User, LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
type TaskCategory = 'vehicle' | 'maintenance' | 'document' | 'fuel' | 'driver' | 'other';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  due_date?: string;
  vehicle_registration?: string;
}

interface Employee {
  id: string;
  email: string;
  full_name: string;
}

interface Vehicle {
  id: string;
  registration: string;
}

interface CategoryConfigItem {
  icon?: LucideIcon;
  color: string;
  label?: string;
}

interface PriorityConfigItem {
  color: string;
  label: string;
}

interface TaskCardProps {
  task: Task;
  employees: Employee[];
  vehicles: Vehicle[];
  categoryConfig: Record<TaskCategory, CategoryConfigItem>;
  priorityConfig: Record<TaskPriority, PriorityConfigItem>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  viewMode?: 'card' | 'list';
}

export default function TaskCard({
  task,
  employees,
  vehicles,
  categoryConfig,
  priorityConfig,
  onEdit,
  onDelete,
  onStatusChange,
  viewMode = "card"
}: TaskCardProps) {
  const category = categoryConfig[task.category];
  const priority = priorityConfig[task.priority];
  const CategoryIcon = category?.icon;

  const assignedEmployee = employees.find(e => e.email === task.assigned_to);
  const vehicle = vehicles.find(v => v.registration === task.vehicle_registration);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-2 rounded-lg ${category?.color || 'bg-slate-100'}`}>
            {CategoryIcon && <CategoryIcon className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-slate-800">{task.title}</p>
              <Badge className={`${priority?.color || 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
                {priority?.label}
              </Badge>
              {task.status === 'completed' && (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                  Terminee
                </Badge>
              )}
              {isOverdue && (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                  En retard
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {assignedEmployee && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {assignedEmployee.full_name}
                </span>
              )}
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
              {vehicle && (
                <span>Vehicle: {vehicle.registration}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {task.status !== 'completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(task, task.status === 'todo' ? 'in_progress' : 'completed')}
              className="text-xs"
            >
              {task.status === 'todo' ? 'Demarrer' : 'Terminer'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              {task.status !== 'completed' && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'todo')}>
                    A faire
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'in_progress')}>
                    En cours
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'completed')}>
                    Terminee
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${category?.color || 'bg-slate-100'}`}>
            {CategoryIcon && <CategoryIcon className="w-4 h-4" />}
          </div>
          <Badge className={`${priority?.color || 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
            {priority?.label}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e: MouseEvent) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            {task.status !== 'completed' && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task, 'todo'); }}>
                  A faire
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task, 'in_progress'); }}>
                  En cours
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task, 'completed'); }}>
                  Terminee
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h4 className="font-medium text-slate-800 mb-2">{task.title}</h4>

      {task.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="space-y-2 text-xs text-slate-500">
        {assignedEmployee && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {assignedEmployee.full_name}
          </div>
        )}
        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            <Calendar className="w-3 h-3" />
            {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
            {isOverdue && ' (En retard)'}
          </div>
        )}
        {vehicle && (
          <div>Vehicle: {vehicle.registration}</div>
        )}
      </div>

      {task.status !== 'completed' && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onStatusChange(task, task.status === 'todo' ? 'in_progress' : 'completed');
          }}
          className="w-full mt-3 text-xs"
        >
          {task.status === 'todo' ? 'Demarrer' : 'Terminer'}
        </Button>
      )}
    </motion.div>
  );
}
