'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

interface CountryCode {
  code: string;
  country: string;
  flag: string;
  label: string;
}

const countryCodes: CountryCode[] = [
  // Afrique de l'Ouest
  { code: '+221', country: 'SN', flag: '\u{1F1F8}\u{1F1F3}', label: 'S\u00e9n\u00e9gal' },
  { code: '+225', country: 'CI', flag: '\u{1F1E8}\u{1F1EE}', label: "C\u00f4te d'Ivoire" },
  { code: '+223', country: 'ML', flag: '\u{1F1F2}\u{1F1F1}', label: 'Mali' },
  { code: '+224', country: 'GN', flag: '\u{1F1EC}\u{1F1F3}', label: 'Guin\u00e9e' },
  { code: '+226', country: 'BF', flag: '\u{1F1E7}\u{1F1EB}', label: 'Burkina Faso' },
  { code: '+228', country: 'TG', flag: '\u{1F1F9}\u{1F1EC}', label: 'Togo' },
  { code: '+229', country: 'BJ', flag: '\u{1F1E7}\u{1F1EF}', label: 'B\u00e9nin' },
  { code: '+227', country: 'NE', flag: '\u{1F1F3}\u{1F1EA}', label: 'Niger' },
  { code: '+222', country: 'MR', flag: '\u{1F1F2}\u{1F1F7}', label: 'Mauritanie' },
  { code: '+220', country: 'GM', flag: '\u{1F1EC}\u{1F1F2}', label: 'Gambie' },
  { code: '+245', country: 'GW', flag: '\u{1F1EC}\u{1F1FC}', label: 'Guin\u00e9e-Bissau' },
  { code: '+238', country: 'CV', flag: '\u{1F1E8}\u{1F1FB}', label: 'Cap-Vert' },
  { code: '+232', country: 'SL', flag: '\u{1F1F8}\u{1F1F1}', label: 'Sierra Leone' },
  { code: '+231', country: 'LR', flag: '\u{1F1F1}\u{1F1F7}', label: 'Lib\u00e9ria' },
  { code: '+233', country: 'GH', flag: '\u{1F1EC}\u{1F1ED}', label: 'Ghana' },
  { code: '+234', country: 'NG', flag: '\u{1F1F3}\u{1F1EC}', label: 'Nigeria' },
  // Afrique Centrale
  { code: '+237', country: 'CM', flag: '\u{1F1E8}\u{1F1F2}', label: 'Cameroun' },
  { code: '+241', country: 'GA', flag: '\u{1F1EC}\u{1F1E6}', label: 'Gabon' },
  { code: '+242', country: 'CG', flag: '\u{1F1E8}\u{1F1EC}', label: 'Congo' },
  { code: '+243', country: 'CD', flag: '\u{1F1E8}\u{1F1E9}', label: 'RD Congo' },
  { code: '+235', country: 'TD', flag: '\u{1F1F9}\u{1F1E9}', label: 'Tchad' },
  { code: '+236', country: 'CF', flag: '\u{1F1E8}\u{1F1EB}', label: 'R\u00e9publique centrafricaine' },
  { code: '+240', country: 'GQ', flag: '\u{1F1EC}\u{1F1F6}', label: 'Guin\u00e9e \u00e9quatoriale' },
  // Afrique de l'Est
  { code: '+254', country: 'KE', flag: '\u{1F1F0}\u{1F1EA}', label: 'Kenya' },
  { code: '+255', country: 'TZ', flag: '\u{1F1F9}\u{1F1FF}', label: 'Tanzanie' },
  { code: '+256', country: 'UG', flag: '\u{1F1FA}\u{1F1EC}', label: 'Ouganda' },
  { code: '+250', country: 'RW', flag: '\u{1F1F7}\u{1F1FC}', label: 'Rwanda' },
  { code: '+257', country: 'BI', flag: '\u{1F1E7}\u{1F1EE}', label: 'Burundi' },
  { code: '+251', country: 'ET', flag: '\u{1F1EA}\u{1F1F9}', label: '\u00c9thiopie' },
  { code: '+252', country: 'SO', flag: '\u{1F1F8}\u{1F1F4}', label: 'Somalie' },
  { code: '+253', country: 'DJ', flag: '\u{1F1E9}\u{1F1EF}', label: 'Djibouti' },
  { code: '+291', country: 'ER', flag: '\u{1F1EA}\u{1F1F7}', label: '\u00c9rythr\u00e9e' },
  // Afrique Australe
  { code: '+27', country: 'ZA', flag: '\u{1F1FF}\u{1F1E6}', label: 'Afrique du Sud' },
  { code: '+258', country: 'MZ', flag: '\u{1F1F2}\u{1F1FF}', label: 'Mozambique' },
  { code: '+260', country: 'ZM', flag: '\u{1F1FF}\u{1F1F2}', label: 'Zambie' },
  { code: '+263', country: 'ZW', flag: '\u{1F1FF}\u{1F1FC}', label: 'Zimbabwe' },
  { code: '+267', country: 'BW', flag: '\u{1F1E7}\u{1F1FC}', label: 'Botswana' },
  { code: '+264', country: 'NA', flag: '\u{1F1F3}\u{1F1E6}', label: 'Namibie' },
  { code: '+261', country: 'MG', flag: '\u{1F1F2}\u{1F1EC}', label: 'Madagascar' },
  { code: '+230', country: 'MU', flag: '\u{1F1F2}\u{1F1FA}', label: 'Maurice' },
  // Afrique du Nord
  { code: '+212', country: 'MA', flag: '\u{1F1F2}\u{1F1E6}', label: 'Maroc' },
  { code: '+213', country: 'DZ', flag: '\u{1F1E9}\u{1F1FF}', label: 'Alg\u00e9rie' },
  { code: '+216', country: 'TN', flag: '\u{1F1F9}\u{1F1F3}', label: 'Tunisie' },
  { code: '+218', country: 'LY', flag: '\u{1F1F1}\u{1F1FE}', label: 'Libye' },
  { code: '+20', country: 'EG', flag: '\u{1F1EA}\u{1F1EC}', label: '\u00c9gypte' },
  { code: '+249', country: 'SD', flag: '\u{1F1F8}\u{1F1E9}', label: 'Soudan' },
  // Europe
  { code: '+33', country: 'FR', flag: '\u{1F1EB}\u{1F1F7}', label: 'France' },
  { code: '+32', country: 'BE', flag: '\u{1F1E7}\u{1F1EA}', label: 'Belgique' },
  { code: '+41', country: 'CH', flag: '\u{1F1E8}\u{1F1ED}', label: 'Suisse' },
  { code: '+44', country: 'GB', flag: '\u{1F1EC}\u{1F1E7}', label: 'Royaume-Uni' },
  { code: '+49', country: 'DE', flag: '\u{1F1E9}\u{1F1EA}', label: 'Allemagne' },
  { code: '+34', country: 'ES', flag: '\u{1F1EA}\u{1F1F8}', label: 'Espagne' },
  { code: '+39', country: 'IT', flag: '\u{1F1EE}\u{1F1F9}', label: 'Italie' },
  { code: '+351', country: 'PT', flag: '\u{1F1F5}\u{1F1F9}', label: 'Portugal' },
  { code: '+31', country: 'NL', flag: '\u{1F1F3}\u{1F1F1}', label: 'Pays-Bas' },
  { code: '+46', country: 'SE', flag: '\u{1F1F8}\u{1F1EA}', label: 'Su\u00e8de' },
  { code: '+47', country: 'NO', flag: '\u{1F1F3}\u{1F1F4}', label: 'Norv\u00e8ge' },
  { code: '+45', country: 'DK', flag: '\u{1F1E9}\u{1F1F0}', label: 'Danemark' },
  { code: '+358', country: 'FI', flag: '\u{1F1EB}\u{1F1EE}', label: 'Finlande' },
  { code: '+48', country: 'PL', flag: '\u{1F1F5}\u{1F1F1}', label: 'Pologne' },
  { code: '+43', country: 'AT', flag: '\u{1F1E6}\u{1F1F9}', label: 'Autriche' },
  { code: '+30', country: 'GR', flag: '\u{1F1EC}\u{1F1F7}', label: 'Gr\u00e8ce' },
  { code: '+353', country: 'IE', flag: '\u{1F1EE}\u{1F1EA}', label: 'Irlande' },
  { code: '+352', country: 'LU', flag: '\u{1F1F1}\u{1F1FA}', label: 'Luxembourg' },
  { code: '+40', country: 'RO', flag: '\u{1F1F7}\u{1F1F4}', label: 'Roumanie' },
  { code: '+420', country: 'CZ', flag: '\u{1F1E8}\u{1F1FF}', label: 'Tch\u00e9quie' },
  { code: '+36', country: 'HU', flag: '\u{1F1ED}\u{1F1FA}', label: 'Hongrie' },
  { code: '+7', country: 'RU', flag: '\u{1F1F7}\u{1F1FA}', label: 'Russie' },
  { code: '+380', country: 'UA', flag: '\u{1F1FA}\u{1F1E6}', label: 'Ukraine' },
  // Ameriques
  { code: '+1', country: 'US', flag: '\u{1F1FA}\u{1F1F8}', label: '\u00c9tats-Unis' },
  { code: '+1', country: 'CA', flag: '\u{1F1E8}\u{1F1E6}', label: 'Canada' },
  { code: '+52', country: 'MX', flag: '\u{1F1F2}\u{1F1FD}', label: 'Mexique' },
  { code: '+55', country: 'BR', flag: '\u{1F1E7}\u{1F1F7}', label: 'Br\u00e9sil' },
  { code: '+54', country: 'AR', flag: '\u{1F1E6}\u{1F1F7}', label: 'Argentine' },
  { code: '+57', country: 'CO', flag: '\u{1F1E8}\u{1F1F4}', label: 'Colombie' },
  { code: '+56', country: 'CL', flag: '\u{1F1E8}\u{1F1F1}', label: 'Chili' },
  { code: '+51', country: 'PE', flag: '\u{1F1F5}\u{1F1EA}', label: 'P\u00e9rou' },
  { code: '+58', country: 'VE', flag: '\u{1F1FB}\u{1F1EA}', label: 'Venezuela' },
  { code: '+593', country: 'EC', flag: '\u{1F1EA}\u{1F1E8}', label: '\u00c9quateur' },
  { code: '+509', country: 'HT', flag: '\u{1F1ED}\u{1F1F9}', label: 'Ha\u00efti' },
  // Asie
  { code: '+86', country: 'CN', flag: '\u{1F1E8}\u{1F1F3}', label: 'Chine' },
  { code: '+91', country: 'IN', flag: '\u{1F1EE}\u{1F1F3}', label: 'Inde' },
  { code: '+81', country: 'JP', flag: '\u{1F1EF}\u{1F1F5}', label: 'Japon' },
  { code: '+82', country: 'KR', flag: '\u{1F1F0}\u{1F1F7}', label: 'Cor\u00e9e du Sud' },
  { code: '+90', country: 'TR', flag: '\u{1F1F9}\u{1F1F7}', label: 'Turquie' },
  { code: '+966', country: 'SA', flag: '\u{1F1F8}\u{1F1E6}', label: 'Arabie saoudite' },
  { code: '+971', country: 'AE', flag: '\u{1F1E6}\u{1F1EA}', label: '\u00c9mirats arabes unis' },
  { code: '+974', country: 'QA', flag: '\u{1F1F6}\u{1F1E6}', label: 'Qatar' },
  { code: '+961', country: 'LB', flag: '\u{1F1F1}\u{1F1E7}', label: 'Liban' },
  { code: '+962', country: 'JO', flag: '\u{1F1EF}\u{1F1F4}', label: 'Jordanie' },
  { code: '+964', country: 'IQ', flag: '\u{1F1EE}\u{1F1F6}', label: 'Irak' },
  { code: '+92', country: 'PK', flag: '\u{1F1F5}\u{1F1F0}', label: 'Pakistan' },
  { code: '+880', country: 'BD', flag: '\u{1F1E7}\u{1F1E9}', label: 'Bangladesh' },
  { code: '+60', country: 'MY', flag: '\u{1F1F2}\u{1F1FE}', label: 'Malaisie' },
  { code: '+62', country: 'ID', flag: '\u{1F1EE}\u{1F1E9}', label: 'Indon\u00e9sie' },
  { code: '+63', country: 'PH', flag: '\u{1F1F5}\u{1F1ED}', label: 'Philippines' },
  { code: '+66', country: 'TH', flag: '\u{1F1F9}\u{1F1ED}', label: 'Tha\u00eflande' },
  { code: '+84', country: 'VN', flag: '\u{1F1FB}\u{1F1F3}', label: 'Vietnam' },
  { code: '+65', country: 'SG', flag: '\u{1F1F8}\u{1F1EC}', label: 'Singapour' },
  // Oceanie
  { code: '+61', country: 'AU', flag: '\u{1F1E6}\u{1F1FA}', label: 'Australie' },
  { code: '+64', country: 'NZ', flag: '\u{1F1F3}\u{1F1FF}', label: 'Nouvelle-Z\u00e9lande' },
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
  const [open, setOpen] = React.useState(false);

  const parsePhone = (val: string): { countryCode: string; countryId: string; number: string } => {
    if (!val) {
      const def = countryCodes.find(c => c.code === defaultCountryCode) || countryCodes[0];
      return { countryCode: def.code, countryId: def.country, number: '' };
    }

    const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
    for (const cc of sorted) {
      if (val.startsWith(cc.code)) {
        return { countryCode: cc.code, countryId: cc.country, number: val.slice(cc.code.length).trim() };
      }
    }

    if (val.startsWith('+')) {
      const match = val.match(/^(\+\d{1,4})\s*(.*)/);
      if (match) {
        const knownCode = countryCodes.find(c => c.code === match[1]);
        if (knownCode) return { countryCode: match[1], countryId: knownCode.country, number: match[2] };
      }
    }

    const def = countryCodes.find(c => c.code === defaultCountryCode) || countryCodes[0];
    return { countryCode: def.code, countryId: def.country, number: val };
  };

  const { countryCode, countryId, number } = parsePhone(value);
  const selectedCountry = countryCodes.find(c => c.code === countryCode && c.country === countryId)
    || countryCodes.find(c => c.code === countryCode)
    || countryCodes[0];

  const handleCountrySelect = (cc: CountryCode) => {
    const clean = number.replace(/^\s+/, '');
    onChange(clean ? `${cc.code} ${clean}` : '');
    setOpen(false);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s]/g, '');
    onChange(raw ? `${countryCode} ${raw}` : '');
  };

  return (
    <div className={cn('flex gap-0', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex h-9 items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted/50 px-2.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              error && 'border-red-500'
            )}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-xs text-muted-foreground font-medium">{selectedCountry.code}</span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un pays..." />
            <CommandList>
              <CommandEmpty>Aucun pays trouv\u00e9.</CommandEmpty>
              <CommandGroup>
                {countryCodes.map((cc) => (
                  <CommandItem
                    key={`${cc.country}-${cc.code}`}
                    value={`${cc.label} ${cc.country} ${cc.code}`}
                    onSelect={() => handleCountrySelect(cc)}
                    className="cursor-pointer"
                  >
                    <span className="text-base mr-1">{cc.flag}</span>
                    <span className="text-sm truncate">{cc.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{cc.code}</span>
                    {cc.code === countryCode && cc.country === selectedCountry.country && (
                      <Check className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <input
        type="tel"
        placeholder={placeholder}
        value={number}
        onChange={handleNumberChange}
        className={cn(
          'flex h-9 w-full rounded-r-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
      />
    </div>
  );
}
