'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, CreateEmployeeDto, DepartmentResponse } from "@/lib/api";
import { toast } from "sonner";
import EmployeeForm from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: departmentsResponse } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(1, 100),
  });

  const deptData = departmentsResponse?.data;
  const departments: DepartmentResponse[] = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.items ||
      (deptData as any)?.list ||
      (deptData as any)?.data ||
      [];

  const createEmployee = useMutation({
    mutationFn: (data: CreateEmployeeDto) => api.employees.create(data),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      toast.success("Employe ajoute avec succes");
      router.replace("/employees");
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
      onCancel={() => router.push("/employees")}
      isSubmitting={createEmployee.isPending}
    />
  );
}
