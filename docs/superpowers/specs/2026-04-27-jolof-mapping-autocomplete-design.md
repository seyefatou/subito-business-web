# Intégration Jolof Mapping — autocomplétion d'adresses

**Date** : 2026-04-27
**Auteur** : aida-diallo
**Statut** : design approuvé, prêt pour plan d'implémentation

## Contexte

L'application Subito Business utilise actuellement un composant `AddressAutocomplete` (`components/ui/address-autocomplete.tsx`) qui appelle directement l'API publique **Nominatim / OpenStreetMap** pour suggérer des adresses dans 4 pages dashboard :

- `app/(dashboard)/hourly-vtc/page.tsx`
- `app/(dashboard)/inter-city/page.tsx`
- `app/(dashboard)/deliveries/page.tsx`
- `app/(dashboard)/airport-shuttle/page.tsx`

Limites de l'approche actuelle :

- Latence variable (Nominatim n'a pas de cache dédié)
- Couverture limitée des points d'intérêt locaux au Sénégal et en Afrique de l'Ouest
- Aucun fallback en cas d'indisponibilité

**Jolof Mapping** (`https://map.jolofmobility.com`) est une API de géocodage avec cache Redis L1, fallback PostgreSQL et fallback Google Places, optimisée pour le marché ouest-africain. L'objectif est de basculer l'autocomplétion vers Jolof tout en gardant Nominatim comme filet de sécurité.

## Objectifs

1. Remplacer l'appel Nominatim par l'endpoint `/api/geocoding/autocomplete` de Jolof Mapping
2. Conserver Nominatim comme **fallback** automatique en cas d'échec
3. Aucune régression visible côté UI ou côté consommateurs (4 pages dashboard)
4. Configuration via variable d'environnement `NEXT_PUBLIC_JOLOF_API_URL`

## Non-objectifs

- Pas d'intégration des autres endpoints Jolof (`/search`, `/reverse`) dans cette itération
- Pas de proxy Next.js côté serveur (l'endpoint est public, CORS attendu côté Jolof)
- Pas de migration vers `lat: number, lon: number` (on conserve l'interface `AddressSuggestion` actuelle)
- Pas de modification du UI du composant ni des 4 pages consommatrices

## Architecture

Le seul fichier de code modifié est `components/ui/address-autocomplete.tsx`. Une variable d'environnement est ajoutée dans `.env.local` (voir section dédiée).

```
┌─────────────────────────────┐
│  Pages dashboard (4)        │
│  hourly-vtc, inter-city,    │
│  deliveries, airport-shuttle│
└──────────────┬──────────────┘
               │
               │ <AddressAutocomplete value=... onSelect=... />
               ▼
┌─────────────────────────────────────────────┐
│ components/ui/address-autocomplete.tsx      │
│                                             │
│  AddressAutocomplete (UI, inchangé)         │
│       │                                     │
│       ▼ debounce 400ms                      │
│  searchAddresses(query, countryCode)        │
│       │                                     │
│       ├─► fetch Jolof /autocomplete         │
│       │   ✓ → mapping → return              │
│       │   ✗ → fallback                      │
│       └─► fetch Nominatim (fallback)        │
└─────────────────────────────────────────────┘
```

## Détails techniques

### Endpoint cible

```
GET https://map.jolofmobility.com/api/geocoding/autocomplete
  ?query=<string>          (requis)
  &limit=6                 (on garde 6 pour cohérence visuelle)
  &language=fr
  &country=<ISO uppercase> (ex: SN, CI, ML)
```

Pas d'authentification : endpoint public.

### Mapping de la requête

| Param interne | Source | Param Jolof |
|---|---|---|
| `query` | input utilisateur | `query` |
| `limit` | constante `6` | `limit` |
| `language` | `'fr'` (constante) | `language` |
| `country` | prop `countryCode` (lowercase, ex: `'sn'`) → `.toUpperCase()` | `country` |

### Mapping de la réponse

Réponse Jolof :

```json
{
  "success": true,
  "data": [
    {
      "provider": "nominatim",
      "description": "Dakar, Senegal",
      "display_name": "Dakar, Senegal",
      "place_id": "12345",
      "types": ["locality", "political"],
      "importance": 0.85,
      "lat": 14.7167,
      "lon": -17.4677
    }
  ],
  "query": "Dak",
  "count": 5,
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

L'interface `AddressSuggestion` actuelle reste inchangée :

```ts
export interface AddressSuggestion {
  display_name: string;
  lat: string;   // string conservée pour compat
  lon: string;
}
```

Mapping appliqué dans `searchAddresses` :

```ts
return (json.data || []).map((item: any) => ({
  display_name: item.display_name,
  lat: String(item.lat),
  lon: String(item.lon),
}));
```

### Variable d'environnement

Ajouter dans `.env.local` :

```
NEXT_PUBLIC_JOLOF_API_URL=https://map.jolofmobility.com
```

Dans le code :

```ts
const JOLOF_BASE = process.env.NEXT_PUBLIC_JOLOF_API_URL || 'https://map.jolofmobility.com';
```

### Logique de fallback

```ts
export async function searchAddresses(query: string, countryCode = 'sn') {
  if (!query || query.length < 2) return [];

  // 1. Tentative Jolof
  try {
    const url = `${JOLOF_BASE}/api/geocoding/autocomplete?` + new URLSearchParams({
      query,
      limit: '6',
      language: 'fr',
      country: countryCode.toUpperCase(),
    });
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        return json.data.map((item: any) => ({
          display_name: item.display_name,
          lat: String(item.lat),
          lon: String(item.lon),
        }));
      }
    }
  } catch {
    // ignore et fallback
  }

  // 2. Fallback Nominatim (logique existante conservée)
  return searchAddressesNominatim(query, countryCode);
}
```

La fonction Nominatim existante est extraite dans une fonction privée `searchAddressesNominatim` (renommage du corps actuel de `searchAddresses`).

### Gestion d'erreurs

- Toute exception réseau ou réponse non-`success` → silencieuse, fallback automatique
- Aucun toast/erreur visible : un champ d'autocomplétion ne doit pas afficher d'erreur intrusive
- Pas de log console en production (le `catch` est silencieux comme dans le code actuel)

## Tests / vérification

Vérification manuelle après implémentation :

1. **Golden path** : sur chaque page dashboard concernée, taper "Dak" → vérifier que les suggestions apparaissent et viennent de Jolof (vérifier l'URL appelée dans l'onglet Réseau du navigateur)
2. **Sélecteur de pays** : changer le pays (SN → CI → ML) et vérifier que le `country` envoyé change bien
3. **Sélection** : cliquer sur une suggestion et vérifier que `onSelect(displayName, lat, lng)` reçoit des nombres exploitables (les pages stockent souvent ces coords)
4. **Fallback** : bloquer temporairement `map.jolofmobility.com` (DevTools → Network → block request URL) et vérifier que les suggestions Nominatim prennent le relai sans erreur visible
5. **Aucune régression** : vérifier que le UI (loader, dropdown, sélecteur de drapeau pays) reste identique

## Fichiers touchés

- `components/ui/address-autocomplete.tsx` — modification de `searchAddresses`, ajout de `searchAddressesNominatim` (extraction du code actuel)
- `.env.local` — ajout de `NEXT_PUBLIC_JOLOF_API_URL`
- (optionnel) `.env.example` si présent — même variable

## Risques et mitigations

| Risque | Probabilité | Mitigation |
|---|---|---|
| Jolof bloque le CORS depuis le navigateur | moyenne | Le fallback Nominatim prend le relai. Si confirmé, basculer plus tard sur l'approche B (proxy Next.js) |
| Format de réponse différent en prod | faible | Validation défensive (`json?.success && Array.isArray(json.data)`) |
| Latence Jolof supérieure à Nominatim | faible | Le debounce 400ms reste en place ; aucune dégradation UX |
| API Jolof retourne `lat`/`lon` en string au lieu de number | faible | `String(item.lat)` est tolérant aux deux types |
