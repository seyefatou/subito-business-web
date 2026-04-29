# Refonte design — Pages détail Activité & Logement

**Date** : 2026-04-29
**Branche** : aida
**Pages cibles** :
- `app/(dashboard)/service-reservations/activite/[id]/page.tsx`
- `app/(dashboard)/service-reservations/logement/[id]/page.tsx`

## Contexte

Les pages détail actuelles sont fonctionnelles mais visuellement génériques : enchaînement de cards `rounded-2xl border border-slate-200`, peu d'animations, hero modeste, hiérarchie typographique uniforme. Elles ne reflètent pas la qualité visuelle des pages récemment retravaillées (assurance, dashboard) qui utilisent les tokens de marque Subito (gradient orange, framer-motion, micro-interactions).

L'objectif est une refonte **complète** orientée *fiche produit éditoriale premium*, avec un template partagé entre les deux pages mais des variations adaptées à chaque type de contenu.

## Objectifs

1. Créer une expérience de consultation distinctive et premium qui valorise le produit (logement / activité-circuit)
2. Réutiliser et amplifier les tokens de marque Subito (gradient `#FF7842 → #DC3F1A`, slate, animations framer-motion)
3. Conserver la cohérence avec le reste du dashboard (sidebar collapsible, container, typographie shadcn)
4. Optimiser la conversion via une `ReserveCard` sticky desktop qui guide vers le flow de réservation
5. Préserver toutes les fonctionnalités existantes (galerie, avis paginés, retour vers `service-reservations` avec query params, CTA `Réserver` qui passe l'ID au flow)

## Non-objectifs

- Aucune modification des endpoints API (`api.circuits.getPublic`, `api.activites.getPublic`, `api.logements.getPublic`, `api.avis.*`)
- Aucun nouveau champ de données qui n'est pas déjà fourni par les types `Circuit`, `Activite`, `Logement`, `AvisResponse`
- Pas de vrai date picker fonctionnel dans la `ReserveCard` (champs read-only visuels qui mènent au flow existant)
- Pas de refonte du flow de réservation lui-même (`service-reservations/page.tsx`)

## Décisions de design

### Architecture globale

- **Container** : `max-w-7xl mx-auto px-4` (élargi depuis l'actuel `max-w-5xl` pour permettre 2 colonnes confortables)
- **Layout desktop (≥ 1024px / `lg:`)** : grille `lg:grid-cols-12 gap-8`
  - Hero pleine largeur (col-span-12), suivi de :
  - Colonne gauche `lg:col-span-8` — narratif scrollable
  - Colonne droite `lg:col-span-4` — `ReserveCard` sticky `top-24`
  - Section avis pleine largeur (col-span-12) en bas, séparée par `mt-16`
- **Layout mobile/tablet (< 1024px)** : stack vertical, `ReserveCard` devient bottom-bar fixe (pattern actuel conservé)
- **Spacing** : `space-y-12` entre sections de la colonne narrative ; séparateurs minimalistes (trait fin slate-200 ou pull-out chiffré)

### Hero immersif

- **Dimensions** : `h-[28rem] md:h-[32rem]`, `rounded-3xl overflow-hidden`
- **Image** : `object-cover` plein cadre
- **Overlays empilés** :
  - Gradient sombre `bg-gradient-to-t from-black/80 via-black/30 to-transparent` (lisibilité du texte)
  - Touche orange Subito subtile en coin haut-droit : radial gradient `from-orange-500/30 to-transparent` (rappel marque sans étouffer)
- **Contenu en bas du hero** :
  - Gauche : badge type ("Hôtel · 5★" / "Circuit" / "Activité") + titre H1 `text-3xl md:text-4xl font-bold text-white` + ligne ville avec `MapPin`
  - Droite : prix en `text-3xl font-bold text-white` + unité (`/nuit`, `/pers.`) en `text-sm text-white/80`
- **Carrousel** :
  - Flèches glassmorphism `w-10 h-10 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25` avec icônes blanches
  - Indicateur en pilule centrée en bas : dots `w-1.5 h-1.5` avec dot actif élargi `w-6 bg-white` (transition smooth)
- **Miniatures** : déplacées sous le hero dans une bande `bg-slate-50 rounded-2xl p-3` séparée, scroll horizontal
- **Bouton retour** : flottant en haut-gauche du hero (cercle glassmorphism + flèche), remplace la barre de retour actuelle

### Colonne narrative (gauche)

**Bloc identité** (juste sous hero/miniatures, pleine largeur de la colonne) :
- Sous-ligne "Proposé par {partner.nomPartner}" + mini-logo rond du partner (logement uniquement)
- Adresse complète avec `MapPin` orange
- Badges secondaires (catégorie, statut) en pills slate-100

**Stats-key en pull-out horizontal** (remplace la grille de cards "Caractéristiques" / "Informations pratiques") :
- Rangée flex avec séparateurs verticaux fins `border-l border-slate-200`
- Chiffres `text-3xl font-bold text-slate-900` + label dessous `text-xs uppercase tracking-wide text-slate-500`
- 3 à 4 stats selon disponibilité dans les données
- Counter animé (0 → valeur) à l'entrée via framer-motion

**Description** :
- Typographie généreuse : `text-base leading-relaxed text-slate-700`
- Première lettre en lettrine (drop cap) `first-letter:text-5xl first-letter:font-bold first-letter:text-orange-500 first-letter:mr-2 first-letter:float-left first-letter:leading-none`
- `whitespace-pre-line` conservé

**Sections variables** (introduites uniformément) :
- Titre de section : `text-sm font-semibold uppercase tracking-wider text-orange-600` + trait orange `w-6 h-0.5 bg-orange-500` en dessous
- Contenu : listes/chips épurées sur fond blanc, plus de boîtes colorées multi-couleurs
- Sections gérées : équipements (groupés par catégorie pour logement), inclus/non-inclus (activité), lieux proches, règles de la maison, instructions d'accès, politique d'annulation

**Politique d'annulation** : bandeau `bg-slate-50` simple avec icône `CalendarX` (plus de bandeau ambre).

**Instructions d'accès** (logement uniquement) : bandeau sans border, fond `bg-blue-50/50`, trait gauche `border-l-4 border-blue-500`, icône `Navigation`.

### ReserveCard sticky (colonne droite, desktop)

- **Container** : `rounded-2xl border border-slate-200 bg-white shadow-sm sticky top-24 p-6 space-y-5`
- **En-tête** : prix `text-3xl font-bold text-slate-900` + unité ; sous-ligne `★ 4.8 · 24 avis` (si avis)
- **Champs dates indicatifs** : grille 2 colonnes avec border interne, read-only, `cursor-pointer` qui mène au flow de réservation
  - Logement : "Arrivée" / "Départ"
  - Activité : "Date" / "Participants"
- **Mini résumé** : ligne flex avec icônes (capacité, durée, étoiles) selon le type
- **Trait séparateur** : `border-t border-slate-100`
- **CTA principal** : bouton large pleine largeur `gradient-subito text-white border-0 h-12` "Réserver"
- **CTA secondaire** : bouton outline "Annuler" pleine largeur
- **Footer** : ligne réassurance `text-xs text-slate-500` avec icône `Shield` ("Annulation flexible · Paiement sécurisé")

### Bottom-bar mobile (< 1024px)

- Pattern actuel conservé : `fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-4`
- Affiche : type + titre tronqué + prix à gauche, boutons "Annuler" + "Réserver" à droite
- `gradient-subito` sur le CTA principal

### Section Avis (pleine largeur, en bas)

- Container : `mt-16 bg-slate-50/50 rounded-3xl p-8`
- **En-tête en grille 2 colonnes** :
  - Gauche : note globale `text-6xl font-bold text-slate-900`, étoiles dorées dessous, sous-titre `{total} avis`
  - Droite : grille 2x2 des moyennes par critère (Service, Prestataire, Qualité/Prix, Ponctualité), chaque ligne avec label + mini-bar de progression orange (`bg-orange-500`) + valeur
- **Liste des avis** : grille `md:grid-cols-2 gap-4`, chaque avis :
  - Card blanche `rounded-2xl p-5 border border-slate-100`
  - Guillemet décoratif `Quote` orange en haut-gauche
  - Étoiles + nom client + date
  - Commentaire `text-slate-700`
  - Réponse partenaire : `border-l-2 border-orange-300 pl-3 mt-3`, libellé "Réponse du partenaire" en orange
- **Pagination** : centrée, boutons cercles outline, séparés par `{page} / {pages}`
- **Empty state** : illustration discrète + "Aucun avis pour le moment"

### Variations Activité vs Logement

| Élément | Logement | Activité/Circuit |
|---|---|---|
| Hero badge | "Hôtel · 5★" / "Appartement" (ambre) | "Circuit" (bleu) / "Activité" (émeraude) |
| Stats-key | participants · chambres · salles de bain · check-in/out | participants max · durée · prix/pers. · ville |
| Bloc partner | Affiché si `logement.partner` | Non affiché |
| Instructions d'accès | Bandeau bleu si `instructionsAcces` | Non applicable |
| Sections | desc → caractéristiques → équipements (par catégorie) → lieux proches → règles → annulation | desc courte → desc complète → infos pratiques → inclus/non-inclus → annulation |
| Inclus/non-inclus | Non | Deux listes côte-à-côte (✓ vert / ✗ rouge inline, plus de boîtes colorées) |
| ReserveCard champs | Arrivée / Départ | Date / Participants |

### Animations & micro-interactions (framer-motion)

- **Hero** : image fade-in + scale `1.05 → 1.0` (1s ease-out) ; titre/badge/prix slide-up depuis `y: 20, opacity: 0` avec stagger 0.1s
- **Carrousel** : `AnimatePresence` mode wait, slide latéral avec `transition: spring stiffness: 300 damping: 30`
- **Sections narratives** : `motion.section` avec `whileInView={{ opacity: 1, y: 0 }}` initial `{ opacity: 0, y: 20 }`, `viewport={{ once: true, margin: "-50px" }}`
- **Stats-key chiffres** : counter animé 0 → valeur sur 800ms via framer-motion `useMotionValue` + `animate` (pas de dépendance externe)
- **ReserveCard** : hover sur CTA principal `whileHover={{ scale: 1.02 }}` + shadow accentuée
- **Bouton retour glassmorphism** : hover transition `bg-white/15 → bg-white/25`, scale léger
- **Avis** : `whileInView` stagger 0.05s entre cards

### Loading state

- Skeleton cohérent qui mime la nouvelle structure :
  - Hero skeleton : div pleine largeur avec gradient `from-orange-100 via-orange-50 to-orange-100` en shimmer (`animate-pulse`)
  - Lignes de texte skeleton dans la colonne narrative
  - ReserveCard skeleton à droite
- Conserver le `Loader2` orange en fallback si nécessaire

### Empty state (item introuvable)

- Container centré pleine hauteur
- Cercle dégradé orange `w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center` avec icône blanche au centre (`Compass` pour activité, `Home` pour logement)
- Titre `text-xl font-semibold` + sous-texte `text-slate-500`
- Bouton "Retour" outline

## Implémentation

### Fichiers modifiés

- `app/(dashboard)/service-reservations/activite/[id]/page.tsx` — refonte complète
- `app/(dashboard)/service-reservations/logement/[id]/page.tsx` — refonte complète

### Composants partagés à extraire

Dans `components/service-reservations/detail/` :

1. **`HeroImmersif.tsx`** — hero avec galerie, overlay, badge type, titre, prix, bouton retour glassmorphism
   - Props : `images`, `title`, `subtitle`, `price`, `priceUnit`, `badge { label, color }`, `onBack`, `onReserve`
2. **`ReserveCard.tsx`** — un seul composant qui gère les deux affichages :
   - Desktop (≥ 1024px) : card sticky dans la colonne droite via `hidden lg:block`
   - Mobile (< 1024px) : bottom-bar fixe via `lg:hidden fixed bottom-0`
   - Props : `price`, `priceUnit`, `rating`, `reviewsCount`, `summary[]`, `onReserve`, `onCancel`, `dateFields`
3. **`StatsKeyRow.tsx`** — rangée horizontale de chiffres en pull-out
   - Props : `stats: { value: string | number, label: string, animated?: boolean }[]`
4. **`SectionTitle.tsx`** — titre de section avec accent orange + trait
   - Props : `children`
5. **`AvisSection.tsx`** — section avis pleine largeur (en-tête + grille + pagination)
   - Props : `avisData`, `page`, `onPageChange`
6. **`DetailSkeleton.tsx`** — skeleton loader cohérent avec la nouvelle structure
7. **`DetailNotFound.tsx`** — empty state avec cercle dégradé orange
   - Props : `icon`, `title`, `onBack`

### Dépendances

Toutes déjà présentes :
- `framer-motion` (utilisé en assurance/dashboard)
- `lucide-react` (icônes)
- `@/components/ui/button`, `@/components/ui/badge`
- `tailwindcss` avec utilitaires `gradient-subito` déjà définis dans `globals.css`

Aucune nouvelle dépendance npm.

### Ordre d'implémentation suggéré

1. Créer les composants partagés (`HeroImmersif`, `StatsKeyRow`, `ReserveCard`, `SectionTitle`, `AvisSection`, `DetailSkeleton`, `DetailNotFound`)
2. Refondre `logement/[id]/page.tsx` en assemblant les composants
3. Refondre `activite/[id]/page.tsx` en assemblant les composants avec les variations
4. Vérification manuelle navigateur (golden path : load → carrousel → CTA → retour ; edge : item introuvable, sans images, sans avis)
5. `tsc --noEmit` + `npm run lint`

## Tests / Vérification

Pas de framework de test automatisé dans ce projet (memory : `project_no_test_framework`). Vérification manuelle :

- **Compilation** : `npx tsc --noEmit` sans erreur
- **Lint** : `npm run lint` propre
- **Navigateur (golden path)** :
  - Logement avec images + avis : hero immersif s'affiche, miniatures cliquables, ReserveCard sticky scrolle correctement, CTA Réserver navigue vers le flow avec `logementId`
  - Activité-circuit avec images + avis : variations badge bleu, stats adaptées, CTA navigue avec `circuitId` ou `activiteId` + `selectedItemType`
- **Edge cases** :
  - Item introuvable → empty state distinctif
  - Aucune image → fallback `ImageIcon` dans hero
  - Aucun avis → message empty dans section avis
  - Aucun équipement détaillé → fallback liste simple
- **Responsive** :
  - Desktop ≥ 1024px : 2 colonnes, ReserveCard sticky
  - Tablet/mobile < 1024px : stack vertical, bottom-bar fixe
- **Animations** : entrées fluides, pas de jank au scroll

## Risques

- **Sticky panel + content scroll** : risque de désalignement si la colonne droite devient plus haute que la gauche. Mitigation : `top-24` + `max-h-[calc(100vh-7rem)] overflow-y-auto` sur ReserveCard si trop haute.
- **Lettrine (drop cap)** : peut s'afficher bizarrement avec descriptions très courtes. Mitigation : appliquer la lettrine seulement si `description.length > 100`.
- **Counter animé** : peut être perturbant si la valeur change après mount (peu probable avec données statiques). Mitigation : animer une seule fois à l'entrée.
- **Performance images** : grandes images dans le hero. Mitigation : `loading="lazy"` sur miniatures, `fetchpriority="high"` sur image principale.
