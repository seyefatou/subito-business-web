# Sidebar collapsible + gradient global — design

**Date** : 2026-04-27
**Statut** : design approuvé, prêt pour plan d'implémentation
**Références visuelles** : 3 captures fournies par l'utilisateur (sidebar collapsed, page Booking Confirmed avec gradient, sidebar expanded avec CTA gradient)

## Contexte

L'application Subito Business utilise actuellement :

- Une sidebar fixe `w-72` (288px) sur desktop, sans possibilité de collapse
- Une couleur brand solide `#FF6B35` exposée via une classe trompeuse `.gradient-subito` qui est en fait un `background-color` solid
- Un seul vrai gradient `from-orange-500 to-red-400` utilisé ponctuellement (bouton "Partager")

## Objectifs

1. Rendre la sidebar collapsible : icônes uniquement (`w-16`) ↔ étendue (`w-64`)
2. Persister l'état dans `localStorage`
3. Définir un vrai gradient brand `linear-gradient(135deg, #FF7842 0%, #DC3F1A 100%)` réutilisable
4. Faire en sorte que la classe existante `.gradient-subito` (utilisée à plusieurs endroits) devienne un VRAI gradient, ce qui propage automatiquement le changement sans toucher chaque page
5. Ajouter un variant `gradient` au composant `Button` shadcn pour que les pages puissent simplement écrire `<Button variant="gradient">` pour leurs CTAs

## Non-objectifs

- Pas de migration forcée des CTAs existants des pages dashboard. Chaque page adopte le variant `gradient` à son rythme.
- Pas de refonte de la palette globale Tailwind (`tailwind.config.js`). On reste sur des classes CSS définies dans `globals.css`.
- Pas de mode dark
- Pas de changement du comportement mobile de la sidebar (overlay)

## Architecture

### Sidebar collapsible

Modification de `app/(dashboard)/layout.tsx` :

- Nouvel état local `sidebarCollapsed: boolean`, initialisé depuis `localStorage` (`subito_sidebar_collapsed`)
- `useEffect` qui persiste l'état à chaque changement
- Bouton toggle (chevron) en haut à droite de la sidebar, visible uniquement sur `lg:` (desktop)
- Largeurs dynamiques : `lg:w-64` quand expanded, `lg:w-16` quand collapsed
- `<main>` ajuste : `lg:pl-64` ↔ `lg:pl-16`
- Items de nav : en mode collapsed, le texte est caché (`hidden lg:block` géré par classes conditionnelles), seules l'icône et le badge sont visibles. Au hover sur l'item collapsed, un tooltip natif (`title=` attr) montre le nom

Mobile inchangé : la sidebar reste un overlay déclenché par le bouton hamburger.

### Gradient global

Modification UNIQUE dans `app/globals.css` (la classe est déjà utilisée dans **41 fichiers** du projet, dont les pages auth, dashboard, et tous les forms) :

```css
.gradient-subito {
  background-image: linear-gradient(135deg, #FF7842 0%, #DC3F1A 100%);
}
```

(remplace l'ancien `background-color: #FF6B35`)

**Effet de bord positif majeur** : tous les 41 fichiers existants qui utilisent `gradient-subito` (carré avatar header, box "Besoin d'aide", boutons "Continuer" sur certaines pages, `KPICard`, etc.) passent automatiquement au vrai gradient sans aucune modification.

Le bloc `<style>` inline dans `app/(dashboard)/layout.tsx` qui redéfinit la même classe en solid devient redondant et conflictuel — il faut le **supprimer** (sinon il écrase la définition globale).

### Variant Button

Modification de `components/ui/button.tsx` (ajout au `cva()` config) :

```ts
gradient: 'gradient-subito text-white shadow-sm hover:brightness-95',
```

Usage dans les pages :

```tsx
<Button variant="gradient">Continuer vers le véhicule</Button>
```

### Item de nav actif

État actif passe de `bg-gradient-to-r from-orange-50 to-red-50` (clair, pâle) à un vrai accent gradient :

```tsx
active
  ? 'gradient-subito text-white shadow-md'
  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
```

L'icône en mode actif passe en `text-white` au lieu de `text-subito`.

## Fichiers touchés

| Fichier | Action |
|---|---|
| `app/(dashboard)/layout.tsx` | toggle collapse + nav adaptative + style mis à jour |
| `app/globals.css` | ajout `.bg-subito-gradient` |
| `components/ui/button.tsx` | ajout variant `gradient` |

Aucune autre page de feature n'est modifiée dans cette itération.

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Le `localStorage.getItem` pendant SSR/hydration provoque un mismatch | Lecture seulement dans un `useEffect`, valeur par défaut `false` au premier render |
| Les badges (notifications, tickets) deviennent invisibles en mode collapsed | Repositionnement : badge en pastille flottante en haut-droite de l'icône en mode collapsed |
| Le tooltip natif `title=` est lent (~500ms) | Acceptable pour MVP. Si besoin, futur upgrade vers Radix Tooltip. |
| Conflit avec un eventuel composant qui fait `position: fixed` et calcule son offset à partir de `lg:pl-72` | Recherche grep sur `pl-72`/`ml-72` au moment de l'implémentation pour identifier les usages à mettre à jour |

## Vérification

- `npx tsc --noEmit` passe
- `npm run lint` passe
- Visuellement sur navigateur :
  - Bouton toggle visible sur desktop, ouvre/ferme la sidebar avec animation fluide
  - État persiste après rechargement
  - Item actif a le gradient
  - Box "Besoin d'aide" et carré avatar utilisateur ont le vrai gradient (effet de bord automatique)
  - Test ajout d'un `<Button variant="gradient">` sur une page → bouton orange en gradient
  - Mobile : overlay inchangé
