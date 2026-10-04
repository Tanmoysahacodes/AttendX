import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, Download, Upload, X, CheckCircle2, XCircle, Lock, ChevronRight, Edit2 } from 'lucide-react';
import api from '../lib/api';
import { getInitials, formatDate, exportFile } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod';

const playerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  jerseyNumber: z.string().min(1, 'Jersey number is required'),
  position: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
  phone: z.string().optional(),
});

// Player Profile Modal
function PlayerProfile({ player, onClose }: { player: any; onClose: () => void }) {
  const { user } = useAuth();
  const role = user?.role;

  const { data: profile } = useQuery({
    queryKey: ['player-profile', player.id],
    queryFn: () => api.get(`/players/${player.id}`).then(r => r.data.data),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['player-attendance', player.id],
    queryFn: () => api.get(`/players/${player.id}/attendance`).then(r => r.data.data),
    enabled: role !== 'PLAYER' || user?.id === player.id,
  });

  const p = profile || player;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-surface-card border border-surface-border w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-surface-border">
          <button onClick={onClose} className="absolute top-4 right-4 btn-ghost btn-icon">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-900/40 border border-brand-800/50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-brand-400">
                {p.jerseyNumber ? `#${p.jerseyNumber}` : getInitials(p.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-zinc-50">{p.name}</h2>
                {p.role === 'CAPTAIN' && (
                  <span className="badge bg-amber-900/40 text-amber-400 border-amber-900/40 text-[10px]">
                    <Shield className="w-3 h-3" /> Captain
                  </span>
                )}
              </div>
              {p.jerseyNumber && <p className="text-brand-400 font-semibold text-sm">Jersey #{p.jerseyNumber}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {p.position && <span className="text-xs text-zinc-400">{p.position}</span>}
                <span className={`badge text-[10px] ${p.status === 'ACTIVE' ? 'badge-present' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {p.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <div className="px-6 py-4 border-b border-surface-border">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Player Profile</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{p.description}</p>
          </div>
        )}

        {/* Attendance Summary */}
        <div className="px-6 py-4 border-b border-surface-border">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Attendance Summary</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-brand-400">
                {profile?.attendancePct !== null && profile?.attendancePct !== undefined ? `${profile.attendancePct}%` : 'N/A'}
              </p>
              <p className="text-xs text-zinc-500">Overall</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{profile?.presentCount ?? 0}</p>
              <p className="text-xs text-zinc-500">Present</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{profile?.absentCount ?? 0}</p>
              <p className="text-xs text-zinc-500">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-zinc-300">{profile?.totalSessions ?? 0}</p>
              <p className="text-xs text-zinc-500">Sessions</p>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="px-6 py-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Attendance History</p>
          {attendance.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No attendance records yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {attendance.map((r: any) => (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  r.status === 'PRESENT' ? 'bg-green-900/10 border border-green-900/20' : 'bg-red-900/10 border border-red-900/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {r.status === 'PRESENT'
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    }
                    <span className="text-sm text-zinc-300">{formatDate(r.session.date)}</span>
                    <span className="text-xs text-zinc-500">{r.session.sessionType || 'Practice'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${r.status === 'PRESENT' ? 'text-green-400' : 'text-red-400'}`}>
                      {r.status === 'PRESENT' ? 'PRESENT' : 'ABSENT'}
                    </span>
                    {r.session.status === 'FINALIZED' && <Lock className="w-3 h-3 text-zinc-600" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Players() {
  const { user } = useAuth();
  const role = user?.role;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.get('/players').then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(playerSchema),
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, setValue: setEditValue, formState: { errors: editErrors, isSubmitting: isEditing } } = useForm({
    resolver: zodResolver(playerSchema),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/players', { ...data, position: data.position || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['players'] }); setShowAddModal(false); reset(); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to add player.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/players/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['players'] }); setShowEditModal(null); resetEdit(); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update player.'),
  });

  const assignCaptainMutation = useMutation({
    mutationFn: (playerId: string) => api.post('/admin/captain/assign', { playerId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['players'] }); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to assign captain.'),
  });

  const removeCaptainMutation = useMutation({
    mutationFn: () => api.post('/admin/captain/remove'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['players'] }); },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) =>
      api.post(`/players/${id}/${active ? 'deactivate' : 'reactivate'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players'] }),
  });

  const importMutation = useMutation({
    mutationFn: (data: any[]) => api.post('/admin/players/import', { players: data }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      alert(`Import complete! Created: ${res.data.data.created}, Skipped: ${res.data.data.skipped}`);
      setShowImportModal(false);
      setImportPreview([]);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to import.'),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
      const parsed: any[] = [], errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map(v => v.trim());
        const p: any = {};
        headers.forEach((h, j) => {
          if (h === 'name') p.name = vals[j];
          if (h === 'jerseynumber' || h === 'jersey') p.jerseyNumber = vals[j];
          if (h === 'position') p.position = vals[j] || undefined;
          if (h === 'year') p.year = vals[j] || undefined;
          if (h === 'course') p.course = vals[j] || undefined;
          if (h === 'phone') p.phone = vals[j] || undefined;
        });
        if (!p.name || !p.jerseyNumber) errors.push(`Row ${i + 1}: Missing name or jersey number`);
        else parsed.push(p);
      }
      setImportPreview(parsed);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/players/export/csv', { responseType: 'blob' });
      await exportFile(res.data, 'players.csv');
    } catch { alert('Failed to export players.'); }
  };

  const filtered = players.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.jerseyNumber && p.jerseyNumber.includes(search))
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Team Roster</h1>
          <p className="text-zinc-500 text-sm mt-1">{players.length} registered players</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full sm:w-56"
          />
          {role === 'ADMIN' && (
            <>
              <button onClick={handleExport} className="btn-secondary">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowImportModal(true); setImportPreview([]); setImportErrors([]); }} className="btn-secondary">
                <Upload className="w-4 h-4" />
              </button>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <UserPlus className="w-4 h-4" /> Add Player
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-secondary border-b border-surface-border text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Jersey</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium text-center">Attendance</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                {role === 'ADMIN' && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Loading roster...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No players found.</td></tr>
              ) : (
                filtered.map((p: any) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPlayer(p)}
                    className="hover:bg-surface-secondary/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-zinc-300">{getInitials(p.name)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{p.name}</p>
                          {p.role === 'CAPTAIN' && (
                            <span className="badge bg-amber-900/40 text-amber-400 border-amber-900/40 text-[9px] mt-0.5">
                              <Shield className="w-2.5 h-2.5" /> Captain
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-300">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{p.position || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${p.attendancePct === null ? 'text-zinc-500' : p.attendancePct >= 75 ? 'text-green-400' : p.attendancePct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {p.attendancePct !== null ? `${p.attendancePct}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge text-[10px] ${p.status === 'ACTIVE' ? 'badge-present' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    {role === 'ADMIN' && (
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setShowEditModal(p);
                              setEditValue('name', p.name);
                              setEditValue('jerseyNumber', p.jerseyNumber || '');
                              setEditValue('position', p.position || '');
                              setEditValue('description', p.description || '');
                              setEditValue('phone', p.phone || '');
                            }}
                            className="btn-ghost btn-icon"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {p.status === 'ACTIVE' && p.role !== 'CAPTAIN' && (
                            <button
                              onClick={() => { if (confirm(`Assign ${p.name} as Captain? The current captain will be demoted.`)) assignCaptainMutation.mutate(p.id); }}
                              className="btn-ghost btn-icon"
                              title="Assign Captain"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-500/70 hover:text-amber-400" />
                            </button>
                          )}
                          {p.role === 'CAPTAIN' && (
                            <button
                              onClick={() => { if (confirm('Remove captain role from this player?')) removeCaptainMutation.mutate(); }}
                              className="btn-ghost btn-icon"
                              title="Remove Captain"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm(`${p.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} ${p.name}?`)) toggleStatusMutation.mutate({ id: p.id, active: p.status === 'ACTIVE' }); }}
                            className={`btn-ghost btn-sm text-xs ${p.status === 'ACTIVE' ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                          >
                            {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <PlayerProfile player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Player</h2>
            <form onSubmit={handleSubmit(data => addMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input {...register('name')} className="input" placeholder="e.g. Rahul Kumar" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message as string}</p>}
              </div>
              <div>
                <label className="label">Jersey Number</label>
                <input {...register('jerseyNumber')} className="input" placeholder="e.g. 07" />
                {errors.jerseyNumber && <p className="text-red-400 text-xs mt-1">{errors.jerseyNumber.message as string}</p>}
              </div>
              <div>
                <label className="label">Position (Optional)</label>
                <input {...register('position')} className="input" placeholder="e.g. Raider, Defender..." />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Adding...' : 'Add Player'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Edit Player — {showEditModal.name}</h2>
            <form onSubmit={handleEditSubmit(data => editMutation.mutate({ id: showEditModal.id, data }))} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input {...regEdit('name')} className="input" />
                {editErrors.name && <p className="text-red-400 text-xs mt-1">{editErrors.name.message as string}</p>}
              </div>
              <div>
                <label className="label">Jersey Number</label>
                <input {...regEdit('jerseyNumber')} className="input" />
                {editErrors.jerseyNumber && <p className="text-red-400 text-xs mt-1">{editErrors.jerseyNumber.message as string}</p>}
              </div>
              <div>
                <label className="label">Position</label>
                <input {...regEdit('position')} className="input" placeholder="e.g. Left Corner, Raider..." />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...regEdit('description')} className="input min-h-[80px] resize-none" placeholder="Player description..." />
              </div>
              <div>
                <label className="label">Phone (Optional)</label>
                <input {...regEdit('phone')} className="input" placeholder="e.g. 9876543210" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => { setShowEditModal(null); resetEdit(); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isEditing} className="btn-primary">{isEditing ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Import Players from CSV</h2>
            <p className="text-sm text-zinc-400 mb-4">
              CSV headers: <code className="bg-surface-secondary px-1 py-0.5 rounded text-brand-300 text-xs">name, jerseyNumber, position, year, course, phone</code>
            </p>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="input mb-4" />
            {importErrors.length > 0 && (
              <div className="bg-red-900/20 text-red-400 p-3 rounded-lg text-sm mb-4">
                <strong>Errors:</strong>
                <ul className="list-disc pl-5 mt-1">
                  {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            {importPreview.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-zinc-300 mb-2 text-sm">Preview ({importPreview.length} valid rows)</h3>
                <div className="bg-surface-secondary p-3 rounded-lg text-sm max-h-40 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead><tr className="text-zinc-500"><th className="pr-4">Name</th><th className="pr-4">Jersey</th><th>Position</th></tr></thead>
                    <tbody>
                      {importPreview.map((p, i) => (
                        <tr key={i} className="border-t border-surface-border">
                          <td className="py-1 pr-4">{p.name}</td>
                          <td className="py-1 pr-4">#{p.jerseyNumber}</td>
                          <td className="py-1">{p.position || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowImportModal(false)} className="btn-ghost">Cancel</button>
              <button
                onClick={() => importMutation.mutate(importPreview)}
                disabled={importPreview.length === 0 || importMutation.isPending}
                className="btn-primary"
              >
                {importMutation.isPending ? 'Importing...' : `Import ${importPreview.length} Players`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
