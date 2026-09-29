import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Calendar } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function MyAttendance() {
  const { user } = useAuth();

  const { data: myStats, isLoading: statsLoading } = useQuery({
    queryKey: ['my-stats', user?.id],
    queryFn: () => api.get(`/players/${user!.id}`).then(r => r.data.data),
  });

  const { data: myAttendance = [], isLoading: attLoading } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: () => api.get(`/players/${user!.id}/attendance`).then(r => r.data.data),
  });

  if (statsLoading || attLoading) {
    return <div className="p-6 text-zinc-500">Loading your attendance...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">My Attendance History</h1>
        <p className="text-zinc-500 text-sm mt-1">View your complete attendance record.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card border-brand-900/30 bg-brand-900/10">
          <p className="stat-label text-brand-400">Total Attendance</p>
          <p className="text-3xl font-bold text-brand-400">{myStats?.attendancePct !== null ? `${myStats?.attendancePct}%` : 'N/A'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Present</p>
          <p className="text-3xl font-bold text-green-400">{myStats?.presentCount ?? 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Absent</p>
          <p className="text-3xl font-bold text-red-400">{myStats?.absentCount ?? 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Sessions</p>
          <p className="text-3xl font-bold text-zinc-50">{myStats?.totalSessions ?? 0}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-400" />
            Session History
          </h2>
        </div>
        
        {myAttendance.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No attendance records found.</div>
        ) : (
          <div className="divide-y divide-surface-border">
            {myAttendance.map((r: any) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-surface-secondary/30 transition-colors">
                <div>
                  <p className="font-medium text-zinc-100">{formatDate(r.session.date)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Marked by {r.markedBy.name}</p>
                </div>
                <div className={`badge ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'} px-3 py-1 text-sm`}>
                  {r.status === 'PRESENT' ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Present</>
                  ) : (
                    <><XCircle className="w-4 h-4 mr-1.5" /> Absent</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
