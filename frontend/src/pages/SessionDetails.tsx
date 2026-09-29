import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ArrowLeft, Lock, Edit2 } from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function SessionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get(`/attendance/sessions/${id}`).then(r => r.data.data),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.post(`/attendance/sessions/${id}/finalize`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      alert('Session finalized.');
    },
  });

  if (isLoading) return <div className="p-6 text-zinc-500">Loading session details...</div>;
  if (!session) return <div className="p-6 text-red-500">Session not found.</div>;

  const presentCount = session.records.filter((r: any) => r.status === 'PRESENT').length;
  const absentCount = session.records.filter((r: any) => r.status === 'ABSENT').length;
  const total = session.records.length;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const canEdit = user?.role === 'ADMIN' || (session.status !== 'FINALIZED' && (user?.role === 'COACH' || user?.role === 'CAPTAIN'));
  const canFinalize = session.status !== 'FINALIZED' && ['ADMIN', 'COACH', 'CAPTAIN'].includes(user?.role || '');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/sessions')} className="btn-ghost btn-sm -ml-3 mb-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sessions
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Practice</h1>
          <p className="text-zinc-400 text-sm mt-1">{formatDate(session.date)}</p>
        </div>
        <div className="flex gap-2">
          <div className={`px-4 py-1.5 rounded-lg border font-bold text-sm flex items-center gap-2 ${session.status === 'FINALIZED' ? 'bg-amber-900/20 text-amber-500 border-amber-900/50' : 'bg-green-900/20 text-green-500 border-green-900/50'}`}>
            {session.status === 'FINALIZED' && <Lock className="w-4 h-4" />}
            {session.status}
          </div>
          {canEdit && (
            <button onClick={() => navigate(`/attendance?date=${session.date.split('T')[0]}`)} className="btn-secondary">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
          {canFinalize && (
            <button onClick={() => { if(confirm('Finalize session?')) finalizeMutation.mutate(); }} className="btn-primary">
              <Lock className="w-4 h-4" /> Finalize
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="stat-label">Present</p>
          <p className="text-3xl font-bold text-green-400">{presentCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Absent</p>
          <p className="text-3xl font-bold text-red-400">{absentCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total</p>
          <p className="text-3xl font-bold text-zinc-100">{total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Attendance %</p>
          <p className="text-3xl font-bold text-brand-400">{pct}%</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-secondary text-zinc-400 border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-medium">Jersey</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Marked By</th>
                <th className="px-4 py-3 font-medium text-right">Marked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {session.records.map((r: any) => (
                <tr key={r.id} className="hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 font-bold text-zinc-400">{r.player.jerseyNumber ? `#${r.player.jerseyNumber}` : '—'}</td>
                  <td className="px-4 py-3 font-medium text-zinc-100">{r.player.name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                      {r.status === 'PRESENT' ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PRESENT</> : <><XCircle className="w-3.5 h-3.5 mr-1" /> ABSENT</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{r.markedBy.name}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">{formatTime(r.markedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
