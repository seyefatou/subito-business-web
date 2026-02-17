'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  Wallet,
  User,
  TrendingUp,
  History,
  Lock,
  Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import FuelCardForm from "./FuelCardForm";
import FuelCardTransferDialog from "./FuelCardTransferDialog";

interface FuelCard {
  id: string;
  card_number: string;
  card_type: string;
  holder_name: string;
  holder_email?: string;
  balance: number;
  monthly_limit?: number;
  current_month_spent?: number;
  department?: string;
  status: string;
}

interface Employee {
  id: string;
  email: string;
  full_name: string;
  department?: string;
}

interface FuelCardTransaction {
  id: string;
  transaction_type: string;
  from_card?: string;
  to_card?: string;
  amount: number;
  status: string;
  created_date: string;
}

interface User {
  id: string;
  email: string;
}

interface FuelCardManagementProps {
  cards: FuelCard[];
  user: User;
}

export default function FuelCardManagement({ cards, user }: FuelCardManagementProps) {
  const queryClient = useQueryClient();
  const [showCreateCard, setShowCreateCard] = useState<boolean>(false);
  const [showTransfer, setShowTransfer] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<FuelCard | null>(null);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: transactions = [] } = useQuery<FuelCardTransaction[]>({
    queryKey: ['fuelCardTransactions'],
    queryFn: () => base44.entities.FuelCardTransaction.list('-created_date', 100),
  });

  const createCard = useMutation({
    mutationFn: (data: Partial<FuelCard>) => base44.entities.FuelCard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCards'] });
      setShowCreateCard(false);
      toast.success("Carte creee");
    },
  });

  const updateCard = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FuelCard> }) => base44.entities.FuelCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCards'] });
      toast.success("Carte mise a jour");
    },
  });

  const mainCard = cards.find(c => c.card_type === 'company_main');
  const employeeCards = cards.filter(c => c.card_type === 'employee');

  const totalEmployeeBalance = employeeCards.reduce((sum, c) => sum + (c.balance || 0), 0);

  const handleToggleStatus = (card: FuelCard): void => {
    const newStatus = card.status === 'active' ? 'blocked' : 'active';
    updateCard.mutate({
      id: card.id,
      data: { ...card, status: newStatus }
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-orange-100 text-sm mb-1">Carte Principale</p>
              <p className="text-3xl font-bold">{(mainCard?.balance || 0).toLocaleString()} FCFA</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <p className="text-orange-100 text-sm">
            Disponible pour alimenter les cartes employes
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 text-sm mb-1">Cartes Employes</p>
              <p className="text-3xl font-bold text-slate-800">{employeeCards.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            {employeeCards.filter(c => c.status === 'active').length} actives
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 text-sm mb-1">Total Distribue</p>
              <p className="text-3xl font-bold text-slate-800">{totalEmployeeBalance.toLocaleString()} FCFA</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            Reparti sur {employeeCards.length} carte{employeeCards.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShowCreateCard(true)}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Creer une carte employe
        </Button>
        <Button
          onClick={() => setShowTransfer(true)}
          variant="outline"
          className="gap-2"
          disabled={!mainCard || mainCard.balance <= 0}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Alimenter une carte
        </Button>
      </div>

      {/* Main Card */}
      {mainCard && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Carte Principale de l&apos;Entreprise
          </h3>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Numero de carte</p>
              <p className="font-mono font-semibold text-lg text-slate-800">{mainCard.card_number}</p>
              <p className="text-sm text-slate-600 mt-2">{mainCard.holder_name}</p>
            </div>
            <Badge className={mainCard.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
              {mainCard.status === 'active' ? 'Active' : 'Bloquee'}
            </Badge>
          </div>
        </div>
      )}

      {/* Employee Cards */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-4">Cartes Employes</h3>
        {employeeCards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune carte employe creee</p>
            <Button
              onClick={() => setShowCreateCard(true)}
              variant="outline"
              className="mt-4"
            >
              Creer la premiere carte
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{card.holder_name}</p>
                      <p className="text-xs text-slate-500">{card.department}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(card)}
                  >
                    {card.status === 'active' ? (
                      <Unlock className="w-4 h-4 text-green-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-red-600" />
                    )}
                  </Button>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Solde disponible</p>
                    <p className="text-2xl font-bold text-slate-800">{(card.balance || 0).toLocaleString()} FCFA</p>
                  </div>
                  {card.monthly_limit && (
                    <div>
                      <p className="text-xs text-slate-500">Plafond mensuel</p>
                      <p className="text-sm font-medium text-slate-700">{card.monthly_limit.toLocaleString()} FCFA</p>
                      <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full"
                          style={{
                            width: `${Math.min(((card.current_month_spent || 0) / card.monthly_limit) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCard(card);
                      setShowTransfer(true);
                    }}
                  >
                    Alimenter
                  </Button>
                  <Badge className={card.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {card.status === 'active' ? 'Active' : 'Bloquee'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          Transactions recentes
        </h3>
        {transactions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Aucune transaction</p>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 10).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    txn.transaction_type === 'recharge_main' ? 'bg-green-100' :
                    txn.transaction_type === 'transfer_to_employee' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    <ArrowRightLeft className={`w-4 h-4 ${
                      txn.transaction_type === 'recharge_main' ? 'text-green-600' :
                      txn.transaction_type === 'transfer_to_employee' ? 'text-blue-600' :
                      'text-orange-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {txn.transaction_type === 'recharge_main' ? 'Recharge carte principale' :
                       txn.transaction_type === 'transfer_to_employee' ? `Transfert vers ${txn.to_card}` :
                       'Achat carburant'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(txn.created_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    txn.transaction_type === 'recharge_main' ? 'text-green-600' :
                    txn.transaction_type === 'fuel_purchase' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {txn.transaction_type === 'recharge_main' ? '+' : '-'}
                    {txn.amount.toLocaleString()} FCFA
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {txn.status === 'completed' ? 'Complete' : txn.status === 'pending' ? 'En attente' : 'Echoue'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Card Dialog */}
      <Dialog open={showCreateCard} onOpenChange={setShowCreateCard}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Creer une carte employe</DialogTitle>
          </DialogHeader>
          <FuelCardForm
            employees={employees}
            onSubmit={(data) => createCard.mutate(data)}
            onCancel={() => setShowCreateCard(false)}
            isSubmitting={createCard.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Alimenter une carte employe</DialogTitle>
          </DialogHeader>
          <FuelCardTransferDialog
            mainCard={mainCard}
            employeeCards={employeeCards}
            selectedCard={selectedCard}
            onClose={() => {
              setShowTransfer(false);
              setSelectedCard(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
