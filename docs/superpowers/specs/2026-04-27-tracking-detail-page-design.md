# Page détail commande (tracking) — design

**Date** : 2026-04-27
**Statut** : design approuvé
**Référence visuelle** : pattern e-commerce 2 colonnes (info à gauche, récap sticky à droite)

## Contexte

La page `/tracking` affiche les commandes dans un tableau. Cliquer sur "Détails" ouvre actuellement une **modal** (`tracking/page.tsx` lignes 641-1004) avec ~360 lignes de JSX conditionnel par `serviceType`. La modal cache de l'information (max-h, scroll), et n'est pas partageable par URL.

## Objectifs

1. Remplacer la modal par une **page entière** `/tracking/[id]`
2. Afficher **toutes** les informations disponibles, organisées en sections claires
3. Layout responsive : 2 colonnes desktop, 1 colonne mobile
4. Conserver le bouton "Payer cette réservation" (déplacé dans la nouvelle page)
5. URL partageable

## Non-objectifs

- Pas de modification du tableau de listing (sauf l'action "Détails")
- Pas de réécriture de la logique de fetch
- Pas de migration des modals "ServiceReservation" (logement, hotel, activite, vehicule) qui ont déjà leurs propres pages détail dédiées

## Architecture

### Fichiers

| Fichier | Action |
|---|---|
| `app/(dashboard)/tracking/[id]/page.tsx` | **Créer** — la nouvelle page |
| `app/(dashboard)/tracking/page.tsx` | **Modifier** — supprimer la modal détail, transformer "Détails" en lien `router.push` |

### Routing

URL : `/tracking/[id]?type=<serviceType>`

Le `type` query param est nécessaire pour choisir le bon endpoint API (`bookings.get`, `travelDocuments.get`, ou `serviceReservations.get`). Reproduit la logique conditionnelle existante de la modal (page actuelle ligne 232-240).

### Fetch

Dans `[id]/page.tsx` :

```ts
const id = parseInt(params.id, 10);
const serviceType = searchParams.get('type') || '';
const isTravelDoc = serviceType === 'visa_assistance';
const isServiceRes = ['ACTIVITE', 'LOGEMENT', 'FLOTTE'].includes(serviceType);

const { data, isLoading, error } = useQuery({
  queryKey: ['booking-detail', id, serviceType],
  queryFn: async () => {
    if (isTravelDoc) return api.travelDocuments.get(id);
    if (isServiceRes) return api.serviceReservations.get(id);
    return api.bookings.get(id);
  },
  enabled: !isNaN(id),
});
```

### Layout

Desktop (≥ lg):
- Hero header (largeur full)
- Grille `grid-cols-12 gap-6` :
  - Colonne gauche : `col-span-12 lg:col-span-8`
  - Colonne droite : `col-span-12 lg:col-span-4` avec `lg:sticky lg:top-24`

Mobile (< lg) : tout empilé verticalement.

### Sections

**Hero header (full width)** :
- Bouton "← Retour" (router.back())
- Titre "Détail réservation" + booking code/reference
- Trois badges en ligne : service type, status, paymentStatus

**Colonne gauche (cartes blanches `rounded-2xl shadow-sm border-slate-100`)** :

1. **Trajet / Service**
   - Si `airport_shuttle` ou `inter_city` : Aller (date/heure, adresses, vol, passagers) + Retour (si `isOneWay === false || pickupDateRetour`)
   - Si `vtc_hourly` : date/heure scheduledDatetime, adresse PEC, forfait, type véhicule
   - Si `visa_assistance` : pays/ville départ/destination, dates, motif, services (vol/hôtel/assurance), passeport, nationalité, naissance
   - Sinon : section "Informations" générique avec `departureDate`, `passengers`, etc.

2. **Client**
   - Nom, téléphone (avec lien `tel:`), email (avec lien `mailto:`), adresse client
   - Badge "Payé par : entreprise/client"

3. **Notes & demandes spéciales** (si `notes`, `specialRequests`, `noteSpeciale`, `commentaire`)

4. **Toutes les données** (section dépliable `<details>`) — affiche tous les champs non-vides du booking sous forme de `<dl>` avec key/value, garantit que rien n'est caché. Permet l'audit complet.

**Colonne droite (sticky)** :

5. **Carte Total + Paiement**
   - Total prix en grand (`text-3xl font-black`)
   - Statut paiement (badge vert "Payé" / jaune "Non payé")
   - Bouton "Payer cette réservation" (`variant="gradient"`) — visible si conditions remplies (status confirmed/completed + paymentStatus !== paid + paidBy !== client)
   - Mode de paiement
   - Référence de paiement (si présente)
   - Remise (si `discountAmount > 0`)
   - Payé par

6. **Carte Métadonnées**
   - Créé le, Modifié le
   - Canal (badge)
   - Tag (badge)
   - Code entreprise

### Modal de paiement

Le modal `showPayDialog` (lignes 1006-1046 de la page actuelle) est **dupliqué dans `[id]/page.tsx`** pour rester self-contained. Pas de prop drilling ni de query param hack.

### Listing : transformation du bouton

Dans `app/(dashboard)/tracking/page.tsx` :

```tsx
// Avant
<button onClick={(e) => { e.stopPropagation(); openDetail(booking); }}>
  Details
</button>

// Après
<Link
  href={`/tracking/${booking.id}?type=${booking.serviceType || ''}`}
  onClick={(e) => e.stopPropagation()}
  className="text-[#FF7842] font-bold text-sm hover:underline underline-offset-4"
>
  Details
</Link>
```

Et : suppression de `selectedBooking`, `detailOpen`, `setSelectedBooking`, `setDetailOpen`, `openDetail`, du `useQuery` du detail, et de tout le `<Dialog open={detailOpen}>` (lignes 641-1004).

### Style

- Cartes : `bg-white rounded-2xl shadow-sm border border-slate-100 p-6`
- Section title : `text-sm font-bold text-slate-500 uppercase tracking-wider mb-4`
- Field label : `text-xs text-slate-500`
- Field value : `text-sm font-medium text-slate-800`
- Hero gradient bandeau : `gradient-subito text-white p-6 rounded-2xl` pour le header

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| URL accédée sans `type` query param | Fallback sur `api.bookings.get(id)` (cas le plus courant) |
| `id` non numérique dans URL | Parse + check `isNaN`, afficher état d'erreur |
| Booking introuvable (404) | État erreur avec message + bouton retour |
| Champs custom des serviceType non documentés | Section "Toutes les données" en `<details>` qui itère sur l'objet, ne rien cacher |
| Loss de l'état "scroll position" du listing au retour | `router.back()` préserve naturellement la position |

## Vérification

- `npx tsc --noEmit` passe
- `npm run lint` passe
- Naviguer sur `/tracking`, cliquer "Détails" sur n'importe quelle ligne → la nouvelle page s'ouvre avec toutes les infos
- Vérifier les 4 types : `airport_shuttle`, `inter_city`, `vtc_hourly`, `visa_assistance`
- Cliquer "Payer cette réservation" → modal de paiement fonctionnel
- Cliquer "Retour" → revient sur la liste à la même position
- Tester sur mobile : layout 1 colonne
