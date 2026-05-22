import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const items: NavItem[] = [
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/support', label: 'Support', icon: '💬' },
  { to: '/knowledge', label: 'Knowledge', icon: '🧠' },
  { to: '/ai-edits', label: 'AI Edits', icon: '✏️' },
  { to: '/flows', label: 'Flows', icon: '🔀' },
  { to: '/actions', label: 'Actions', icon: '⚡' },
  { to: '/triggers', label: 'Triggers', icon: '🎯' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
  { to: '/help', label: 'Help', icon: '❓' },
];

export default function Sidebar() {
  return (
    <aside className="w-20 shrink-0 bg-botscrew-500 text-white flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        <div className="text-[10px] font-bold tracking-wide text-center leading-tight px-1">
          GET<br />SKI<br />BOTS
        </div>
      </div>
      <nav className="flex-1 py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-[10px] transition ${
                isActive ? 'bg-botscrew-700 text-white' : 'text-white/80 hover:bg-botscrew-600'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
