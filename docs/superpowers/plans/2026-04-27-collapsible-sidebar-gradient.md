# Sidebar collapsible + gradient global — Plan d'implémentation

> **Pour agents automatisés** : utilise `superpowers:subagent-driven-development` ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche.

**Objectif** : Rendre la sidebar dashboard collapsible (icônes uniquement ↔ étendue) avec persistance localStorage, et basculer la classe brand `.gradient-subito` d'une couleur solide à un vrai gradient `linear-gradient(135deg, #FF7842 0%, #DC3F1A 100%)` qui se propage automatiquement aux 41 fichiers qui l'utilisent.

**Architecture** : Trois fichiers modifiés. (1) `app/globals.css` — change la définition de `.gradient-subito`. (2) `app/(dashboard)/layout.tsx` — supprime le bloc `<style>` redondant, ajoute le toggle collapse + état persisté + nav adaptative. (3) `components/ui/button.tsx` — ajout d'un variant `gradient`.

**Tech stack** : Next.js 14 App Router, TypeScript, Tailwind, class-variance-authority (cva), lucide-react icons.

**Spec de référence** : `docs/superpowers/specs/2026-04-27-collapsible-sidebar-gradient-design.md`

---

## Mapping fichiers ↔ responsabilités

| Fichier | Action | Responsabilité |
|---|---|---|
| `app/globals.css` | Modifier ligne 119-121 | Définition centrale du gradient, propage à 41 fichiers |
| `app/(dashboard)/layout.tsx` | Modifier (style block + sidebar JSX + main JSX) | Toggle, persistance, nav collapsible |
| `components/ui/button.tsx` | Modifier `cva()` | Variant `gradient` réutilisable |

---

## Task 1 : Activer le vrai gradient dans `globals.css`

**Fichier** :
- Modifier : `app/globals.css` lignes 119-121

- [ ] **Étape 1.1 : Remplacer la définition de `.gradient-subito`**

Dans `app/globals.css`, remplacer :

```css
  .gradient-subito {
    background-color: #FF6B35;
  }
```

par :

```css
  .gradient-subito {
    background-image: linear-gradient(135deg, #FF7842 0%, #DC3F1A 100%);
  }
```

- [ ] **Étape 1.2 : Vérifier la compilation TypeScript**

Run :
```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 1.3 : Pas de commit isolé**

Garder ce changement non-committé pour le grouper avec Task 2 (qui supprime aussi un override de cette même classe dans le layout).

---

## Task 2 : Supprimer l'override solide dans `layout.tsx`

**Fichier** :
- Modifier : `app/(dashboard)/layout.tsx` lignes 220-246

Le bloc `<style>` dans `layout.tsx` redéfinit la même classe `.gradient-subito` avec un `background-color: #FF6B35` qui écrase le gradient venant de `globals.css`. Il faut supprimer ce bloc entier (les autres règles CSS qu'il contient sont déjà dupliquées dans `globals.css`).

- [ ] **Étape 2.1 : Supprimer le bloc `<style>`**

Dans `app/(dashboard)/layout.tsx`, remplacer :

```tsx
  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --subito-orange: #FF6B35;
          --subito-coral: #FF6B35;
          --subito-pink: #FF6B35;
        }

        .gradient-subito {
          background-color: #FF6B35;
        }

        .text-subito {
          color: #FF6B35;
        }

        .bg-subito {
          background-color: #FF6B35;
        }

        .border-subito {
          border-color: #FF6B35;
        }

        .hover\\:bg-subito:hover {
          background-color: #e55a2b;
        }
      `}</style>

      {/* Mobile sidebar overlay */}
```

par :

```tsx
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
```

- [ ] **Étape 2.2 : Vérifier la compilation TypeScript**

Run :
```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 2.3 : Vérification visuelle rapide**

Démarrer le dev server :
```bash
npm run dev
```

Ouvrir n'importe quelle page dashboard (ex : `/dashboard`). Vérifier visuellement :
- Le carré orange avec les initiales utilisateur (en haut à droite) montre maintenant un gradient (du orange clair au orange plus foncé)
- La box "Besoin d'aide" en bas de la sidebar montre aussi le gradient
- Les `KPICard`, `LiveMap` et autres composants qui utilisaient `gradient-subito` ont eux aussi le gradient

Si tout est OK, continuer. Si un endroit est devenu illisible (texte invisible sur le gradient), noter le composant — il faudra peut-être ajuster `text-white` ou opacité plus tard, mais ce n'est PAS dans le scope de cette task.

- [ ] **Étape 2.4 : Pas de commit isolé**

Continuer vers Task 3 et grouper Task 1+2+3 dans un seul commit "feat(theme): activate brand gradient across the app".

---

## Task 3 : Ajouter le variant `gradient` au composant Button

**Fichier** :
- Modifier : `components/ui/button.tsx` lignes 11-21

- [ ] **Étape 3.1 : Ajouter le variant dans la config cva**

Dans `components/ui/button.tsx`, remplacer :

```ts
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
```

par :

```ts
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient: 'gradient-subito text-white shadow-sm hover:brightness-95',
      },
```

(Une seule ligne ajoutée à la fin avant la fermeture `}`).

- [ ] **Étape 3.2 : Vérifier la compilation TypeScript**

Run :
```bash
npx tsc --noEmit
```

Attendu : aucune erreur. Le type `VariantProps` exporté par cva inclura automatiquement `'gradient'` comme valeur valide pour `variant`.

- [ ] **Étape 3.3 : Vérifier le lint**

Run :
```bash
npm run lint
```

Attendu : pas de nouvelle erreur.

- [ ] **Étape 3.4 : Commit groupé Task 1+2+3**

```bash
git add app/globals.css app/(dashboard)/layout.tsx components/ui/button.tsx
git commit -m "feat(theme): activate brand gradient across the app"
```

Vérifier avec `git show --stat HEAD` que seuls ces 3 fichiers sont dans le commit.

---

## Task 4 : Sidebar collapsible — état + persistance

**Fichier** :
- Modifier : `app/(dashboard)/layout.tsx` (imports + état + effet de persistance)

- [ ] **Étape 4.1 : Ajouter `ChevronLeft` et `ChevronRight` aux imports lucide**

Dans `app/(dashboard)/layout.tsx`, dans le bloc `import { ... } from "lucide-react"` (lignes 6-36), ajouter `ChevronLeft, ChevronRight` :

```tsx
import {
  LayoutDashboard,
  MapPin,
  FileText,
  CreditCard,
  Users,
  Building2,
  Car,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Package,
  Fuel,
  Zap,
  Wrench,
  Clock,
  LucideIcon,
  Loader2,
  ClipboardCheck,
  Copy,
  Share2,
  Compass,
  Hotel,
  Shield,
  MessageSquare
} from "lucide-react";
```

- [ ] **Étape 4.2 : Ajouter l'état `sidebarCollapsed` après `sidebarOpen`**

Dans `DashboardLayoutInner`, juste après la ligne `const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);` (ligne 96), ajouter :

```tsx
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Hydrate collapsed state from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('subito_sidebar_collapsed');
      if (stored === '1') setSidebarCollapsed(true);
    } catch { /* localStorage may be unavailable */ }
  }, []);

  // Persist collapsed state on change
  useEffect(() => {
    try {
      window.localStorage.setItem('subito_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch { /* ignore */ }
  }, [sidebarCollapsed]);
```

- [ ] **Étape 4.3 : Vérifier la compilation TypeScript**

Run :
```bash
npx tsc --noEmit
```

Attendu : aucune erreur. (`useEffect` est déjà importé en ligne 3.)

- [ ] **Étape 4.4 : Pas de commit isolé**

Continuer vers Task 5.

---

## Task 5 : Sidebar collapsible — JSX adaptatif

**Fichier** :
- Modifier : `app/(dashboard)/layout.tsx` JSX de la sidebar et du main

- [ ] **Étape 5.1 : Adapter la largeur de la sidebar selon `sidebarCollapsed`**

Dans `app/(dashboard)/layout.tsx`, remplacer le bloc `<aside ...>` (lignes 257-262 environ) :

```tsx
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
```

par :

```tsx
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200
        transform transition-all duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
```

Note : sur mobile (overlay), garde `w-72`. Sur desktop (`lg:`), c'est `w-16` (collapsed) ou `w-64` (expanded).

- [ ] **Étape 5.2 : Adapter le bloc Logo + ajouter le bouton toggle**

Toujours dans `app/(dashboard)/layout.tsx`, remplacer le bloc Logo (lignes 264-283 environ) :

```tsx
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo-subito.jpeg`}
                alt="Subito"
                className="h-10 w-auto"
              />
              <div>
                <span className="font-bold text-xl text-slate-800">Subito</span>
                <span className="block text-xs text-slate-500 font-medium -mt-1">Business</span>
              </div>
            </div>
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
```

par :

```tsx
          {/* Logo */}
          <div className={`h-20 flex items-center border-b border-slate-100 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-6'}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:gap-0' : ''}`}>
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo-subito.jpeg`}
                alt="Subito"
                className="h-10 w-auto"
              />
              <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
                <span className="font-bold text-xl text-slate-800">Subito</span>
                <span className="block text-xs text-slate-500 font-medium -mt-1">Business</span>
              </div>
            </div>
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors ${sidebarCollapsed ? 'lg:absolute lg:-right-3 lg:top-7 lg:bg-white lg:border lg:border-slate-200 lg:shadow-sm' : ''}`}
              onClick={() => setSidebarCollapsed(c => !c)}
              aria-label={sidebarCollapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
```

- [ ] **Étape 5.3 : Adapter les items de nav (texte caché en mode collapsed + tooltip natif + style actif gradient)**

Toujours dans `app/(dashboard)/layout.tsx`, remplacer le `.map()` du `<nav>` (lignes 287-317 environ) :

```tsx
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-orange-50 to-red-50 text-subito border border-orange-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'text-subito' : ''}`} />
                  {item.name}
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.href === '/tickets' && unreadTickets > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-orange-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white animate-pulse">
                      {unreadTickets > 99 ? '99+' : unreadTickets}
                    </span>
                  )}
                </Link>
              );
            })}
```

par :

```tsx
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`
                    relative flex items-center gap-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${sidebarCollapsed ? 'lg:justify-center lg:px-2 px-4 py-3' : 'px-4 py-3'}
                    ${active
                      ? 'gradient-subito text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : ''}`} />
                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.name}</span>
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${active ? 'bg-white/30' : 'bg-red-500'} ${sidebarCollapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-[16px] lg:h-4 lg:px-1 lg:text-[9px] ml-auto' : 'ml-auto'}`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.href === '/tickets' && unreadTickets > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white animate-pulse ${active ? 'bg-white/30' : 'bg-orange-500'} ${sidebarCollapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-[16px] lg:h-4 lg:px-1 lg:text-[9px] ml-auto' : 'ml-auto'}`}>
                      {unreadTickets > 99 ? '99+' : unreadTickets}
                    </span>
                  )}
                </Link>
              );
            })}
```

Notes :
- En mode collapsed (`lg:`) : justify-center, padding réduit, texte du nom caché, badge en pastille flottante en haut-droite
- État actif : `gradient-subito text-white shadow-md` (le vrai gradient de Task 1)
- Badge sur item actif : fond `bg-white/30` (translucide blanc) au lieu de rouge/orange pour rester lisible

- [ ] **Étape 5.4 : Cacher la box "Besoin d'aide" en mode collapsed**

Remplacer le bloc bottom-section (lignes 320-332 environ) :

```tsx
          {/* Bottom section */}
          <div className="p-4 border-t border-slate-100">
            <div className="rounded-xl gradient-subito p-4 text-white">
              <p className="text-sm font-medium mb-1">Besoin d&apos;aide ?</p>
              <p className="text-xs opacity-90 mb-3">Support disponible 24/7</p>
              <Button
                size="sm"
                className="w-full bg-white text-subito hover:bg-slate-100"
              >
                Contacter le support
              </Button>
            </div>
          </div>
```

par :

```tsx
          {/* Bottom section */}
          <div className={`p-4 border-t border-slate-100 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <div className="rounded-xl gradient-subito p-4 text-white">
              <p className="text-sm font-medium mb-1">Besoin d&apos;aide ?</p>
              <p className="text-xs opacity-90 mb-3">Support disponible 24/7</p>
              <Button
                size="sm"
                className="w-full bg-white text-subito hover:bg-slate-100"
              >
                Contacter le support
              </Button>
            </div>
          </div>
```

(seul le `className` du wrapper change : ajout `${sidebarCollapsed ? 'lg:hidden' : ''}`).

- [ ] **Étape 5.5 : Adapter le padding-left du `<main>`**

Remplacer la ligne (ligne 337 environ) :

```tsx
      {/* Main content */}
      <div className="lg:pl-72">
```

par :

```tsx
      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
```

- [ ] **Étape 5.6 : Vérifier la compilation TypeScript**

Run :
```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 5.7 : Vérifier le lint**

Run :
```bash
npm run lint
```

Attendu : pas de nouvelle erreur (warnings préexistants OK).

- [ ] **Étape 5.8 : Vérification visuelle navigateur**

Démarrer le dev server (s'il ne tourne pas déjà) :
```bash
npm run dev
```

Naviguer dans le dashboard et vérifier :

1. **Toggle desktop** : un bouton chevron est visible en haut à droite de la sidebar (ou collé sur le bord quand collapsed). Cliquer → la sidebar passe à 64px de large, n'affiche que les icônes. Cliquer encore → retour à 256px.

2. **Item actif** : l'item de la page courante a le gradient orange en fond, texte et icône blancs.

3. **Badges** : sur la page Notifications, le badge rouge (compteur) est visible. En mode collapsed, le badge devient une petite pastille flottante en haut-droite de l'icône Bell.

4. **Persistance** : refresh F5 → la sidebar garde son état (collapsed ou expanded).

5. **Tooltip natif** : en mode collapsed, hover sur un item → le nom s'affiche après ~500ms (tooltip navigateur natif via `title=`).

6. **Mobile** : sur viewport étroit (`<lg`), le toggle desktop est masqué, le hamburger fonctionne comme avant, la sidebar reste à 288px en overlay.

7. **Main content** : quand la sidebar passe collapsed, le contenu principal glisse à gauche pour profiter de l'espace.

8. **Box "Besoin d'aide"** : visible en mode expanded, masquée en mode collapsed.

- [ ] **Étape 5.9 : Recherche de potentiels conflits `pl-72`/`ml-72`**

Run :
```bash
grep -rn "pl-72\|ml-72\|w-72" --include="*.tsx" --include="*.ts" app/ components/ | head -20
```

Si on trouve d'autres composants qui calculent leur position à partir de `pl-72` (par exemple un toolbar fixed), ils devront être ajustés. Si rien n'apparaît hors `app/(dashboard)/layout.tsx`, parfait — pas d'autre changement.

Si quelque chose apparaît, le noter dans le commit message comme observation, mais NE PAS modifier dans cette task (scope creep). Créer une issue de suivi.

- [ ] **Étape 5.10 : Commit Task 4+5**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat(layout): collapsible sidebar with persisted state and adaptive nav"
```

Vérifier avec `git show --stat HEAD` que seul `app/(dashboard)/layout.tsx` est dans le commit.

---

## Récapitulatif des vérifications

À la fin du plan, tu dois avoir :

- ✅ `npx tsc --noEmit` passe
- ✅ `npm run lint` passe sans nouvelle erreur
- ✅ **2 commits** créés sur `aida` :
  - `feat(theme): activate brand gradient across the app` (3 fichiers)
  - `feat(layout): collapsible sidebar with persisted state and adaptive nav` (1 fichier)
- ✅ Le carré avatar utilisateur affiche un gradient orange
- ✅ La box "Besoin d'aide" affiche un gradient orange
- ✅ Toggle de la sidebar fonctionne (desktop)
- ✅ État collapsed persiste après refresh
- ✅ Item actif affiche le gradient orange en fond
- ✅ Badges restent visibles en mode collapsed (pastille flottante)
- ✅ Mobile : comportement inchangé (overlay 288px)
- ✅ Le variant `<Button variant="gradient">` est disponible pour les pages qui veulent l'adopter (non rétroactif)
