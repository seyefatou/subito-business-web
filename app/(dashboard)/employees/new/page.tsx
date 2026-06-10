'use client';

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, CreateEmployeeDto, DepartmentResponse } from "@/lib/api";
import { toast } from "sonner";
import EmployeeForm from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/employees';
  const queryClient = useQueryClient();

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

  const createEmployee = useMutation({
    mutationFn: (data: CreateEmployeeDto) => api.employees.create(data),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      toast.success("Employe ajoute avec succes");
      router.push(returnTo);
    },
    onError: (err: Error) => {
      const m = (err.message || "").toLowerCase();
      if (m.includes("conflit") || m.includes("conflict") || m.includes("409") || m.includes("doublon") || m.includes("existe")) {
        toast.error("Un employe avec cet email existe deja", {
          description: "Verifiez l'adresse email ou modifiez l'employe existant.",
        });
      } else {
        toast.error(err.message || "Erreur lors de l'ajout");
      }
    },
  });

  return (
    <EmployeeForm
      mode="create"
      departments={departments}
      onSubmit={(data) => createEmployee.mutate(data)}
      onCancel={() => router.push(returnTo)}
      isSubmitting={createEmployee.isPending}
    />
  );
}
