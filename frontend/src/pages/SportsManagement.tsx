import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useSquad, type Sport, type Squad } from '../context/SquadContext';
import {
  Trophy, Plus, Edit2, X, Shield, Users, Upload,
  CheckCircle2, ChevronDown, ChevronRight,
  Layers
} from 'lucide-react';

export default function SportsManagement() {
  const queryClient = useQueryClient();
  const { sports, refreshSports, setActiveSquadId } = useSquad();

  // Dialog / Modal states
  const [newSportOpen, setNewSportOpen] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportColor, setNewSportColor] = useState('#f97316');

  const [newCategorySportId, setNewCategorySportId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [newSquadCategoryId, setNewSquadCategoryId] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState('');

  // Editing state
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [captainModalSquad, setCaptainModalSquad] = useState<Squad | null>(null);
  const [importModalSquad, setImportModalSquad] = useState<Squad | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Expanded sports accordions
  const [expandedSports, setExpandedSports] = useState<Record<string, boolean>>({
    Kabaddi: true,
    Badminton: true,
    Taekwondo: true,
  });

  const toggleSport = (name: string) => {
    setExpandedSports(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Queries for squad players when assigning Captain
  const { data: squadPlayers = [] } = useQuery({
    queryKey: ['squad-players', captainModalSquad?.id],
    enabled: !!captainModalSquad,
    queryFn: () => api.get(`/players?squadId=${captainModalSquad!.id}`).then(r => r.data.data),
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createSportMutation = useMutation({
    mutationFn: (data: { name: string; accentColor: string }) => api.post('/sports', data),
    onSuccess: () => {
      refreshSports();
      setNewSportOpen(false);
      setNewSportName('');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create sport'),
  });

  const updateSportMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/sports/${id}`, data),
    onSuccess: () => {
      refreshSports();
      setEditingSport(null);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update sport'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: ({ sportId, name }: { sportId: string; name: string }) =>
      api.post(`/sports/${sportId}/categories`, { name }),
    onSuccess: () => {
      refreshSports();
      setNewCategorySportId(null);
      setNewCategoryName('');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create category'),
  });

  const createSquadMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      api.post(`/sports/categories/${categoryId}/squads`, { name }),
    onSuccess: () => {
      refreshSports();
      setNewSquadCategoryId(null);
      setNewSquadName('');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create squad'),
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
      // Parse CSV rows
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
            Configure sports, categories, squads, captains, and accent colors across Sharda Sports Society.
          </p>
        </div>
        <button
          onClick={() => setNewSportOpen(true)}
          className="btn-primary"
        >
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
            <div
              key={sport.id}
              className="card overflow-hidden border-surface-border transition-all"
            >
              {/* Sport Header */}
              <div
                className="p-4 bg-surface-secondary flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => toggleSport(sport.name)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sport.accentColor }}
                  />
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
                      {!sport.isActive && (
                        <span className="badge-inactive">Inactive</span>
                      )}
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
                    title="Edit Sport details & accent color"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setNewCategorySportId(sport.id);
                      setNewCategoryName('');
                    }}
                    className="btn-secondary btn-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
                  <button className="btn-ghost btn-icon p-1 text-zinc-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Edit Sport Form Modal/Inline */}
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
                      className="btn-primary btn-sm"
                    >
                      Save Changes
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
                      />
                      <button
                        onClick={() => {
                          if (!newCategoryName.trim()) return;
                          createCategoryMutation.mutate({ sportId: sport.id, name: newCategoryName.trim() });
                        }}
                        className="btn-primary btn-sm"
                      >
                        Add
                      </button>
                      <button onClick={() => setNewCategorySportId(null)} className="btn-ghost btn-sm">Cancel</button>
                    </div>
                  )}

                  {sport.categories?.map(category => (
                    <div
                      key={category.id}
                      className="rounded-xl bg-surface-secondary/40 border border-surface-border/60 p-4 space-y-3"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-zinc-400" />
                          <h3 className="font-semibold text-zinc-200">{category.name}</h3>
                          <span className="text-xs text-zinc-500">
                            ({category.squads?.length || 0} squads)
                          </span>
                        </div>
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
                          />
                          <button
                            onClick={() => {
                              if (!newSquadName.trim()) return;
                              createSquadMutation.mutate({ categoryId: category.id, name: newSquadName.trim() });
                            }}
                            className="btn-primary btn-sm text-xs"
                          >
                            Save Squad
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
                              <div>
                                <h4 className="font-bold text-zinc-100 text-sm">{squad.name}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                  <Users className="w-3 h-3 text-zinc-500" />
                                  <span>{squad._count?.players ?? '—'} active players</span>
                                </div>
                              </div>
                              <span className="badge-active text-[10px]">Active</span>
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
                                onClick={() => {
                                  setActiveSquadId(squad.id);
                                }}
                                className="btn-ghost btn-sm text-xs ml-auto text-brand-400 hover:text-brand-300 py-1 px-2"
                              >
                                Switch to Squad →
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

      {/* ── Assign Captain Modal ─────────────────────────────────────────────── */}
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

      {/* ── CSV Import Modal ─────────────────────────────────────────────────── */}
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
              placeholder="Name,System ID,Jersey Number,Course,Year,Email&#10;John Doe,2025112233,7,B.Tech,2nd,john@sharda.ac.in"
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
