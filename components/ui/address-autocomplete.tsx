'use client';

import React, { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export const COUNTRIES = [
  { code: 'sn', name: 'Senegal', flag: '🇸🇳' },
  { code: 'ci', name: 'Cote d\'Ivoire', flag: '🇨🇮' },
  { code: 'ml', name: 'Mali', flag: '🇲🇱' },
  { code: 'gn', name: 'Guinee', flag: '🇬🇳' },
  { code: 'bf', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'bj', name: 'Benin', flag: '🇧🇯' },
  { code: 'tg', name: 'Togo', flag: '🇹🇬' },
  { code: 'ne', name: 'Niger', flag: '🇳🇪' },
  { code: 'mr', name: 'Mauritanie', flag: '🇲🇷' },
  { code: 'gm', name: 'Gambie', flag: '🇬🇲' },
  { code: 'cm', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'ga', name: 'Gabon', flag: '🇬🇦' },
  { code: 'cg', name: 'Congo', flag: '🇨🇬' },
  { code: 'ma', name: 'Maroc', flag: '🇲🇦' },
  { code: 'tn', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
];

// Helper: convertir un nom de pays en code ISO
export function countryNameToCode(name: string): string {
  const map: Record<string, string> = {
    'senegal': 'sn', 'sénégal': 'sn',
    'cotedivoire': 'ci', "cote d'ivoire": 'ci', "côte d'ivoire": 'ci',
    'mali': 'ml',
    'guinee': 'gn', 'guinée': 'gn',
    'burkina faso': 'bf', 'burkina': 'bf',
    'benin': 'bj', 'bénin': 'bj',
    'togo': 'tg',
    'niger': 'ne',
    'mauritanie': 'mr',
    'gambie': 'gm',
    'cameroun': 'cm',
    'gabon': 'ga',
    'congo': 'cg',
    'maroc': 'ma',
    'tunisie': 'tn',
    'france': 'fr',
  };
  return map[name.toLowerCase()] || 'sn';
}

export async function searchAddresses(query: string, countryCode = 'sn'): Promise<AddressSuggestion[]> {
  if (!query || query.length < 2) return [];
  try {
    const params = new URLSearchParams({
      query,
      limit: '6',
      language: 'fr',
      country: countryCode.toUpperCase(),
    });
    const res = await fetch(`https://map.jolofmobility.com/api/geocoding/autocomplete?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.data)) return [];
    return json.data.map((item: any) => ({
      display_name: item.display_name,
      lat: String(item.lat),
      lon: String(item.lon),
    }));
  } catch {
    return [];
  }
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  iconColor = 'text-green-500',
  className,
  countryCode = 'sn',
  showCountrySelect = false,
  onCountryChange,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  iconColor?: string;
  className?: string;
  countryCode?: string;
  showCountrySelect?: boolean;
  onCountryChange?: (code: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (text: string) => {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchAddresses(text, countryCode);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setLoading(false);
    }, 400);
  };

  const handleSelect = (s: AddressSuggestion) => {
    onSelect(s.display_name, parseFloat(s.lat), parseFloat(s.lon));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode);

  return (
    <div className={className || ''}>
      {showCountrySelect && (
        <div className="mb-2">
          <Select value={countryCode} onValueChange={(val) => onCountryChange?.(val)}>
            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{selectedCountry?.flag}</span>
                <span className="font-medium text-slate-700">{selectedCountry?.name || 'Choisir un pays'}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2.5">
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div ref={containerRef} className="relative">
        <MapPin className={`absolute left-3 top-3 w-4 h-4 ${iconColor}`} />
        <Input
          className="pl-10"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-slate-400" />
        )}
        {showSuggestions && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-slate-100 last:border-0"
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 leading-snug">{s.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
