# Edit Company Bookings — Design

## Contexte

L'API expose des endpoints `PUT` pour modifier les réservations entreprise :

- `PUT /v1/bookings/airport-shuttle/compagny/{id}`
- `PUT /v1/bookings/inter-city/compagny/{id}`
- `PUT /v1/bookings/vtc-hourly/compagny/{id}`
- `PUT /v1/bookings/visa-assistance/compagny/{id}`

Les wrappers TypeScript existent déjà dans `lib/api.ts` (`api.bookings.airportShuttle.update`, etc.). Aucune UI ne consomme ces endpoints aujourd'hui : on peut créer et consulter une réservation entreprise, mais pas la modifier.

## Objectif

Permettre à un utilisateur compagnie de **modifier** une réservation depuis la page de détail `/tracking/[id]`, en réutilisant le wizard de création (multi-étapes) de chaque type de réservation.

## Périmètre

**Inclus :**

- `airport_shuttle` (wizard existant à `app/(dashboard)/airport-shuttle/page.tsx`)
- `inter_city` / `intercity` (wizard existant à `app/(dashboard)/inter-city/page.tsx`)
- `vtc_hourly` (wizard existant à `app/(dashboard)/hourly-vtc/page.tsx`)

**Exclus :**

- `visa_assistance` : pas de wizard de création front à ce jour. Ajouter l'édition demanderait d'abord de construire un formulaire de création. À traiter dans un ticket séparé.
- Modification du paiement : le flow `pay-individual` (Bictorys) existe déjà sur `/tracking`, on n'y touche pas.
- Annulation : déjà gérée via `api.bookings.cancel(id)`.

## Architecture

### Extraction des wizards en composants partagés

Aujourd'hui, chaque page wizard mélange shell de page (titre, layout) et logique de wizard (steps, état, mutations). On extrait le wizard en composant réutilisable.

```
components/bookings/
├── AirportShuttleBookingWizard.tsx   # nouveau, ~1900 lignes (extrait de la page)
├── InterCityBookingWizard.tsx         # nouveau, ~2080 lignes
└── HourlyVtcBookingWizard.tsx         # nouveau, ~1420 lignes
```

**Props publiques de chaque wizard :**

```ts
interface BookingWizardProps {
  mode: 'create' | 'edit';
  bookingId?: number;          // requis si mode === 'edit'
  initialData?: BookingResponse; // requis si mode === 'edit'
}
```

Les pages existantes deviennent de simples shells :

```tsx
// app/(dashboard)/airport-shuttle/page.tsx
export default function AirportShuttlePage() {
  return <AirportShuttleBookingWizard mode="create" />;
}
```

### Nouvelles routes d'édition

```
app/(dashboard)/
├── airport-shuttle/[id]/edit/page.tsx   # nouveau
├── inter-city/[id]/edit/page.tsx        # nouveau
└── hourly-vtc/[id]/edit/page.tsx        # nouveau
```

Chaque page d'édition :

1. Lit `id` depuis `useParams()`.
2. Charge la réservation via `api.bookings.<type>.get(id)` avec `useQuery`.
3. Pendant le chargement : skeleton ou spinner.
4. En cas d'erreur (404, accès refusé) : message d'erreur + lien retour vers `/tracking/[id]`.
5. Une fois chargée : rend `<XxxBookingWizard mode="edit" bookingId={id} initialData={booking} />`.

### Hydratation du formulaire

Chaque wizard expose une fonction interne `bookingResponseToFormData(booking: BookingResponse): FormData` qui convertit la réponse API (forme aplatie, mix snake/camel) vers la `FormData` interne du wizard.

Mapping clé pour chaque type :

- **Airport shuttle** : `pickupDateAller` → `departure_date`, `pickupTimeAller` → `departure_time`, `adressePriseEnChargeAller` → `address`, etc.
- **Inter-city** : champs `departureCity`/`arrivalCity` + adresses départ/arrivée aller/retour.
- **VTC hourly** : `scheduledDatetime` (split date+heure), `package`, `vehicleType`, `pickupAddress`.

Si un champ est manquant dans `BookingResponse` (clé optionnelle absente), on retombe sur la valeur initiale (`initialFormData`) du wizard.

### Mode edit : différences de comportement

À l'intérieur du wizard, `mode === 'edit'` modifie :

| Aspect | `create` | `edit` |
|---|---|---|
| Titre de page | "Reserver une navette" | "Modifier la reservation" |
| Bouton final | "Confirmer - X FCFA" | "Enregistrer les modifications" |
| Mutation | `api.bookings.create<Type>(data)` | `api.bookings.<type>.update(bookingId, data)` |
| Confetti en succès | oui | non |
| Toast en succès | "Reservation creee" | "Reservation mise a jour" |
| Redirection succès | `/tracking` | `/tracking/<bookingId>` |
| Champs paiement (étape paiement) | éditables | lecture seule (badge informationnel) |

**Champs paiement en lecture seule :** `paidBy`, `paymentMethod`, `companyCode`. Le règlement déjà initié ne doit pas être modifié via le PUT de réservation. Si l'utilisateur veut changer le mode de paiement, il passe par le flow `pay-individual` ou annule + recrée.

### Bouton "Modifier" sur `/tracking/[id]`

Ajouté dans la zone d'actions de la page de détail.

```tsx
const editableTypes = ['airport_shuttle', 'inter_city', 'intercity', 'vtc_hourly'];
const editableStatuses = ['pending', 'confirmed'];

const canEdit =
  editableTypes.includes(booking.serviceType ?? '') &&
  editableStatuses.includes(booking.status ?? '');

// route slug
const editSlug = {
  airport_shuttle: 'airport-shuttle',
  inter_city: 'inter-city',
  intercity: 'inter-city',
  vtc_hourly: 'hourly-vtc',
}[booking.serviceType ?? ''];

{canEdit && editSlug && (
  <Button onClick={() => router.push(`/${editSlug}/${booking.id}/edit`)}>
    Modifier
  </Button>
)}
```

**Statuts qui rendent le bouton invisible :** `in_progress`, `completed`, `cancelled`, `rejected`, `paid`, `processing`, `deleted`. Une fois la course en cours ou terminée, l'édition n'a plus de sens métier.

## Flux utilisateur

```
/tracking
   │
   ▼ clic sur une réservation
/tracking/[id]
   │
   ▼ clic "Modifier" (visible si pending/confirmed et type supporté)
/airport-shuttle/[id]/edit  (ou /inter-city, /hourly-vtc)
   │
   ▼ chargement de la réservation, hydratation du formulaire
Wizard pré-rempli, étape 1
   │
   ▼ navigation libre entre étapes
Étape paiement (champs paiement en lecture seule)
   │
   ▼ clic "Enregistrer les modifications"
PUT /v1/bookings/<type>/compagny/{id}
   │
   ├─ succès → toast + redirect /tracking/[id]
   └─ erreur → toast erreur, formulaire ouvert
```

## Gestion d'erreurs

- **Réservation introuvable (404) :** page d'édition affiche un message "Reservation introuvable" avec un lien vers `/tracking`.
- **Statut non éditable côté serveur :** si l'API rejette le PUT (ex. statut changé entre-temps), le toast d'erreur affiche le message du backend et la page reste ouverte.
- **Validation côté formulaire :** identique au mode create. Un wizard partage les mêmes règles dans les deux modes.

## Hors-périmètre / risques

1. **Refactor lourd :** extraire 3 wizards de ~1500-2000 lignes chacun est un changement structurel. Risque de régression sur le flow de création. Mitigation : tests manuels du flow create avant et après extraction (Cf. plan de validation).
2. **Visa-assistance :** intentionnellement exclu. Si le besoin est confirmé, ouvrir un ticket séparé pour construire create + edit.
3. **Champs imbriqués :** la `BookingResponse` mélange champs aplats et imbriqués (`[key: string]: unknown`). Le mapping back→formData peut perdre des champs si l'API a évolué. Mitigation : logger les clés inattendues en dev.

## Plan de validation manuelle

Pas de framework de tests automatisés dans ce projet (cf. `MEMORY.md`). Validation par checks TypeScript + lint + scénarios manuels :

1. `npx tsc --noEmit` passe sans erreur sur les nouveaux fichiers.
2. Lint passe.
3. **Régression création** (3 types) : créer une réservation de chaque type — le flow doit être identique à avant l'extraction.
4. **Édition** (3 types) : depuis `/tracking/[id]`, modifier la date, l'adresse, le nombre de passagers/notes ; vérifier que le PUT est envoyé avec le bon payload (DevTools Network) et que le détail reflète la mise à jour.
5. **Bouton Modifier caché** : ouvrir une réservation `paid` ou `cancelled`, vérifier l'absence du bouton.
6. **Type non supporté** : ouvrir une réservation `visa_assistance` ou un service-reservation (`ACTIVITE`/`LOGEMENT`/`FLOTTE`), vérifier l'absence du bouton.
7. **Réservation introuvable** : naviguer manuellement vers `/airport-shuttle/999999/edit`, vérifier le message d'erreur.

## Découpage en phases d'implémentation

(Détaillé dans le plan d'implémentation suivant.)

1. **Phase 1 — Extraction d'un wizard** (airport-shuttle d'abord, le plus simple). Vérifier que le flow create marche toujours.
2. **Phase 2 — Page d'édition airport-shuttle + bouton Modifier sur `/tracking/[id]`.** Validation du flow edit complet sur 1 type.
3. **Phase 3 — Extension à inter-city et hourly-vtc** (extraction + page edit).
4. **Phase 4 — Polish** : libellés, états de chargement, gestion 404.
