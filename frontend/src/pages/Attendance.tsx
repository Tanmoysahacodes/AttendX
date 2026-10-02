import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Check, X, CheckCircle2, ShieldAlert, Save, Lock, RefreshCw, Sun, Plus } from 'lucide-react';
import api from '../lib/api';
import { formatDate, getInitials } from '../lib/utils';
import { useSearchParams, Link } from 'react-router-dom';

export default function Attendance() {
  const { user } = useAuth();
  const role = user?.role;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Use today's local date as YYYY-MM-DD default
  const todayLocal = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  })();
  const initialDate = searchParams.get('date') || todayLocal;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [saving, setSaving] = useState(false);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [dayOffReason, setDayOffReason] = useState('');

  // Get active players
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.get('/players').then(r => r.data.data.filter((p: any) => p.status === 'ACTIVE')),
  });

  // Get all sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/attendance/sessions').then(r => r.data.data),
  });

  const session = useMemo(() => {
    return sessions.find((s: any) => {
      // DB stores dates as UTC midnight (2026-09-28T00:00:00.000Z)
      // Extract YYYY-MM-DD from the UTC timestamp directly (not local)
      const sDate = s.date.split('T')[0];
      return sDate === selectedDate;
    }) || null;
  }, [sessions, selectedDate]);

  // Local state for attendance toggles
  const [localRecords, setLocalRecords] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});

  // Sync local state when session changes
  useEffect(() => {
    const newLocal: Record<string, 'PRESENT' | 'ABSENT'> = {};
    if (session?.records) {
      session.records.forEach((r: any) => { newLocal[r.playerId] = r.status; });
    }
    setLocalRecords(newLocal);
  }, [session?.id, session?.records?.length]);

  const isDayOff = session?.status === 'DAY_OFF';
  const isFinalized = session?.status === 'FINALIZED';
  const canEdit = role === 'ADMIN' || (!isFinalized && !isDayOff && (role === 'COACH' || role === 'SPORTS_OFFICER'));
  const canUpdate = (role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && isFinalized;

  const toggleStatus = (playerId: string, target: 'PRESENT' | 'ABSENT') => {
    if (!canEdit) return;
    setLocalRecords(prev => ({
      ...prev,
      [playerId]: prev[playerId] === target ? (target === 'PRESENT' ? 'ABSENT' : 'PRESENT') : target,
    }));
  };

  const markAllPresent = () => {
    if (!canEdit) return;
    const newLocal = { ...localRecords };
    players.forEach((p: any) => { newLocal[p.id] = 'PRESENT'; });
    setLocalRecords(newLocal);
  };

  const createSessionMutation = useMutation({
    mutationFn: () => api.post('/attendance/sessions', {
      date: selectedDate,
      sessionType: 'PRACTICE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['team-stats'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create session.'),
  });

  const saveMutation = useMutation({
    mutationFn: ({ records, finalize }: { records: any[], finalize: boolean }) =>
      api.post('/attendance/mark', {
        date: selectedDate,
        sessionId: session?.id,
        records,
        finalize,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['team-stats'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to save attendance.'),
    onSettled: () => setSaving(false),
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.post(`/attendance/sessions/${session?.id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const dayOffMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const res = session?.id
        ? await api.post(`/attendance/sessions/${session.id}/dayoff`, { reason })
        : await api.post('/attendance/dayoff', { date: selectedDate, reason });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['team-stats'] });
      setShowDayOffModal(false);
      setDayOffReason('');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to mark Day Off.'),
  });

  const handleSave = (finalize = false) => {
    if (!canEdit) return;
    const recordsToSave = Object.entries(localRecords).map(([playerId, status]) => ({ playerId, status }));
    if (recordsToSave.length === 0) { alert('No attendance marked yet. Mark at least one player first.'); return; }
    if (finalize && !confirm('Finalize attendance?\n\nOnce finalized, attendance can still be updated by authorized staff.')) return;
    setSaving(true);
    saveMutation.mutate({ records: recordsToSave, finalize });
  };

  const presentCount = Object.values(localRecords).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(localRecords).filter(s => s === 'ABSENT').length;
  const unmarkedCount = players.length - presentCount - absentCount;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Today's Attendance</h1>
          <p className="text-zinc-500 text-sm mt-1">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={e => {
              setSelectedDate(e.target.value);
              setSearchParams({ date: e.target.value });
            }}
            className="input w-full sm:w-auto text-sm py-1.5"
          />
          <Link to="/sessions" className="btn-secondary btn-sm whitespace-nowrap">All Sessions</Link>
        </div>
      </div>

      {/* Session Status Banner */}
      {session && (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          isDayOff ? 'bg-blue-900/20 border-blue-900/40' :
          isFinalized ? 'bg-green-900/20 border-green-900/40' :
          'bg-amber-900/20 border-amber-900/40'
        }`}>
          <div className="flex items-center gap-3">
            {isFinalized && <Lock className="w-5 h-5 text-green-400" />}
            {isDayOff && <Sun className="w-5 h-5 text-blue-400" />}
            <div>
              <p className={`font-bold ${isDayOff ? 'text-blue-400' : isFinalized ? 'text-green-400' : 'text-amber-400'}`}>
                {isDayOff ? 'DAY OFF' : `Session ${session.status}`}
              </p>
              {isDayOff && session.dayOffReason && (
                <p className="text-sm text-zinc-400 mt-0.5">Reason: {session.dayOffReason}</p>
              )}
            </div>
          </div>
          {isFinalized && canUpdate && (
            <button onClick={() => reopenMutation.mutate()} className="btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4" /> Update
            </button>
          )}
        </div>
      )}

      {/* No session yet */}
      {!session && !sessionsLoading && (
        <div className="card p-8 text-center">
          <p className="text-zinc-400 mb-4">No session created for {formatDate(selectedDate)}.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {(role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && (
              <>
                <button onClick={() => createSessionMutation.mutate()} disabled={createSessionMutation.isPending} className="btn-primary">
                  <Plus className="w-4 h-4" /> Create Practice Session
                </button>
                <button onClick={() => setShowDayOffModal(true)} className="btn-secondary">
                  <Sun className="w-4 h-4" /> Mark Day Off
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attendance List */}
      {session && !isDayOff && (
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">
              Player Roster ({players.length})
              {unmarkedCount > 0 && <span className="ml-2 text-amber-400 text-xs">{unmarkedCount} not marked</span>}
            </h2>
            {canEdit && (
              <div className="flex gap-2">
                <button onClick={markAllPresent} className="btn-secondary btn-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" /> All Present
                </button>
                <button onClick={() => setShowDayOffModal(true)} className="btn-ghost btn-sm">
                  <Sun className="w-4 h-4" /> Day Off
                </button>
              </div>
            )}
          </div>

          {isFinalized && !canEdit && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-900/40 text-green-400 rounded-lg flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 flex-shrink-0" />
              Session finalized.{((role as string) === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && ' Click "Update" to make changes.'}
            </div>
          )}

          {session.status === 'FINALIZED' && (role === 'ADMIN' || role === 'COACH' || role === 'SPORTS_OFFICER') && (
            <div className="mb-4 p-3 bg-amber-900/20 border border-amber-900/40 text-amber-400 rounded-lg flex items-center gap-2 text-sm">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              Viewing finalized attendance. Click <strong>"Update"</strong> above to edit.
            </div>
          )}

          <div className="space-y-2">
            {playersLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-surface-secondary rounded-lg" />)}
              </div>
            ) : (
              players.map((p: any) => {
                const status = localRecords[p.id];
                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    status === 'PRESENT' ? 'bg-green-900/10 border-green-900/30' :
                    status === 'ABSENT' ? 'bg-red-900/10 border-red-900/30' :
                    'bg-surface-secondary border-surface-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-card border border-surface-border flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-zinc-300">{p.jerseyNumber ? `#${p.jerseyNumber}` : getInitials(p.name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{p.name}</p>
                        <p className="text-xs text-zinc-500">{p.position || 'Player'}{p.role === 'CAPTAIN' && ' · Captain'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStatus(p.id, 'PRESENT')}
                        disabled={!canEdit}
                        className={`btn btn-sm gap-1.5 transition-all ${
                          status === 'PRESENT'
                            ? 'bg-green-600 hover:bg-green-700 text-white border border-green-500'
                            : 'bg-surface-card hover:bg-green-900/20 text-zinc-400 hover:text-green-400 border border-surface-border'
                        }`}
                      >
                        <Check className="w-4 h-4" /> <span className="hidden sm:inline">Present</span>
                      </button>
                      <button
                        onClick={() => toggleStatus(p.id, 'ABSENT')}
                        disabled={!canEdit}
                        className={`btn btn-sm gap-1.5 transition-all ${
                          status === 'ABSENT'
                            ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                            : 'bg-surface-card hover:bg-red-900/20 text-zinc-400 hover:text-red-400 border border-surface-border'
                        }`}
                      >
                        <X className="w-4 h-4" /> <span className="hidden sm:inline">Absent</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      {canEdit && session && !isDayOff && (
        <div className="fixed bottom-0 left-0 md:left-56 right-0 p-4 bg-surface-card border-t border-surface-border shadow-2xl flex items-center justify-between z-40">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-zinc-500">Present</p>
              <p className="text-lg font-bold text-green-400">{presentCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Absent</p>
              <p className="text-lg font-bold text-red-400">{absentCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-lg font-bold text-zinc-300">{players.length}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || saveMutation.isPending}
              className="btn-secondary btn-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || saveMutation.isPending}
              className="btn-primary"
            >
              <Lock className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Finalize'}
            </button>
          </div>
        </div>
      )}

      {/* Day Off Modal */}
      {showDayOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-900/30 flex items-center justify-center">
                <Sun className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold">Mark Day Off</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              A Day Off session will NOT count as an absence for any player. Enter a mandatory reason below.
            </p>
            <div>
              <label className="label">Reason <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={dayOffReason}
                onChange={e => setDayOffReason(e.target.value)}
                className="input"
                placeholder="e.g. University holiday, Exam week..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowDayOffModal(false); setDayOffReason(''); }} className="btn-ghost">Cancel</button>
              <button
                onClick={() => {
                  if (!dayOffReason.trim()) { alert('Please enter a reason.'); return; }
                  dayOffMutation.mutate({ reason: dayOffReason });
                }}
                disabled={dayOffMutation.isPending}
                className="btn-primary"
              >
                {dayOffMutation.isPending ? 'Saving...' : 'Confirm Day Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
