import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Columns2,
  Flame,
  Gamepad2,
  Globe,
  LayoutGrid,
  Maximize,
  Play,
  Radio,
  RefreshCw,
  Search,
  Smile,
  Trophy,
  Tv,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  FOOTBALL_LEAGUES,
  type RealChannel,
  type RealMatch,
  type SportCategoryId,
} from './types/broadcast';
import { RealVideoPlayer } from './components/RealVideoPlayer';
import { ChannelDirectoryPanel } from './components/ChannelDirectoryPanel';
import { ScreenBroadcastPicker } from './components/ScreenBroadcastPicker';
import { RealMatchCard } from './components/RealMatchCard';
import { RealScheduleTable } from './components/RealScheduleTable';

type MatchStatusFilter = 'all' | 'live' | 'upcoming' | 'finished';

export default function App() {
  const [channels, setChannels] = useState<RealChannel[]>([]);
  const [matches, setMatches] = useState<RealMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<SportCategoryId>('all');
  const [footballLeague, setFootballLeague] = useState<string>('Toutes');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [primaryChannel, setPrimaryChannel] = useState<RealChannel | null>(null);
  const [secondaryChannel, setSecondaryChannel] = useState<RealChannel | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<RealMatch | null>(null);
  const [secondaryMatch, setSecondaryMatch] = useState<RealMatch | null>(null);

  const [multiScreenMode, setMultiScreenMode] = useState(false);
  const [cinemaWideMode, setCinemaWideMode] = useState(false);
  const [targetScreen, setTargetScreen] = useState<'primary' | 'secondary'>('primary');
  const [remindedIds, setRemindedIds] = useState<string[]>([]);

  const playerSectionRef = useRef<HTMLElement | null>(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [chRes, mRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/matches'),
      ]);
      const chJson = (await chRes.json()) as { channels?: RealChannel[] };
      const mJson = (await mRes.json()) as {
        matches?: RealMatch[];
        updatedAt?: string;
        error?: string;
      };

      if (chJson.channels && chJson.channels.length > 0) {
        const list = chJson.channels;
        setChannels(list);
        const savedPrimaryId = window.localStorage.getItem('mk_screen1_channel');
        const savedSecondaryId = window.localStorage.getItem('mk_screen2_channel');
        setPrimaryChannel(
          (curr) => curr ?? list.find((c) => c.id === savedPrimaryId) ?? list[0]
        );
        setSecondaryChannel(
          (curr) =>
            curr ??
            list.find((c) => c.id === savedSecondaryId) ??
            list.find((c) => c.category === 'kids') ??
            list[1] ??
            list[0]
        );
      }

      if (mJson.matches) {
        setMatches(mJson.matches);
        setSelectedMatch((curr) => {
          if (!curr) return mJson.matches![0] ?? null;
          return mJson.matches!.find((m) => m.id === curr.id) ?? curr;
        });
        setSecondaryMatch((curr) => {
          if (!curr) return null;
          return mJson.matches!.find((m) => m.id === curr.id) ?? curr;
        });
      }

      if (mJson.updatedAt) {
        setLastUpdated(mJson.updatedAt);
      }
      setFetchError(mJson.error ?? null);
    } catch {
      setFetchError('Impossible de charger les matchs en direct pour le moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(() => {
      loadData(false);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const categoryCounts = useMemo(() => {
    const counts: Record<SportCategoryId, number> = {
      all: matches.length + channels.length,
      kids: channels.filter((c) => c.category === 'kids').length,
      bein: channels.filter((c) => c.network === 'beIN SPORTS').length,
      tunisie: channels.filter((c) => c.category === 'tunisie').length,
      qatar: channels.filter((c) => c.category === 'qatar').length,
      algerie: channels.filter((c) => c.category === 'algerie').length,
      maroc: channels.filter((c) => c.category === 'maroc').length,
      football: 0,
      channels: channels.length,
      basketball: 0,
      tennis: 0,
      motorsport: 0,
      combat: 0,
    };
    matches.forEach((m) => {
      counts[m.category] += 1;
    });
    return counts;
  }, [matches, channels]);

  const filteredChannels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return channels.filter((ch) => {
      if (selectedCategory === 'bein' && ch.network !== 'beIN SPORTS') return false;
      if (
        selectedCategory !== 'all' &&
        selectedCategory !== 'bein' &&
        selectedCategory !== 'channels' &&
        ch.category !== selectedCategory
      ) {
        return false;
      }
      if (q) {
        const hay = `${ch.name} ${ch.number} ${ch.network} ${ch.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [channels, selectedCategory, searchQuery]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matches.filter((m) => {
      if (
        selectedCategory === 'kids' ||
        selectedCategory === 'bein' ||
        selectedCategory === 'channels' ||
        selectedCategory === 'tunisie' ||
        selectedCategory === 'qatar' ||
        selectedCategory === 'algerie' ||
        selectedCategory === 'maroc'
      ) {
        return false;
      }
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (
        (selectedCategory === 'football' || selectedCategory === 'all') &&
        footballLeague !== 'Toutes' &&
        m.competition !== footballLeague
      ) {
        return false;
      }
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (q) {
        const hay = `${m.title} ${m.competition} ${m.beinChannel} ${m.venue} ${m.homeTeam.name} ${m.awayTeam.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, selectedCategory, footballLeague, statusFilter, searchQuery]);

  const groupedMatches = useMemo(() => {
    const order: Array<RealMatch['category']> = [
      'football',
      'basketball',
      'tennis',
      'motorsport',
      'combat',
    ];
    return order
      .map((cat) => {
        const meta = CATEGORIES.find((c) => c.id === cat)!;
        return {
          ...meta,
          items: filteredMatches.filter((m) => m.category === cat),
        };
      })
      .filter((g) => g.items.length > 0);
  }, [filteredMatches]);

  const assignChannelToScreen = (ch: RealChannel, screen: 'primary' | 'secondary') => {
    if (screen === 'secondary') {
      setSecondaryChannel(ch);
      setSecondaryMatch(null);
      window.localStorage.setItem('mk_screen2_channel', ch.id);
    } else {
      setPrimaryChannel(ch);
      if (ch.category === 'kids') {
        setSelectedMatch(null);
      }
      window.localStorage.setItem('mk_screen1_channel', ch.id);
    }
  };

  const assignMatchToScreen = (match: RealMatch, screen: 'primary' | 'secondary') => {
    const linked =
      channels.find((c) => c.id === match.linkedChannelId) ?? channels[0] ?? null;
    if (screen === 'secondary') {
      setSecondaryMatch(match);
      if (linked) {
        setSecondaryChannel(linked);
        window.localStorage.setItem('mk_screen2_channel', linked.id);
      }
    } else {
      setSelectedMatch(match);
      if (linked) {
        setPrimaryChannel(linked);
        window.localStorage.setItem('mk_screen1_channel', linked.id);
      }
    }
  };

  const handleSwapScreens = () => {
    if (!primaryChannel || !secondaryChannel) return;
    const prevPrimary = primaryChannel;
    const prevSecondary = secondaryChannel;
    const prevPrimaryMatch = selectedMatch;
    const prevSecondaryMatch = secondaryMatch;
    setPrimaryChannel(prevSecondary);
    setSecondaryChannel(prevPrimary);
    setSelectedMatch(prevSecondaryMatch);
    setSecondaryMatch(prevPrimaryMatch);
    window.localStorage.setItem('mk_screen1_channel', prevSecondary.id);
    window.localStorage.setItem('mk_screen2_channel', prevPrimary.id);
  };

  const handleSelectChannel = (ch: RealChannel) => {
    const target = multiScreenMode ? targetScreen : 'primary';
    assignChannelToScreen(ch, target);
    playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectMatch = (match: RealMatch) => {
    const target = multiScreenMode ? targetScreen : 'primary';
    assignMatchToScreen(match, target);
    playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleReminder = (id: string) => {
    setRemindedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setFootballLeague('Toutes');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const getCategoryIcon = (id: SportCategoryId) => {
    switch (id) {
      case 'all':
        return <LayoutGrid className="w-3.5 h-3.5 shrink-0" />;
      case 'kids':
        return <Smile className="w-3.5 h-3.5 shrink-0" />;
      case 'bein':
        return <Tv className="w-3.5 h-3.5 shrink-0" />;
      case 'tunisie':
      case 'qatar':
      case 'algerie':
      case 'maroc':
        return <Globe className="w-3.5 h-3.5 shrink-0" />;
      case 'football':
        return <Trophy className="w-3.5 h-3.5 shrink-0" />;
      case 'channels':
        return <Radio className="w-3.5 h-3.5 shrink-0" />;
      case 'basketball':
        return <Flame className="w-3.5 h-3.5 shrink-0" />;
      case 'tennis':
        return <Radio className="w-3.5 h-3.5 shrink-0" />;
      case 'motorsport':
        return <Gamepad2 className="w-3.5 h-3.5 shrink-0" />;
      case 'combat':
        return <Flame className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080A0F] text-white overflow-x-hidden">
      {/* Top Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-[#080A0F]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#direct"
            className="font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            MK.tv
          </a>

          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-200"
          >
            <a
              href="#direct"
              onClick={() => setSelectedCategory('all')}
              className="hover:text-white hover:underline underline-offset-8 decoration-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              En Direct
            </a>
            <a
              href="#chaines"
              onClick={() => setSelectedCategory('bein')}
              className="hover:text-white hover:underline underline-offset-8 decoration-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              Chaînes beIN
            </a>
            <a
              href="#chaines"
              onClick={() => setSelectedCategory('kids')}
              className="hover:text-white hover:underline underline-offset-8 decoration-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              Kids & Animés
            </a>
            <a
              href="#categories"
              onClick={() => setSelectedCategory('football')}
              className="hover:text-white hover:underline underline-offset-8 decoration-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              Catégories
            </a>
            <a
              href="#programme"
              className="hover:text-white hover:underline underline-offset-8 decoration-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              Programme
            </a>
          </nav>

          <button
            type="button"
            onClick={() => {
              setMultiScreenMode((m) => !m);
              playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              multiScreenMode
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-white text-slate-950 hover:bg-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>{multiScreenMode ? 'Écran Unique' : 'Multi-Écrans'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-5 space-y-8">
        {/* Section 1: Live Video Broadcast Stage */}
        <section id="direct" ref={playerSectionRef} className="space-y-3 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                <span className="text-rose-400">DIRECT HLS</span>
                <span aria-hidden="true">·</span>
                <span className="text-white">{primaryChannel?.name ?? 'MK.tv'}</span>
                {lastUpdated && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      Scores{' '}
                      {new Date(lastUpdated).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                {multiScreenMode
                  ? `Multi-Écrans : ${primaryChannel?.name ?? ''} & ${secondaryChannel?.name ?? ''}`
                  : selectedMatch
                  ? `${primaryChannel?.name ?? 'Direct'} — ${selectedMatch.title}`
                  : primaryChannel?.name ?? 'MK.tv En Direct'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!multiScreenMode && (
                <button
                  type="button"
                  onClick={() => setCinemaWideMode((w) => !w)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                    cinemaWideMode
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'bg-[#11151E] border-white/15 hover:border-white/30 text-white'
                  }`}
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span>{cinemaWideMode ? 'Afficher Chaînes' : 'Pleine Largeur'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11151E] border border-white/15 hover:border-white/30 text-xs font-bold text-white transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>

              {multiScreenMode && (
                <>
                  <button
                    type="button"
                    onClick={handleSwapScreens}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11151E] border border-white/15 hover:border-white/30 text-xs font-bold text-white transition-colors whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Permuter</span>
                  </button>

                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#11151E] border border-white/15">
                    <button
                      type="button"
                      onClick={() => setTargetScreen('primary')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap ${
                        targetScreen === 'primary'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Cibler Écran 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetScreen('secondary')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap ${
                        targetScreen === 'secondary'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Cibler Écran 2
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {primaryChannel ? (
            multiScreenMode ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="space-y-2.5">
                  <ScreenBroadcastPicker
                    screenLabel="Écran 1"
                    isTargeted={targetScreen === 'primary'}
                    channel={primaryChannel}
                    activeMatch={selectedMatch}
                    channels={channels}
                    matches={matches}
                    onTarget={() => setTargetScreen('primary')}
                    onSelectChannel={(ch) => assignChannelToScreen(ch, 'primary')}
                    onSelectMatch={(m) => assignMatchToScreen(m, 'primary')}
                  />
                  <RealVideoPlayer
                    key={`screen1-${primaryChannel.id}`}
                    channel={primaryChannel}
                    activeMatch={selectedMatch}
                    compact
                  />
                </div>

                <div className="space-y-2.5">
                  <ScreenBroadcastPicker
                    screenLabel="Écran 2"
                    isTargeted={targetScreen === 'secondary'}
                    channel={secondaryChannel ?? primaryChannel}
                    activeMatch={secondaryMatch}
                    channels={channels}
                    matches={matches}
                    onTarget={() => setTargetScreen('secondary')}
                    onSelectChannel={(ch) => assignChannelToScreen(ch, 'secondary')}
                    onSelectMatch={(m) => assignMatchToScreen(m, 'secondary')}
                  />
                  <RealVideoPlayer
                    key={`screen2-${(secondaryChannel ?? primaryChannel).id}`}
                    channel={secondaryChannel ?? primaryChannel}
                    activeMatch={secondaryMatch}
                    compact
                  />
                </div>
              </div>
            ) : cinemaWideMode ? (
              <div className="w-full">
                <RealVideoPlayer
                  key={`single-${primaryChannel.id}`}
                  channel={primaryChannel}
                  activeMatch={selectedMatch}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-stretch">
                <RealVideoPlayer
                  key={`single-${primaryChannel.id}`}
                  channel={primaryChannel}
                  activeMatch={selectedMatch}
                />
                <ChannelDirectoryPanel
                  channels={channels}
                  activeChannelId={primaryChannel.id}
                  onSelectChannel={handleSelectChannel}
                />
              </div>
            )
          ) : (
            <div className="aspect-video w-full rounded-xl bg-[#11151E] border border-white/10 animate-pulse" />
          )}
        </section>

        {/* Section 2: Wrapped Category Navigation & Search Controls (Zero Off-Screen Overflow) */}
        <section id="categories" className="space-y-5 scroll-mt-16">
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-white/10">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id !== 'football' && cat.id !== 'all') {
                      setFootballLeague('Toutes');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                    active
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'bg-[#11151E] border-white/10 hover:border-white/25 text-slate-200 hover:text-white'
                  }`}
                >
                  {getCategoryIcon(cat.id)}
                  <span>{cat.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      active ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    {categoryCounts[cat.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un match ou une chaîne..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#11151E] border border-white/15 text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Effacer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#11151E] border border-white/15">
                {(
                  [
                    { id: 'all', label: 'Tout' },
                    { id: 'live', label: 'En Direct' },
                    { id: 'upcoming', label: 'À Venir' },
                    { id: 'finished', label: 'Terminés' },
                  ] as { id: MatchStatusFilter; label: string }[]
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                      statusFilter === st.id
                        ? 'bg-white text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {(selectedCategory === 'football' || selectedCategory === 'all') && (
            <div className="flex flex-wrap items-center gap-1.5">
              {FOOTBALL_LEAGUES.map((league) => {
                const active = footballLeague === league;
                return (
                  <button
                    key={league}
                    type="button"
                    onClick={() => setFootballLeague(league)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                      active
                        ? 'bg-white text-slate-950 border-white'
                        : 'bg-[#11151E] text-slate-300 border-white/10 hover:border-white/25'
                    }`}
                  >
                    {league}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chaînes beIN SPORTS & Direct TV Section */}
          {filteredChannels.length > 0 && (
            <div id="chaines" className="space-y-3 scroll-mt-16">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.id === 'all'
                    ? 'Chaînes beIN, Maghreb, Qatar & Sport TV'
                    : CATEGORIES.find((c) => c.id === selectedCategory)?.label ??
                      'Chaînes en Direct'}
                </h2>
                <span className="text-xs font-mono tabular-nums font-bold text-slate-400">
                  {filteredChannels.length} chaînes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredChannels.map((ch) => {
                  const onScreen1 = ch.id === primaryChannel?.id;
                  const onScreen2 = multiScreenMode && ch.id === secondaryChannel?.id;
                  const isPlaying = onScreen1 || onScreen2;

                  if (multiScreenMode) {
                    return (
                      <div
                        key={ch.id}
                        className={`rounded-xl border p-3.5 space-y-2 transition-colors ${
                          isPlaying
                            ? 'bg-[#181E2B] border-rose-500'
                            : 'bg-[#11151E] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono font-bold text-rose-400">{ch.number}</span>
                          <span className="font-mono tabular-nums font-bold text-slate-300">
                            {ch.quality}
                          </span>
                        </div>
                        <div className="font-display font-bold text-sm text-white truncate">
                          {ch.name}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400 truncate">
                          {ch.network} · {ch.language}
                        </div>
                        <div className="pt-2 border-t border-white/10 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              assignChannelToScreen(ch, 'primary');
                              playerSectionRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                              onScreen1
                                ? 'bg-rose-600 text-white'
                                : 'bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white'
                            }`}
                          >
                            {onScreen1 ? 'Sur Écran 1' : 'Mettre Écran 1'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              assignChannelToScreen(ch, 'secondary');
                              playerSectionRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                              onScreen2
                                ? 'bg-rose-600 text-white'
                                : 'bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white'
                            }`}
                          >
                            {onScreen2 ? 'Sur Écran 2' : 'Mettre Écran 2'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleSelectChannel(ch)}
                      className={`group text-left rounded-xl border p-3.5 space-y-2 transition-colors ${
                        isPlaying
                          ? 'bg-[#181E2B] border-rose-500'
                          : 'bg-[#11151E] border-white/10 hover:border-white/25 hover:bg-[#151B27]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono font-bold text-rose-400">{ch.number}</span>
                        <span className="font-mono tabular-nums font-bold text-slate-300">
                          {ch.quality}
                        </span>
                      </div>
                      <div className="font-display font-bold text-sm text-white truncate">
                        {ch.name}
                      </div>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400 truncate">
                          {ch.language}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-white group-hover:text-rose-400 transition-colors shrink-0">
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isPlaying ? 'En lecture' : 'Regarder'}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real Matches Loading / Error / Categorized Grids */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-[#11151E] border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : fetchError && matches.length === 0 ? (
            <div className="bg-[#11151E] border border-white/15 rounded-xl p-8 text-center space-y-3">
              <p className="text-sm font-bold text-white">{fetchError}</p>
              <button
                type="button"
                onClick={() => loadData(true)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                Réessayer
              </button>
            </div>
          ) : filteredMatches.length === 0 && filteredChannels.length === 0 ? (
            <div className="bg-[#11151E] border border-white/15 rounded-xl p-8 text-center space-y-3">
              <p className="text-sm font-bold text-white">
                Aucun match réel ni chaîne trouvé pour ce filtre
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                Afficher tous les matchs
              </button>
            </div>
          ) : (
            groupedMatches.length > 0 && (
              <div className="space-y-8">
                {groupedMatches.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="font-display text-base sm:text-lg font-bold text-white">
                        {group.label}
                      </h2>
                      <span className="text-xs font-mono tabular-nums font-bold text-slate-400">
                        {group.items.length} match{group.items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map((match) => (
                        <RealMatchCard
                          key={match.id}
                          match={match}
                          isActive={selectedMatch?.id === match.id}
                          onSelect={handleSelectMatch}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>

        {/* Daily Real Match Schedule Table */}
        {matches.length > 0 && (
          <section id="programme" className="space-y-3 scroll-mt-16">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Programme Réel des Matchs & Chaînes beIN
              </h2>
              <span className="text-xs font-mono tabular-nums font-bold text-slate-400">
                {matches.length} matchs
              </span>
            </div>

            <RealScheduleTable
              matches={matches}
              activeMatchId={selectedMatch?.id}
              remindedIds={remindedIds}
              onWatch={handleSelectMatch}
              onToggleReminder={handleToggleReminder}
            />
          </section>
        )}
      </main>

      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-sm font-extrabold text-white">MK.tv</span>
            <span aria-hidden="true">·</span>
            <span>Matchs réels en direct & chaînes sportives HD</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('kids');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Kids & Animés
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('bein');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              beIN SPORTS
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('tunisie');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Tunisie
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('qatar');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Qatar & Golfe
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('algerie');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Algérie
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('maroc');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Maroc
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('football');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Football
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
