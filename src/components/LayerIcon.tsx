import { Sparkles, MessageCircle, Phone, Mail, type LucideIcon } from 'lucide-react';
import type { LayerId } from '../data/parent';

const ICONS: Record<LayerId, LucideIcon> = {
  parent: Sparkles,
  chat: MessageCircle,
  voice: Phone,
  email: Mail,
};

export function LayerIcon({
  id,
  className = 'h-4 w-4',
}: {
  id: LayerId;
  className?: string;
}) {
  const Icon = ICONS[id];
  return <Icon strokeWidth={1.75} className={className} />;
}
