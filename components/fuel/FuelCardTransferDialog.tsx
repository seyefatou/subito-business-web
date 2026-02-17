'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Wallet } from "lucide-react";

interface FuelCard {
  id: string;
  card_number: string;
  card_type: string;
  holder_name: string;
  balance: number;
  status: string;
}

interface FuelCardTransferDialogProps {
  mainCard: FuelCard | undefined;
  employeeCards: FuelCard[];
  selectedCard: FuelCard | null;
  onClose: () => void;
}

interface TransferParams {
  fromCard: FuelCard;
  toCard: FuelCard;
  amount: number;
}

export default function FuelCardTransferDialog({ mainCard, employeeCards, selectedCard, onClose }: FuelCardTransferDialogProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>("");
  const [targetCardId, setTargetCardId] = useState<string>(selectedCard?.id || "");

  const transferFunds = useMutation({
    mutationFn: async ({ fromCard, toCard, amount }: TransferParams) => {
      // Create transaction record
      await base44.entities.FuelCardTransaction.create({
        transaction_type: 'transfer_to_employee',
        from_card: fromCard.card_number,
        to_card: toCard.card_number,
        amount: amount,
        balance_before: fromCard.balance,
        balance_after: fromCard.balance - amount,
        status: 'completed',
      });

      // Update main card balance
      await base44.entities.FuelCard.update(fromCard.id, {
        balance: fromCard.balance - amount,
      });

      // Update employee card balance
      await base44.entities.FuelCard.update(toCard.id, {
        balance: toCard.balance + amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCards'] });
      queryClient.invalidateQueries({ queryKey: ['fuelCardTransactions'] });
      toast.success("Transfert effectue avec succes");
      onClose();
    },
    onError: () => {
      toast.error("Erreur lors du transfert");
    }
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    const targetCard = employeeCards.find(c => c.id === targetCardId);
    const transferAmount = parseFloat(amount);

    if (!targetCard) {
      toast.error("Veuillez selectionner une carte");
      return;
    }

    if (transferAmount <= 0) {
      toast.error("Le montant doit etre superieur a 0");
      return;
    }

    if (mainCard && transferAmount > mainCard.balance) {
      toast.error("Solde insuffisant sur la carte principale");
      return;
    }

    if (mainCard) {
      transferFunds.mutate({
        fromCard: mainCard,
        toCard: targetCard,
        amount: transferAmount,
      });
    }
  };

  const selectedEmployeeCard = employeeCards.find(c => c.id === targetCardId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <p className="text-sm text-orange-100">Carte Principale</p>
        </div>
        <p className="text-3xl font-bold">{(mainCard?.balance || 0).toLocaleString()} FCFA</p>
        <p className="text-sm text-orange-100 mt-1">Disponible</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Carte employe a alimenter *</Label>
          <Select value={targetCardId} onValueChange={setTargetCardId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner une carte" />
            </SelectTrigger>
            <SelectContent>
              {employeeCards
                .filter(c => c.status === 'active')
                .map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.holder_name} - {card.card_number} ({card.balance?.toLocaleString() || 0} FCFA)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Montant a transferer (FCFA) *</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
            placeholder="Ex: 50000"
            min="1"
            max={mainCard?.balance}
          />
          {mainCard && (
            <p className="text-xs text-slate-500">
              Maximum: {mainCard.balance.toLocaleString()} FCFA
            </p>
          )}
        </div>

        {selectedEmployeeCard && amount && parseFloat(amount) > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600">Solde actuel carte employe:</span>
              <span className="font-semibold text-slate-800">
                {selectedEmployeeCard.balance.toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 my-2">
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Nouveau solde:</span>
              <span className="font-bold text-blue-700">
                {(selectedEmployeeCard.balance + parseFloat(amount)).toLocaleString()} FCFA
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={transferFunds.isPending || !targetCardId || !amount || parseFloat(amount) <= 0}
          className="gradient-subito text-white border-0"
        >
          {transferFunds.isPending ? 'Transfert en cours...' : 'Confirmer le transfert'}
        </Button>
      </div>
    </form>
  );
}
