export type ColorTheme = 'teal' | 'saffron' | 'indigo' | 'ruby' | 'monochrome';

export interface ThemePreset {
  id: ColorTheme;
  name: string;
  tagline: string;
  category: string;
  primaryHex: string;
  primaryLightHex: string;
  accentHex: string;
  cssClass: string;
  description: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'teal',
    name: 'Aura Forest',
    tagline: 'Trustworthy & Balanced',
    category: 'Supermarket & Kirana',
    primaryHex: '#0f766e', // Teal 700
    primaryLightHex: '#ccfbf1', // Teal 100
    accentHex: '#f59e0b', // Amber 500
    cssClass: 'theme-teal',
    description: 'Calm, high-trust organic green-teal. Reduces eye strain during 8-hour cashier shifts.',
  },
  {
    id: 'saffron',
    name: 'Kashmir Saffron',
    tagline: 'Warm & Artisanal',
    category: 'Sweets, Bakery & Ethnic Boutique',
    primaryHex: '#c2410c', // Orange 700 / Terracotta
    primaryLightHex: '#ffedd5', // Orange 100
    accentHex: '#eab308', // Yellow 500
    cssClass: 'theme-saffron',
    description: 'Vibrant, welcoming saffron terracotta. Ideal for Indian sweet shops, spice bazaars, and traditional boutiques.',
  },
  {
    id: 'indigo',
    name: 'Indigo Merchant',
    tagline: 'Modern & High-Tech',
    category: 'Electronics & Department Store',
    primaryHex: '#4338ca', // Indigo 700
    primaryLightHex: '#e0e7ff', // Indigo 100
    accentHex: '#06b6d4', // Cyan 500
    cssClass: 'theme-indigo',
    description: 'Crisp, authoritative royal indigo. Gives an ultra-modern fintech terminal feel.',
  },
  {
    id: 'ruby',
    name: 'Ruby Express',
    tagline: 'Energetic & Fast-Paced',
    category: 'Fast Food, QSR & Convenience Mart',
    primaryHex: '#be123c', // Rose 700
    primaryLightHex: '#ffe4e6', // Rose 100
    accentHex: '#f97316', // Orange 500
    cssClass: 'theme-ruby',
    description: 'Bold, high-visibility crimson ruby. Drives fast billing decisions for quick-service retail counters.',
  },
  {
    id: 'monochrome',
    name: 'Nordic Minimal',
    tagline: 'Sleek & Contemporary',
    category: 'Fashion, Lifestyle & Minimalist Cafe',
    primaryHex: '#18181b', // Zinc 900
    primaryLightHex: '#f4f4f5', // Zinc 100
    accentHex: '#10b981', // Emerald 500
    cssClass: 'theme-monochrome',
    description: 'High-contrast studio aesthetic. Clean lines, zero clutter, and ultra-crisp tabular numerals.',
  },
];
