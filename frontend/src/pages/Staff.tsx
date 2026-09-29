import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, UserMinus } from 'lucide-react';
import api from '../lib/api';
import { getInitials, formatDate, formatTime } from '../lib/utils';

export default function Staff() {
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/players').then(r => r.data.data.filter((p: any) => p.role !== 'PLAYER')),
  });

  const removeCaptainMutation = useMutation({
    mutationFn: () => api.post('/admin/captain/remove'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      alert('Captain role removed.');
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Staff Management</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage team leadership and administrative roles.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-surface-card rounded-xl" />)}
          </div>
        ) : (
          staff.map((s: any) => (
            <div key={s.id} className="card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-secondary border border-surface-border flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-zinc-300">{getInitials(s.name)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-zinc-100">{s.name}</h3>
                    <span className={`badge text-[10px] ${s.role === 'ADMIN' ? 'badge-admin' : s.role === 'COACH' ? 'badge-coach' : 'badge-captain'}`}>
                      {s.role}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    Last login: {s.lastLoginAt ? `${formatDate(s.lastLoginAt)} ${formatTime(s.lastLoginAt)}` : 'Never'}
                  </p>
                </div>
              </div>
              
              {s.role === 'CAPTAIN' && (
                <button 
                  onClick={() => { if(confirm('Remove Captain role?')) removeCaptainMutation.mutate(); }}
                  className="btn-danger btn-sm"
                >
                  <UserMinus className="w-4 h-4" /> Remove Role
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card p-5 bg-surface-secondary/50 border-dashed">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-zinc-200">How to assign a Captain</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
              To assign a new Captain, go to the <strong>Players</strong> tab and click the 
              shield icon next to any active player's name. This will automatically transfer 
              the Captain role if one already exists.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
