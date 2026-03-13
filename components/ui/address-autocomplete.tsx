'use client';

import React, { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

// Photon/OSM address suggestion
interface PhotonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

export interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

function formatPhotonAddress(props: PhotonFeature['properties']): string {
  const parts: string[] = [];
  if (props.name) parts.push(props.name);
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  }
  if (props.city) parts.push(props.city);
  if (props.state && props.state !== props.city) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return parts.join(', ') || 'Adresse inconnue';
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 2) return [];
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&limit=6&lang=fr&lat=14.6928&lon=-17.4441`,
      {
        headers: {
          'User-Agent': 'SubitoBusiness/1.0 (contact@subitobusiness.com)',
        },
      }
    );
    const data = await res.json();
    const features: PhotonFeature[] = data.features || [];
    return features.map((f) => ({
      display_name: formatPhotonAddress(f.properties),
      lat: String(f.geometry.coordinates[1]),
      lon: String(f.geometry.coordinates[0]),
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
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  iconColor?: string;
  className?: string;
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
      const results = await searchAddresses(text);
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

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <MapPin className={`absolute left-3 top-3 w-4 h-4 ${iconColor}`} />
      <Input
        className="pl-10"
        placeholder={placeholder}
        value={value}
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
  );
}
