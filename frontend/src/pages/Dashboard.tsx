import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { formatDate, getInitials, getRoleLabel } from '../lib/utils';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardList, TrendingUp, CheckCircle2, XCircle,
  UserPlus, Activity, Flame, CalendarDays, Sun, Lock,
  Plus, RefreshCw, Shield
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { getGreeting } from '../lib/utils';

function StatCard({ label, value, icon: Icon, color = 'text-zinc-300', sub, loading }: {
  label: string; value: any; icon?: React.ElementType; color?: string; sub?: string; loading?: boolean;
}) {
  if (loading) return <div className="stat-card animate-pulse"><div className="h-4 bg-zinc-800 rounded w-20 mb-2" /><div className="h-8 bg-zinc-800 rounded w-16" /></div>;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className={`stat-value ${color}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
        {Icon && <div className="p-2 bg-surface-secondary rounded-lg"><Icon className={`w-5 h-5 ${color}`} /></div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;


  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats'],
    queryFn: () => api.get('/stats/team').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.get('/players').then(r => r.data.data),
    enabled: role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER' || role === 'CAPTAIN',
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/attendance/sessions').then(r => r.data.data),
    enabled: role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER' || role === 'CAPTAIN',
  });

  const { data: trend = [] } = useQuery({
    queryKey: ['trend'],
    queryFn: () => api.get('/stats/trend?limit=14').then(r => r.data.data),
    enabled: role !== 'PLAYER',
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data.data),
  });

  // Player own stats
  const { data: myStats } = useQuery({
    queryKey: ['my-stats', user?.id],
    enabled: !!user && role === 'PLAYER',
    queryFn: () => api.get(`/players/${user!.id}`).then(r => r.data.data),
  });

  const { data: myAttendance = [] } = useQuery({
    queryKey: ['my-attendance', user?.id],
    enabled: !!user && role === 'PLAYER',
    queryFn: () => api.get(`/players/${user!.id}/attendance`).then(r => r.data.data),
  });

  const currentCaptain = roster.find((p: any) => p.role === 'CAPTAIN');
  const recentSessions = sessions.slice(0, 5);

  // Determine today's session status and action
  const todayStatus = stats?.todaySessionStatus;
  const todayId = stats?.todaySessionId;

  const TodayAction = () => {
    if (statsLoading) return null;
    // CAPTAIN is view-only; SPORTS_OFFICER gets same access as COACH
    const isCaptain = role === 'CAPTAIN';
    if (!todayStatus) {
      if (isCaptain) return null;
      return (
        <Link to="/attendance" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Today's Session
        </Link>
      );
    }
    if (todayStatus === 'OPEN') return (
      isCaptain
        ? <Link to={todayId ? `/sessions/${todayId}` : '/attendance'} className="btn-secondary">
            <ClipboardList className="w-4 h-4" /> View Session
          </Link>
        : <Link to="/attendance" className="btn-primary">
            <ClipboardList className="w-4 h-4" /> Mark Attendance
          </Link>
    );
    if (todayStatus === 'FINALIZED') return (
      isCaptain
        ? <Link to={todayId ? `/sessions/${todayId}` : '/sessions'} className="btn-secondary">
            <ClipboardList className="w-4 h-4" /> View Attendance
          </Link>
        : <Link to="/attendance" className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Update Attendance
          </Link>
    );
    if (todayStatus === 'DAY_OFF') return (
      <Link to={todayId ? `/sessions/${todayId}` : '/sessions'} className="btn-secondary">
        <Sun className="w-4 h-4" /> View Day Off
      </Link>
    );
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-zinc-50">
          {getGreeting()}, {user?.name} 👋
        </h1>
        <p className="text-zinc-500 text-sm mt-1">{formatDate(new Date())}</p>
      </div>

      {/* ── Admin / Coach / Captain ──────────────────────────────── */}
      {(role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER' || role === 'CAPTAIN') && (
        <>
          {/* Captain Card for Admin */}
          {role === 'ADMIN' && (
            <div className="card p-5 border-amber-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Current Captain</p>
                    <p className="text-lg font-bold text-zinc-100 mt-0.5">
                      {currentCaptain ? `${currentCaptain.name} #${currentCaptain.jerseyNumber || ''}` : 'Not Assigned'}
                    </p>
                  </div>
                </div>
                <Link to="/players" className="btn-secondary btn-sm">
                  {currentCaptain ? 'Change Captain' : 'Assign Captain'}
                </Link>
              </div>
            </div>
          )}

          {/* Today's Attendance Summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Today's Attendance</h2>
              <TodayAction />
            </div>
            {statsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-surface-secondary rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface-secondary rounded-lg text-center">
                  <p className="text-xs text-zinc-500 uppercase">Present</p>
                  <p className="text-2xl font-bold text-green-400">{stats?.todayPresent ?? 0}</p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg text-center">
                  <p className="text-xs text-zinc-500 uppercase">Absent</p>
                  <p className="text-2xl font-bold text-red-400">{stats?.todayAbsent ?? 0}</p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg text-center">
                  <p className="text-xs text-zinc-500 uppercase">Total Marked</p>
                  <p className="text-2xl font-bold text-zinc-300">{stats?.todayTotal ?? 0}</p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg text-center">
                  <p className="text-xs text-zinc-500 uppercase">Session</p>
                  <p className={`text-sm font-bold mt-1 ${
                    todayStatus === 'FINALIZED' ? 'text-green-400' :
                    todayStatus === 'OPEN' ? 'text-amber-400' :
                    todayStatus === 'DAY_OFF' ? 'text-blue-400' :
                    'text-zinc-500'
                  }`}>
                    {todayStatus === 'DAY_OFF' ? 'DAY OFF' : todayStatus || 'NONE'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Team Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Active Players" value={stats?.activePlayers} icon={Users} loading={statsLoading} color="text-zinc-100" />
            <StatCard label="Team Attendance" value={stats?.teamAttendancePct !== null && stats?.teamAttendancePct !== undefined ? `${stats.teamAttendancePct}%` : (stats?.finalizedSessions === 0 ? 'N/A' : '—')} icon={TrendingUp} color="text-brand-400" loading={statsLoading} sub={stats?.finalizedSessions === 0 ? 'No finalized sessions' : undefined} />
            <StatCard label="Sessions" value={stats?.finalizedSessions} icon={ClipboardList} loading={statsLoading} sub="Finalized" />
            <StatCard label="Day Offs" value={stats?.dayOffCount ?? 0} icon={Sun} color="text-blue-400" loading={statsLoading} />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <TodayAction />
              <Link to="/sessions" className="btn-secondary btn-sm">
                <CalendarDays className="w-3.5 h-3.5" /> Sessions
              </Link>
              {role === 'ADMIN' && (
                <Link to="/players" className="btn-secondary btn-sm">
                  <UserPlus className="w-3.5 h-3.5" /> Players
                </Link>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Recent Sessions</h2>
                <Link to="/sessions" className="btn-ghost btn-sm text-xs">View All →</Link>
              </div>
              <div className="space-y-2">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                    <div className="flex items-center gap-3">
                      {s.status === 'DAY_OFF' ? <Sun className="w-4 h-4 text-blue-400" /> : <ClipboardList className="w-4 h-4 text-zinc-500" />}
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{formatDate(s.date)}</p>
                        {s.status === 'DAY_OFF' && <p className="text-xs text-blue-400">Day Off: {s.dayOffReason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.status !== 'DAY_OFF' && (
                        <span className="text-sm">
                          <span className="text-green-400 font-bold">{s.presentCount}</span>
                          <span className="text-zinc-600"> / </span>
                          <span className="text-red-400 font-bold">{s.absentCount}</span>
                        </span>
                      )}
                      <span className={`badge text-[10px] ${
                        s.status === 'FINALIZED' ? 'badge-present' :
                        s.status === 'DAY_OFF' ? 'bg-blue-900/40 text-blue-400 border-blue-900/40' :
                        'bg-amber-900/30 text-amber-400 border-amber-900/40'
                      }`}>
                        {s.status === 'DAY_OFF' ? <><Sun className="w-2.5 h-2.5" /> OFF</> :
                         s.status === 'FINALIZED' ? <><Lock className="w-2.5 h-2.5" /> DONE</> : 'OPEN'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }} formatter={(v: any) => [v, '']} labelFormatter={l => new Date(l as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                  <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} dot={false} name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {trend.length === 0 && !statsLoading && (
            <div className="card p-8 text-center text-zinc-500">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <p>No finalized attendance data yet.</p>
              <p className="text-xs mt-1">Start marking and finalizing sessions to see the trend.</p>
            </div>
          )}
        </>
      )}

      {/* ── Player Dashboard ──────────────────────────────────── */}
      {role === 'PLAYER' && (
        <>
          {/* Player Hero */}
          <div className="card p-6 flex items-center gap-5 border-brand-900/30">
            <div className="w-16 h-16 rounded-2xl bg-brand-900/40 border border-brand-800/50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-brand-400">
                {user?.jerseyNumber ? `#${user.jerseyNumber}` : getInitials(user?.name || '')}
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">{getRoleLabel(role)}</p>
              <h2 className="text-2xl font-bold text-zinc-50">{user?.name}</h2>
              {user?.jerseyNumber && <p className="text-brand-500 text-sm font-semibold">Jersey #{user.jerseyNumber}</p>}
            </div>
          </div>

          {/* My Attendance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card">
              <p className="stat-label">Attendance</p>
              <p className="text-3xl font-bold text-brand-400">{myStats?.attendancePct !== null && myStats?.attendancePct !== undefined ? `${myStats.attendancePct}%` : 'N/A'}</p>
            </div>
            <StatCard label="Present" value={myStats?.presentCount ?? 0} icon={CheckCircle2} color="text-green-400" />
            <StatCard label="Absent" value={myStats?.absentCount ?? 0} icon={XCircle} color="text-red-400" />
            <StatCard label="Sessions" value={myStats?.totalSessions ?? 0} icon={ClipboardList} />
          </div>

          {/* Streak */}
          {myStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="card-sm p-4 flex items-center gap-3">
                <Flame className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="stat-label">Current Streak</p>
                  <p className="text-2xl font-bold text-orange-400">{myStats.currentStreak} <span className="text-sm text-zinc-500">sessions</span></p>
                </div>
              </div>
              <div className="card-sm p-4 flex items-center gap-3">
                <Activity className="w-6 h-6 text-amber-500" />
                <div>
                  <p className="stat-label">Best Streak</p>
                  <p className="text-2xl font-bold text-amber-400">{myStats.bestStreak} <span className="text-sm text-zinc-500">sessions</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Attendance */}
          {myAttendance.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent Attendance</h2>
              <div className="space-y-2">
                {myAttendance.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                    <span className="text-sm text-zinc-300">{formatDate(r.session.date)}</span>
                    {r.session.status === 'DAY_OFF' ? (
                      <span className="badge bg-blue-900/40 text-blue-400 border-blue-900/40">
                        <Sun className="w-3 h-3 mr-1" /> Day Off
                      </span>
                    ) : (
                      <span className={r.status === 'PRESENT' ? 'badge badge-present' : 'badge badge-absent'}>
                        {r.status === 'PRESENT' ? '✓ Present' : '✕ Absent'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <Link to="/my-attendance" className="btn-ghost btn-sm mt-3">View All →</Link>
            </div>
          )}
        </>
      )}

      {/* Announcements (all roles) */}
      {announcements.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Announcements</h2>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((a: any) => (
              <div key={a.id} className="flex gap-3 p-3 bg-surface-secondary rounded-lg border border-surface-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-zinc-200">{a.title}</p>
                    <span className={`badge text-[10px] px-1.5 py-0 ${a.priority === 'URGENT' ? 'badge-urgent' : a.priority === 'HIGH' ? 'badge-high' : 'badge-normal'}`}>{a.priority}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/announcements" className="btn-ghost btn-sm mt-3">View All →</Link>
        </div>
      )}
    </div>
  );
}