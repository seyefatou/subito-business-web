'use client';

import React, { useState, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const documentTypeLabels: Record<string, string> = {
  carte_grise: "Carte grise",
  assurance: "Assurance",
  controle_technique: "Controle technique",
  facture_entretien: "Facture entretien",
  contrat_location: "Contrat location",
  autre: "Autre"
};

interface VehicleDocument {
  id?: string;
  document_type?: string;
  document_name?: string;
  file_url?: string;
  expiry_date?: string;
  issue_date?: string;
  reminder_days_before?: number;
  notes?: string;
}

interface DocumentFormData {
  document_type: string;
  document_name: string;
  file_url: string;
  expiry_date: string;
  issue_date: string;
  reminder_days_before: number;
  notes: string;
}

interface VehicleDocumentFormProps {
  document?: VehicleDocument | null;
  onSubmit: (data: DocumentFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function VehicleDocumentForm({ document, onSubmit, onCancel, isSubmitting }: VehicleDocumentFormProps) {
  const [formData, setFormData] = useState<DocumentFormData>({
    document_type: document?.document_type || "assurance",
    document_name: document?.document_name || "",
    file_url: document?.file_url || "",
    expiry_date: document?.expiry_date || "",
    issue_date: document?.issue_date || "",
    reminder_days_before: document?.reminder_days_before || 30,
    notes: document?.notes || "",
  });

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleChange = (field: keyof DocumentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.document_name) {
        handleChange('document_name', file.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Note: In Next.js, implement file upload via API route
      // const result = await uploadFile(selectedFile);
      // handleChange('file_url', result.file_url);
      toast.success("Fichier uploade");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type & Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de document *</Label>
          <Select value={formData.document_type} onValueChange={(v) => handleChange('document_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nom du document *</Label>
          <Input
            placeholder="Assurance 2024"
            value={formData.document_name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('document_name', e.target.value)}
            required
          />
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Fichier</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            variant="outline"
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </Button>
        </div>
        {formData.file_url && (
          <p className="text-xs text-green-600">Fichier enregistre</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date d&apos;emission</Label>
          <Input
            type="date"
            value={formData.issue_date}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('issue_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Date d&apos;expiration</Label>
          <Input
            type="date"
            value={formData.expiry_date}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('expiry_date', e.target.value)}
          />
        </div>
      </div>

      {/* Reminder */}
      {formData.expiry_date && (
        <div className="space-y-2">
          <Label>Rappel (jours avant expiration)</Label>
          <Input
            type="number"
            value={formData.reminder_days_before}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('reminder_days_before', parseInt(e.target.value))}
            min="1"
            max="365"
          />
          <p className="text-xs text-slate-500">
            Un rappel sera envoye {formData.reminder_days_before} jours avant l&apos;expiration
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Informations complementaires..."
          value={formData.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
          className="h-20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gradient-subito text-white border-0"
        >
          {isSubmitting ? 'Enregistrement...' : document ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
