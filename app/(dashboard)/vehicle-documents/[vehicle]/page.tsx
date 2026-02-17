"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/base44Client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText,
  Plus,
  Download,
  Trash2,
  AlertTriangle,
  Calendar,
  Upload,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import VehicleDocumentForm from "@/components/fleet/VehicleDocumentForm";
import { toast } from "sonner";
import Link from "next/link";

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
}

interface VehicleDocument {
  id: string;
  document_name: string;
  vehicle_registration: string;
  document_type: string;
  expiry_date?: string;
  issue_date?: string;
  notes?: string;
  file_url?: string;
  created_date: string;
}

interface PageProps {
  params: Promise<{ vehicle: string }>;
}

const documentTypeLabels: Record<string, string> = {
  carte_grise: "Carte grise",
  assurance: "Assurance",
  controle_technique: "Controle technique",
  facture_entretien: "Facture entretien",
  contrat_location: "Contrat location",
  autre: "Autre"
};

export default function VehicleDocumentDetail({ params }: PageProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<VehicleDocument | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ vehicle: string } | null>(null);

  // Resolve params
  React.useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const vehicleRegistration = resolvedParams?.vehicle ? decodeURIComponent(resolvedParams.vehicle) : "";

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: documents = [] } = useQuery<VehicleDocument[]>({
    queryKey: ['vehicleDocuments'],
    queryFn: () => base44.entities.VehicleDocument.list('-created_date'),
  });

  const createDoc = useMutation({
    mutationFn: (data: Partial<VehicleDocument>) => base44.entities.VehicleDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleDocuments'] });
      setShowForm(false);
      toast.success("Document ajoute");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateDoc = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleDocument> }) => base44.entities.VehicleDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleDocuments'] });
      setShowForm(false);
      setEditingDoc(null);
      toast.success("Document modifie");
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => base44.entities.VehicleDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleDocuments'] });
      setDeleteDoc(null);
      toast.success("Document supprime");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleSubmit = (data: Partial<VehicleDocument>) => {
    if (editingDoc) {
      updateDoc.mutate({ id: editingDoc.id, data });
    } else {
      createDoc.mutate({ ...data, vehicle_registration: vehicleRegistration });
    }
  };

  const vehicle = vehicles.find(v => v.registration === vehicleRegistration);
  const vehicleDocs = documents.filter(d => d.vehicle_registration === vehicleRegistration);

  const getDocumentStatus = (doc: VehicleDocument) => {
    if (!doc.expiry_date) return 'ok';
    const expiryDate = new Date(doc.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'ok';
  };

  const docsByType: Record<string, VehicleDocument[]> = {};
  Object.keys(documentTypeLabels).forEach(type => {
    docsByType[type] = vehicleDocs.filter(d => d.document_type === type);
  });

  if (!vehicle) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-600">Vehicule non trouve</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Link href="/vehicle-documents">
            <Button variant="ghost" className="mb-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl gradient-subito">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{vehicle.registration}</h1>
              <p className="text-slate-500">{vehicle.brand} {vehicle.model} - {vehicleDocs.length} document{vehicleDocs.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingDoc(null);
            setShowForm(true);
          }}
          className="gradient-subito text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un document
        </Button>
      </div>

      {/* Documents by Type */}
      <div className="space-y-4">
        {Object.entries(docsByType).map(([type, docs]) => (
          <div key={type} className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{documentTypeLabels[type]}</h3>
              <Badge variant="outline">{docs.length}</Badge>
            </div>

            {docs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun document</p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((doc) => {
                  const status = getDocumentStatus(doc);

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-xl border-2 ${
                        status === 'expired' ? 'border-red-200 bg-red-50' :
                        status === 'expiring_soon' ? 'border-orange-200 bg-orange-50' :
                        'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{doc.document_name}</p>
                          {doc.issue_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Emis le {format(new Date(doc.issue_date), 'd MMMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                        {doc.expiry_date && (
                          <Badge className={
                            status === 'expired' ? 'bg-red-100 text-red-700 border-0' :
                            status === 'expiring_soon' ? 'bg-orange-100 text-orange-700 border-0' :
                            'bg-green-100 text-green-700 border-0'
                          }>
                            <Calendar className="w-3 h-3 mr-1" />
                            {status === 'expired' ? 'Expire' : format(new Date(doc.expiry_date), 'd MMM yyyy', { locale: fr })}
                          </Badge>
                        )}
                      </div>

                      {doc.notes && (
                        <p className="text-sm text-slate-600 mb-3">{doc.notes}</p>
                      )}

                      <div className="flex items-center gap-2">
                        {doc.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                            className="gap-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Voir
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDoc(doc);
                            setShowForm(true);
                          }}
                          className="gap-2"
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDoc(doc)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? 'Modifier le document' : 'Ajouter un document'}
            </DialogTitle>
          </DialogHeader>
          <VehicleDocumentForm
            document={editingDoc}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingDoc(null);
            }}
            isSubmitting={createDoc.isPending || updateDoc.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Le document sera definitivement supprime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDoc && deleteDocMutation.mutate(deleteDoc.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
