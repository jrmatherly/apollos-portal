import { BarChart3, Cpu, Key, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUserPhoto } from "../hooks/useUserPhoto";
import { cn } from "../lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "API Keys", path: "/keys", icon: Key },
  { name: "Usage", path: "/usage", icon: BarChart3 },
  { name: "Models", path: "/models", icon: Cpu },
  { name: "Teams", path: "/teams", icon: Users },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const photoUrl = useUserPhoto();

  const displayName = user?.name || "User";
  const displayEmail = user?.username || "";
  const initials = displayName
    .split(" ")
    .filter((s) => s.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="w-64 shrink-0 border-r border-surface-border bg-surface flex flex-col h-full fixed z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <img src="/apollos_new_circle_no_bg_sm.svg" alt="Apollos AI" className="w-8 h-8" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-text-primary">Apollos AI</h1>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">
              Self-Service Portal
            </p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium text-sm",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-border/50",
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
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-border/50 transition-colors cursor-pointer group"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary/50 transition-all"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
            <p className="text-xs text-text-secondary truncate">{displayEmail}</p>
          </div>
          <LogOut className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
        </button>
      </div>
    </aside>
  );
}
