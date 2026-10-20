import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSquad } from '../context/SquadContext';
import {
  UserPlus, Shield, Download, Upload, X,
  ChevronRight, Edit2
} from 'lucide-react';
import api from '../lib/api';
import { getInitials, formatDate, exportFile } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const playerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  systemId: z.string().min(1, 'System ID is required'),
  jerseyNumber: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  course: z.string().optional().or(z.literal('')),
  year: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
});

const playerEditSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  jerseyNumber: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  course: z.string().optional().or(z.literal('')),
  year: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
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
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                {p.systemId && <span>ID: <strong className="text-zinc-200 font-mono">{p.systemId}</strong></span>}
                {p.jerseyNumber && <span className="text-brand-400 font-semibold">Jersey #{p.jerseyNumber}</span>}
                {p.squad?.name && <span className="text-zinc-400">Squad: {p.squad.name}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {p.position && <span className="text-xs text-zinc-400">{p.position}</span>}
                <span className={`badge text-[10px] ${p.status === 'ACTIVE' ? 'badge-present' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {p.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Academic / Extra Details */}
        {(p.course || p.year || p.email || p.phone) && (
          <div className="px-6 py-4 border-b border-surface-border grid grid-cols-2 gap-3 text-xs">
            {p.course && (
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block mb-0.5">Course / School</span>
                <span className="text-zinc-200 font-medium">{p.course}</span>
              </div>
            )}
            {p.year && (
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block mb-0.5">Year</span>
                <span className="text-zinc-200 font-medium">{p.year}</span>
              </div>
            )}
            {p.email && (
              <div className="col-span-2">
                <span className="text-zinc-500 uppercase tracking-wider block mb-0.5">Email</span>
                <span className="text-zinc-200 font-mono">{p.email}</span>
              </div>
            )}
            {p.phone && (
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block mb-0.5">Phone</span>
                <span className="text-zinc-200">{p.phone}</span>
              </div>
            )}
          </div>
        )}

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
              <p className="text-xl font-bold text-amber-400">{profile?.currentStreak ?? 0}</p>
              <p className="text-xs text-zinc-500">Streak</p>
            </div>
          </div>
        </div>

        {/* Attendance Log */}
        {attendance.length > 0 && (
          <div className="p-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Recent Sessions</p>
            <div className="space-y-2">
              {attendance.slice(0, 8).map((record: any) => (
                <div key={record.id} className="flex items-center justify-between text-sm py-1.5 border-b border-surface-border/50">
                  <span className="text-zinc-400">{formatDate(record.session.date)}</span>
                  <span className={`badge text-[10px] ${record.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Players() {
  const { user } = useAuth();
  const { activeSquad, activeSport, activeCategory, accentColor } = useSquad();
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
    queryKey: ['players', activeSquad?.id],
    queryFn: () => api.get('/players', { params: { squadId: activeSquad?.id } }).then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(playerSchema),
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, setValue: setEditValue, formState: { errors: editErrors, isSubmitting: isEditing } } = useForm({
    resolver: zodResolver(playerEditSchema),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/players', {
      ...data,
      jerseyNumber: data.jerseyNumber ? String(data.jerseyNumber).trim() : null,
      position: data.position || undefined,
      squadId: activeSquad?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowAddModal(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to add player.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/players/${id}`, {
      ...data,
      jerseyNumber: data.jerseyNumber ? String(data.jerseyNumber).trim() : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowEditModal(null);
      resetEdit();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update player.'),
  });

  const assignCaptainMutation = useMutation({
    mutationFn: (playerId: string) => {
      if (activeSquad) {
        return api.post(`/sports/squads/${activeSquad.id}/captain/assign`, { playerId });
      }
      return api.post('/admin/captain/assign', { playerId });
    },
    onSuccess: () => { queryClient.invalidateQueries(); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to assign captain.'),
  });

  const removeCaptainMutation = useMutation({
    mutationFn: () => {
      if (activeSquad) {
        return api.post(`/sports/squads/${activeSquad.id}/captain/remove`);
      }
      return api.post('/admin/captain/remove');
    },
    onSuccess: () => { queryClient.invalidateQueries(); },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) =>
      api.post(`/players/${id}/${active ? 'deactivate' : 'reactivate'}`),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const importMutation = useMutation({
    mutationFn: (data: any[]) => {
      if (activeSquad) {
        return api.post(`/sports/squads/${activeSquad.id}/import`, { players: data });
      }
      return api.post('/admin/players/import', { players: data });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries();
      const d = res.data.data;
      alert(`Import complete! Imported: ${d.imported ?? d.created ?? 0}, Matched: ${d.matched ?? 0}, Skipped: ${d.skipped ?? 0}`);
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
      const parsed: any[] = [], errList: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const p: any = {};
        headers.forEach((h, j) => {
          if (h === 'name') p.name = vals[j];
          if (h === 'systemid' || h === 'id') p.systemId = String(vals[j]);
          if (h === 'jerseynumber' || h === 'jersey') p.jerseyNumber = vals[j] || null;
          if (h === 'position') p.position = vals[j] || undefined;
          if (h === 'year') p.year = vals[j] || undefined;
          if (h === 'course' || h === 'school') p.course = vals[j] || undefined;
          if (h === 'phone') p.phone = vals[j] || undefined;
          if (h === 'email') p.email = vals[j] || undefined;
        });
        if (!p.name) errList.push(`Row ${i + 1}: Missing player name`);
        else if (!p.systemId) errList.push(`Row ${i + 1}: Missing System ID for ${p.name}`);
        else parsed.push(p);
      }
      setImportPreview(parsed);
      setImportErrors(errList);
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/players/export/csv', { responseType: 'blob' });
      const squadName = activeSquad?.name ? `${activeSquad.name.replace(/\s+/g, '_')}_players.csv` : 'players.csv';
      await exportFile(res.data, squadName);
    } catch { alert('Failed to export players.'); }
  };

  const filtered = players.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.systemId && p.systemId.includes(search)) ||
    (p.jerseyNumber && p.jerseyNumber.includes(search))
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header with Squad Context */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-50">Team Roster</h1>
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
          <p className="text-zinc-400 text-sm mt-1">
            {players.length} registered players {activeSquad ? `in ${activeSquad.name}` : ''}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <input
            type="text"
            placeholder="Search name, ID, jersey..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full sm:w-56"
          />
          {role === 'ADMIN' && (
            <>
              <button onClick={handleExport} className="btn-secondary" title="Export CSV">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowImportModal(true); setImportPreview([]); setImportErrors([]); }} className="btn-secondary" title="Import CSV">
                <Upload className="w-4 h-4" />
              </button>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <UserPlus className="w-4 h-4" /> Add Player
              </button>
            </>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-secondary border-b border-surface-border text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">System ID</th>
                <th className="px-4 py-3 font-medium">Jersey</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium text-center">Attendance</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                {role === 'ADMIN' && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Loading roster...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No players found in this squad.</td></tr>
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
                    <td className="px-4 py-3 font-mono text-zinc-400 text-xs">
                      {p.systemId || '—'}
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
                              setEditValue('course', p.course || '');
                              setEditValue('year', p.year || '');
                              setEditValue('email', p.email || '');
                            }}
                            className="btn-ghost btn-icon"
                            title="Edit Player"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {p.status === 'ACTIVE' && p.role !== 'CAPTAIN' && (
                            <button
                              onClick={() => { if (confirm(`Assign ${p.name} as Captain of this squad?`)) assignCaptainMutation.mutate(p.id); }}
                              className="btn-ghost btn-icon"
                              title="Assign Captain"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-500/70 hover:text-amber-400" />
                            </button>
                          )}
                          {p.role === 'CAPTAIN' && (
                            <button
                              onClick={() => { if (confirm('Remove Captain role from this player?')) removeCaptainMutation.mutate(); }}
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
          <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1 text-zinc-100">Add Player</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Adding to squad: <strong className="text-zinc-200">{activeSquad?.name || 'Default Squad'}</strong>
            </p>
            <form onSubmit={handleSubmit(data => addMutation.mutate(data))} className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input {...register('name')} className="input" placeholder="e.g. Rahul Kumar" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message as string}</p>}
              </div>
              <div>
                <label className="label">System ID (Required for login)</label>
                <input {...register('systemId')} className="input font-mono" placeholder="e.g. 2025112233" />
                {errors.systemId && <p className="text-red-400 text-xs mt-1">{errors.systemId.message as string}</p>}
              </div>
              <div>
                <label className="label">Jersey Number (Optional)</label>
                <input {...register('jerseyNumber')} className="input" placeholder="Leave empty if none assigned" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Course / School</label>
                  <input {...register('course')} className="input" placeholder="e.g. BTech CSE" />
                </div>
                <div>
                  <label className="label">Year</label>
                  <input {...register('year')} className="input" placeholder="e.g. 2nd year" />
                </div>
              </div>
              <div>
                <label className="label">Position (Optional)</label>
                <input {...register('position')} className="input" placeholder="e.g. Raider, Defender, Singles" />
              </div>
              <div>
                <label className="label">Email (Optional)</label>
                <input {...register('email')} className="input" placeholder="student@ug.sharda.ac.in" />
              </div>
              <div>
                <label className="label">Phone (Optional)</label>
                <input {...register('phone')} className="input" placeholder="Phone number" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Adding...' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1 text-zinc-100">Edit Player — {showEditModal.name}</h2>
            <p className="text-xs text-zinc-400 mb-4">
              System ID: <strong className="font-mono text-zinc-200">{showEditModal.systemId || 'N/A'}</strong>
            </p>
            <form onSubmit={handleEditSubmit(data => editMutation.mutate({ id: showEditModal.id, data }))} className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input {...regEdit('name')} className="input" />
                {editErrors.name && <p className="text-red-400 text-xs mt-1">{editErrors.name.message as string}</p>}
              </div>
              <div>
                <label className="label">Jersey Number (Optional — clear to remove)</label>
                <input {...regEdit('jerseyNumber')} className="input" placeholder="Leave empty for none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Course / School</label>
                  <input {...regEdit('course')} className="input" />
                </div>
                <div>
                  <label className="label">Year</label>
                  <input {...regEdit('year')} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Position</label>
                <input {...regEdit('position')} className="input" />
              </div>
              <div>
                <label className="label">Email</label>
                <input {...regEdit('email')} className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...regEdit('phone')} className="input" />
              </div>
              <div>
                <label className="label">Description / Bio</label>
                <textarea {...regEdit('description')} className="input min-h-[70px] resize-none" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => { setShowEditModal(null); resetEdit(); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isEditing} className="btn-primary">
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1 text-zinc-100">Import Players from CSV</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Destination Squad: <strong className="text-zinc-200">{activeSquad?.name || 'Selected Squad'}</strong>
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              Accepted headers: <code className="bg-surface-secondary px-1 py-0.5 rounded text-brand-300 text-xs">name, systemId, jerseyNumber, course, year, position, email, phone</code>
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
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-zinc-500">
                        <th className="pr-4 py-1">Name</th>
                        <th className="pr-4 py-1">System ID</th>
                        <th className="pr-4 py-1">Jersey</th>
                        <th className="py-1">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((p, i) => (
                        <tr key={i} className="border-t border-surface-border">
                          <td className="py-1 pr-4">{p.name}</td>
                          <td className="py-1 pr-4 font-mono">{p.systemId}</td>
                          <td className="py-1 pr-4">{p.jerseyNumber ? `#${p.jerseyNumber}` : '—'}</td>
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
