import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Sun, Lock, RefreshCw, MoreVertical, Trash2, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSquad } from '../context/SquadContext';

// ─── Floating ⋯ menu per row ──────────────────────────────────────────────────
function RowMenu({ session, onDelete }: { session: any; onDelete: (s: any) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="btn-ghost btn-icon p-1.5 text-zinc-500 hover:text-zinc-300"
        title="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[170px] bg-surface-card border border-surface-border rounded-xl shadow-2xl py-1 animate-slide-up">
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(session); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            Delete Session…
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Two-Step Delete Confirmation Modal ───────────────────────────────────────
function DeleteSessionModal({
  session,
  onClose,
  onConfirm,
  isPending,
}: {
  session: any;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState('');
  const dateStr = session.date?.split('T')[0] ?? '';
  const canProceed = typed.trim() === dateStr;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      <div className="card w-full max-w-sm bg-red-950/50 border-red-800/60 p-6 space-y-4 animate-slide-up">
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-900/60 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100 text-base leading-tight">
              Delete Session — {formatDate(dateStr)}
            </h3>
            <p className="text-xs text-red-400 mt-0.5 font-medium">
              {session.status === 'FINALIZED' ? 'FINALIZED SESSION — Extra care required' : 'This cannot be undone'}
            </p>
          </div>
        </div>

        {/* Step 1 — Warning details */}
        {step === 1 && (
          <>
            <div className="text-sm text-zinc-300 space-y-2 leading-relaxed">
              <p>You are about to permanently delete the <strong className="text-zinc-100">{session.sessionType || 'Practice'}</strong> session held on <strong className="text-zinc-100">{formatDate(dateStr)}</strong>.</p>
              {session.status === 'FINALIZED' && (
                <p>This session is <span className="text-red-300 font-semibold">FINALIZED</span> — it has already been counted in attendance statistics. Deleting it will <span className="text-red-300">permanently remove attendance records</span> for all {session.totalMarked ?? 0} players marked that day.</p>
              )}
              <p>This action <strong>cannot be undone</strong>.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg p-3 text-xs text-zinc-400 space-y-1">
              <div className="flex justify-between"><span>Date:</span><span className="text-zinc-200 font-mono">{dateStr}</span></div>
              <div className="flex justify-between"><span>Status:</span><span className={session.status === 'FINALIZED' ? 'text-green-400' : 'text-amber-400'}>{session.status}</span></div>
              <div className="flex justify-between"><span>Players marked:</span><span className="text-zinc-200">{session.totalMarked ?? 0}</span></div>
              <div className="flex justify-between"><span>Present / Absent:</span><span className="text-zinc-200">{session.presentCount ?? 0} / {session.absentCount ?? 0}</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
              <button
                onClick={() => setStep(2)}
                className="btn-sm bg-red-700 hover:bg-red-600 text-white border border-red-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                I understand, proceed →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Type date to confirm */}
        {step === 2 && (
          <>
            <div className="text-sm text-zinc-300 leading-relaxed">
              To confirm deletion, type the session date exactly as shown below:
            </div>
            <div className="bg-zinc-900/80 rounded-lg px-3 py-2 text-center font-mono text-zinc-100 text-sm border border-zinc-700/60 tracking-wider">
              {dateStr}
            </div>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={`Type: ${dateStr}`}
              className="input font-mono text-sm text-center tracking-wider"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && canProceed) onConfirm(); }}
            />
            {typed.length > 0 && !canProceed && (
              <p className="text-xs text-red-400 text-center -mt-1">Does not match — type exactly: <code>{dateStr}</code></p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setStep(1); setTyped(''); }} className="btn-ghost btn-sm">← Back</button>
              <button
                onClick={onConfirm}
                disabled={!canProceed || isPending}
                className={`btn-sm px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  canProceed
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                }`}
              >
                {isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendanceSessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSquad, activeSport, activeCategory, accentColor } = useSquad();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  const [form, setForm] = useState({ date: todayStr, sessionType: 'PRACTICE', title: '', notes: '', location: '' });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', activeSquad?.id],
    queryFn: () => api.get('/attendance/sessions', { params: { squadId: activeSquad?.id } }).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/attendance/sessions', { ...data, squadId: activeSquad?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowCreateModal(false);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create session.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/attendance/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete session.');
      setDeleteTarget(null);
    },
  });

  const role = user?.role;
  const canManage = role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER' || role === 'CAPTAIN';
  const isAdmin = role === 'ADMIN';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-50">Attendance Sessions</h1>
            {activeSquad && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                }}
              >
                {activeSport?.name} → {activeCategory?.name}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm mt-1">
            Historical and current practice sessions for {activeSquad?.name || 'squad'}.
          </p>
        </div>
        {canManage && (
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
                    {(role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && (
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
                        {s.status === 'OPEN' && (role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && (
                          <Link
                            to={`/attendance?date=${s.date.split('T')[0]}`}
                            className="btn-primary btn-sm text-xs"
                          >
                            Mark
                          </Link>
                        )}
                        {s.status === 'FINALIZED' && (role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && (
                          <Link
                            to={`/attendance?date=${s.date.split('T')[0]}`}
                            className="btn-secondary btn-sm text-xs"
                          >
                            <RefreshCw className="w-3 h-3" /> Update
                          </Link>
                        )}
                        {/* Hidden ⋯ menu — Admin only for finalized, anyone for open */}
                        {isAdmin && (
                          <RowMenu session={s} onDelete={setDeleteTarget} />
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

      {/* Two-step delete confirmation */}
      {deleteTarget && (
        <DeleteSessionModal
          session={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          isPending={deleteMutation.isPending}
        />
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
