'use client';

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, DepartmentResponse, EmployeeResponse, UpdateEmployeeDto } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import EmployeeForm from "@/components/employees/EmployeeForm";

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/employees';
  const queryClient = useQueryClient();
  const idRaw = params?.id;
  const id = typeof idRaw === "string" ? parseInt(idRaw) : NaN;
  const validId = Number.isFinite(id);

  const { data: employeeResponse, isLoading: loadingEmployee, error: loadError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.employees.get(id),
    enabled: validId,
  });

  const { data: departmentsResponse } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(1, 100),
  });

  const departments: DepartmentResponse[] = (() => {
    const raw = departmentsResponse as any;
    if (Array.isArray(raw)) return raw;
    const inner = raw?.data;
    if (Array.isArray(inner)) return inner;
    return inner?.items || inner?.list || inner?.data || [];
  })();

  // Robust unwrap: handle {data: emp}, {data: {data: emp}}, or direct emp
  const employee: EmployeeResponse | null = (() => {
    if (!employeeResponse) return null;
    const lvl1 = (employeeResponse as any)?.data ?? employeeResponse;
    const lvl2 = (lvl1 as any)?.data ?? lvl1;
    if (lvl2 && typeof lvl2 === "object" && "id" in lvl2) return lvl2 as EmployeeResponse;
    if (lvl1 && typeof lvl1 === "object" && "id" in lvl1) return lvl1 as EmployeeResponse;
    return null;
  })();

  const updateEmployee = useMutation({
    mutationFn: (data: UpdateEmployeeDto) => api.employees.update(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["employee", id] }),
      ]);
      toast.success("Employe modifie avec succes");
      router.push(returnTo);
    },
    onError: (err: Error) => {
      const m = (err.message || "").toLowerCase();
      if (m.includes("conflit") || m.includes("conflict") || m.includes("409") || m.includes("doublon") || m.includes("existe")) {
        toast.error("Un autre employe utilise deja cet email", {
          description: "Choisissez une adresse email differente.",
        });
      } else {
        toast.error(err.message || "Erreur lors de la modification");
      }
    },
  });

  if (!validId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <AlertTriangle className="w-12 h-12 text-[#E04A1F]" />
        <h2 className="text-xl font-bold text-[#171c1f]">Identifiant invalide</h2>
        <p className="text-sm text-slate-500">L&apos;URL ne contient pas un ID d&apos;employe valide.</p>
        <button
          onClick={() => router.push(returnTo)}
          className="mt-2 px-5 py-2.5 bg-[#E04A1F] text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour a la liste
        </button>
      </div>
    );
  }

  if (loadingEmployee) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E04A1F]" />
      </div>
    );
  }

  if (loadError || !employee) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <AlertTriangle className="w-12 h-12 text-[#E04A1F]" />
        <h2 className="text-xl font-bold text-[#171c1f]">Employe introuvable</h2>
        <p className="text-sm text-slate-500">
          {(loadError as Error)?.message ||
            "Cet employe n'existe plus ou vous n'avez pas l'autorisation d'y acceder."}
        </p>
        <button
          onClick={() => router.push(returnTo)}
          className="mt-2 px-5 py-2.5 bg-[#E04A1F] text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour a la liste
        </button>
      </div>
    );
  }

  return (
    <EmployeeForm
      mode="edit"
      employee={employee}
      departments={departments}
      onSubmit={(data) => updateEmployee.mutate(data)}
      onCancel={() => router.push(returnTo)}
      isSubmitting={updateEmployee.isPending}
    />
  );
}
