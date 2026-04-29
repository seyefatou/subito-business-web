# Refonte « Prises en charge » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner visuellement `app/(dashboard)/pending-validations/page.tsx` sur le design language des pages récentes (tickets, navette, activité) en remplaçant le tableau dense par une liste en cartes rounded-3xl, sans toucher à la logique métier (mutations, fetch, types).

**Architecture:** Réécriture incrémentale du JSX d'un seul fichier en 3 commits cohérents : (1) section haute (hero + stats + filtres + état local de filtrage), (2) liste en cartes remplaçant le tableau, (3) restyle des dialogs. Logique de données conservée à l'identique.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui (Button, Badge, Dialog, Input, Textarea, Label), framer-motion, lucide-react, react-query.

**Project conventions (from memory):**
- **No test framework** : pas de jest/vitest. Vérification = `npx tsc --noEmit` + `npm run lint` + vérification manuelle navigateur. Les étapes "test" du template TDD sont remplacées par des étapes de vérification visuelle/compilation.

**Spec source :** `docs/superpowers/specs/2026-04-29-pending-validations-redesign-design.md`

---

## File Structure

**Modified files:**
```
app/(dashboard)/pending-validations/page.tsx   # réécriture du JSX, logique conservée
```

Pas de nouveau fichier, pas de composant extrait.

**Verification commands** (à utiliser à chaque tâche) :
- `npx tsc --noEmit` — TypeScript propre
- `npm run lint` — ESLint propre
- Manual : `npm run dev` puis navigation sur `/pending-validations`

---

## Task 1 : Section haute (hero + stats + filtres) + état de filtrage

**Files:**
- Modify: `app/(dashboard)/pending-validations/page.tsx`

Cette tâche remplace l'ancien header simple, l'ancienne grille de stats colorées, et ajoute la barre de filtres + recherche. La table en bas reste **inchangée** pour l'instant — elle sera remplacée à la tâche 2. La page reste fonctionnelle pendant la transition (le tableau lit `orders`, on lui passe `filteredOrders` à la tâche 2).

- [ ] **Step 1: Ajouter les imports nécessaires pour Task 1**

Au sommet du fichier, ajouter `Search` à `lucide-react` et `Input` à `@/components/ui/input`. Les imports `motion`, `Link`, `Plane`, `FileText` seront ajoutés en Task 2 (pour éviter des warnings unused-vars entre les commits).

Imports résultants après cette étape :

```tsx
'use client';

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaymentRequest } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Loader2,
  Banknote,
  Inbox,
  Eye,
  Phone,
  Mail,
  Car,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
```

(`Plane` est déjà importé dans le fichier original — on l'utilisera en Task 2. `DialogDescription` est ajouté ici car les dialogs de Task 3 l'utilisent ; en attendant, il reste unused mais ESLint n'avertit pas pour les imports nommés inutilisés depuis `@/components/ui/dialog` dans ce projet — patterns existants dans `tickets/page.tsx`. Si lint avertit, déplacer en Task 3.)

- [ ] **Step 2: Ajouter constantes et helpers globaux**

Juste après les imports et avant `// ==================== TYPES ====================`, insérer :

```tsx
const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

type TypeFilter = 'all' | 'booking' | 'travel-document';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'booking', label: 'Réservations' },
  { value: 'travel-document', label: 'Documents' },
];

function getServiceIcon(serviceType: string, type: 'booking' | 'travel-document') {
  if (type === 'travel-document' || serviceType === 'visa_assistance') return FileText;
  if (serviceType === 'airport_shuttle') return Plane;
  if (serviceType === 'inter_city' || serviceType === 'vtc_hourly') return Car;
  return MapPin;
}

function StatusPillEnAttente() {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3 mr-1" />
      En attente
    </span>
  );
}
```

- [ ] **Step 3: Ajouter le state local de recherche/filtre + le memo filtré**

Dans le composant `PendingValidations`, juste après `const [rejectionReason, setRejectionReason] = useState("");` :

```tsx
const [searchQuery, setSearchQuery] = useState("");
const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
```

Et juste après le `useMemo` qui produit `orders` (vers la ligne 133), ajouter un second memo `filteredOrders` :

```tsx
const filteredOrders = useMemo(() => {
  let list = orders;
  if (typeFilter !== 'all') {
    list = list.filter((o) => o.type === typeFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((o) =>
      (o.clientName || '').toLowerCase().includes(q) ||
      (o.bookingCode || '').toLowerCase().includes(q) ||
      o.id.toString().includes(q)
    );
  }
  return list;
}, [orders, typeFilter, searchQuery]);
```

- [ ] **Step 4: Remplacer le hero header**

Repérer le bloc actuel (lignes ~192-204) :

```tsx
{/* Header */}
<div className="flex items-center gap-3">
  <div className="p-3 rounded-xl gradient-subito">
    <CreditCard className="w-6 h-6 text-white" />
  </div>
  <div>
    <h1 className="text-2xl font-bold text-slate-800">Prises en charge</h1>
    <p className="text-slate-500 mt-1">
      Demandes en attente de validation — quand un client réserve et demande que l&apos;entreprise paie
    </p>
  </div>
</div>
```

Le remplacer par :

```tsx
{/* Hero Header */}
<div className="mb-8">
  <nav className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
    <span>Finances</span>
    <span>/</span>
    <span className="text-[#E04A1F]">Prises en charge</span>
  </nav>
  <h1
    className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#171c1f] leading-tight"
    style={MANROPE}
  >
    Prises en charge
  </h1>
  <p className="text-[#585e6c] font-medium mt-1">
    Demandes en attente de validation — quand un client réserve et demande à l&apos;entreprise de payer
  </p>
</div>
```

Aussi : remplacer le wrapper racine `<div className="space-y-6">` par `<div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6 space-y-6">` (cohérent avec tickets).

- [ ] **Step 5: Remplacer le bandeau stats**

Repérer le bloc actuel (lignes ~206-231) et le remplacer par :

```tsx
{/* Stats */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
      <Clock className="w-5 h-5 text-amber-700" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">En attente</p>
      <p className="text-2xl font-extrabold text-amber-600 mt-0.5" style={MANROPE}>
        {orders.length}
      </p>
    </div>
  </div>
  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-[#f0f4f8] flex items-center justify-center shrink-0">
      <Banknote className="w-5 h-5 text-[#585e6c]" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Montant total</p>
      <p className="text-xl md:text-2xl font-extrabold text-[#171c1f] mt-0.5 truncate" style={MANROPE}>
        {orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString('fr-FR')} FCFA
      </p>
    </div>
  </div>
  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
      <CreditCard className="w-5 h-5 text-[#E04A1F]" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">À traiter</p>
      <p className="text-2xl font-extrabold text-[#E04A1F] mt-0.5" style={MANROPE}>
        {orders.length}
      </p>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Ajouter la barre de filtres + le compteur**

Juste après le bloc stats et **avant** le bloc table actuel, insérer :

```tsx
{/* Filters */}
<div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
  <div className="relative flex-1">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#585e6c]" />
    <Input
      placeholder="Rechercher par client ou référence..."
      className="pl-11 h-11 rounded-xl border-slate-200"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
  <div className="flex gap-2 flex-wrap">
    {TYPE_FILTERS.map((f) => {
      const active = typeFilter === f.value;
      return (
        <button
          key={f.value}
          onClick={() => setTypeFilter(f.value)}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition ${
            active
              ? 'bg-[#E04A1F] text-white shadow-md'
              : 'bg-[#f0f4f8] text-[#585e6c] hover:bg-slate-200'
          }`}
        >
          {f.label}
        </button>
      );
    })}
  </div>
</div>

{/* Compteur */}
{!isLoading && filteredOrders.length > 0 && (
  <div className="flex items-center justify-end">
    <p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
      {filteredOrders.length} demande{filteredOrders.length > 1 ? 's' : ''}
    </p>
  </div>
)}
```

- [ ] **Step 7: Vérifier compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur. (À ce stade `filteredOrders` n'est pas encore consommé par la table — pas grave, c'est juste un memo non utilisé, TS ne se plaint pas.)

Run: `npm run lint`
Expected: pas d'erreur. Si `Plane`, `FileText`, `Search`, `motion`, `Link`, `Input` sont signalés unused, c'est attendu (ils seront consommés en Task 2).

> **Si lint échoue sur unused imports :** ajouter en haut du fichier `// eslint-disable-next-line @typescript-eslint/no-unused-vars` au-dessus des imports concernés est une mauvaise idée. À la place, **passer directement à l'étape 8** sans commit, puis enchaîner sur Task 2 dans le même commit. Mais si lint passe, faire le commit de la tâche 1.

- [ ] **Step 8: Vérification visuelle**

Run: `npm run dev` (s'il ne tourne pas déjà) puis ouvrir `http://localhost:3000/pending-validations`.

Attendu :
- Hero avec breadcrumb « Finances / Prises en charge » (segment courant en orange) au-dessus d'un titre Manrope bold
- 3 stats en cartes blanches avec icône en cercle coloré
- Barre filtres avec champ de recherche + 3 pills (`Toutes`, `Réservations`, `Documents`)
- Cliquer sur les pills change l'active → fond orange `#E04A1F`
- La table existante reste dessous (pas encore stylée — sera changée en Task 2)

- [ ] **Step 9: Commit**

```bash
git add app/(dashboard)/pending-validations/page.tsx
git commit -m "feat(pending-validations): align hero/stats/filters with recent design language"
```

---

## Task 2 : Liste en cartes (remplace le tableau)

**Files:**
- Modify: `app/(dashboard)/pending-validations/page.tsx`

Cette tâche remplace le bloc `{orders.length === 0 ? (empty) : (table)}` par le pattern carte motion + empty state stylé. La logique de mutations reste exactement la même, on rebrancher juste les boutons sur `approveMutation.mutate(item)`, etc.

- [ ] **Step 1: Ajouter les imports pour Task 2**

Ajouter en haut du fichier :

```tsx
import Link from "next/link";
import { motion } from "framer-motion";
```

Et ajouter `FileText` au bloc d'import lucide-react existant (Plane est déjà présent depuis le fichier original). Le bloc devient :

```tsx
import {
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Loader2,
  Banknote,
  Inbox,
  Eye,
  Phone,
  Mail,
  Car,
  Plane,
  FileText,
  Search,
} from "lucide-react";
```

- [ ] **Step 2: Repérer le bloc à remplacer**

Repérer le bloc actuel `{/* Table */}` qui commence par `{orders.length === 0 ? (` (ligne ~234) et se termine par `)}` juste avant `{/* Detail Dialog */}` (ligne ~351).

Note : ce bloc inclut deux états — l'empty state ET la table. On va remplacer **les deux** d'un coup.

- [ ] **Step 3: Remplacer par cartes + empty state stylés**

Substituer tout le bloc identifié à l'étape 1 par :

```tsx
{/* Liste */}
{filteredOrders.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
    <div className="w-20 h-20 rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
      <Inbox className="w-10 h-10 text-[#E04A1F]" />
    </div>
    <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>
      Aucune demande en attente
    </p>
    <p className="text-sm text-[#585e6c] mt-1 max-w-md text-center px-6">
      Les demandes apparaissent ici quand un client réserve et choisit « paiement par l&apos;entreprise ».
      Retrouvez l&apos;historique de toutes vos commandes dans{' '}
      <Link href="/tracking" className="text-[#E04A1F] font-bold hover:underline">
        Suivi des commandes
      </Link>.
    </p>
  </div>
) : (
  <div className="space-y-3">
    {filteredOrders.map((item, idx) => {
      const ServiceIcon = getServiceIcon(item.serviceType, item.type);
      const typeLabel = item.type === 'travel-document' ? 'Document voyage' : 'Réservation';
      const serviceLabel = SERVICE_LABELS[item.serviceType] || item.serviceType?.replace(/_/g, ' ') || '—';
      return (
        <motion.div
          key={`${item.type}-${item.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
        >
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#ffdbd0] transition-all p-5 md:p-6">
            <div className="flex items-start gap-4 md:gap-6 flex-wrap md:flex-nowrap">
              {/* Icone service */}
              <div className="w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0">
                <ServiceIcon className="w-5 h-5 text-[#E04A1F]" />
              </div>

              {/* Bloc texte */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                    {item.bookingCode || `#${item.id}`}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    · {typeLabel}
                  </span>
                  <StatusPillEnAttente />
                </div>
                <h3
                  className="text-base md:text-lg font-extrabold text-[#171c1f] leading-tight truncate"
                  style={MANROPE}
                >
                  {serviceLabel}
                </h3>
                <div className="flex items-center gap-4 text-xs text-[#585e6c] mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {item.clientName || '—'}
                  </span>
                  {item.clientPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {item.clientPhone}
                    </span>
                  )}
                  {!item.clientPhone && item.clientEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {item.clientEmail}
                    </span>
                  )}
                  {item.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(item.createdAt), 'd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
              </div>

              {/* Bloc montant */}
              <div className="text-left md:text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Montant</p>
                <p className="text-xl md:text-2xl font-extrabold text-[#E04A1F] mt-0.5" style={MANROPE}>
                  {item.amount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 mt-4 pt-4 flex justify-end gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                className="gap-1.5 rounded-xl border-slate-200 text-[#585e6c] hover:bg-slate-50 h-9 text-xs font-bold"
              >
                <Eye className="w-3.5 h-3.5" />
                Détails
              </Button>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(item)}
                disabled={isMutating}
                className="gap-1.5 rounded-xl bg-[#E04A1F] hover:bg-[#C8330F] text-white h-9 text-xs font-bold shadow-md shadow-[#E04A1F]/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setSelectedItem(item); setShowRejectDialog(true); }}
                disabled={isMutating}
                className="gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-9 text-xs font-bold"
              >
                <XCircle className="w-3.5 h-3.5" />
                Refuser
              </Button>
            </div>
          </div>
        </motion.div>
      );
    })}
  </div>
)}
```

- [ ] **Step 4: Vérifier compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur.

Run: `npm run lint`
Expected: pas d'erreur. Tous les imports ajoutés sont maintenant consommés.

- [ ] **Step 5: Vérification visuelle**

Sur `/pending-validations` :
- Avec données : la liste affiche des cartes empilées espacées de 12px, chacune avec icône cercle orange, infos client, montant en gros à droite, et 3 boutons en bas (Détails / Approuver / Refuser)
- Hover sur une carte : ombre et bordure orange clair `#ffdbd0`
- Animation d'entrée subtile (fade + slide) avec délai progressif
- Filtres et recherche fonctionnent (la liste se restreint)
- Boutons Approuver / Refuser ouvrent les dialogs (pas encore stylés — sera Task 3)

Si l'app n'a pas de données réelles : l'empty state s'affiche avec cercle `#ffdbd0` + Inbox + lien orange vers `/tracking`.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/pending-validations/page.tsx
git commit -m "feat(pending-validations): replace table with motion cards list"
```

---

## Task 3 : Restyle des dialogs (Détail + Refus)

**Files:**
- Modify: `app/(dashboard)/pending-validations/page.tsx`

Le contenu fonctionnel des dialogs reste identique (réf, montant, service, client, détails raw, actions ; refus avec textarea). Seul le style est mis à jour pour matcher la grammaire orange/slate-100 du reste de l'app.

- [ ] **Step 1: Restyler le Detail Dialog**

Repérer le bloc `{/* Detail Dialog */}` qui commence par `<Dialog open={showDetailDialog}` et se termine au `</Dialog>` correspondant. Remplacer par :

```tsx
{/* Detail Dialog */}
<Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
  <DialogContent className="sm:max-w-2xl rounded-3xl">
    <DialogHeader>
      <DialogTitle
        className="text-2xl font-extrabold text-[#171c1f]"
        style={MANROPE}
      >
        Détails de la demande
      </DialogTitle>
      <DialogDescription className="text-[#585e6c]">
        Vérifiez les informations puis approuvez ou refusez la prise en charge.
      </DialogDescription>
    </DialogHeader>
    {selectedItem && (
      <div className="space-y-4 mt-4">
        {/* Top : Réf + Montant */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#f0f4f8] space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Référence</p>
            <p className="font-mono font-bold text-[#171c1f]">{selectedItem.bookingCode || `#${selectedItem.id}`}</p>
            <StatusPillEnAttente />
          </div>
          <div className="p-4 rounded-2xl bg-[#ffdbd0] space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Montant</p>
            <p className="text-2xl font-extrabold text-[#E04A1F]" style={MANROPE}>
              {selectedItem.amount.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        {/* Service */}
        <div className="p-4 rounded-2xl bg-[#f0f4f8] space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Service</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#585e6c]" />
              <span className="text-[#171c1f] font-semibold">
                {SERVICE_LABELS[selectedItem.serviceType] || selectedItem.serviceType?.replace(/_/g, ' ') || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#585e6c]" />
              <span className="text-[#171c1f] font-semibold">
                {selectedItem.createdAt
                  ? format(new Date(selectedItem.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="p-4 rounded-2xl bg-[#f0f4f8] space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Client</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#585e6c]" />
              <span className="font-semibold text-[#171c1f]">{selectedItem.clientName || '—'}</span>
            </div>
            {selectedItem.clientPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#585e6c]" />
                <span className="text-[#171c1f]">{selectedItem.clientPhone}</span>
              </div>
            )}
            {selectedItem.clientEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#585e6c]" />
                <span className="text-[#171c1f]">{selectedItem.clientEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Détails raw */}
        {(() => {
          const r = selectedItem.raw;
          const details: Array<{ label: string; value: string }> = [];
          if (r['pickupAddress'] || r['pickupLocation']) details.push({ label: 'Lieu de prise en charge', value: String(r['pickupAddress'] || r['pickupLocation'] || '') });
          if (r['dropoffAddress'] || r['dropoffLocation']) details.push({ label: 'Destination', value: String(r['dropoffAddress'] || r['dropoffLocation'] || '') });
          if (r['pickupDate']) details.push({ label: 'Date de prise en charge', value: format(new Date(r['pickupDate'] as string), "d MMMM yyyy 'à' HH:mm", { locale: fr }) });
          if (r['nbPassengers'] || r['nombrePassagers']) details.push({ label: 'Passagers', value: String(r['nbPassengers'] || r['nombrePassagers'] || '') });
          if (r['vehicleType'] || r['typeVehicule']) details.push({ label: 'Type de véhicule', value: String(r['vehicleType'] || r['typeVehicule'] || '') });
          if (r['flightNumber'] || r['numeroVol']) details.push({ label: 'N° de vol', value: String(r['flightNumber'] || r['numeroVol'] || '') });
          if (r['departureCity'] || r['villeDepart']) details.push({ label: 'Ville départ', value: String(r['departureCity'] || r['villeDepart'] || '') });
          if (r['arrivalCity'] || r['villeArrivee']) details.push({ label: 'Ville arrivée', value: String(r['arrivalCity'] || r['villeArrivee'] || '') });
          if (r['documentType'] || r['typeDocument']) details.push({ label: 'Type de document', value: String(r['documentType'] || r['typeDocument'] || '') });
          if (r['notes']) details.push({ label: 'Notes', value: String(r['notes']) });
          if (r['duration'] || r['duree']) details.push({ label: 'Durée', value: String(r['duration'] || r['duree'] || '') });
          return details.length > 0 ? (
            <div className="p-4 rounded-2xl bg-[#f0f4f8] space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#585e6c]">Détails de la réservation</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {details.map((d, i) => (
                  <div key={i}>
                    <span className="text-[#585e6c]">{d.label} :</span>{' '}
                    <span className="font-semibold text-[#171c1f]">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowDetailDialog(false)}
            className="rounded-xl border-slate-200 text-[#585e6c] font-bold"
          >
            Fermer
          </Button>
          <Button
            onClick={() => { setShowDetailDialog(false); approveMutation.mutate(selectedItem); }}
            disabled={isMutating}
            className="rounded-xl bg-[#E04A1F] hover:bg-[#C8330F] text-white font-bold shadow-md shadow-[#E04A1F]/20"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approuver
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowDetailDialog(false); setShowRejectDialog(true); }}
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
          >
            <XCircle className="w-4 h-4 mr-1.5" /> Refuser
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

- [ ] **Step 2: Restyler le Reject Dialog**

Repérer le bloc `{/* Reject Dialog */}` et le remplacer par :

```tsx
{/* Reject Dialog */}
<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
  <DialogContent className="sm:max-w-md rounded-3xl">
    <DialogHeader>
      <DialogTitle
        className="text-2xl font-extrabold text-[#171c1f]"
        style={MANROPE}
      >
        Refuser la demande
      </DialogTitle>
      <DialogDescription className="text-[#585e6c]">
        Indiquez la raison du refus pour informer le client.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-3 mt-4">
      <Label htmlFor="rejection-reason" className="text-sm font-bold text-[#171c1f]">
        Raison du refus (optionnel)
      </Label>
      <Textarea
        id="rejection-reason"
        placeholder="Expliquez pourquoi vous refusez cette demande..."
        value={rejectionReason}
        onChange={(e) => setRejectionReason(e.target.value)}
        className="min-h-[100px] rounded-xl border-slate-200"
      />
    </div>
    <DialogFooter className="gap-2 sm:gap-2 mt-4 flex-wrap">
      <Button
        variant="outline"
        onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }}
        className="rounded-xl border-slate-200 text-[#585e6c] font-bold"
      >
        Annuler
      </Button>
      <Button
        onClick={() => { if (selectedItem) rejectMutation.mutate(selectedItem); }}
        disabled={isMutating}
        className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
      >
        Confirmer le refus
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 3: Restyler le loading state initial**

Repérer en haut du `return` (juste avant le `if (isLoading)` qui retourne le spinner) :

```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-slate-500">Chargement des demandes...</p>
      </div>
    </div>
  );
}
```

Le remplacer par :

```tsx
if (isLoading) {
  return (
    <div className="max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6">
      <div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur.

Run: `npm run lint`
Expected: pas d'erreur.

- [ ] **Step 5: Vérification visuelle complète**

Sur `/pending-validations` :
- Loading initial : carte blanche rounded-3xl avec spinner orange centré
- Cliquer `Détails` sur une carte → dialog rounded-3xl, titre Manrope, deux blocs top (réf en gris / montant en orange `#ffdbd0`), sections service/client/détails en `#f0f4f8`, footer 3 boutons rounded-xl
- Cliquer `Refuser` (depuis carte ou depuis dialog détail) → dialog refus rounded-3xl, textarea rounded-xl, bouton confirmation rouge
- Approuver depuis dialog détail : ferme le dialog et lance la mutation
- Mobile (< md) : tous les dialogs restent lisibles, sections empilées, boutons s'enroulent correctement

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/pending-validations/page.tsx
git commit -m "feat(pending-validations): align detail and reject dialogs with brand styling"
```

---

## Final verification

À la fin des 3 tâches :

- [ ] **Run tsc final**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Run lint final**

Run: `npm run lint`
Expected: clean.

- [ ] **Test fonctionnel complet en navigateur**

Sur `/pending-validations`, vérifier en bout-à-bout :
- Stats correctes (compteurs et montant total)
- Recherche filtre la liste sur client/référence
- Pills filtrent par type (Réservations / Documents)
- Empty state s'affiche si filtres trop restrictifs
- Approuver depuis carte : item disparaît, toast succès
- Détails depuis carte : dialog stylé, contenu complet
- Refuser depuis carte ou dialog détail : reject dialog, mutation OK
- Hover et animations cohérents avec le reste de l'app
- Mobile (DevTools < 768px) : tout reste lisible
