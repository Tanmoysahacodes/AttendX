import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSquad } from '../context/SquadContext';
import {
  LayoutDashboard, Users, CalendarDays, Megaphone, BarChart3,
  ClipboardList, ScrollText, LogOut, Menu, X,
  ChevronRight, Activity, UserCog, Info, Trophy, ChevronDown,
  Check
} from 'lucide-react';
import { cn, getInitials, getRoleLabel, getRoleBadgeClass } from '../lib/utils';
import shardaLogoUrl from '../assets/sharda-sports-society-logo.png';
import SportSquadSelectorModal from '../components/SportSquadSelectorModal';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',     to: '/',             icon: LayoutDashboard, roles: ['PLAYER', 'CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: "Today's Attendance", to: '/attendance', icon: ClipboardList, roles: ['CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'Sessions',      to: '/sessions',     icon: CalendarDays,    roles: ['CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'My Attendance', to: '/my-attendance',icon: Activity,        roles: ['PLAYER'] },
  { label: 'Players',       to: '/players',      icon: Users,           roles: ['CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'Sports & Squads', to: '/sports',     icon: Trophy,          roles: ['ADMIN'] },
  { label: 'Schedule',      to: '/schedule',     icon: CalendarDays,    roles: ['PLAYER', 'CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'Announcements', to: '/announcements',icon: Megaphone,       roles: ['PLAYER', 'CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'Analytics',     to: '/analytics',    icon: BarChart3,       roles: ['CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'Reports',       to: '/reports',      icon: ScrollText,      roles: ['COACH', 'SPORTS_OFFICER', 'ADMIN'] },
  { label: 'Staff',         to: '/staff',        icon: UserCog,         roles: ['ADMIN'] },
  { label: 'Audit Logs',    to: '/audit',        icon: ScrollText,      roles: ['ADMIN'] },
  { label: 'About',         to: '/about',        icon: Info,            roles: ['PLAYER', 'CAPTAIN', 'COACH', 'SPORTS_OFFICER', 'ADMIN'] },
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
          ? 'bg-brand-900/40 text-brand-400 border border-brand-900/40 font-semibold'
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
  const {
    sports,
    activeSquad,
    activeSport,
    activeCategory,
    accentColor,
    isOverallView,
    setIsOverallView,
    setActiveSquadId,
    openSelector,
  } = useSquad();

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSquadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNav = navItems.filter(i => user && i.roles.includes(user.role));
  const canSwitchSquad = user && ['ADMIN', 'COACH', 'SPORTS_OFFICER'].includes(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className={cn('flex items-center gap-3 p-4 border-b border-surface-border', collapsed && !mobile && 'justify-center')}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white/10 p-0.5 border border-white/10 shadow-sm">
          <img src={shardaLogoUrl} alt="Sharda Sports Society" className="w-full h-full object-contain" />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <div className="text-base font-black tracking-tight leading-none text-zinc-100 truncate">
              Sharda Sports
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 font-medium flex items-center gap-1">
              <span>Powered by</span>
              <span className="font-bold text-zinc-200">Attend<span className="text-brand-500">X</span></span>
            </div>
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto btn-ghost btn-icon p-1 text-zinc-400 hover:text-zinc-200">
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

      {/* Current Sport Context Pill (Collapsed or mobile/desktop footer) */}
      {activeSport && (!collapsed || mobile) && (
        <div className="px-3 pb-2">
          <div
            className="p-2.5 rounded-lg border text-xs"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}35`,
            }}
          >
            <div className="flex items-center justify-between text-zinc-300 font-semibold mb-0.5">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                {activeSport.name}
              </span>
              <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/30 text-zinc-400">
                {activeCategory?.name}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {isOverallView ? 'Overall Sports Society' : activeSquad?.name || 'Selected Squad'}
            </p>
          </div>
        </div>
      )}

      {/* User Footer */}
      <div className={cn('p-3 border-t border-surface-border', collapsed && !mobile ? 'flex flex-col items-center gap-2' : 'space-y-2')}>
        <div className={cn('flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-secondary', collapsed && !mobile && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-brand-900/50 flex items-center justify-center flex-shrink-0 border border-brand-500/20">
            <span className="text-xs font-bold text-brand-400">{getInitials(user?.name || '')}</span>
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100 truncate">{user?.name}</p>
              <span className={`${getRoleBadgeClass(user?.role || '')} text-[10px] px-1.5 py-0.5`}>
                {getRoleLabel(user?.role || '')}
              </span>
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
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
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
        <header className="flex items-center gap-3 px-4 py-2.5 bg-surface-secondary border-b border-surface-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden btn-ghost btn-icon">
            <Menu className="w-5 h-5" />
          </button>

          {/* Squad / Sport Switcher Pill */}
          <div className="relative" ref={dropdownRef}>
            {canSwitchSquad ? (
              <button
                onClick={openSelector}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-surface-card hover:bg-zinc-800 transition-colors shadow-xs"
                style={{
                  borderColor: isOverallView ? '#a855f7' : `${accentColor}50`,
                }}
                title="Click to select Sport, Category, and Squad"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: isOverallView ? '#a855f7' : accentColor }}
                />
                <span className="text-zinc-200">
                  {isOverallView
                    ? 'Overall Society Dashboard'
                    : `${activeSport?.name || 'Sport'} → ${activeCategory?.name || ''}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
              </button>
            ) : (
              /* Player / Captain fixed squad badge */
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-surface-card"
                style={{ borderColor: `${accentColor}50` }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                <span className="text-zinc-200">
                  {activeSport?.name} → {activeCategory?.name}
                </span>
              </div>
            )}

            {/* Dropdown Menu for Staff */}
            {canSwitchSquad && squadDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-xl bg-surface-card border border-surface-border shadow-2xl z-50 p-2 space-y-2 animate-slide-up">
                {/* Admin Overall View Option */}
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setIsOverallView(true);
                      setSquadDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-colors',
                      isOverallView
                        ? 'bg-purple-950/40 text-purple-300 border border-purple-800/40'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      Overall Sports Society
                    </span>
                    {isOverallView && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                )}

                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 pt-1">
                  Sports & Squads
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {sports.map(sport => (
                    <div key={sport.id} className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-zinc-300">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sport.accentColor }} />
                        {sport.name}
                      </div>

                      {sport.categories?.map(cat => (
                        <div key={cat.id} className="pl-3 space-y-0.5">
                          {cat.squads?.map(squad => {
                            const isSelected = !isOverallView && activeSquad?.id === squad.id;
                            return (
                              <button
                                key={squad.id}
                                onClick={() => {
                                  setActiveSquadId(squad.id);
                                  setSquadDropdownOpen(false);
                                }}
                                className={cn(
                                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
                                  isSelected
                                    ? 'bg-zinc-800 text-zinc-100 font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                )}
                              >
                                <span>{cat.name} ({squad.name})</span>
                                {isSelected && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: sport.accentColor }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
              <div className="w-7 h-7 rounded-full bg-brand-900/50 flex items-center justify-center border border-brand-500/20">
                <span className="text-[11px] font-bold text-brand-400">{getInitials(user?.name || '')}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-zinc-200 leading-none">{user?.name}</p>
                <p className="text-[10px] text-zinc-500 leading-none mt-1">{getRoleLabel(user?.role || '')}</p>
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

      {/* Sport & Squad Selector Modal */}
      <SportSquadSelectorModal />
    </div>
  );
}
