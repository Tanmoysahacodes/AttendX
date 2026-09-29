import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Sun, CalendarDays } from 'lucide-react';
import api from '../lib/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { formatDateShort } from '../lib/utils';

export default function Analytics() {
  const { data: trend = [], isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: () => api.get('/stats/trend?limit=60').then(r => r.data.data),
  });

  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats'],
    queryFn: () => api.get('/stats/team').then(r => r.data.data),
  });

  const { data: playerAnalytics = [], isLoading: playersLoading } = useQuery({
    queryKey: ['player-analytics'],
    queryFn: () => api.get('/stats/player-analytics').then(r => r.data.data),
  });

  const isLoading = trendLoading || statsLoading;
  const hasData = trend.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Team Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Deep dive into team attendance performance.</p>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="stat-label">Team Attendance</p>
          <p className="text-3xl font-bold text-brand-400">
            {statsLoading ? '…' :
              teamStats?.teamAttendancePct !== null && teamStats?.teamAttendancePct !== undefined
                ? `${teamStats.teamAttendancePct}%`
                : 'N/A'}
          </p>
          {teamStats?.finalizedSessions === 0 && <p className="text-xs text-zinc-500 mt-1">No finalized sessions</p>}
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Total Sessions</p>
              <p className="text-3xl font-bold text-zinc-100">{statsLoading ? '…' : (teamStats?.finalizedSessions ?? 0)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Finalized</p>
            </div>
            <CalendarDays className="w-5 h-5 text-zinc-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Day Offs</p>
              <p className="text-3xl font-bold text-blue-400">{statsLoading ? '…' : (teamStats?.dayOffCount ?? 0)}</p>
            </div>
            <Sun className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Active Players</p>
              <p className="text-3xl font-bold text-green-400">{statsLoading ? '…' : (teamStats?.activePlayers ?? 0)}</p>
            </div>
            <Users className="w-5 h-5 text-green-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      {!isLoading && !hasData ? (
        <div className="card p-12 text-center">
          <TrendingUp className="w-14 h-14 mx-auto mb-4 text-zinc-700" />
          <p className="text-lg font-semibold text-zinc-400">No finalized attendance data yet.</p>
          <p className="text-sm text-zinc-600 mt-2">Mark and finalize some sessions to see analytics here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" /> Attendance Trend (%)
            </h2>
            {trendLoading ? (
              <div className="h-64 bg-surface-secondary animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={d => formatDateShort(d)} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }} labelFormatter={l => formatDateShort(l as string)} formatter={(v: any) => [`${v}%`, 'Attendance']} />
                  <Line type="monotone" dataKey="pct" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 3 }} name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-6 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" /> Present vs Absent
            </h2>
            {trendLoading ? (
              <div className="h-64 bg-surface-secondary animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={d => formatDateShort(d)} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }} labelFormatter={l => formatDateShort(l as string)} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Player Attendance Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Player Attendance</h2>
          {playerAnalytics.length > 0 && (
            <span className="text-xs text-zinc-500">{playerAnalytics.length} players</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-secondary text-zinc-400 border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium text-center">Present</th>
                <th className="px-4 py-3 font-medium text-center">Absent</th>
                <th className="px-4 py-3 font-medium text-center">Attendance %</th>
                <th className="px-4 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {playersLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-800 rounded" /></td>)}
                  </tr>
                ))
              ) : playerAnalytics.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No player data yet.</td></tr>
              ) : (
                playerAnalytics.map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-400">{p.jerseyNumber ? `#${p.jerseyNumber}` : '—'}</td>
                    <td className="px-4 py-3 font-medium text-zinc-100">{p.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.position || '—'}</td>
                    <td className="px-4 py-3 text-center font-bold text-green-400">{p.presentCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-400">{p.absentCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${p.attendancePct === null ? 'text-zinc-500' : p.attendancePct >= 75 ? 'text-green-400' : p.attendancePct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {p.attendancePct !== null ? `${p.attendancePct}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-32">
                      {p.attendancePct !== null && (
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${p.attendancePct >= 75 ? 'bg-green-500' : p.attendancePct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${p.attendancePct}%` }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
