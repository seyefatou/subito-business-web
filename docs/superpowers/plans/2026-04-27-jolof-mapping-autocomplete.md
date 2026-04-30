# Intégration Jolof Mapping — Plan d'implémentation

> **Pour agents automatisés** : utilise `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox `- [ ]`.

**Objectif** : Remplacer l'appel direct à Nominatim par l'API Jolof Mapping (`/api/geocoding/autocomplete`) dans le composant `AddressAutocomplete`, avec fallback Nominatim en cas d'échec.

**Architecture** : Modification d'un seul fichier `components/ui/address-autocomplete.tsx` + ajout d'une variable d'environnement. La fonction publique `searchAddresses(query, countryCode)` garde sa signature et son interface de retour `AddressSuggestion`. Aucune des 4 pages consommatrices n'est modifiée.

**Tech stack** : Next.js 14 (App Router), TypeScript 5.8, React 18, fetch API standard.

**Spec de référence** : `docs/superpowers/specs/2026-04-27-jolof-mapping-autocomplete-design.md`

---

## Mapping fichiers ↔ responsabilités

| Fichier | Action | Responsabilité |
|---|---|---|
| `components/ui/address-autocomplete.tsx` | Modifier | Réécrit `searchAddresses` pour appeler Jolof, avec fallback vers une nouvelle fonction privée `searchAddressesNominatim` (extraction du code actuel) |
| `.env.local` | Modifier | Ajoute `NEXT_PUBLIC_JOLOF_API_URL` |

Aucun autre fichier n'est touché. Le UI du composant `AddressAutocomplete` reste identique.

---

## Task 1 : Ajouter la variable d'environnement Jolof

**Fichiers** :
- Modifier : `.env.local`

- [ ] **Étape 1.1 : Lire l'état actuel de `.env.local`**

```bash
cat .env.local
```

Attendu : une ligne `NEXT_PUBLIC_API_URL=https://api.mysubito.net/v1`.

- [ ] **Étape 1.2 : Ajouter la variable Jolof**

Le fichier doit ressembler à :

```env
NEXT_PUBLIC_API_URL=https://api.mysubito.net/v1
NEXT_PUBLIC_JOLOF_API_URL=https://map.jolofmobility.com
```

- [ ] **Étape 1.3 : Pas de commit**

`.env.local` est dans `.gitignore` (vérifier au besoin avec `git check-ignore .env.local`). Ne pas commit.

---

## Task 2 : Extraire la logique Nominatim dans une fonction privée

**Fichiers** :
- Modifier : `components/ui/address-autocomplete.tsx` (lignes 62–83)

Objectif : avant d'introduire Jolof, isoler la fonction Nominatim existante sous le nom `searchAddressesNominatim`. La fonction publique `searchAddresses` continuera d'appeler Nominatim pour cette tâche — le comportement ne change pas encore. Cela permet de valider que le refactoring n'a rien cassé avant d'ajouter Jolof.

- [ ] **Étape 2.1 : Renommer le corps de `searchAddresses` en `searchAddressesNominatim`**

Dans `components/ui/address-autocomplete.tsx`, remplacer le bloc actuel :

```ts
export async function searchAddresses(query: string, countryCode = 'sn'): Promise<AddressSuggestion[]> {
  if (!query || query.length < 2) return [];
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6&countrycodes=${countryCode}&accept-language=fr`,
      {
        headers: {
          'User-Agent': 'SubitoBusiness/1.0 (contact@subitobusiness.com)',
        },
      }
    );
    const data = await res.json();
    return (data || []).map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
    }));
  } catch {
    return [];
  }
}
```

par :

```ts
async function searchAddressesNominatim(query: string, countryCode = 'sn'): Promise<AddressSuggestion[]> {
  if (!query || query.length < 2) return [];
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6&countrycodes=${countryCode}&accept-language=fr`,
      {
        headers: {
          'User-Agent': 'SubitoBusiness/1.0 (contact@subitobusiness.com)',
        },
      }
    );
    const data = await res.json();
    return (data || []).map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
    }));
  } catch {
    return [];
  }
}

export async function searchAddresses(query: string, countryCode = 'sn'): Promise<AddressSuggestion[]> {
  return searchAddressesNominatim(query, countryCode);
}
```

Note : `searchAddressesNominatim` n'est PAS exportée (volontaire — fonction privée).

- [ ] **Étape 2.2 : Vérifier la compilation TypeScript**

Run : 
```bash
npx tsc --noEmit
```

Attendu : aucune erreur. Le code se compile.

- [ ] **Étape 2.3 : Vérifier le lint**

Run :
```bash
npm run lint
```

Attendu : pas de nouvelle erreur ESLint.

- [ ] **Étape 2.4 : Vérification manuelle navigateur**

Démarrer le dev server :
```bash
npm run dev
```

Aller sur `http://localhost:3000/hourly-vtc` (après login), taper "Dak" dans le champ d'adresse. Vérifier que les suggestions Nominatim s'affichent toujours (ouvrir l'onglet Réseau du DevTools, vérifier que la requête va bien vers `nominatim.openstreetmap.org`).

- [ ] **Étape 2.5 : Pas de commit ici**

L'utilisateur peut décider de regrouper ce refactor avec la Task 3 dans un seul commit final. Passer à la Task 3.

---

## Task 3 : Implémenter `searchAddressesJolof` et le fallback

**Fichiers** :
- Modifier : `components/ui/address-autocomplete.tsx`

Objectif : ajouter une fonction `searchAddressesJolof` qui appelle l'API Jolof Mapping, et modifier `searchAddresses` pour l'appeler en premier avec fallback vers Nominatim si elle échoue.

- [ ] **Étape 3.1 : Ajouter la constante `JOLOF_BASE` en haut du fichier**

Juste après la directive `'use client';` et avant les imports, ajouter (en respectant l'ordre — la constante doit venir APRÈS les imports) :

Recherche la ligne :
```ts
import {
  Select,
  ...
} from "@/components/ui/select";
```

Ajoute juste après ce bloc d'imports, avant `export interface AddressSuggestion` :

```ts
const JOLOF_BASE = process.env.NEXT_PUBLIC_JOLOF_API_URL || 'https://map.jolofmobility.com';
```

- [ ] **Étape 3.2 : Ajouter la fonction `searchAddressesJolof`**

Juste avant la fonction `searchAddressesNominatim`, ajouter :

```ts
async function searchAddressesJolof(query: string, countryCode = 'sn'): Promise<AddressSuggestion[] | null> {
  try {
    const params = new URLSearchParams({
      query,
      limit: '6',
      language: 'fr',
      country: countryCode.toUpperCase(),
    });
    const res = await fetch(`${JOLOF_BASE}/api/geocoding/autocomplete?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.data)) return null;
    return json.data.map((item: any) => ({
      display_name: item.display_name,
      lat: String(item.lat),
      lon: String(item.lon),
    }));
  } catch {
    return null;
  }
}
```

Note : retourne `null` (pas `[]`) en cas d'échec, pour distinguer "Jolof a échoué" de "Jolof a répondu zéro résultat".

- [ ] **Étape 3.3 : Modifier `searchAddresses` pour utiliser Jolof avec fallback**

Remplacer le corps de `searchAddresses` (qui à la fin de la Task 2 est `return searchAddressesNominatim(query, countryCode);`) par :

```ts
export async function searchAddresses(query: string, countryCode = 'sn'): Promise<AddressSuggestion[]> {
  if (!query || query.length < 2) return [];
  const jolofResults = await searchAddressesJolof(query, countryCode);
  if (jolofResults !== null) return jolofResults;
  return searchAddressesNominatim(query, countryCode);
}
```

- [ ] **Étape 3.4 : Vérifier la compilation TypeScript**

Run :
```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 3.5 : Vérifier le lint**

Run :
```bash
npm run lint
```

Attendu : pas de nouvelle erreur ESLint.

- [ ] **Étape 3.6 : Vérification manuelle — golden path Jolof**

Démarrer le dev server (s'il ne tourne pas déjà) :
```bash
npm run dev
```

1. Aller sur `http://localhost:3000/hourly-vtc` (après login)
2. Ouvrir DevTools → onglet Réseau, filtrer sur "autocomplete"
3. Taper "Dak" dans le champ d'adresse
4. Attendu : 
   - Une requête GET vers `https://map.jolofmobility.com/api/geocoding/autocomplete?query=Dak&limit=6&language=fr&country=SN` (status 200)
   - Des suggestions affichées dans le dropdown
   - Cliquer sur une suggestion remplit le champ et passe lat/lng au callback

- [ ] **Étape 3.7 : Vérification manuelle — sélecteur de pays**

Sur la même page (ou une page avec `showCountrySelect`), changer le pays vers "Côte d'Ivoire". Taper "Abi" → vérifier que la requête envoie bien `country=CI`.

- [ ] **Étape 3.8 : Vérification manuelle — fallback Nominatim**

Dans DevTools → Network → clic droit sur une requête vers `map.jolofmobility.com` → "Block request URL".

Retaper "Dak" : 
- Attendu : la requête Jolof échoue (bloquée), puis une requête vers `nominatim.openstreetmap.org` part automatiquement
- Des suggestions Nominatim apparaissent dans le dropdown
- Aucune erreur visible dans le UI

Débloquer ensuite la requête Jolof.

- [ ] **Étape 3.9 : Vérification manuelle — non-régression sur les 4 pages**

Pour chaque page :
- `http://localhost:3000/hourly-vtc`
- `http://localhost:3000/inter-city`
- `http://localhost:3000/deliveries`
- `http://localhost:3000/airport-shuttle`

Taper une adresse, vérifier que :
- Les suggestions s'affichent
- La sélection remplit bien le champ avec coords valides
- Le UI n'a pas changé visuellement

- [ ] **Étape 3.10 : Build production**

Run :
```bash
npm run build
```

Attendu : build réussi sans erreur. La variable `NEXT_PUBLIC_JOLOF_API_URL` doit être correctement inlinée.

- [ ] **Étape 3.11 : Commit**

Commit uniquement le fichier modifié (l'arbre de travail contient d'autres modifications en cours qui ne doivent PAS être incluses) :

```bash
git add components/ui/address-autocomplete.tsx
git commit -m "feat(geocoding): integrate Jolof Mapping autocomplete with Nominatim fallback"
```

---

## Task 4 : Documentation des variables d'environnement (optionnel)

**Fichiers** :
- Vérifier l'existence de : `.env.example`

- [ ] **Étape 4.1 : Vérifier si `.env.example` existe**

Run :
```bash
ls -la .env.example 2>/dev/null && echo "EXISTS" || echo "DOES NOT EXIST"
```

- [ ] **Étape 4.2 : Si `EXISTS`, ajouter la variable**

Ajouter dans `.env.example` :

```env
NEXT_PUBLIC_JOLOF_API_URL=https://map.jolofmobility.com
```

- [ ] **Étape 4.3 : Si `EXISTS`, commit**

```bash
git add .env.example
git commit -m "docs(env): document NEXT_PUBLIC_JOLOF_API_URL"
```

- [ ] **Étape 4.4 : Si `DOES NOT EXIST`**

Ne rien faire — le projet ne maintient pas de `.env.example`. Skipper cette tâche.

---

## Récapitulatif des vérifications

À la fin du plan, tu dois avoir :

- ✅ `npx tsc --noEmit` passe sans erreur
- ✅ `npm run lint` passe sans nouvelle erreur
- ✅ `npm run build` passe sans erreur
- ✅ Sur les 4 pages dashboard : autocomplétion fonctionne, requête va vers Jolof, sélection ok
- ✅ Sélecteur de pays : country code transformé en uppercase et envoyé correctement
- ✅ Fallback Nominatim : déclenché silencieusement si Jolof down
- ✅ 1 commit créé : `feat(geocoding): integrate Jolof Mapping autocomplete with Nominatim fallback`
