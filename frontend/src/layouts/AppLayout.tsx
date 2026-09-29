import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, CalendarDays, Megaphone, BarChart3,
  ClipboardList, ScrollText, LogOut, Menu, X,
  ChevronRight, Activity, UserCog, Info
} from 'lucide-react';
import { cn, getInitials, getRoleLabel, getRoleBadgeClass } from '../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    to: '/',             icon: LayoutDashboard, roles: ['PLAYER', 'CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'Today\'s Attendance',to: '/attendance',   icon: ClipboardList,   roles: ['CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'Sessions',     to: '/sessions',     icon: CalendarDays,    roles: ['CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'My Attendance',to: '/my-attendance',icon: Activity,        roles: ['PLAYER'] },
  { label: 'Players',      to: '/players',      icon: Users,           roles: ['CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'Schedule',     to: '/schedule',     icon: CalendarDays,    roles: ['PLAYER', 'CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'Announcements',to: '/announcements',icon: Megaphone,       roles: ['PLAYER', 'CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'Analytics',    to: '/analytics',    icon: BarChart3,       roles: ['CAPTAIN', 'COACH', 'ADMIN'] },
  { label: 'Reports',      to: '/reports',      icon: ScrollText,      roles: ['COACH', 'ADMIN'] },
  { label: 'Staff',        to: '/staff',        icon: UserCog,         roles: ['ADMIN'] },
  { label: 'Audit Logs',   to: '/audit',        icon: ScrollText,      roles: ['ADMIN'] },
  { label: 'About',        to: '/about',        icon: Info,            roles: ['PLAYER', 'CAPTAIN', 'COACH', 'ADMIN'] },
];

function NavItemLink({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
        isActive
          ? 'bg-brand-900/40 text-brand-400 border border-brand-900/40'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon className="w-4.5 h-4.5 flex-shrink-0 w-[18px] h-[18px]" />
      {!collapsed && <span>{item.label}</span>}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-100 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-surface-border">
          {item.label}
        </div>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter(i => user && i.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4 border-b border-surface-border', collapsed && !mobile && 'justify-center')}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/10">
          <img src="/logo.png" alt="AttendX Logo" className="w-full h-full object-contain" />
        </div>
        {(!collapsed || mobile) && (
          <div className="text-xl font-black tracking-tight leading-none">
            <span className="text-zinc-50">Attend</span>
            <span className="text-brand-500">X</span>
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto btn-ghost btn-icon p-1">
            <ChevronRight className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map(item => (
          <NavItemLink key={item.to} item={item} collapsed={collapsed && !mobile} onClick={() => setSidebarOpen(false)} />
        ))}
      </nav>

      {/* User */}
      <div className={cn('p-3 border-t border-surface-border', collapsed && !mobile ? 'flex flex-col items-center gap-2' : 'space-y-2')}>
        <div className={cn('flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-secondary', collapsed && !mobile && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-brand-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand-400">{getInitials(user?.name || '')}</span>
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100 truncate">{user?.name}</p>
              <span className={`${getRoleBadgeClass(user?.role || '')} text-[10px] px-1.5 py-0.5`}>{getRoleLabel(user?.role || '')}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn('btn-ghost btn-sm w-full text-zinc-500 hover:text-red-400', collapsed && !mobile && 'justify-center px-2')}
        >
          <LogOut className="w-3.5 h-3.5" />
          {(!collapsed || mobile) && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col bg-surface-secondary border-r border-surface-border transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-surface-secondary border-r border-surface-border flex flex-col">
            <SidebarContent mobile />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 btn-ghost btn-icon">
              <X className="w-4 h-4" />
            </button>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-surface-secondary border-b border-surface-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden btn-ghost btn-icon">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
              <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
              <div className="w-7 h-7 rounded-full bg-brand-900/50 flex items-center justify-center">
                <span className="text-[11px] font-bold text-brand-400">{getInitials(user?.name || '')}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-zinc-200 leading-none">{user?.name}</p>
                <p className="text-xs text-zinc-500 leading-none mt-0.5">{getRoleLabel(user?.role || '')}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost btn-icon text-zinc-500 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
