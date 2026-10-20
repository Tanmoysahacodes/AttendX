import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSquad } from '../context/SquadContext';
import api from '../lib/api';
import { formatDate, getGreeting, getInitials } from '../lib/utils';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardList, TrendingUp, CheckCircle2, XCircle,
  Flame, CalendarDays, Sun,
  Plus, RefreshCw, Shield, Trophy, ChevronRight, Layers, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

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

// ─── Overall Sports Society View (Admin & Sports Officer) ──────────────────────
function OverallSocietyDashboard() {
  const { user } = useAuth();
  const { setActiveSquadId } = useSquad();
  const role = user?.role;

  const { data: overall, isLoading } = useQuery({
    queryKey: ['stats-overall'],
    queryFn: () => api.get('/stats/overall').then(r => r.data.data),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Society Overview Banner */}
      <div className="card p-6 bg-gradient-to-r from-purple-950/30 via-surface-card to-brand-950/20 border-purple-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-800/40 text-purple-300 text-xs font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" /> Sharda Sports Society Dashboard
            </div>
            <h2 className="text-2xl font-black text-zinc-50">Overall Sports Society Analytics</h2>
            <p className="text-zinc-400 text-xs mt-1">
              Multi-sport monitoring across Kabaddi, Badminton, Taekwondo, and society squads.
            </p>
          </div>
          {role === 'ADMIN' ? (
            <Link to="/sports" className="btn-primary btn-sm self-start sm:self-auto">
              <Trophy className="w-4 h-4" /> Manage Sports & Squads
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/30 border border-purple-800/40 text-purple-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" /> Sports Officer View
            </span>
          )}
        </div>
      </div>

      {/* High-Level Society Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Sports" value={overall?.totalSports} icon={Trophy} color="text-purple-400" loading={isLoading} />
        <StatCard label="Total Squads" value={overall?.totalSquads} icon={Layers} color="text-blue-400" loading={isLoading} />
        <StatCard label="Total Players" value={overall?.totalPlayers} icon={Users} color="text-green-400" loading={isLoading} />
        <StatCard
          label="Society Attendance"
          value={overall?.overallAttendancePct !== null && overall?.overallAttendancePct !== undefined ? `${overall.overallAttendancePct}%` : 'N/A'}
          icon={TrendingUp}
          color="text-brand-400"
          loading={isLoading}
        />
      </div>

      {/* Sport-by-Sport Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Sports Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overall?.sports?.map((sp: any) => (
            <div
              key={sp.id}
              className="card p-5 border-surface-border flex flex-col justify-between gap-4 hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: sp.accentColor }} />
                    <h4 className="text-lg font-bold text-zinc-100">{sp.name}</h4>
                  </div>
                  <span className="badge text-xs" style={{ backgroundColor: `${sp.accentColor}20`, color: sp.accentColor }}>
                    {sp.playerCount} Players
                  </span>
                </div>

                {/* Categories & Squads */}
                <div className="space-y-2 pt-2 border-t border-surface-border">
                  {sp.categories?.map((cat: any) => (
                    <div key={cat.id} className="text-xs">
                      <p className="text-zinc-500 font-semibold mb-1 uppercase text-[10px]">{cat.name} Category</p>
                      <div className="space-y-1">
                        {cat.squads?.map((sq: any) => (
                          <div
                            key={sq.id}
                            className="p-2 rounded bg-surface-secondary/70 flex items-center justify-between hover:bg-zinc-800 transition-colors cursor-pointer"
                            onClick={() => setActiveSquadId(sq.id)}
                          >
                            <div>
                              <span className="font-semibold text-zinc-200">{sq.name}</span>
                              <p className="text-[10px] text-zinc-500">{sq.playerCount} players · {sq.finalizedSessions} sessions</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-brand-400">
                                {sq.attendancePct !== null ? `${sq.attendancePct}%` : '—'}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border/50 text-right">
                <span className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1">
                  Click any squad above to view dashboard <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { activeSquad, activeSport, activeCategory, accentColor, isOverallView } = useSquad();
  const role = user?.role;

  // If Admin or Sports Officer chose overall view, show Overall Society Dashboard
  if ((role === 'ADMIN' || role === 'SPORTS_OFFICER') && isOverallView) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <OverallSocietyDashboard />
      </div>
    );
  }

  // ─── Squad Specific Queries (Header x-squad-id & query params applied) ────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats', activeSquad?.id],
    queryFn: () => api.get('/stats/team', { params: { squadId: activeSquad?.id } }).then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: roster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ['players', activeSquad?.id],
    queryFn: () => api.get('/players', { params: { squadId: activeSquad?.id } }).then(r => r.data.data),
    enabled: role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER' || role === 'CAPTAIN',
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', activeSquad?.id],
    queryFn: () => api.get('/attendance/sessions', { params: { squadId: activeSquad?.id } }).then(r => r.data.data),
    enabled: role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER' || role === 'CAPTAIN',
  });

  const { data: trend = [] } = useQuery({
    queryKey: ['trend', activeSquad?.id],
    queryFn: () => api.get('/stats/trend', { params: { limit: 14, squadId: activeSquad?.id } }).then(r => r.data.data),
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

  const todayStatus = stats?.todaySessionStatus;
  const todayId = stats?.todaySessionId;

  // Captains have Admin-equivalent attendance-management within their own squad!
  const canManageAttendance = ['ADMIN', 'COACH', 'SPORTS_OFFICER', 'CAPTAIN'].includes(role || '');

  const TodayAction = () => {
    if (statsLoading) return null;
    if (!todayStatus) {
      if (!canManageAttendance) return null;
      return (
        <Link to="/attendance" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Today's Session
        </Link>
      );
    }
    if (todayStatus === 'OPEN') return (
      <Link to="/attendance" className="btn-primary">
        <ClipboardList className="w-4 h-4" /> Mark Attendance
      </Link>
    );
    if (todayStatus === 'FINALIZED') return (
      canManageAttendance ? (
        <Link to="/attendance" className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Update Attendance
        </Link>
      ) : (
        <Link to={todayId ? `/sessions/${todayId}` : '/sessions'} className="btn-secondary">
          <ClipboardList className="w-4 h-4" /> View Attendance
        </Link>
      )
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
      {/* Header Banner with Active Squad & Accent */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-50">
              {getGreeting()}, {user?.name} 👋
            </h1>
            {activeSquad && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold border inline-flex items-center gap-1.5"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                {activeSport?.name} → {activeCategory?.name} ({activeSquad.name})
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            {formatDate(new Date())} · Sharda Sports Society
          </p>
        </div>
      </div>

      {/* ── Admin / Coach / Sports Officer / Captain View ─────────── */}
      {role !== 'PLAYER' && (
        <>
          {/* Captain Card */}
          <div
            className="card p-5 border"
            style={{ borderColor: `${accentColor}30` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}25` }}
                >
                  <Shield className="w-5 h-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">
                    {activeSquad ? `${activeSquad.name} Captain` : 'Squad Captain'}
                  </p>
                  <p className="text-lg font-bold text-zinc-100 mt-0.5">
                    {currentCaptain ? `${currentCaptain.name} ${currentCaptain.jerseyNumber ? `#${currentCaptain.jerseyNumber}` : ''}` : 'Not Assigned'}
                  </p>
                </div>
              </div>
              {role === 'ADMIN' && (
                <Link to="/sports" className="btn-secondary btn-sm">
                  {currentCaptain ? 'Change Captain' : 'Assign Captain'}
                </Link>
              )}
            </div>
          </div>

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

          {/* Squad Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Active Players" value={stats?.activePlayers} icon={Users} loading={statsLoading} color="text-zinc-100" />
            <StatCard
              label="Squad Attendance"
              value={stats?.teamAttendancePct !== null && stats?.teamAttendancePct !== undefined ? `${stats.teamAttendancePct}%` : (stats?.finalizedSessions === 0 ? 'N/A' : '—')}
              icon={TrendingUp}
              color="text-brand-400"
              loading={statsLoading}
              sub={stats?.finalizedSessions === 0 ? 'No finalized sessions' : undefined}
            />
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
              <Link to="/players" className="btn-secondary btn-sm">
                <Users className="w-3.5 h-3.5" /> Roster
              </Link>
              {role === 'ADMIN' && (
                <Link to="/sports" className="btn-secondary btn-sm">
                  <Trophy className="w-3.5 h-3.5" /> Sports & Squads
                </Link>
              )}
            </div>
          </div>

          {/* Attendance Trend Chart */}
          {trend.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                14-Day Attendance Trend ({activeSquad?.name || 'Squad'})
              </h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="#71717a" fontSize={11} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      labelStyle={{ color: '#e4e4e7' }}
                      formatter={(v: any) => [`${v}%`, 'Attendance']}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke={accentColor}
                      strokeWidth={2.5}
                      dot={{ fill: accentColor, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* New Squad Notice if 0 sessions conducted yet */}
          {stats?.finalizedSessions === 0 && (
            <div className="card p-4 bg-brand-950/20 border-brand-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-brand-300">New Squad Workspace Ready</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {roster.length} registered players in {activeSquad?.name || 'this squad'}. No attendance sessions have been conducted yet.
                </p>
              </div>
              {canManageAttendance && (
                <Link to="/attendance" className="btn-primary btn-sm flex-shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Start First Session
                </Link>
              )}
            </div>
          )}

          {/* Squad Roster Preview */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  {activeSquad?.name || 'Squad'} Roster ({roster.length} Players)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Registered athletes and squad captains in {activeSport?.name} ({activeCategory?.name})
                </p>
              </div>
              <Link to="/players" className="text-xs font-semibold inline-flex items-center gap-1 hover:underline" style={{ color: accentColor }}>
                View Full Roster ({roster.length}) →
              </Link>
            </div>

            {rosterLoading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Loading squad roster...</div>
            ) : roster.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-surface-border rounded-lg">
                No players registered in this squad yet. Click <Link to="/players" className="text-brand-400 font-semibold underline">here to add players</Link> or import CSV.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {roster.slice(0, 6).map((p: any) => (
                  <Link
                    key={p.id}
                    to="/players"
                    className="p-2.5 rounded-lg bg-surface-secondary/60 hover:bg-surface-secondary border border-surface-border/50 hover:border-zinc-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center flex-shrink-0 text-xs font-bold text-zinc-200">
                        {p.jerseyNumber ? `#${p.jerseyNumber}` : getInitials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{p.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {p.position || (p.systemId ? `ID: ${p.systemId}` : 'Athlete')}
                        </p>
                      </div>
                    </div>
                    {p.role === 'CAPTAIN' ? (
                      <span className="badge bg-amber-900/40 text-amber-400 border-amber-900/40 text-[9px] flex-shrink-0">
                        <Shield className="w-2.5 h-2.5 inline mr-1" /> Captain
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-zinc-500 flex-shrink-0">
                        {p.attendancePct !== null ? `${p.attendancePct}%` : '—'}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
            {roster.length > 6 && (
              <div className="mt-3 text-center">
                <Link
                  to="/players"
                  className="text-xs font-semibold px-3 py-1 rounded bg-surface-secondary text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                >
                  +{roster.length - 6} more players · Open complete roster →
                </Link>
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Recent Sessions</h2>
              <Link to="/sessions" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">View all →</Link>
            </div>
            {recentSessions.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">No finalized sessions recorded for this squad yet.</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {recentSessions.map((s: any) => (
                  <Link
                    key={s.id}
                    to={`/sessions/${s.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-surface-secondary/40 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{formatDate(s.date)}</p>
                      <p className="text-xs text-zinc-500">{s.sessionType}</p>
                    </div>
                    <div className="text-right">
                      <span className={`badge text-[10px] ${s.status === 'FINALIZED' ? 'badge-present' : s.status === 'DAY_OFF' ? 'badge-coach' : 'badge-inactive'}`}>
                        {s.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Player View ────────────────────────────────────────────── */}
      {role === 'PLAYER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="My Attendance"
              value={myStats?.attendancePct !== null && myStats?.attendancePct !== undefined ? `${myStats.attendancePct}%` : 'N/A'}
              icon={TrendingUp}
              color="text-brand-400"
            />
            <StatCard label="Present Days" value={myStats?.presentCount ?? 0} icon={CheckCircle2} color="text-green-400" />
            <StatCard label="Absent Days" value={myStats?.absentCount ?? 0} icon={XCircle} color="text-red-400" />
            <StatCard label="Current Streak" value={myStats?.currentStreak ?? 0} icon={Flame} color="text-amber-400" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">My Recent Attendance</h2>
              <Link to="/my-attendance" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">View history →</Link>
            </div>
            {myAttendance.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">No attendance records yet.</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {myAttendance.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-zinc-300">{formatDate(r.session.date)}</span>
                    <span className={`badge text-[10px] ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Announcements</h2>
            <Link to="/announcements" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">View all →</Link>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((a: any) => (
              <div key={a.id} className="p-3 bg-surface-secondary rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-zinc-200">{a.title}</h4>
                  <span className={`badge text-[10px] ${a.priority === 'URGENT' ? 'badge-urgent' : a.priority === 'HIGH' ? 'badge-high' : 'badge-normal'}`}>
                    {a.priority}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}