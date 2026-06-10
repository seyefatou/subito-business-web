'use client';

import { useState } from 'react';
import { Users, Building2 } from 'lucide-react';
import EmployeesPage from '@/app/(dashboard)/employees/page';
import DepartmentsPage from '@/app/(dashboard)/departments/page';

type Tab = 'employes' | 'departements';

export default function OrganisationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('departements');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-[#f0f4f8] p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('departements')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'departements'
              ? 'bg-white text-[#E04A1F] shadow-sm'
              : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Départements
        </button>
        <button
          onClick={() => setActiveTab('employes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'employes'
              ? 'bg-white text-[#E04A1F] shadow-sm'
              : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Employés
        </button>
      </div>

      {activeTab === 'departements' ? <DepartmentsPage /> : <EmployeesPage />}
    </div>
  );
}
