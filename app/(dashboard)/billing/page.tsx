'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Download,
  CreditCard,
  Building,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Wallet,
  Smartphone,
  Banknote,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Invoice {
  id: string;
  invoice_number?: string;
  period_start?: string;
  period_end?: string;
  due_date?: string;
  total_amount?: number;
  status: 'pending' | 'paid' | 'overdue';
  created_date: string;
}

interface Order {
  id: string;
  service_category?: string;
  department?: string;
  final_cost?: number;
  estimated_cost?: number;
  created_date: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const statusConfig: Record<string, StatusConfig> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "Payee", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  overdue: { label: "En retard", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function Billing() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 50),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  // Current month orders for billing preview
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonthOrders = orders.filter(o => {
    const d = new Date(o.created_date);
    return d >= monthStart && d <= monthEnd;
  });

  const currentMonthTotal = currentMonthOrders.reduce((sum, o) =>
    sum + (o.final_cost || o.estimated_cost || 0), 0
  );

  // Group by category
  const byCategory = currentMonthOrders.reduce((acc, o) => {
    const cat = o.service_category || 'other';
    acc[cat] = (acc[cat] || 0) + (o.final_cost || o.estimated_cost || 0);
    return acc;
  }, {} as Record<string, number>);

  // Group by department
  const byDepartment = currentMonthOrders.reduce((acc, o) => {
    const dept = o.department || 'General';
    acc[dept] = (acc[dept] || 0) + (o.final_cost || o.estimated_cost || 0);
    return acc;
  }, {} as Record<string, number>);

  const totalPending = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    format(new Date(inv.period_start || inv.created_date), 'MMM yyyy', { locale: fr }).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paymentMethods: PaymentMethod[] = [
    { id: 'virement', label: 'Virement bancaire', icon: Building, desc: 'Sous 2-3 jours ouvres' },
    { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, desc: 'Orange Money, MTN, Wave' },
    { id: 'credit', label: 'Credit entreprise', icon: CreditCard, desc: 'Deduire de votre credit' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturation</h1>
          <p className="text-slate-500 mt-1">Gerez vos factures et paiements</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-orange-100">
              <Wallet className="w-5 h-5 text-subito" />
            </div>
            <span className="text-slate-600">Mois en cours</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{currentMonthTotal.toLocaleString()} FCFA</p>
          <p className="text-sm text-slate-500 mt-1">{currentMonthOrders.length} commandes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-slate-600">En attente</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalPending.toLocaleString()} FCFA</p>
          <p className="text-sm text-slate-500 mt-1">
            {invoices.filter(i => i.status === 'pending').length} facture(s)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-slate-600">Total paye</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalPaid.toLocaleString()} FCFA</p>
          <p className="text-sm text-slate-500 mt-1">
            {invoices.filter(i => i.status === 'paid').length} facture(s)
          </p>
        </motion.div>
      </div>

      {/* Main content */}
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="current">Mois en cours</TabsTrigger>
          <TabsTrigger value="invoices">Historique factures</TabsTrigger>
          <TabsTrigger value="payment">Moyens de paiement</TabsTrigger>
        </TabsList>

        {/* Current month breakdown */}
        <TabsContent value="current" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By service */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Par service</h3>
              <div className="space-y-3">
                {Object.entries(byCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600 capitalize">{cat}</span>
                    <span className="font-semibold text-slate-800">{amount.toLocaleString()} FCFA</span>
                  </div>
                ))}
                {Object.keys(byCategory).length === 0 && (
                  <p className="text-slate-400 text-center py-4">Aucune depense ce mois</p>
                )}
              </div>
            </motion.div>

            {/* By department */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Par departement</h3>
              <div className="space-y-3">
                {Object.entries(byDepartment).map(([dept, amount]) => (
                  <div key={dept} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{dept}</span>
                    <span className="font-semibold text-slate-800">{amount.toLocaleString()} FCFA</span>
                  </div>
                ))}
                {Object.keys(byDepartment).length === 0 && (
                  <p className="text-slate-400 text-center py-4">Aucune depense ce mois</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Preview invoice */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Facture previsionnelle - {format(now, 'MMMM yyyy', { locale: fr })}</p>
                <p className="text-3xl font-bold mt-2">{currentMonthTotal.toLocaleString()} FCFA</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Date de facturation</p>
                <p className="font-medium mt-1">{format(monthEnd, 'dd MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Invoices history */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Search bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par numero de facture ou periode..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Facture
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Periode
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Montant
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Statut
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Echeance
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      {searchTerm ? 'Aucune facture trouvee' : 'Aucune facture'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const status = statusConfig[invoice.status] || statusConfig.pending;
                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100">
                              <FileText className="w-4 h-4 text-slate-500" />
                            </div>
                            <span className="font-medium text-slate-800">
                              {invoice.invoice_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {invoice.period_start && format(new Date(invoice.period_start), 'MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {(invoice.total_amount || 0).toLocaleString()} FCFA
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${status.color} border-0`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {invoice.due_date && format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Payment methods */}
        <TabsContent value="payment">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setPaymentMethod(method.id)}
                className={`
                  p-6 rounded-2xl border-2 cursor-pointer transition-all
                  ${paymentMethod === method.id
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    p-3 rounded-xl
                    ${paymentMethod === method.id ? 'gradient-subito' : 'bg-slate-100'}
                  `}>
                    <method.icon className={`w-6 h-6 ${paymentMethod === method.id ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{method.label}</h3>
                    <p className="text-sm text-slate-500">{method.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-6 bg-slate-50 rounded-2xl">
            <h3 className="font-semibold text-slate-800 mb-4">Coordonnees bancaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Banque</p>
                <p className="font-medium text-slate-800">SGBCI Cote d'Ivoire</p>
              </div>
              <div>
                <p className="text-slate-500">IBAN</p>
                <p className="font-medium text-slate-800">CI93 0000 0000 0000 0000 0000 000</p>
              </div>
              <div>
                <p className="text-slate-500">BIC / SWIFT</p>
                <p className="font-medium text-slate-800">SGBFCIAX</p>
              </div>
              <div>
                <p className="text-slate-500">Titulaire</p>
                <p className="font-medium text-slate-800">MYSUBITO SARL</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice detail modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg gradient-subito">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  Facture {selectedInvoice.invoice_number}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Montant total</span>
                  <span className="text-xl font-bold text-slate-800">
                    {(selectedInvoice.total_amount || 0).toLocaleString()} FCFA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Periode</p>
                    <p className="font-medium text-slate-800">
                      {selectedInvoice.period_start && format(new Date(selectedInvoice.period_start), 'MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Echeance</p>
                    <p className="font-medium text-slate-800">
                      {selectedInvoice.due_date && format(new Date(selectedInvoice.due_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Download className="w-4 h-4" />
                    Telecharger PDF
                  </Button>
                  {selectedInvoice.status === 'pending' && (
                    <Button className="flex-1 gradient-subito text-white border-0">
                      Payer maintenant
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
