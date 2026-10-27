import { Bell, CircleAlert, Droplet, Droplets, FileText, Flame, FlameKindling, Gauge, Hammer, House, Shield, ShieldCheck, Trash2, Waves, Wifi, Zap } from 'lucide-react';

const ICONS = {
  zap: Zap, droplet: Droplet, droplets: Droplets, waves: Waves, flame: Flame, 'flame-kindling': FlameKindling, house: House,
  'trash-2': Trash2, bell: Bell, wifi: Wifi, shield: Shield, hammer: Hammer, 'circle-alert': CircleAlert, 'shield-check': ShieldCheck,
  'file-text': FileText, gauge: Gauge,
} as const;

/** Значок вида квитанции или ресурса счётчика по имени из src/lib/receipts.ts. */
export function KindIcon({ name, size = 17 }: { name: string; size?: number }) {
  const I = ICONS[name as keyof typeof ICONS] ?? FileText;
  return <I size={size} strokeWidth={1.8} aria-hidden />;
}
