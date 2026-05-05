# Edit Company Bookings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre la modification (PUT) des réservations entreprise `airport-shuttle`, `inter-city`, `hourly-vtc` depuis `/tracking/[id]`, en réutilisant les wizards de création extraits en composants partagés.

**Architecture:** Chaque wizard de création (3 pages monolithiques de 1500-2100 lignes) est extrait en composant `components/bookings/<Type>BookingWizard.tsx` avec une prop `mode: 'create' | 'edit'`. Trois nouvelles routes `/<type>/[id]/edit` chargent la réservation et rendent le wizard en mode edit. Le bouton "Modifier" existant sur `/tracking/[id]` est recâblé pour router vers ces nouvelles pages, conditionnellement à `status` et `serviceType`.

**Tech Stack:** Next.js 14 App Router, React, TanStack Query, framer-motion, sonner (toasts), Tailwind. Pas de framework de tests automatisés (cf. `MEMORY.md`) → validation par `npx tsc --noEmit` + lint + scénarios manuels en navigateur.

**Spec:** `docs/superpowers/specs/2026-05-05-edit-company-bookings-design.md`

---

## File Structure

**Création :**
- `components/bookings/AirportShuttleBookingWizard.tsx` (extrait de `app/(dashboard)/airport-shuttle/page.tsx`)
- `components/bookings/InterCityBookingWizard.tsx` (extrait de `app/(dashboard)/inter-city/page.tsx`)
- `components/bookings/HourlyVtcBookingWizard.tsx` (extrait de `app/(dashboard)/hourly-vtc/page.tsx`)
- `app/(dashboard)/airport-shuttle/[id]/edit/page.tsx` (nouvelle route)
- `app/(dashboard)/inter-city/[id]/edit/page.tsx` (nouvelle route)
- `app/(dashboard)/hourly-vtc/[id]/edit/page.tsx` (nouvelle route)

**Modification :**
- `app/(dashboard)/airport-shuttle/page.tsx` → shell qui rend `<AirportShuttleBookingWizard mode="create" />`
- `app/(dashboard)/inter-city/page.tsx` → idem
- `app/(dashboard)/hourly-vtc/page.tsx` → idem
- `app/(dashboard)/tracking/[id]/page.tsx` → recâbler bouton "Modifier" + visibilité conditionnelle

---

## Phase 1 : Airport-Shuttle — Extraction du wizard

Objectif : sortir le wizard de la page sans changer son comportement. Aucune nouvelle fonctionnalité dans cette phase.

### Task 1.1 : Créer le composant wizard (copie verbatim)

**Files:**
- Create: `components/bookings/AirportShuttleBookingWizard.tsx`

- [ ] **Step 1 :** Lire `app/(dashboard)/airport-shuttle/page.tsx` intégralement (utiliser plusieurs `Read` avec `offset`/`limit` car le fichier fait ~1968 lignes).

- [ ] **Step 2 :** Créer `components/bookings/AirportShuttleBookingWizard.tsx` en copiant **tout le contenu** du fichier source. Apporter exactement ces 4 modifications :

  1. Garder la directive `'use client'` en première ligne.
  2. Adapter les imports relatifs : tous les `@/components/ui/...`, `@/lib/api`, `@/lib/auth-context`, `@/components/employees/EmployeeForm` restent identiques (alias `@/` fonctionne depuis n'importe où). Aucun import à changer.
  3. Renommer la fonction `export default function AirportShuttle()` en `export default function AirportShuttleBookingWizard()`.
  4. Ne **PAS** ajouter de props pour l'instant — l'extraction de cette task est une copie 1:1 sans nouvelles fonctionnalités.

- [ ] **Step 3 :** Modifier `app/(dashboard)/airport-shuttle/page.tsx` pour réduire son contenu à un shell. Le fichier devient :

```tsx
import AirportShuttleBookingWizard from "@/components/bookings/AirportShuttleBookingWizard";

export default function AirportShuttlePage() {
  return <AirportShuttleBookingWizard />;
}
```

- [ ] **Step 4 :** Lancer `npx tsc --noEmit` à la racine du projet.
  - Attendu : aucune erreur. Si TypeScript se plaint d'un import manquant ou d'un type non résolu, corriger en ajustant l'import (la cause la plus probable est un alias mal résolu — vérifier `tsconfig.json` `paths`).

- [ ] **Step 5 :** Lancer `npm run lint` (ou `next lint`).
  - Attendu : pas d'erreur. Les warnings éventuels sur `any` doivent être identiques avant/après extraction.

- [ ] **Step 6 :** Validation manuelle navigateur — démarrer le dev server (`npm run dev`), ouvrir `/airport-shuttle`, parcourir tout le wizard (5 étapes : Client, Trajet, Vehicule, Paiement, Confirmation), créer une réservation factice. Vérifier que confetti s'affiche en succès et que la redirection vers `/tracking` fonctionne.

- [ ] **Step 7 :** Commit.

```bash
git add components/bookings/AirportShuttleBookingWizard.tsx app/(dashboard)/airport-shuttle/page.tsx
git commit -m "refactor(airport-shuttle): extract wizard into shared component"
```

---

### Task 1.2 : Ajouter le support du mode "edit" au wizard

**Files:**
- Modify: `components/bookings/AirportShuttleBookingWizard.tsx`

- [ ] **Step 1 :** Ajouter l'interface de props et les types nécessaires en haut du fichier (après les imports, avant `interface StepDef`) :

```tsx
import type { BookingResponse } from "@/lib/api";

export interface AirportShuttleBookingWizardProps {
  mode?: 'create' | 'edit';
  bookingId?: number;
  initialData?: BookingResponse;
}
```

- [ ] **Step 2 :** Modifier la signature de la fonction et déstructurer les props avec valeurs par défaut :

```tsx
export default function AirportShuttleBookingWizard({
  mode = 'create',
  bookingId,
  initialData,
}: AirportShuttleBookingWizardProps = {}) {
  const isEdit = mode === 'edit';
  // ... reste inchangé
}
```

- [ ] **Step 3 :** Ajouter en haut du composant (juste après les hooks `useState` existants et avant les `useQuery`) la fonction de mapping `bookingResponseToFormData` :

```tsx
function bookingResponseToFormData(b: BookingResponse): Partial<FormData> {
  const get = (k: string) => (b as Record<string, unknown>)[k];
  const str = (k: string) => {
    const v = get(k);
    return typeof v === 'string' ? v : '';
  };
  const num = (k: string) => {
    const v = get(k);
    return typeof v === 'number' ? v : null;
  };
  const bool = (k: string) => {
    const v = get(k);
    return typeof v === 'boolean' ? v : false;
  };
  return {
    direction: str('direction') || 'to_airport',
    trajetAeroportId: num('trajetAeroportId'),
    is_round_trip: !bool('isOneWay'),
    departure_date: str('pickupDateAller'),
    departure_time: str('pickupTimeAller'),
    return_date: str('pickupDateRetour'),
    return_time: str('pickupTimeRetour'),
    passengers: typeof get('passengers') === 'number' ? (get('passengers') as number) : 1,
    flight_number: str('flightNumber'),
    address: str('adressePriseEnChargeAller'),
    addressLat: num('adressePriseEnChargeAllerLat'),
    addressLng: num('adressePriseEnChargeAllerLng'),
    return_address: str('adressePriseEnChargeRetour'),
    returnAddressLat: num('adressePriseEnChargeRetourLat'),
    returnAddressLng: num('adressePriseEnChargeRetourLng'),
    payment_method: typeof get('paidBy') === 'string' ? (get('paidBy') as string) : '',
    clientName: str('clientName'),
    clientEmail: str('clientEmail'),
    clientPhone: str('clientPhone'),
    clientAddress: str('clientAddress'),
    siegeBebes: typeof get('siegeBebes') === 'number' ? (get('siegeBebes') as number) : 0,
    animalDeCompagnie: bool('animalDeCompagnie'),
    adresseSupplement: typeof get('adresseSupplement') === 'number' ? (get('adresseSupplement') as number) : 0,
    specialRequests: str('specialRequests'),
    employeeId: num('employeeId'),
    vehiculeId: num('vehiculeId'),
  };
}
```

- [ ] **Step 4 :** Ajouter un `useEffect` qui hydrate `formData` quand `initialData` change (juste après la déclaration de `setFormData`) :

```tsx
useEffect(() => {
  if (isEdit && initialData) {
    const mapped = bookingResponseToFormData(initialData);
    setFormData(prev => ({ ...prev, ...mapped }));
    if (mapped.trajetAeroportId) {
      // Trigger trajet selection sync
    }
  }
}, [isEdit, initialData]);
```

- [ ] **Step 5 :** Ajouter la mutation d'update à côté de `createBooking` :

```tsx
const updateBooking = useMutation({
  mutationFn: (data: Partial<CreateAirportShuttleBookingDto>) => {
    if (!bookingId) throw new Error('bookingId requis en mode edit');
    return api.bookings.airportShuttle.update(bookingId, data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking-detail-page'] });
    toast.success('Reservation mise a jour');
    if (bookingId) router.push(`/tracking/${bookingId}`);
  },
  onError: (err: Error) => {
    toast.error(err.message || 'Erreur lors de la modification');
  },
});
```

- [ ] **Step 6 :** Localiser dans le wizard la fonction qui appelle `createBooking.mutate(bookingData)` (ligne ~452 du fichier original). La remplacer par un branchement :

```tsx
if (isEdit) {
  updateBooking.mutate(bookingData);
} else {
  createBooking.mutate(bookingData);
}
```

- [ ] **Step 7 :** Localiser le bouton final de soumission (ligne ~1959 du fichier original) avec son label `Confirmer - X FCFA`. Adapter `disabled` et le label :

```tsx
disabled={isEdit ? updateBooking.isPending : createBooking.isPending}
```

```tsx
{isEdit
  ? (updateBooking.isPending ? 'Enregistrement...' : 'Enregistrer les modifications')
  : (createBooking.isPending ? 'Confirmation...' : `Confirmer - ${calculateTotal().toLocaleString()} FCFA`)
}
```

- [ ] **Step 8 :** Conditionner le confetti dans `createBooking.onSuccess` — déjà uniquement dans `createBooking`, donc rien à faire (l'`updateBooking.onSuccess` n'en déclenche pas).

- [ ] **Step 9 :** Localiser le titre principal de la page wizard (chercher un élément contenant "Reserver" ou similaire en haut du JSX). Le rendre conditionnel :

```tsx
<h1>{isEdit ? 'Modifier la reservation' : 'Reserver une navette aeroport'}</h1>
```

(Si le titre exact diffère, conserver la formulation existante en mode `create` et utiliser "Modifier la reservation" en mode `edit`.)

- [ ] **Step 10 :** Conditionner les champs paiement à l'étape 4 (Paiement) en lecture seule en mode edit. Trouver le bloc `RadioGroup` ou les `Card` du choix `paidBy`/`paymentMethod` (chercher `payment_method` dans le JSX). Ajouter `disabled={isEdit}` ou wrapper :

```tsx
{isEdit ? (
  <div className="rounded-xl border bg-muted/30 p-4 text-sm">
    <p className="font-semibold mb-1">Mode de paiement</p>
    <p className="text-muted-foreground">
      {formData.payment_method === 'company' ? "Compte entreprise" : "Client / Employe"}
      {' — non modifiable apres creation'}
    </p>
  </div>
) : (
  /* le RadioGroup existant */
)}
```

- [ ] **Step 11 :** Lancer `npx tsc --noEmit`.
  - Attendu : aucune erreur.

- [ ] **Step 12 :** Lancer `npm run lint`.
  - Attendu : pas de nouvelle erreur.

- [ ] **Step 13 :** Validation manuelle — la page `/airport-shuttle` (mode create) doit toujours fonctionner exactement comme avant. Créer une réservation pour confirmer.

- [ ] **Step 14 :** Commit.

```bash
git add components/bookings/AirportShuttleBookingWizard.tsx
git commit -m "feat(airport-shuttle): add edit mode to booking wizard"
```

---

### Task 1.3 : Créer la route d'édition

**Files:**
- Create: `app/(dashboard)/airport-shuttle/[id]/edit/page.tsx`

- [ ] **Step 1 :** Créer le fichier avec ce contenu exact :

```tsx
'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { api, BookingResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AirportShuttleBookingWizard from "@/components/bookings/AirportShuttleBookingWizard";

export default function EditAirportShuttleBookingPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params?.id || "", 10);

  const { data, isLoading, error } = useQuery<unknown>({
    queryKey: ["booking-edit", "airport-shuttle", id],
    queryFn: () => api.bookings.airportShuttle.get(id),
    enabled: !isNaN(id),
  });

  // BackEnd peut retourner la booking directement OU enveloppee dans { data: ... }.
  const raw = data as Record<string, unknown> | undefined;
  const unwrapped =
    raw && typeof raw.data === "object" && raw.data !== null && "id" in (raw.data as Record<string, unknown>)
      ? (raw.data as Record<string, unknown>)
      : raw;
  const booking = unwrapped as (BookingResponse & Record<string, unknown>) | undefined;

  if (isNaN(id)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-semibold">Identifiant invalide</p>
          <Button asChild variant="outline">
            <Link href="/tracking"><ArrowLeft className="w-4 h-4 mr-2" />Retour au suivi</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-semibold">Reservation introuvable</p>
          <Button asChild variant="outline">
            <Link href="/tracking"><ArrowLeft className="w-4 h-4 mr-2" />Retour au suivi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AirportShuttleBookingWizard
      mode="edit"
      bookingId={id}
      initialData={booking}
    />
  );
}
```

- [ ] **Step 2 :** Lancer `npx tsc --noEmit`.
  - Attendu : aucune erreur.

- [ ] **Step 3 :** Lancer `npm run lint`.

- [ ] **Step 4 :** Commit (validation manuelle dans Phase 4 quand le bouton sera branché).

```bash
git add "app/(dashboard)/airport-shuttle/[id]/edit/page.tsx"
git commit -m "feat(airport-shuttle): add edit page route"
```

---

## Phase 2 : Brancher le bouton "Modifier" sur `/tracking/[id]`

Le bouton existe déjà mais route vers `/airport-shuttle` (page de création vide). On le recâble pour router vers `/<type>/[id]/edit` et on le conditionne par `status` et `serviceType`.

### Task 2.1 : Recâbler le bouton avec visibilité conditionnelle

**Files:**
- Modify: `app/(dashboard)/tracking/[id]/page.tsx:321-334`

- [ ] **Step 1 :** Ouvrir le fichier et localiser le bouton "Modifier" (vers ligne 322-334). Le bloc actuel est :

```tsx
<Button
  variant="outline"
  onClick={() => {
    const t = (d.serviceType || serviceType || "").toLowerCase();
    if (t === "airport_shuttle") router.push("/airport-shuttle");
    else if (t === "inter_city" || t === "intercity") router.push("/inter-city");
    else if (t === "vtc_hourly") router.push("/hourly-vtc");
    else router.push("/tracking");
  }}
  className="gap-2 rounded-xl"
>
  Modifier
</Button>
```

- [ ] **Step 2 :** Remplacer par :

```tsx
{(() => {
  const t = (d.serviceType || serviceType || "").toLowerCase();
  const status = (d.status || "").toLowerCase();
  const editableStatuses = ["pending", "confirmed"];
  const slugByType: Record<string, string> = {
    airport_shuttle: "airport-shuttle",
    inter_city: "inter-city",
    intercity: "inter-city",
    vtc_hourly: "hourly-vtc",
  };
  const slug = slugByType[t];
  const canEdit = !!slug && editableStatuses.includes(status);
  if (!canEdit) return null;
  return (
    <Button
      variant="outline"
      onClick={() => router.push(`/${slug}/${id}/edit`)}
      className="gap-2 rounded-xl"
    >
      Modifier
    </Button>
  );
})()}
```

Note : `d` est l'objet booking utilisé dans ce contexte (cf. ligne ~325) ; `id` est déjà déclaré au-dessus dans le composant. Si `d.status` n'est pas accessible, utiliser `booking?.status` ou la variable équivalente du composant. Vérifier en lisant le fichier autour de la ligne 320 avant l'édition.

- [ ] **Step 3 :** Lancer `npx tsc --noEmit`.

- [ ] **Step 4 :** Lancer `npm run lint`.

- [ ] **Step 5 :** Validation manuelle complète du flow airport-shuttle :

  1. Créer une réservation airport-shuttle (status devient `pending`).
  2. Ouvrir sa page `/tracking/[id]` → le bouton **Modifier** est visible.
  3. Cliquer Modifier → arrive sur `/airport-shuttle/[id]/edit`, formulaire pré-rempli avec les données.
  4. Modifier la date et les notes, parcourir jusqu'à l'étape paiement → champs paiement en lecture seule.
  5. Cliquer "Enregistrer les modifications" → toast succès, redirection `/tracking/[id]`, données à jour.
  6. Vérifier dans DevTools Network que la requête est `PUT /v1/bookings/airport-shuttle/compagny/{id}`.
  7. Tester un statut non éditable : ouvrir une réservation `cancelled` ou `paid` → bouton **Modifier** absent.
  8. Tester un type non supporté : ouvrir une `service-reservation` (ACTIVITE/LOGEMENT/FLOTTE) ou une `visa_assistance` → bouton **Modifier** absent.
  9. Tester réservation introuvable : naviguer manuellement vers `/airport-shuttle/999999/edit` → message "Reservation introuvable" + bouton retour.

- [ ] **Step 6 :** Commit.

```bash
git add "app/(dashboard)/tracking/[id]/page.tsx"
git commit -m "feat(tracking): wire edit button to dedicated edit routes"
```

---

## Phase 3 : Inter-City — Extraction + edit mode + route

### Task 3.1 : Extraire le wizard inter-city

**Files:**
- Create: `components/bookings/InterCityBookingWizard.tsx`
- Modify: `app/(dashboard)/inter-city/page.tsx`

- [ ] **Step 1 :** Lire `app/(dashboard)/inter-city/page.tsx` intégralement (~2148 lignes — utiliser plusieurs `Read`).

- [ ] **Step 2 :** Créer `components/bookings/InterCityBookingWizard.tsx` en copiant le contenu, en :
  1. Conservant `'use client'` en première ligne.
  2. Renommant la fonction exportée en `InterCityBookingWizard`.
  3. Sans ajouter de props pour l'instant.

- [ ] **Step 3 :** Réduire `app/(dashboard)/inter-city/page.tsx` à :

```tsx
import InterCityBookingWizard from "@/components/bookings/InterCityBookingWizard";

export default function InterCityPage() {
  return <InterCityBookingWizard />;
}
```

- [ ] **Step 4 :** `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 5 :** `npm run lint`.

- [ ] **Step 6 :** Validation manuelle — créer une réservation inter-city aller-retour, vérifier que tous les champs (départ/arrivée aller, départ/arrivée retour, bagages, sièges bébé) fonctionnent comme avant.

- [ ] **Step 7 :** Commit.

```bash
git add components/bookings/InterCityBookingWizard.tsx app/(dashboard)/inter-city/page.tsx
git commit -m "refactor(inter-city): extract wizard into shared component"
```

---

### Task 3.2 : Ajouter le mode edit au wizard inter-city

**Files:**
- Modify: `components/bookings/InterCityBookingWizard.tsx`

- [ ] **Step 1 :** Ajouter l'interface props (identique à airport-shuttle, type renommé) :

```tsx
import type { BookingResponse } from "@/lib/api";

export interface InterCityBookingWizardProps {
  mode?: 'create' | 'edit';
  bookingId?: number;
  initialData?: BookingResponse;
}
```

- [ ] **Step 2 :** Modifier la signature : `export default function InterCityBookingWizard({ mode = 'create', bookingId, initialData }: InterCityBookingWizardProps = {}) {` puis `const isEdit = mode === 'edit';`.

- [ ] **Step 3 :** Ajouter la fonction de mapping `bookingResponseToFormData` adaptée à inter-city (consulter `CreateInterCityBookingDto` à `lib/api.ts:302-353` pour la liste des champs) :

```tsx
function bookingResponseToFormData(b: BookingResponse): Partial<FormData> {
  const get = (k: string) => (b as Record<string, unknown>)[k];
  const str = (k: string) => { const v = get(k); return typeof v === 'string' ? v : ''; };
  const num = (k: string) => { const v = get(k); return typeof v === 'number' ? v : null; };
  const bool = (k: string) => { const v = get(k); return typeof v === 'boolean' ? v : false; };
  const numOr = (k: string, fallback: number) => { const v = get(k); return typeof v === 'number' ? v : fallback; };
  return {
    serviceType: str('serviceType') === 'round_trip' ? 'round_trip' : 'one_way',
    trajetInterVilleId: num('trajetInterVilleId'),
    vehiculeId: num('vehiculeId'),
    departureCity: str('departureCity'),
    arrivalCity: str('arrivalCity'),
    is_round_trip: !bool('isOneWay'),
    departure_date: str('pickupDateAller'),
    departure_time: str('pickupTimeAller'),
    return_date: str('pickupDateRetour'),
    return_time: str('pickupTimeRetour'),
    departAddressAller: str('adressePriseEnChargeDepartAller'),
    arriveeAddressAller: str('adressePriseEnChargeArriveeAller'),
    departAddressRetour: str('adressePriseEnChargeDepartRetour'),
    arriveeAddressRetour: str('adressePriseEnChargeArriveeRetour'),
    clientName: str('clientName'),
    clientEmail: str('clientEmail'),
    clientPhone: str('clientPhone'),
    clientAddress: str('clientAddress'),
    siegeBebes: numOr('siegeBebes', 0),
    animalDeCompagnie: bool('animalDeCompagnie'),
    smallBags: numOr('smallBags', 0),
    largeBags: numOr('largeBags', 0),
    specialRequests: str('specialRequests'),
    payment_method: str('paidBy'),
    employeeId: num('employeeId'),
  };
}
```

**Important :** les noms de champs `FormData` ci-dessus sont une supposition basée sur le pattern d'airport-shuttle. Avant d'éditer, ouvrir `components/bookings/InterCityBookingWizard.tsx` et lire la définition réelle de `interface FormData` (probablement vers la ligne 60-100). Adapter les clés pour qu'elles correspondent **exactement** à celles déclarées localement. Si une clé du DTO n'existe pas dans `FormData`, l'omettre.

- [ ] **Step 4 :** Ajouter le `useEffect` d'hydratation (identique au pattern airport-shuttle) :

```tsx
useEffect(() => {
  if (isEdit && initialData) {
    const mapped = bookingResponseToFormData(initialData);
    setFormData(prev => ({ ...prev, ...mapped }));
  }
}, [isEdit, initialData]);
```

- [ ] **Step 5 :** Ajouter la mutation `updateBooking` :

```tsx
const updateBooking = useMutation({
  mutationFn: (data: Partial<CreateInterCityBookingDto>) => {
    if (!bookingId) throw new Error('bookingId requis en mode edit');
    return api.bookings.interCity.update(bookingId, data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking-detail-page'] });
    toast.success('Reservation mise a jour');
    if (bookingId) router.push(`/tracking/${bookingId}`);
  },
  onError: (err: Error) => {
    toast.error(err.message || 'Erreur lors de la modification');
  },
});
```

- [ ] **Step 6 :** Localiser l'appel à `createBooking.mutate(...)` dans le wizard et le brancher conditionnellement :

```tsx
if (isEdit) {
  updateBooking.mutate(bookingData);
} else {
  createBooking.mutate(bookingData);
}
```

- [ ] **Step 7 :** Adapter le bouton final (label + disabled) avec le même pattern qu'airport-shuttle (Phase 1, Task 1.2, Step 7).

- [ ] **Step 8 :** Adapter le titre de la page wizard (`Reserver un trajet inter-ville` → `Modifier la reservation` en mode edit).

- [ ] **Step 9 :** Conditionner les champs paiement en lecture seule en mode edit (même pattern qu'airport-shuttle, Step 10 de Task 1.2).

- [ ] **Step 10 :** `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 11 :** `npm run lint`.

- [ ] **Step 12 :** Validation manuelle — `/inter-city` (mode create) doit fonctionner exactement comme avant.

- [ ] **Step 13 :** Commit.

```bash
git add components/bookings/InterCityBookingWizard.tsx
git commit -m "feat(inter-city): add edit mode to booking wizard"
```

---

### Task 3.3 : Créer la route d'édition inter-city

**Files:**
- Create: `app/(dashboard)/inter-city/[id]/edit/page.tsx`

- [ ] **Step 1 :** Créer le fichier en copiant **exactement** le contenu de `app/(dashboard)/airport-shuttle/[id]/edit/page.tsx` (Task 1.3) avec ces remplacements :
  1. `EditAirportShuttleBookingPage` → `EditInterCityBookingPage`
  2. `["booking-edit", "airport-shuttle", id]` → `["booking-edit", "inter-city", id]`
  3. `api.bookings.airportShuttle.get(id)` → `api.bookings.interCity.get(id)`
  4. Import : `AirportShuttleBookingWizard` → `InterCityBookingWizard`
  5. JSX du wizard : `<AirportShuttleBookingWizard ... />` → `<InterCityBookingWizard ... />`

- [ ] **Step 2 :** `npx tsc --noEmit`.

- [ ] **Step 3 :** `npm run lint`.

- [ ] **Step 4 :** Validation manuelle complète du flow edit inter-city :
  1. Créer une réservation inter-city aller-retour.
  2. Sur `/tracking/[id]`, cliquer Modifier → arrive sur `/inter-city/[id]/edit`, formulaire pré-rempli.
  3. Modifier les sièges bébé et les bagages, sauvegarder.
  4. DevTools Network → `PUT /v1/bookings/inter-city/compagny/{id}` avec le bon payload.
  5. Détail mis à jour.

- [ ] **Step 5 :** Commit.

```bash
git add "app/(dashboard)/inter-city/[id]/edit/page.tsx"
git commit -m "feat(inter-city): add edit page route"
```

---

## Phase 4 : Hourly-VTC — Extraction + edit mode + route

### Task 4.1 : Extraire le wizard hourly-vtc

**Files:**
- Create: `components/bookings/HourlyVtcBookingWizard.tsx`
- Modify: `app/(dashboard)/hourly-vtc/page.tsx`

- [ ] **Step 1 :** Lire `app/(dashboard)/hourly-vtc/page.tsx` intégralement (~1485 lignes).

- [ ] **Step 2 :** Créer `components/bookings/HourlyVtcBookingWizard.tsx` en copiant, en :
  1. Conservant `'use client'`.
  2. Renommant la fonction en `HourlyVtcBookingWizard`.

- [ ] **Step 3 :** Réduire `app/(dashboard)/hourly-vtc/page.tsx` à :

```tsx
import HourlyVtcBookingWizard from "@/components/bookings/HourlyVtcBookingWizard";

export default function HourlyVtcPage() {
  return <HourlyVtcBookingWizard />;
}
```

- [ ] **Step 4 :** `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 5 :** `npm run lint`.

- [ ] **Step 6 :** Validation manuelle — créer une réservation VTC à l'heure (choisir pays, type véhicule, package, date/heure, adresse), vérifier le flow complet.

- [ ] **Step 7 :** Commit.

```bash
git add components/bookings/HourlyVtcBookingWizard.tsx app/(dashboard)/hourly-vtc/page.tsx
git commit -m "refactor(hourly-vtc): extract wizard into shared component"
```

---

### Task 4.2 : Ajouter le mode edit au wizard hourly-vtc

**Files:**
- Modify: `components/bookings/HourlyVtcBookingWizard.tsx`

- [ ] **Step 1 :** Ajouter l'interface props :

```tsx
import type { BookingResponse } from "@/lib/api";

export interface HourlyVtcBookingWizardProps {
  mode?: 'create' | 'edit';
  bookingId?: number;
  initialData?: BookingResponse;
}
```

- [ ] **Step 2 :** Modifier la signature : `export default function HourlyVtcBookingWizard({ mode = 'create', bookingId, initialData }: HourlyVtcBookingWizardProps = {}) {` puis `const isEdit = mode === 'edit';`.

- [ ] **Step 3 :** Ajouter la fonction de mapping (consulter `CreateVtcHourlyBookingDto` à `lib/api.ts:355-379`) :

```tsx
function bookingResponseToFormData(b: BookingResponse): Partial<FormData> {
  const get = (k: string) => (b as Record<string, unknown>)[k];
  const str = (k: string) => { const v = get(k); return typeof v === 'string' ? v : ''; };
  const num = (k: string) => { const v = get(k); return typeof v === 'number' ? v : null; };
  // scheduledDatetime arrive en ISO ; on le split en date + time pour le formulaire
  const scheduled = str('scheduledDatetime');
  let scheduledDate = '';
  let scheduledTime = '';
  if (scheduled) {
    const d = new Date(scheduled);
    if (!isNaN(d.getTime())) {
      scheduledDate = d.toISOString().slice(0, 10);
      scheduledTime = d.toTimeString().slice(0, 5);
    }
  }
  return {
    country: str('country'),
    vehicleType: str('vehicleType'),
    package: str('package'),
    scheduledDate,
    scheduledTime,
    pickupAddress: str('pickupAddress'),
    pickupAddressLat: num('adressePriseEnChargeLat'),
    pickupAddressLng: num('adressePriseEnChargeLng'),
    clientName: str('clientName'),
    clientEmail: str('clientEmail'),
    clientPhone: str('clientPhone'),
    clientAddress: str('clientAddress'),
    notes: str('notes'),
    payment_method: str('paidBy'),
    employeeId: num('employeeId'),
  };
}
```

**Important :** comme pour inter-city, lire la définition réelle de `interface FormData` du wizard avant d'éditer. Adapter les clés (`scheduledDate`/`scheduledTime` peuvent s'appeler différemment dans le wizard — par exemple `scheduled_date`, `pickup_date`, etc.). Si le wizard utilise une seule clé `scheduledDatetime`, ne pas splitter.

- [ ] **Step 4 :** Ajouter le `useEffect` d'hydratation (même pattern qu'airport-shuttle).

- [ ] **Step 5 :** Ajouter la mutation `updateBooking` :

```tsx
const updateBooking = useMutation({
  mutationFn: (data: Partial<CreateVtcHourlyBookingDto>) => {
    if (!bookingId) throw new Error('bookingId requis en mode edit');
    return api.bookings.vtcHourly.update(bookingId, data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking-detail-page'] });
    toast.success('Reservation mise a jour');
    if (bookingId) router.push(`/tracking/${bookingId}`);
  },
  onError: (err: Error) => {
    toast.error(err.message || 'Erreur lors de la modification');
  },
});
```

- [ ] **Step 6 :** Brancher conditionnellement `createBooking.mutate` / `updateBooking.mutate` au moment de la soumission.

- [ ] **Step 7 :** Adapter le bouton final (label + disabled) selon `isEdit`.

- [ ] **Step 8 :** Adapter le titre (`Reserver un VTC a l'heure` → `Modifier la reservation` en mode edit).

- [ ] **Step 9 :** Conditionner les champs paiement en lecture seule en mode edit.

- [ ] **Step 10 :** `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 11 :** `npm run lint`.

- [ ] **Step 12 :** Validation manuelle — `/hourly-vtc` (mode create) inchangé.

- [ ] **Step 13 :** Commit.

```bash
git add components/bookings/HourlyVtcBookingWizard.tsx
git commit -m "feat(hourly-vtc): add edit mode to booking wizard"
```

---

### Task 4.3 : Créer la route d'édition hourly-vtc

**Files:**
- Create: `app/(dashboard)/hourly-vtc/[id]/edit/page.tsx`

- [ ] **Step 1 :** Créer le fichier en copiant `app/(dashboard)/airport-shuttle/[id]/edit/page.tsx` avec ces remplacements :
  1. `EditAirportShuttleBookingPage` → `EditHourlyVtcBookingPage`
  2. `["booking-edit", "airport-shuttle", id]` → `["booking-edit", "hourly-vtc", id]`
  3. `api.bookings.airportShuttle.get(id)` → `api.bookings.vtcHourly.get(id)`
  4. Import : `AirportShuttleBookingWizard` → `HourlyVtcBookingWizard`
  5. JSX : `<AirportShuttleBookingWizard ... />` → `<HourlyVtcBookingWizard ... />`

- [ ] **Step 2 :** `npx tsc --noEmit`.

- [ ] **Step 3 :** `npm run lint`.

- [ ] **Step 4 :** Validation manuelle complète du flow edit hourly-vtc :
  1. Créer une réservation VTC horaire.
  2. Sur `/tracking/[id]`, cliquer Modifier → `/hourly-vtc/[id]/edit` avec formulaire pré-rempli.
  3. Modifier la date/heure et les notes.
  4. DevTools Network → `PUT /v1/bookings/vtc-hourly/compagny/{id}`.

- [ ] **Step 5 :** Commit.

```bash
git add "app/(dashboard)/hourly-vtc/[id]/edit/page.tsx"
git commit -m "feat(hourly-vtc): add edit page route"
```

---

## Phase 5 : Vérification finale & polish

### Task 5.1 : Vérifications globales

- [ ] **Step 1 :** Depuis la racine, `npx tsc --noEmit` une dernière fois.
  - Attendu : aucune erreur sur l'ensemble du projet.

- [ ] **Step 2 :** `npm run lint` une dernière fois.
  - Attendu : pas de nouvelle erreur introduite par cette feature.

- [ ] **Step 3 :** Régression flow create — créer une réservation de chaque type (airport-shuttle, inter-city, hourly-vtc) et vérifier qu'aucun comportement n'a régressé : confetti, redirection, valeurs par défaut, validation, employés, paiement.

- [ ] **Step 4 :** Régression flow edit — pour chaque type, depuis `/tracking/[id]`, modifier au moins 3 champs distincts, sauvegarder, recharger la page de détail, vérifier la persistance.

- [ ] **Step 5 :** Edge cases :
  1. `/airport-shuttle/abc/edit` (id non numérique) → message "Identifiant invalide".
  2. `/airport-shuttle/999999/edit` (id inexistant) → message "Reservation introuvable".
  3. Réservation `paid` → bouton Modifier absent.
  4. Réservation `cancelled` → bouton Modifier absent.
  5. Réservation `visa_assistance` (ou `ACTIVITE`/`LOGEMENT`/`FLOTTE`) → bouton Modifier absent.

- [ ] **Step 6 :** Si tout passe, pas de commit nécessaire.

---

## Récapitulatif des commits

À la fin de l'implémentation, l'historique attendu (relatif à `8002174`) est :

```
1. docs: spec for editing company bookings              (déjà créé)
2. refactor(airport-shuttle): extract wizard into shared component
3. feat(airport-shuttle): add edit mode to booking wizard
4. feat(airport-shuttle): add edit page route
5. feat(tracking): wire edit button to dedicated edit routes
6. refactor(inter-city): extract wizard into shared component
7. feat(inter-city): add edit mode to booking wizard
8. feat(inter-city): add edit page route
9. refactor(hourly-vtc): extract wizard into shared component
10. feat(hourly-vtc): add edit mode to booking wizard
11. feat(hourly-vtc): add edit page route
```

Soit 10 commits d'implémentation après le spec.
