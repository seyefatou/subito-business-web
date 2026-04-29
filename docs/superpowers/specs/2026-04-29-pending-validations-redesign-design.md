# Page « Prises en charge » — refonte design

**Date** : 2026-04-29
**Statut** : design approuvé
**Référence visuelle** : pattern listing récent (`tickets/page.tsx`, `airport-shuttle`, `service-reservations/activite`)

## Contexte

`app/(dashboard)/pending-validations/page.tsx` (506 lignes) affiche les demandes de prise en charge en attente sous forme de **tableau dense à 7 colonnes**. Le style date d'avant l'alignement design des autres pages (header simple, gradient-subito bandeau, cartes statistiques amber/slate/orange, table classique). Les pages récentes (tickets, navette, activité, logement) suivent toutes une grammaire commune : hero header avec breadcrumb pill, filtres pill arrondis, listings en cartes rounded-3xl avec motion d'entrée, palette `#E04A1F` / `#ffdbd0` / `#171c1f` / `#585e6c` / `#f0f4f8`, police Manrope.

## Objectifs

1. Aligner visuellement la page sur le design language récent (tickets, navette)
2. Remplacer le tableau par une **liste de cartes** plus aérée, mieux adaptée aux 3 actions par ligne
3. Restyler les dialogs (Détail, Refus) dans la même grammaire
4. Ne **rien** changer côté data flow, mutations, types, endpoints

## Non-objectifs

- Pas de modification du fetch ni des endpoints (`api.bookings.paymentRequests`, `api.travelDocuments.paymentRequests`)
- Pas de modification des mutations (`approve`, `reject`, `pay`)
- Pas d'ajout de pagination (la liste reste paginée côté API en `limit: 100` comme aujourd'hui)
- Pas de changement de routing (la page reste à `/pending-validations`)

## Architecture

### Fichiers

| Fichier | Action |
|---|---|
| `app/(dashboard)/pending-validations/page.tsx` | **Réécriture du JSX** (logique conservée) |

Pas de nouveau fichier, pas de nouveau composant extrait. La page reste self-contained.

### Layout

Container : `max-w-6xl mx-auto -m-2 md:-m-4 lg:-m-6` (idem tickets).

Sections empilées dans cet ordre :

1. Hero header
2. Bandeau de stats (3 cartes)
3. Barre filtres + recherche
4. Compteur de résultats
5. Liste de cartes (ou empty state)

### Section 1 — Hero header

```
Finances / Prises en charge      ← breadcrumb : `text-xs font-bold uppercase tracking-widest`,
                                    `text-slate-400` puis `text-[#E04A1F]` pour le segment courant
Prises en charge                 ← h1 Manrope `text-3xl md:text-4xl font-extrabold`, `text-[#171c1f]`
Demandes en attente de validation — quand un client réserve et demande à l'entreprise de payer
                                    ← p `text-[#585e6c] font-medium`
```

Pas de bouton CTA principal (aucune création depuis cette page).

### Section 2 — Bandeau stats (3 cartes)

Grille `grid-cols-1 md:grid-cols-3 gap-4`. Chaque carte `rounded-3xl border border-slate-100 shadow-sm p-5 bg-white` avec icône en cercle accent, label uppercase tracking-widest, chiffre en gros bold Manrope.

| Stat | Icône | Cercle bg | Couleur valeur |
|---|---|---|---|
| En attente (count) | `Clock` | `bg-amber-100 text-amber-700` | `text-amber-600` |
| Montant total (FCFA) | `Banknote` | `bg-[#f0f4f8] text-[#585e6c]` | `text-[#171c1f]` |
| À traiter (count) | `CreditCard` | `bg-[#ffdbd0] text-[#E04A1F]` | `text-[#E04A1F]` |

Le calcul reste identique au code actuel (`orders.length`, somme `o.amount`).

### Section 3 — Filtres

Carte `bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-5` contenant :

- **Recherche** (flex-1) : input `pl-11 h-11 rounded-xl border-slate-200` avec icône `Search` à gauche. Filtre côté client sur `clientName`, `bookingCode`, `id`.
- **Pills filtre type** :
  - `Toutes` (default)
  - `Réservations` (`type === 'booking'`)
  - `Documents` (`type === 'travel-document'`)

Pills actives : `bg-[#E04A1F] text-white shadow-md`. Inactives : `bg-[#f0f4f8] text-[#585e6c] hover:bg-slate-200`. Forme `rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest`.

État local : `searchQuery: string`, `typeFilter: 'all' | 'booking' | 'travel-document'`.

### Section 4 — Compteur

```tsx
<p className="text-xs text-[#585e6c] font-semibold uppercase tracking-widest">
  {filtered.length} demande{filtered.length > 1 ? 's' : ''}
</p>
```

Aligné à droite, marge basse.

### Section 5 — Liste en cartes

Chaque carte = `motion.div` avec `initial={{ opacity:0, y:10 }}, animate={{ opacity:1, y:0 }}, transition={{ delay: idx * 0.03 }}`.

Container : `bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#ffdbd0] transition-all p-5 md:p-6`.

**Layout interne** (flex md:items-center gap-4 md:gap-6, wrap mobile) :

```
┌───┐  #REF · Réservation [En attente]                          12 500 FCFA
│ ✈ │  Navette Aéroport
└───┘  👤 Mamadou Diop · 📞 +221 77 ... · 📅 14 mars 2026
       ─────────────────────────────────────────────────────────
       [ Détails ]   [ ✓ Approuver ]   [ ✗ Refuser ]
```

Détails par bloc :

- **Cercle icône** (gauche, `w-12 h-12 rounded-2xl bg-[#ffdbd0] flex items-center justify-center shrink-0`) :
  - `Plane` si `serviceType === 'airport_shuttle'`
  - `Car` si `vtc_hourly` ou `inter_city`
  - `FileText` si `travel-document` ou `visa_assistance`
  - `MapPin` sinon (fallback)
  - Icône `text-[#E04A1F]`
- **Bloc texte central** (`flex-1 min-w-0`) :
  - Ligne 1 : `#REF` (mono petit slate-400) · label type uppercase tracking-widest · `<StatusPill>` amber « En attente »
  - Ligne 2 : titre service (Manrope `text-base md:text-lg font-extrabold text-[#171c1f]`)
  - Ligne 3 : méta (icône + texte) — client, téléphone (si présent), email (si présent et pas de téléphone), date — séparateurs `·`
- **Bloc montant** (droite, à partir de `md:`) :
  - `text-[#E04A1F] font-extrabold text-xl md:text-2xl` Manrope
  - Sous-label `text-xs uppercase tracking-widest text-[#585e6c]` : « Montant »
- **Ligne actions** (séparateur `border-t border-slate-100 mt-4 pt-4`, `flex justify-end gap-2 flex-wrap`) :
  - `Détails` : `variant="ghost"` ou outline `border-slate-200 text-[#585e6c]`, icône `Eye`
  - `Approuver` : `bg-[#E04A1F] hover:bg-[#C8330F] text-white shadow-lg shadow-[#E04A1F]/20`, icône `CheckCircle2`
  - `Refuser` : outline rouge `border-red-200 text-red-600 hover:bg-red-50`, icône `XCircle`
  - Tous `rounded-xl py-2 px-4 text-sm font-bold gap-2`, `disabled:opacity-50` quand mutation en vol

`StatusPill` helper local (réutilisé tel quel du pattern tickets) :

```tsx
function StatusPill({ statut }: { statut: string }) {
  const cfg = { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
      <Clock className="w-3 h-3 mr-1" /> {cfg.label}
    </span>
  );
}
```

(Tous les items sont en `paymentStatus = pending_company_approval`. Pas besoin de gérer d'autres états ici.)

### Empty state (si `filtered.length === 0`)

```tsx
<div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
  <div className="w-20 h-20 rounded-full bg-[#ffdbd0] flex items-center justify-center mb-4">
    <Inbox className="w-10 h-10 text-[#E04A1F]" />
  </div>
  <p className="font-bold text-[#171c1f] text-lg" style={MANROPE}>
    Aucune demande en attente
  </p>
  <p className="text-sm text-[#585e6c] mt-1 max-w-md text-center">
    Les demandes apparaissent ici quand un client réserve et choisit « paiement par l&apos;entreprise ».
    Retrouvez l&apos;historique de toutes vos commandes dans <Link href="/tracking" className="text-[#E04A1F] font-bold hover:underline">Suivi des commandes</Link>.
  </p>
</div>
```

### Loading state

```tsx
<div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
  <Loader2 className="w-10 h-10 animate-spin text-[#E04A1F]" />
</div>
```

### Detail dialog (restyle)

`DialogContent` : `sm:max-w-2xl rounded-3xl`.

Structure :

- `DialogHeader` : titre Manrope `text-2xl font-extrabold text-[#171c1f]` « Détails de la demande » + `DialogDescription` orange-grise
- Grille top : référence (slate-50 rounded-2xl) + montant (orange `bg-[#ffdbd0]` rounded-2xl, valeur `text-[#E04A1F] text-2xl font-extrabold`)
- Section « Service » : `bg-[#f0f4f8] rounded-2xl p-4 space-y-3` avec label uppercase tracking-widest et icônes
- Section « Client » : idem, infos avec `Phone`/`Mail`/`User`
- Section « Détails de la réservation » (raw) : itère comme aujourd'hui, mais wrapper `bg-[#f0f4f8] rounded-2xl`, key/value en `text-sm`, label slate, valeur `text-[#171c1f] font-semibold`
- Footer actions : `Fermer` (outline slate), `Approuver` (orange), `Refuser` (outline rouge) — boutons `rounded-xl`

### Reject dialog (restyle léger)

`DialogContent rounded-3xl`, header Manrope, textarea `rounded-xl border-slate-200`, footer :
- `Annuler` outline slate
- `Confirmer le refus` `bg-red-600 hover:bg-red-700 rounded-xl py-2.5 px-4 font-bold`

## Constantes / helpers

À ajouter en haut du fichier :

```tsx
const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

const TYPE_FILTERS: { value: 'all' | 'booking' | 'travel-document'; label: string }[] = [
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
```

`Plane`, `Car`, `FileText` sont déjà importés ou à ajouter dans le bloc `lucide-react`.

## Stack & dépendances

Ajouts d'imports : `framer-motion` (pour `motion.div`), `Link` de `next/link` (pour empty state), `Hash` (optionnel, pour la référence), `FileText` (icône travel-document), `Search` (icône recherche), `Input` (`@/components/ui/input`).

Aucun nouveau package npm.

## Vérification

- `npx tsc --noEmit` passe
- `npm run lint` passe
- Navigation `/pending-validations` :
  - Cas avec données : 3 stats correctes, cartes affichées avec montant et bonnes icônes par service, hover orange clair
  - Recherche : taper un nom client filtre la liste
  - Pills : `Réservations` ne montre que les bookings, `Documents` que les travel-docs
  - Bouton `Approuver` → toast succès, item disparaît
  - Bouton `Détails` → dialog stylé en orange/slate, sections lisibles
  - Bouton `Refuser` (depuis carte ou dialog) → reject dialog stylé, confirmation enlève l'item
  - Mobile (< md) : carte se réorganise verticalement, montant passe en haut ou sous le titre, actions en pleine largeur
- Empty state : visible quand aucun item ou filtres trop restrictifs

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Régression sur les mutations (approve/reject/pay) | Logique mutation **non touchée**, juste le JSX appelant |
| Items avec `serviceType` inconnu | Fallback icône `MapPin` + label brut (`replace(/_/g, ' ')`) |
| Item booking sans téléphone ni email | Méta affiche client seul ; ne casse pas |
| Filtre client-side avec liste vide | Empty state distingue « aucune demande » de « rien ne match les filtres » via le `searchQuery`/`typeFilter` actifs (message neutre conservé, le contexte reste clair) |
