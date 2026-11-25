import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Monitor, Play, Search, X } from 'lucide-react';
import type { RealChannel, RealMatch } from '../types/broadcast';

interface ScreenBroadcastPickerProps {
  screenLabel: string;
  isTargeted: boolean;
  channel: RealChannel;
  activeMatch: RealMatch | null;
  channels: RealChannel[];
  matches: RealMatch[];
  onTarget: () => void;
  onSelectChannel: (channel: RealChannel) => void;
  onSelectMatch: (match: RealMatch) => void;
}

type PickerTab = 'all' | 'kids' | 'sport' | 'maghreb' | 'matches';

export function ScreenBroadcastPicker({
  screenLabel,
  isTargeted,
  channel,
  activeMatch,
  channels,
  matches,
  onTarget,
  onSelectChannel,
  onSelectMatch,
}: ScreenBroadcastPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PickerTab>('all');
  const [query, setQuery] = useState('');

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((ch) => {
      if (activeTab === 'kids' && ch.network !== 'Kids & Animés') return false;
      if (
        activeTab === 'sport' &&
        ch.network !== 'beIN SPORTS' &&
        ch.network !== 'Sport International'
      ) {
        return false;
      }
      if (
        activeTab === 'maghreb' &&
        ch.network !== 'Tunisie' &&
        ch.network !== 'Qatar & Golfe' &&
        ch.network !== 'Algérie' &&
        ch.network !== 'Maroc'
      ) {
        return false;
      }
      if (q) {
        const hay = `${ch.name} ${ch.number} ${ch.network} ${ch.language}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [channels, activeTab, query]);

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (!q) return true;
      const hay = `${m.title} ${m.competition} ${m.beinChannel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [matches, query]);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isTargeted
          ? 'bg-[#151A26] border-rose-500'
          : 'bg-[#11151E] border-white/15'
      }`}
    >
      {/* Screen Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onTarget}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
              isTargeted
                ? 'bg-rose-600 text-white'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
            title="Cliquer pour envoyer les choix de la grille vers cet écran"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{screenLabel}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
              <span className="font-mono text-rose-400 shrink-0">{channel.number}</span>
              <span className="truncate">{channel.name}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 truncate">
              {activeMatch ? `${activeMatch.title} · ${channel.network}` : `${channel.network} · ${channel.language}`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 border transition-colors ${
            isOpen
              ? 'bg-white text-slate-950 border-white'
              : 'bg-[#0B0E14] text-white border-white/15 hover:border-white/35'
          }`}
        >
          <span>Choisir programme</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Independent Broadcast Chooser for This Screen */}
      {isOpen && (
        <div className="border-t border-white/10 p-3 space-y-2.5 bg-[#0B0E14]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Choisir pour ${screenLabel} (chaîne, animé, match)...`}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#11151E] border border-white/15 text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Effacer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'all', label: 'Toutes Chaînes' },
                { id: 'kids', label: 'Kids & Animés' },
                { id: 'sport', label: 'Sport & beIN' },
                { id: 'maghreb', label: 'Maghreb & Golfe' },
                { id: 'matches', label: `Matchs (${matches.length})` },
              ] as { id: PickerTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#11151E] text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {activeTab === 'matches' ? (
              filteredMatches.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-slate-400">
                  Aucun match trouvé pour cette recherche
                </div>
              ) : (
                filteredMatches.map((m) => {
                  const selected = activeMatch?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectMatch(m);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-rose-600/20 border-rose-500 text-white'
                          : 'bg-[#11151E] border-white/10 hover:border-white/25 text-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{m.title}</div>
                        <div className="text-[11px] font-medium text-slate-400 truncate">
                          {m.competition} · {m.beinChannel} · {m.statusDetail}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums font-bold text-rose-400 shrink-0">
                        {m.status === 'live' ? 'DIRECT' : `${m.homeTeam.score}-${m.awayTeam.score}`}
                      </span>
                    </button>
                  );
                })
              )
            ) : filteredChannels.length === 0 ? (
              <div className="py-4 text-center text-xs font-semibold text-slate-400">
                Aucune chaîne trouvée pour cette recherche
              </div>
            ) : (
              filteredChannels.map((ch) => {
                const selected = ch.id === channel.id && !activeMatch;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      onSelectChannel(ch);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'bg-rose-600/20 border-rose-500 text-white'
                        : 'bg-[#11151E] border-white/10 hover:border-white/25 text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <span className="font-mono text-rose-400 shrink-0">{ch.number}</span>
                        <span className="truncate">{ch.name}</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 truncate">
                        {ch.network} · {ch.language} · {ch.quality}
                      </div>
                    </div>
                    {ch.id === channel.id ? (
                      <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
