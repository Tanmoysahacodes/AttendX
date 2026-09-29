import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Sun, Lock, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function AttendanceSessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  const [form, setForm] = useState({ date: todayStr, sessionType: 'PRACTICE', title: '', notes: '', location: '' });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/attendance/sessions').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/attendance/sessions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowCreateModal(false);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create session.'),
  });

  const role = user?.role;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Attendance Sessions</h1>
          <p className="text-zinc-500 text-sm mt-1">All historical and current practice sessions.</p>
        </div>
        {(role === 'ADMIN' || role === 'COACH' || role === 'CAPTAIN') && (
          <div className="flex gap-2">
            <Link to="/attendance" className="btn-secondary btn-sm">
              <CalendarDays className="w-4 h-4" /> Today
            </Link>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Session
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="card overflow-hidden animate-pulse">
          <div className="h-12 bg-surface-secondary" />
          {[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-card border-t border-surface-border" />)}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-secondary text-zinc-400 border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-center">Present</th>
                  <th className="px-4 py-3 font-medium text-center">Absent</th>
                  <th className="px-4 py-3 font-medium text-center">Attendance %</th>
                  <th className="px-4 py-3 font-medium">Marked By</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {sessions.length === 0 ? (
                  <tr><td colSpan={8} className="p-10 text-center text-zinc-500">
                    No sessions yet.
                    {(role === 'ADMIN' || role === 'COACH' || role === 'CAPTAIN') && (
                      <button onClick={() => setShowCreateModal(true)} className="btn-primary ml-4">
                        <Plus className="w-4 h-4" /> Create First Session
                      </button>
                    )}
                  </td></tr>
                ) : sessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-100">{formatDate(s.date)}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {s.status === 'DAY_OFF' ? (
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-blue-400">Day Off</span>
                        </span>
                      ) : (s.sessionType || 'Practice')}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-400">{s.status === 'DAY_OFF' ? '—' : s.presentCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-400">{s.status === 'DAY_OFF' ? '—' : s.absentCount}</td>
                    <td className="px-4 py-3 text-center">
                      {s.status === 'DAY_OFF' ? (
                        <span className="text-blue-400 text-xs italic">{s.dayOffReason}</span>
                      ) : s.attendancePct !== null ? (
                        <span className={`font-bold ${s.attendancePct >= 75 ? 'text-green-400' : s.attendancePct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {s.attendancePct}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{s.createdBy?.name || 'System'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge text-[11px] ${
                        s.status === 'FINALIZED' ? 'badge-present' :
                        s.status === 'DAY_OFF' ? 'bg-blue-900/40 text-blue-400 border-blue-900/40' :
                        'bg-amber-900/30 text-amber-400 border-amber-900/40'
                      }`}>
                        {s.status === 'DAY_OFF' ? <><Sun className="w-3 h-3" /> DAY OFF</> :
                         s.status === 'FINALIZED' ? <><Lock className="w-3 h-3" /> FINALIZED</> :
                         'OPEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.status !== 'DAY_OFF' && (
                          <button
                            onClick={() => navigate(`/sessions/${s.id}`)}
                            className="btn-ghost btn-sm text-xs"
                          >View</button>
                        )}
                        {s.status === 'OPEN' && (role === 'ADMIN' || role === 'COACH' || role === 'CAPTAIN') && (
                          <Link
                            to={`/attendance?date=${s.date.split('T')[0]}`}
                            className="btn-primary btn-sm text-xs"
                          >
                            Mark
                          </Link>
                        )}
                        {s.status === 'FINALIZED' && (role === 'ADMIN' || role === 'COACH' || role === 'CAPTAIN') && (
                          <Link
                            to={`/attendance?date=${s.date.split('T')[0]}`}
                            className="btn-secondary btn-sm text-xs"
                          >
                            <RefreshCw className="w-3 h-3" /> Update
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-400" /> Create Session
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Session Type</label>
                <select value={form.sessionType} onChange={e => setForm(f => ({ ...f, sessionType: e.target.value }))} className="input">
                  <option value="PRACTICE">Practice</option>
                  <option value="MATCH">Match</option>
                  <option value="TOURNAMENT">Tournament</option>
                  <option value="FITNESS">Fitness</option>
                  <option value="MEETING">Meeting</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Title (optional)</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Morning Practice" />
              </div>
              <div>
                <label className="label">Location (optional)</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input" placeholder="e.g. Indoor Ground" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
