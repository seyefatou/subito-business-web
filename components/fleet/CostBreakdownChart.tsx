'use client';

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#E04A1F', '#3B82F6', '#8B5CF6', '#10B981'];

interface FuelRequest {
  id: string;
  actual_cost?: number;
  estimated_cost?: number;
}

interface MaintenanceRecord {
  id: string;
  cost?: number;
}

interface VehicleDocument {
  id: string;
  document_type?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
}

interface CostBreakdownChartProps {
  fuelRequests: FuelRequest[];
  maintenanceRecords: MaintenanceRecord[];
  documents: VehicleDocument[];
  title?: string;
}

export default function CostBreakdownChart({ fuelRequests, maintenanceRecords, documents, title }: CostBreakdownChartProps) {
  const fuelCost = fuelRequests.reduce((sum, f) => sum + (f.actual_cost || f.estimated_cost || 0), 0);
  const maintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);

  const insuranceDocs = documents.filter(d => d.document_type === 'assurance');
  const insuranceCost = insuranceDocs.length * 50000;

  const data: ChartDataItem[] = [
    { name: 'Carburant', value: fuelCost },
    { name: 'Entretien', value: maintenanceCost },
    { name: 'Assurance', value: insuranceCost },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400">
          Aucune donnee disponible
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-lg font-bold text-slate-800">
                {total.toLocaleString()} FCFA
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
