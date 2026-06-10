'use client';

import React, { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, EmployeeResponse, DepartmentResponse } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Mail,
  Phone,
  Shield,
  UserCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Trash2,
  RefreshCcw,
  TrendingUp,
  Rocket,
  PlusCircle,
  Plane,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const roleMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  admin: { label: "Admin", icon: Shield, tone: "text-[#E04A1F] font-bold" },
  manager: { label: "Manager", icon: UserCheck, tone: "text-[#E04A1F] font-bold" },
  employe: { label: "Voyageur", icon: Plane, tone: "text-slate-600" },
};

const formatFCFA = (n?: number) =>
  typeof n === "number" ? `${n.toLocaleString("fr-FR")} FCFA` : "—";

export default function Employees() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "budget">("recent");
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeResponse | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ["employees", page],
    queryFn: () => api.employees.list({ page, limit }),
  });

  const { data: departmentsResponse } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(1, 100),
  });

  const empData = employeesResponse?.data;
  const empNested = (empData as any)?.data || empData;
  const employees: EmployeeResponse[] = Array.isArray(empNested)
    ? empNested
    : (empNested as any)?.items || (empNested as any)?.list || [];
  const empMeta = (empData as any)?.meta || {};
  const totalEmployees = empMeta.total || (empData as any)?.total || employees.length;
  const totalPages = empMeta.totalPages || Math.ceil(totalEmployees / limit) || 1;

  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items || (deptData as any)?.list || (deptData as any)?.data || [];

  const deleteEmployee = useMutation({
    mutationFn: (id: number) => api.employees.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employe supprime");
      setDeletingEmployee(null);
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la suppression"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.employees.update(id, { actif }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la mise a jour"),
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let list = employees.filter((emp) => {
      const fullName = `${emp.prenom || ""} ${emp.nom || ""}`.toLowerCase();
      const matchSearch =
        fullName.includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.departement?.nom?.toLowerCase().includes(term);
      const matchDept = filterDept === "all" || emp.departementId?.toString() === filterDept;
      return matchSearch && matchDept;
    });

    if (sortBy === "name") {
      list = [...list].sort((a, b) =>
        `${a.prenom || ""} ${a.nom || ""}`.localeCompare(`${b.prenom || ""} ${b.nom || ""}`)
      );
    } else if (sortBy === "budget") {
      list = [...list].sort((a, b) => (b.plafondMensuel || 0) - (a.plafondMensuel || 0));
    }
    return list;
  }, [employees, searchTerm, filterDept, sortBy]);

  const topDept = useMemo(() => {
    if (!employees.length) return null;
    const counts: Record<string, number> = {};
    employees.forEach((e) => {
      const name = e.departement?.nom || "Sans departement";
      counts[name] = (counts[name] || 0) + 1;
    });
    const [name, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
    return name ? { name, count } : null;
  }, [employees]);

  const totalBudget = useMemo(
    () => employees.reduce((sum, e) => sum + (e.plafondMensuel || 0), 0),
    [employees]
  );

  const handleEdit = (employee: EmployeeResponse) => {
    router.push(`/employees/${employee.id}/edit?returnTo=${encodeURIComponent(pathname)}`);
  };

  const handleAdd = () => {
    router.push(`/employees/new?returnTo=${encodeURIComponent(pathname)}`);
  };

  return (
    <div className="space-y-12 -m-2 md:-m-4 lg:-m-6">
      {/* Hero Header */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <h1
            className="text-4xl font-extrabold tracking-tight text-[#171c1f] mb-2"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Gestion des Employes
          </h1>
          <p className="text-slate-500 font-medium">
            Pilotez les acces et les plafonds budgetaires de vos equipes Subito.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end items-start">
          <Button
            onClick={handleAdd}
            className="bg-[#E04A1F] text-white border-0 font-bold px-5 py-6 rounded-xl shadow-lg shadow-[#E04A1F]/20 hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un employe
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#f0f4f8] p-2 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
          <button
            onClick={() => setFilterDept("all")}
            className={`px-5 py-2 rounded-xl whitespace-nowrap text-sm transition-all ${
              filterDept === "all"
                ? "bg-white text-[#E04A1F] font-bold shadow-sm"
                : "text-slate-500 hover:bg-[#e4e9ed] font-medium"
            }`}
          >
            Tous
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id.toString())}
              className={`px-5 py-2 rounded-xl whitespace-nowrap text-sm transition-all ${
                filterDept === d.id.toString()
                  ? "bg-white text-[#E04A1F] font-bold shadow-sm"
                  : "text-slate-500 hover:bg-[#e4e9ed] font-medium"
              }`}
            >
              {d.nom}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="hidden md:flex items-center bg-white rounded-xl px-3 py-2 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-40"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <ListFilter className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Trier</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-[#171c1f] cursor-pointer"
          >
            <option value="recent">Derniere activite</option>
            <option value="name">Nom (A-Z)</option>
            <option value="budget">Plafond</option>
          </select>
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="bg-white rounded-3xl shadow-[0_8px_32px_rgba(23,28,31,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f4f8]/60">
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest font-bold text-slate-400">Nom / Email</th>
                <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-bold text-slate-400">Departement</th>
                <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-bold text-slate-400">Role</th>
                <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-bold text-slate-400 w-72">Plafond mensuel</th>
                <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-center">Statut</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic">
                    Aucun employe trouve
                  </td>
                </tr>
              ) : (
                filtered.map((employee, index) => {
                  const meta = roleMeta[employee.role || "employe"] || roleMeta.employe;
                  const RoleIcon = meta.icon;
                  const fullName = `${employee.prenom || ""} ${employee.nom || ""}`.trim();
                  const initial = (employee.prenom?.charAt(0) || employee.nom?.charAt(0) || "E").toUpperCase();
                  const cap = employee.plafondMensuel;
                  const inactive = !employee.actif;

                  return (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-[#f0f4f8]/40 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-4 ${inactive ? "opacity-60" : ""}`}>
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: "#E04A1F" }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div
                              className="font-bold text-[#171c1f]"
                              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                            >
                              {fullName || "Sans nom"}
                            </div>
                            <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </div>
                            {employee.telephone && (
                              <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {employee.telephone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-5 ${inactive ? "opacity-60" : ""}`}>
                        <span className="bg-[#dfe3e7] px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">
                          {employee.departement?.nom || "General"}
                        </span>
                      </td>
                      <td className={`px-6 py-5 ${inactive ? "opacity-60" : ""}`}>
                        <div className={`flex items-center gap-1.5 ${meta.tone}`}>
                          <RoleIcon className="w-4 h-4" />
                          <span className="text-sm">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`w-full ${inactive ? "opacity-40" : ""}`}>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[11px] font-bold text-[#E04A1F]">
                              {cap ? formatFCFA(cap) : "Non defini"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                              {inactive ? "Bloque" : cap ? "Actif" : "—"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                inactive ? "bg-slate-300" : "bg-[#E04A1F]"
                              }`}
                              style={{ width: cap && !inactive ? "100%" : "0%" }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          {employee.actif ? (
                            <span className="bg-[#ffdbd0] text-[#3a0a00] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                              Actif
                            </span>
                          ) : (
                            <span className="bg-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                              Suspendu
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive.mutate({ id: employee.id, actif: !employee.actif });
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#E04A1F] hover:bg-[#ffdbd0]/40 transition-colors"
                            title={employee.actif ? "Desactiver" : "Reactiver"}
                          >
                            {employee.actif ? <Ban className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(employee);
                            }}
                            className="p-2 rounded-lg text-[#E04A1F] hover:text-white hover:bg-[#E04A1F] transition-colors"
                            title="Editer"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingEmployee(employee);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#ba1a1a] hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-6 bg-[#f0f4f8]/30 flex items-center justify-between">
          <span className="text-sm text-slate-400 font-medium italic">
            Affichage de {filtered.length} sur {totalEmployees} employes
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg hover:bg-[#eaeef2] transition-all text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === page;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-[#ffdbd0] text-[#3a0a00]"
                      : "hover:bg-[#eaeef2] text-slate-500"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg hover:bg-[#eaeef2] transition-all text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Insight Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#006972] text-white rounded-[2rem] relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 group-hover:scale-110 transition-transform duration-700" />
          <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-4">Vue d&apos;ensemble</h4>
          <p
            className="text-2xl font-extrabold mb-2"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {totalEmployees} employes inscrits
          </p>
          <p className="text-sm text-white/70">
            Plafond global cumule : {formatFCFA(totalBudget)}.
          </p>
        </div>

        <div className="p-6 bg-[#dfe3e7] rounded-[2rem] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Departement Top</h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Rocket className="w-5 h-5 text-[#E04A1F]" />
              </div>
              <div>
                <p
                  className="text-xl font-extrabold text-[#171c1f]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  {topDept?.name || "—"}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {topDept ? `${topDept.count} employe${topDept.count > 1 ? "s" : ""}` : "Aucune donnee"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="mt-6 text-[#E04A1F] font-bold text-sm flex items-center gap-2 group"
          >
            Ajouter un employe
            <Plus className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col justify-center items-center text-center">
          <PlusCircle className="text-[#E04A1F] w-10 h-10 mb-3" />
          <p
            className="font-bold text-slate-900"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Inviter en masse
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Generez un lien d&apos;invitation securise pour votre equipe.
          </p>
          <button className="px-6 py-2 bg-slate-50 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">
            Copier le lien
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={() => setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;employe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer {deletingEmployee?.prenom} {deletingEmployee?.nom} ?
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEmployee && deleteEmployee.mutate(deletingEmployee.id)}
              className="bg-[#ba1a1a] hover:bg-[#93000a]"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
