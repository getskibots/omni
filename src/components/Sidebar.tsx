import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  Lightbulb,
  MessageSquareText,
  Shuffle,
  Wand2,
  MessagesSquare,
  Headphones,
  MessageSquare,
  SlidersHorizontal,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const items: NavItem[] = [
  { to: '/analytics', label: 'Analytics', Icon: TrendingUp },
  { to: '/knowledge', label: 'Knowledge', Icon: Lightbulb },
  { to: '/ai-edits', label: 'AI Edits', Icon: MessageSquareText },
  { to: '/flows', label: 'Flows', Icon: Shuffle },
  { to: '/actions', label: 'Actions', Icon: Wand2 },
  { to: '/triggers', label: 'Triggers', Icon: MessagesSquare },
  { to: '/support', label: 'Support', Icon: Headphones },
  { to: '/widget', label: 'Widget', Icon: MessageSquare },
  { to: '/settings', label: 'Settings', Icon: SlidersHorizontal },
  { to: '/help', label: 'Help', Icon: CircleHelp },
];

export default function Sidebar() {
  return (
    <aside className="w-[104px] shrink-0 bg-botscrew-500 text-white flex flex-col">
      <div className="px-3 pt-4 pb-3 flex flex-col items-center">
        <img src={logoUrl} alt="Get Ski Bots" className="w-[72px] h-auto" />
      </div>
      <nav className="flex-1 py-2">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1.5 py-4 transition ${
                isActive
                  ? 'bg-botscrew-700 text-white'
                  : 'text-white/90 hover:bg-botscrew-600'
              }`
            }
          >
            <Icon strokeWidth={1.75} className="h-5 w-5" />
            <span className="text-[11px] leading-tight">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
