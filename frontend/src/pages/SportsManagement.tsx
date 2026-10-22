import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useSquad, type Sport, type Squad } from '../context/SquadContext';
import {
  Trophy, Plus, Edit2, X, Shield, Users, Upload,
  CheckCircle2, ChevronDown, ChevronRight,
  Layers, Trash2, AlertTriangle, ArrowRight
} from 'lucide-react';

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────────
function ConfirmDelete({
  title, message, onConfirm, onCancel, isPending
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="card p-5 max-w-sm w-full bg-red-950/60 border-red-800/50 space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-900/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="font-bold text-zinc-100 text-base">{title}</h3>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="btn-ghost btn-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger btn-sm"
          >
            {isPending ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SportsManagement() {
  const queryClient = useQueryClient();
  const { sports, refreshSports, setActiveSquadId } = useSquad();

  // ── Add Sport ──
  const [newSportOpen, setNewSportOpen] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportColor, setNewSportColor] = useState('#f97316');

  // ── Edit Sport ──
  const [editingSport, setEditingSport] = useState<Sport | null>(null);

  // ── Delete Sport ──
  const [deletingSport, setDeletingSport] = useState<Sport | null>(null);

  // ── Add / Edit Category ──
  const [newCategorySportId, setNewCategorySportId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

  // ── Delete Category ──
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string; sport: string } | null>(null);

  // ── Add / Edit Squad ──
  const [newSquadCategoryId, setNewSquadCategoryId] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState('');
  const [editingSquad, setEditingSquad] = useState<{ id: string; name: string } | null>(null);

  // ── Delete Squad ──
  const [deletingSquad, setDeletingSquad] = useState<{ id: string; name: string; category: string } | null>(null);

  // ── Captain & Import ──
  const [captainModalSquad, setCaptainModalSquad] = useState<Squad | null>(null);
  const [importModalSquad, setImportModalSquad] = useState<Squad | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  // ── Expanded sports accordions ──
  const [expandedSports, setExpandedSports] = useState<Record<string, boolean>>({
    Kabaddi: true, Badminton: true, Taekwondo: true,
  });
  const toggleSport = (name: string) => {
    setExpandedSports(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // ── Squad player list for captain assignment ──
  const { data: squadPlayers = [] } = useQuery({
    queryKey: ['squad-players', captainModalSquad?.id],
    enabled: !!captainModalSquad,
    queryFn: () => api.get(`/players?squadId=${captainModalSquad!.id}`).then(r => r.data.data),
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createSportMutation = useMutation({
    mutationFn: (data: { name: string; accentColor: string }) => api.post('/sports', data),
    onSuccess: () => { refreshSports(); setNewSportOpen(false); setNewSportName(''); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create sport'),
  });

  const updateSportMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/sports/${id}`, data),
    onSuccess: () => { refreshSports(); setEditingSport(null); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update sport'),
  });

  const deleteSportMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sports/${id}`),
    onSuccess: () => { refreshSports(); setDeletingSport(null); queryClient.invalidateQueries(); },
    onError: (err: any) => { alert(err.response?.data?.message || 'Failed to delete sport'); setDeletingSport(null); },
  });

  const createCategoryMutation = useMutation({
    mutationFn: ({ sportId, name }: { sportId: string; name: string }) =>
      api.post(`/sports/${sportId}/categories`, { name }),
    onSuccess: () => { refreshSports(); setNewCategorySportId(null); setNewCategoryName(''); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create category'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/sports/categories/${id}`, { name }),
    onSuccess: () => { refreshSports(); setEditingCategory(null); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update category'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sports/categories/${id}`),
    onSuccess: () => { refreshSports(); setDeletingCategory(null); queryClient.invalidateQueries(); },
    onError: (err: any) => { alert(err.response?.data?.message || 'Failed to delete category'); setDeletingCategory(null); },
  });

  const createSquadMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      api.post(`/sports/categories/${categoryId}/squads`, { name }),
    onSuccess: () => { refreshSports(); setNewSquadCategoryId(null); setNewSquadName(''); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create squad'),
  });

  const updateSquadMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/sports/squads/${id}`, { name }),
    onSuccess: () => { refreshSports(); setEditingSquad(null); },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update squad'),
  });

  const deleteSquadMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sports/squads/${id}`),
    onSuccess: () => { refreshSports(); setDeletingSquad(null); queryClient.invalidateQueries(); },
    onError: (err: any) => { alert(err.response?.data?.message || 'Failed to delete squad'); setDeletingSquad(null); },
  });

  const assignCaptainMutation = useMutation({
    mutationFn: ({ squadId, playerId }: { squadId: string; playerId: string }) =>
      api.post(`/sports/squads/${squadId}/captain/assign`, { playerId }),
    onSuccess: (res) => {
      alert(res.data.message || 'Captain assigned successfully');
      setCaptainModalSquad(null);
      queryClient.invalidateQueries();
      refreshSports();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to assign captain'),
  });

  const removeCaptainMutation = useMutation({
    mutationFn: (squadId: string) => api.post(`/sports/squads/${squadId}/captain/remove`),
    onSuccess: (res) => {
      alert(res.data.message || 'Captain removed');
      setCaptainModalSquad(null);
      queryClient.invalidateQueries();
      refreshSports();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to remove captain'),
  });

  // Handle CSV Import
  const handleImportCsv = async () => {
    if (!importModalSquad || !csvText.trim()) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        alert('CSV must contain a header line and at least one data row.');
        setImportLoading(false);
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const systemIdIdx = headers.findIndex(h => h.includes('system') || h.includes('id'));
      const jerseyIdx = headers.findIndex(h => h.includes('jersey') || h.includes('number'));
      const courseIdx = headers.findIndex(h => h.includes('course') || h.includes('school'));
      const yearIdx = headers.findIndex(h => h.includes('year'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      if (nameIdx === -1 || systemIdIdx === -1) {
        alert('CSV must include "Name" and "System ID" columns.');
        setImportLoading(false);
        return;
      }
      const players = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIdx];
        const systemId = cols[systemIdIdx];
        if (!name || !systemId) continue;
        players.push({
          name,
          systemId: String(systemId),
          jerseyNumber: jerseyIdx !== -1 && cols[jerseyIdx] ? String(cols[jerseyIdx]) : null,
          course: courseIdx !== -1 && cols[courseIdx] ? cols[courseIdx] : null,
          year: yearIdx !== -1 && cols[yearIdx] ? cols[yearIdx] : null,
          email: emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : null,
        });
      }
      const res = await api.post(`/sports/squads/${importModalSquad.id}/import`, { players });
      setImportResult(res.data.data);
      queryClient.invalidateQueries();
      refreshSports();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-brand-500" />
            Sports & Squads Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Configure sports, categories, squads, captains, and accent colors. Use the edit/delete buttons to correct any mistakes.
          </p>
        </div>
        <button onClick={() => setNewSportOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Sport
        </button>
      </div>

      {/* Add New Sport Dialog */}
      {newSportOpen && (
        <div className="card p-5 border-brand-500/30 bg-surface-secondary/70 animate-slide-up">
          <h3 className="font-bold text-zinc-100 text-base mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brand-500" /> Create New Sport
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Sport Name</label>
              <input
                type="text"
                placeholder="e.g. Football, Basketball, Cricket"
                value={newSportName}
                onChange={e => setNewSportName(e.target.value)}
                className="input"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSportName.trim()) {
                    createSportMutation.mutate({ name: newSportName.trim(), accentColor: newSportColor });
                  }
                }}
              />
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newSportColor}
                  onChange={e => setNewSportColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-surface-border bg-transparent"
                />
                <input
                  type="text"
                  value={newSportColor}
                  onChange={e => setNewSportColor(e.target.value)}
                  className="input uppercase text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setNewSportOpen(false)} className="btn-ghost btn-sm">Cancel</button>
            <button
              onClick={() => {
                if (!newSportName.trim()) return alert('Please enter sport name');
                createSportMutation.mutate({ name: newSportName.trim(), accentColor: newSportColor });
              }}
              className="btn-primary btn-sm"
              disabled={createSportMutation.isPending}
            >
              {createSportMutation.isPending ? 'Saving...' : 'Save Sport'}
            </button>
          </div>
        </div>
      )}

      {/* Sports List */}
      <div className="space-y-4">
        {sports.map(sport => {
          const isExpanded = expandedSports[sport.name] ?? true;

          return (
            <div key={sport.id} className="card overflow-hidden border-surface-border transition-all">
              {/* Sport Header */}
              <div
                className="p-4 bg-surface-secondary flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => toggleSport(sport.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: sport.accentColor }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-zinc-100">{sport.name}</h2>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
                        style={{
                          backgroundColor: `${sport.accentColor}25`,
                          color: sport.accentColor,
                          border: `1px solid ${sport.accentColor}40`,
                        }}
                      >
                        {sport.accentColor}
                      </span>
                      {!sport.isActive && <span className="badge-inactive">Inactive</span>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {sport.categories?.length || 0} categories ·{' '}
                      {sport.categories?.reduce((acc, c) => acc + (c.squads?.length || 0), 0) || 0} squads
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingSport(sport)}
                    className="btn-ghost btn-sm text-zinc-400 hover:text-zinc-200"
                    title="Edit sport name & color"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setNewCategorySportId(sport.id)}
                    className="btn-secondary btn-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
                  <button
                    onClick={() => setDeletingSport(sport)}
                    className="btn-ghost btn-sm text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    title="Delete sport"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="btn-ghost btn-icon p-1 text-zinc-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Edit Sport Inline */}
              {editingSport?.id === sport.id && (
                <div className="p-4 bg-zinc-900 border-y border-surface-border animate-slide-up">
                  <h4 className="text-sm font-semibold text-zinc-200 mb-2">Edit Sport</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Sport Name</label>
                      <input
                        type="text"
                        value={editingSport.name}
                        onChange={e => setEditingSport({ ...editingSport, name: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingSport.accentColor}
                          onChange={e => setEditingSport({ ...editingSport, accentColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-surface-border bg-transparent"
                        />
                        <input
                          type="text"
                          value={editingSport.accentColor}
                          onChange={e => setEditingSport({ ...editingSport, accentColor: e.target.value })}
                          className="input uppercase text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <button
                        type="button"
                        onClick={() => setEditingSport({ ...editingSport, isActive: !editingSport.isActive })}
                        className={`btn-sm w-full mt-1.5 ${editingSport.isActive ? 'btn-success' : 'btn-secondary'}`}
                      >
                        {editingSport.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setEditingSport(null)} className="btn-ghost btn-sm">Cancel</button>
                    <button
                      onClick={() => updateSportMutation.mutate({
                        id: editingSport.id,
                        name: editingSport.name,
                        accentColor: editingSport.accentColor,
                        isActive: editingSport.isActive,
                      })}
                      disabled={updateSportMutation.isPending}
                      className="btn-primary btn-sm"
                    >
                      {updateSportMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Categories & Squads Content */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Add category inline form */}
                  {newCategorySportId === sport.id && (
                    <div className="p-3 bg-surface-secondary/60 rounded-lg border border-dashed border-zinc-700 flex items-center gap-2 animate-slide-up">
                      <input
                        type="text"
                        placeholder="Category name (e.g. Boys, Girls, U-19)"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="input text-sm flex-1"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newCategoryName.trim()) {
                            createCategoryMutation.mutate({ sportId: sport.id, name: newCategoryName.trim() });
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (!newCategoryName.trim()) return;
                          createCategoryMutation.mutate({ sportId: sport.id, name: newCategoryName.trim() });
                        }}
                        className="btn-primary btn-sm"
                        disabled={createCategoryMutation.isPending}
                      >
                        {createCategoryMutation.isPending ? 'Adding...' : 'Add'}
                      </button>
                      <button onClick={() => { setNewCategorySportId(null); setNewCategoryName(''); }} className="btn-ghost btn-sm">Cancel</button>
                    </div>
                  )}

                  {sport.categories?.map(category => (
                    <div
                      key={category.id}
                      className="rounded-xl bg-surface-secondary/40 border border-surface-border/60 p-4 space-y-3"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between">
                        {editingCategory?.id === category.id ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingCategory.name}
                              onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                              className="input text-sm flex-1"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter' && editingCategory.name.trim()) {
                                  updateCategoryMutation.mutate({ id: editingCategory.id, name: editingCategory.name.trim() });
                                }
                                if (e.key === 'Escape') setEditingCategory(null);
                              }}
                            />
                            <button
                              onClick={() => updateCategoryMutation.mutate({ id: editingCategory.id, name: editingCategory.name.trim() })}
                              disabled={updateCategoryMutation.isPending}
                              className="btn-primary btn-sm text-xs"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingCategory(null)} className="btn-ghost btn-sm text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-zinc-400" />
                            <h3 className="font-semibold text-zinc-200">{category.name}</h3>
                            <span className="text-xs text-zinc-500">({category.squads?.length || 0} squads)</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {editingCategory?.id !== category.id && (
                            <>
                              <button
                                onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                                className="btn-ghost btn-icon p-1.5 text-zinc-400 hover:text-zinc-200"
                                title="Rename category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingCategory({ id: category.id, name: category.name, sport: sport.name })}
                                className="btn-ghost btn-icon p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                title="Delete category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setNewSquadCategoryId(category.id);
                              setNewSquadName(`${sport.name} ${category.name}`);
                            }}
                            className="btn-ghost btn-sm text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Squad
                          </button>
                        </div>
                      </div>

                      {/* Add squad inline form */}
                      {newSquadCategoryId === category.id && (
                        <div className="p-2.5 bg-surface-secondary rounded-lg border border-brand-500/30 flex items-center gap-2 animate-slide-up">
                          <input
                            type="text"
                            placeholder="Squad name (e.g. Kabaddi Boys)"
                            value={newSquadName}
                            onChange={e => setNewSquadName(e.target.value)}
                            className="input text-xs flex-1"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newSquadName.trim()) {
                                createSquadMutation.mutate({ categoryId: category.id, name: newSquadName.trim() });
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (!newSquadName.trim()) return;
                              createSquadMutation.mutate({ categoryId: category.id, name: newSquadName.trim() });
                            }}
                            className="btn-primary btn-sm text-xs"
                            disabled={createSquadMutation.isPending}
                          >
                            {createSquadMutation.isPending ? 'Saving...' : 'Save Squad'}
                          </button>
                          <button onClick={() => setNewSquadCategoryId(null)} className="btn-ghost btn-sm text-xs">Cancel</button>
                        </div>
                      )}

                      {/* Squads in this Category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {category.squads?.map(squad => (
                          <div
                            key={squad.id}
                            className="p-3 rounded-lg bg-surface-card border border-surface-border flex flex-col justify-between gap-3 hover:border-zinc-700 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                {editingSquad?.id === squad.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={editingSquad.name}
                                      onChange={e => setEditingSquad({ ...editingSquad, name: e.target.value })}
                                      className="input text-xs flex-1"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && editingSquad.name.trim()) {
                                          updateSquadMutation.mutate({ id: editingSquad.id, name: editingSquad.name.trim() });
                                        }
                                        if (e.key === 'Escape') setEditingSquad(null);
                                      }}
                                    />
                                    <button
                                      onClick={() => updateSquadMutation.mutate({ id: editingSquad.id, name: editingSquad.name.trim() })}
                                      disabled={updateSquadMutation.isPending}
                                      className="btn-primary btn-sm text-[10px] py-1 px-2"
                                    >✓</button>
                                    <button onClick={() => setEditingSquad(null)} className="btn-ghost btn-sm text-[10px] py-1 px-2">✕</button>
                                  </div>
                                ) : (
                                  <h4 className="font-bold text-zinc-100 text-sm">{squad.name}</h4>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                  <Users className="w-3 h-3 text-zinc-500" />
                                  <span>{squad._count?.players ?? '—'} active players</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                {editingSquad?.id !== squad.id && (
                                  <>
                                    <button
                                      onClick={() => setEditingSquad({ id: squad.id, name: squad.name })}
                                      className="btn-ghost btn-icon p-1 text-zinc-500 hover:text-zinc-200"
                                      title="Rename squad"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingSquad({ id: squad.id, name: squad.name, category: category.name })}
                                      className="btn-ghost btn-icon p-1 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                                      title="Delete squad"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Squad Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t border-surface-border/50 text-xs">
                              <button
                                onClick={() => setCaptainModalSquad({ ...squad, category: { ...category, sport } })}
                                className="btn-ghost btn-sm text-xs text-amber-400 hover:text-amber-300 py-1 px-2"
                                title="Assign or change squad Captain"
                              >
                                <Shield className="w-3 h-3" /> Captain
                              </button>

                              <button
                                onClick={() => {
                                  setImportModalSquad({ ...squad, category: { ...category, sport } });
                                  setCsvText('');
                                  setImportResult(null);
                                }}
                                className="btn-ghost btn-sm text-xs text-zinc-300 hover:text-zinc-100 py-1 px-2"
                                title="Import CSV roster into this squad"
                              >
                                <Upload className="w-3 h-3" /> Import CSV
                              </button>

                              <button
                                onClick={() => setActiveSquadId(squad.id)}
                                className="btn-ghost btn-sm text-xs ml-auto text-brand-400 hover:text-brand-300 py-1 px-2"
                              >
                                Switch to Squad <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Confirm Delete: Sport ─────────────────────────────────────────────── */}
      {deletingSport && (
        <ConfirmDelete
          title={`Delete Sport: ${deletingSport.name}?`}
          message={`This will permanently delete "${deletingSport.name}", all its categories, squads, and session history. Players must be deactivated first. This action CANNOT be undone.`}
          onConfirm={() => deleteSportMutation.mutate(deletingSport.id)}
          onCancel={() => setDeletingSport(null)}
          isPending={deleteSportMutation.isPending}
        />
      )}

      {/* ── Confirm Delete: Category ─────────────────────────────────────────── */}
      {deletingCategory && (
        <ConfirmDelete
          title={`Delete Category: ${deletingCategory.name}?`}
          message={`This will permanently delete the "${deletingCategory.name}" category under ${deletingCategory.sport}, including all its squads and attendance history. Active players must be deactivated first.`}
          onConfirm={() => deleteCategoryMutation.mutate(deletingCategory.id)}
          onCancel={() => setDeletingCategory(null)}
          isPending={deleteCategoryMutation.isPending}
        />
      )}

      {/* ── Confirm Delete: Squad ────────────────────────────────────────────── */}
      {deletingSquad && (
        <ConfirmDelete
          title={`Delete Squad: ${deletingSquad.name}?`}
          message={`This will permanently delete the "${deletingSquad.name}" squad (under ${deletingSquad.category}), along with all its attendance sessions and records. Active players must be deactivated or transferred first.`}
          onConfirm={() => deleteSquadMutation.mutate(deletingSquad.id)}
          onCancel={() => setDeletingSquad(null)}
          isPending={deleteSquadMutation.isPending}
        />
      )}

      {/* ── Assign Captain Modal ──────────────────────────────────────────────── */}
      {captainModalSquad && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="card p-5 max-w-md w-full bg-surface-card border-surface-border space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-zinc-100">Squad Captain Management</h3>
              </div>
              <button onClick={() => setCaptainModalSquad(null)} className="btn-ghost btn-icon p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Select an active player from <strong>{captainModalSquad.name}</strong> to assign as Captain.
              Captains manage attendance and analytics exclusively for their assigned squad.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {squadPlayers.length === 0 ? (
                <p className="text-zinc-500 text-xs py-4 text-center">No active players found in this squad.</p>
              ) : (
                squadPlayers.map((player: any) => {
                  const isCap = player.role === 'CAPTAIN';
                  return (
                    <div
                      key={player.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-sm ${
                        isCap
                          ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                          : 'bg-surface-secondary border-surface-border text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-400">
                          {player.jerseyNumber ? `#${player.jerseyNumber}` : '—'}
                        </span>
                        <span className="font-medium">{player.name}</span>
                        {isCap && <span className="badge-captain text-[10px]">Captain</span>}
                      </div>

                      {isCap ? (
                        <button
                          onClick={() => removeCaptainMutation.mutate(captainModalSquad.id)}
                          className="btn-danger btn-sm text-xs py-1"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => assignCaptainMutation.mutate({ squadId: captainModalSquad.id, playerId: player.id })}
                          className="btn-secondary btn-sm text-xs py-1"
                        >
                          Assign Captain
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setCaptainModalSquad(null)} className="btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ──────────────────────────────────────────────────── */}
      {importModalSquad && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="card p-5 max-w-lg w-full bg-surface-card border-surface-border space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold text-zinc-100">Import Roster CSV</h3>
              </div>
              <button onClick={() => setImportModalSquad(null)} className="btn-ghost btn-icon p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Destination Squad: <span className="text-zinc-100 font-bold">{importModalSquad.name}</span>.
              Paste CSV text below or upload a file. System IDs are verified for uniqueness across the society.
            </p>

            <div className="text-[11px] bg-surface-secondary p-2.5 rounded font-mono text-zinc-400 border border-surface-border">
              Expected header format:<br />
              <code>Name,System ID,Jersey Number,Course,Year,Email</code>
            </div>

            <textarea
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`Name,System ID,Jersey Number,Course,Year,Email\nJohn Doe,2025112233,7,B.Tech,2nd,john@sharda.ac.in`}
              className="input font-mono text-xs w-full"
            />

            {importResult && (
              <div className="p-3 rounded-lg bg-surface-secondary border border-surface-border text-xs space-y-1">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Import Complete
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
                  <div className="bg-zinc-800 p-1.5 rounded">
                    <span className="text-green-400 font-bold">{importResult.imported}</span>
                    <p className="text-[10px] text-zinc-400">Imported</p>
                  </div>
                  <div className="bg-zinc-800 p-1.5 rounded">
                    <span className="text-blue-400 font-bold">{importResult.matched}</span>
                    <p className="text-[10px] text-zinc-400">Matched</p>
                  </div>
                  <div className="bg-zinc-800 p-1.5 rounded">
                    <span className="text-red-400 font-bold">{importResult.rejected?.length || 0}</span>
                    <p className="text-[10px] text-zinc-400">Rejected</p>
                  </div>
                </div>
                {importResult.rejected?.length > 0 && (
                  <div className="text-red-400 text-[11px] max-h-24 overflow-y-auto pt-1">
                    {importResult.rejected.map((r: string, idx: number) => (
                      <p key={idx}>• {r}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setImportModalSquad(null)} className="btn-ghost btn-sm">Close</button>
              <button
                onClick={handleImportCsv}
                disabled={importLoading || !csvText.trim()}
                className="btn-primary btn-sm"
              >
                {importLoading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
