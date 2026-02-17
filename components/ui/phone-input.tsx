'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const countryCodes = [
  { code: '+221', country: 'SN', flag: '🇸🇳', label: 'Sénégal' },
  { code: '+225', country: 'CI', flag: '🇨🇮', label: "Côte d'Ivoire" },
  { code: '+223', country: 'ML', flag: '🇲🇱', label: 'Mali' },
  { code: '+224', country: 'GN', flag: '🇬🇳', label: 'Guinée' },
  { code: '+226', country: 'BF', flag: '🇧🇫', label: 'Burkina Faso' },
  { code: '+228', country: 'TG', flag: '🇹🇬', label: 'Togo' },
  { code: '+229', country: 'BJ', flag: '🇧🇯', label: 'Bénin' },
  { code: '+227', country: 'NE', flag: '🇳🇪', label: 'Niger' },
  { code: '+222', country: 'MR', flag: '🇲🇷', label: 'Mauritanie' },
  { code: '+220', country: 'GM', flag: '🇬🇲', label: 'Gambie' },
  { code: '+245', country: 'GW', flag: '🇬🇼', label: 'Guinée-Bissau' },
  { code: '+238', country: 'CV', flag: '🇨🇻', label: 'Cap-Vert' },
  { code: '+237', country: 'CM', flag: '🇨🇲', label: 'Cameroun' },
  { code: '+234', country: 'NG', flag: '🇳🇬', label: 'Nigeria' },
  { code: '+212', country: 'MA', flag: '🇲🇦', label: 'Maroc' },
  { code: '+216', country: 'TN', flag: '🇹🇳', label: 'Tunisie' },
  { code: '+33', country: 'FR', flag: '🇫🇷', label: 'France' },
  { code: '+32', country: 'BE', flag: '🇧🇪', label: 'Belgique' },
  { code: '+41', country: 'CH', flag: '🇨🇭', label: 'Suisse' },
  { code: '+1', country: 'US', flag: '🇺🇸', label: 'États-Unis' },
  { code: '+44', country: 'GB', flag: '🇬🇧', label: 'Royaume-Uni' },
];

export interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountryCode = '+221',
  placeholder = '77 123 45 67',
  className,
  error = false,
}: PhoneInputProps) {
  // Parse the current value to extract country code and number
  const parsePhone = (val: string): { countryCode: string; number: string } => {
    if (!val) return { countryCode: defaultCountryCode, number: '' };

    // Try to match a known country code at the start
    const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
    for (const cc of sorted) {
      if (val.startsWith(cc.code)) {
        return { countryCode: cc.code, number: val.slice(cc.code.length).trim() };
      }
    }

    // If starts with +, try to extract code
    if (val.startsWith('+')) {
      const match = val.match(/^(\+\d{1,3})\s*(.*)/);
      if (match) {
        const knownCode = countryCodes.find(c => c.code === match[1]);
        if (knownCode) return { countryCode: match[1], number: match[2] };
      }
    }

    return { countryCode: defaultCountryCode, number: val };
  };

  const { countryCode, number } = parsePhone(value);
  const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

  const handleCodeChange = (newCode: string) => {
    const clean = number.replace(/^\s+/, '');
    onChange(clean ? `${newCode} ${clean}` : '');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s]/g, '');
    onChange(raw ? `${countryCode} ${raw}` : '');
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={countryCode} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-[120px] shrink-0">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{selectedCountry.flag}</span>
              <span className="text-xs text-muted-foreground">{countryCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {countryCodes.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              <span className="flex items-center gap-2">
                <span>{cc.flag}</span>
                <span className="text-sm">{cc.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{cc.code}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="tel"
        placeholder={placeholder}
        value={number}
        onChange={handleNumberChange}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
      />
    </div>
  );
}
