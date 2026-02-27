import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Key, BarChart3, Cpu, Users, Settings, LogOut, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'API Keys', path: '/keys', icon: Key },
  { name: 'Usage', path: '/usage', icon: BarChart3 },
  { name: 'Models', path: '/models', icon: Cpu },
  { name: 'Teams', path: '/teams', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-surface-border bg-surface flex flex-col h-full fixed z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-text-primary">NEXUS AI</h1>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">Enterprise</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium text-sm',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-border/50'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-surface-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-border/50 transition-colors cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">John Doe</p>
            <p className="text-xs text-text-secondary truncate">Enterprise Admin</p>
          </div>
          <LogOut className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
        </div>
      </div>
    </aside>
  );
}
