import { useState, useEffect } from 'react';
import { useSquad } from '../context/SquadContext';
import { useAuth } from '../context/AuthContext';
import { Trophy, Check, X, ArrowRight, Users, Sparkles } from 'lucide-react';

export default function SportSquadSelectorModal() {
  const { user } = useAuth();
  const {
    sports,
    activeSquad,
    isOverallView,
    isSelectorOpen,
    closeSelector,
    setActiveSquadId,
    setIsOverallView,
  } = useSquad();

  // Local selection state inside the modal
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');
  const [chooseOverall, setChooseOverall] = useState<boolean>(false);

  // Sync initial selection when modal opens
  useEffect(() => {
    if (isSelectorOpen && sports.length > 0) {
      if (isOverallView) {
        setChooseOverall(true);
      } else if (activeSquad) {
        setChooseOverall(false);
        const sportId = activeSquad.category?.sportId || activeSquad.category?.sport?.id;
        if (sportId) setSelectedSportId(sportId);
        if (activeSquad.categoryId) setSelectedCategoryId(activeSquad.categoryId);
        setSelectedSquadId(activeSquad.id);
      } else {
        // Default to first sport and category
        const firstSport = sports[0];
        if (firstSport) {
          setSelectedSportId(firstSport.id);
          const firstCat = firstSport.categories?.[0];
          if (firstCat) {
            setSelectedCategoryId(firstCat.id);
            const firstSquad = firstCat.squads?.[0];
            if (firstSquad) setSelectedSquadId(firstSquad.id);
          }
        }
      }
    }
  }, [isSelectorOpen, sports, activeSquad, isOverallView]);

  if (!isSelectorOpen) return null;

  const currentSport = sports.find(s => s.id === selectedSportId) || sports[0];
  const categories = currentSport?.categories || [];
  const currentCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const squads = currentCategory?.squads || [];
  const currentSquad = squads.find(sq => sq.id === selectedSquadId) || squads[0];

  const handleSportSelect = (sportId: string) => {
    setChooseOverall(false);
    setSelectedSportId(sportId);
    const sp = sports.find(s => s.id === sportId);
    const firstCat = sp?.categories?.[0];
    if (firstCat) {
      setSelectedCategoryId(firstCat.id);
      const firstSq = firstCat.squads?.[0];
      if (firstSq) setSelectedSquadId(firstSq.id);
    }
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    const firstSq = cat?.squads?.[0];
    if (firstSq) setSelectedSquadId(firstSq.id);
  };

  const handleEnter = () => {
    if (chooseOverall) {
      setIsOverallView(true);
      closeSelector();
      return;
    }

    if (currentSquad) {
      setActiveSquadId(currentSquad.id);
      closeSelector();
    }
  };

  const activeColor = chooseOverall ? '#a855f7' : (currentSport?.accentColor || '#f97316');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-xl bg-surface-card border-surface-border shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-surface-border flex items-center justify-between bg-surface-secondary/40">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-secondary border border-surface-border text-zinc-400 mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Sharda Sports Society
            </div>
            <h2 className="text-xl font-bold text-zinc-50">Select Sport & Squad</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose the sport, category (Boys/Girls), and squad to enter.
            </p>
          </div>
          {activeSquad && (
            <button onClick={closeSelector} className="btn-ghost btn-icon p-1 text-zinc-400 hover:text-zinc-200">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Admin Overall Society Option */}
          {user?.role === 'ADMIN' && (
            <div>
              <button
                type="button"
                onClick={() => setChooseOverall(true)}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  chooseOverall
                    ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20 text-purple-200'
                    : 'bg-surface-secondary border-surface-border text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-900/50 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Overall Sports Society Dashboard</p>
                    <p className="text-xs text-zinc-400">View aggregate attendance across all sports</p>
                  </div>
                </div>
                {chooseOverall && <Check className="w-5 h-5 text-purple-400" />}
              </button>
            </div>
          )}

          {/* Step 1: Select Sport */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              1. Choose Sport
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {sports.map(sport => {
                const isSelected = !chooseOverall && selectedSportId === sport.id;
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSportSelect(sport.id)}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isSelected
                        ? 'border-2 shadow-lg'
                        : 'bg-surface-secondary border-surface-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                    style={{
                      borderColor: isSelected ? sport.accentColor : undefined,
                      backgroundColor: isSelected ? `${sport.accentColor}18` : undefined,
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: sport.accentColor }}
                    />
                    <span className={`text-sm font-bold ${isSelected ? 'text-zinc-100' : ''}`}>
                      {sport.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!chooseOverall && (
            <>
              {/* Step 2: Choose Category (Boys / Girls) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  2. Choose Category
                </label>
                {categories.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2">No categories configured for this sport.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {categories.map(cat => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`p-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'bg-zinc-800 text-zinc-100 font-bold border-brand-500 shadow-sm'
                              : 'bg-surface-secondary border-surface-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                          }`}
                        >
                          <Users className="w-4 h-4 text-zinc-400" />
                          <span>{cat.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-brand-400 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Squad Selection */}
              {squads.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    3. Target Squad
                  </label>
                  <div className="space-y-2">
                    {squads.map(sq => {
                      const isSelected = selectedSquadId === sq.id;
                      return (
                        <button
                          key={sq.id}
                          type="button"
                          onClick={() => setSelectedSquadId(sq.id)}
                          className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                            isSelected
                              ? 'bg-zinc-800/90 text-zinc-100 font-semibold border-brand-500'
                              : 'bg-surface-secondary/70 border-surface-border text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold">{sq.name}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {sq._count?.players ?? '—'} registered players
                            </p>
                          </div>
                          {isSelected && (
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: activeColor }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Selection Summary Pill */}
          <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border flex items-center justify-between text-xs">
            <span className="text-zinc-400">Selected Context:</span>
            <span className="font-bold text-zinc-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
              {chooseOverall
                ? 'Overall Sports Society'
                : `${currentSport?.name || ''} → ${currentCategory?.name || ''} (${currentSquad?.name || ''})`}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-border bg-surface-secondary/40 flex items-center justify-end gap-3">
          {activeSquad && (
            <button type="button" onClick={closeSelector} className="btn-ghost btn-sm">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleEnter}
            className="btn btn-lg font-bold text-white px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:brightness-110"
            style={{
              backgroundColor: activeColor,
            }}
          >
            <span>{chooseOverall ? 'Enter Dashboard' : 'ENTER SQUAD'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
