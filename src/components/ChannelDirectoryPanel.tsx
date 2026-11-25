import { useState } from 'react';
import { Play, Tv } from 'lucide-react';
import type { ChannelNetwork, RealChannel } from '../types/broadcast';

interface ChannelDirectoryPanelProps {
  channels: RealChannel[];
  activeChannelId: string;
  onSelectChannel: (channel: RealChannel) => void;
}

const NETWORK_ORDER: ChannelNetwork[] = [
  'beIN SPORTS',
  'Kids & Animés',
  'Tunisie',
  'Qatar & Golfe',
  'Algérie',
  'Maroc',
  'Sport International',
];

type DirectoryFilter = 'all' | 'sport' | 'kids' | 'maghreb';

export function ChannelDirectoryPanel({
  channels,
  activeChannelId,
  onSelectChannel,
}: ChannelDirectoryPanelProps) {
  const [dirFilter, setDirFilter] = useState<DirectoryFilter>('all');

  const visibleChannels = channels.filter((ch) => {
    if (dirFilter === 'kids') return ch.network === 'Kids & Animés';
    if (dirFilter === 'sport') {
      return ch.network === 'beIN SPORTS' || ch.network === 'Sport International';
    }
    if (dirFilter === 'maghreb') {
      return (
        ch.network === 'Tunisie' ||
        ch.network === 'Qatar & Golfe' ||
        ch.network === 'Algérie' ||
        ch.network === 'Maroc'
      );
    }
    return true;
  });

  const grouped = NETWORK_ORDER.map((network) => ({
    network,
    items: visibleChannels.filter((c) => c.network === network),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="relative h-80 lg:h-full bg-[#11151E] border border-white/15 rounded-xl overflow-hidden">
      <div className="lg:absolute lg:inset-0 flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0B0E14] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Tv className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">Chaînes en Direct</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums font-bold text-slate-400 shrink-0">
            {visibleChannels.length} TV
          </span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-2 bg-[#0B0E14]/60 border-b border-white/10 shrink-0 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Tout' },
              { id: 'sport', label: 'Sport' },
              { id: 'kids', label: 'Kids' },
              { id: 'maghreb', label: 'Maghreb' },
            ] as { id: DirectoryFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDirFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                dirFilter === tab.id
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
          {grouped.map((group) => (
            <div key={group.network} className="space-y-1.5">
              <div className="px-1 text-[11px] font-bold text-slate-400">
                {group.network}
              </div>
              {group.items.map((ch) => (
                <ChannelRow
                  key={ch.id}
                  channel={ch}
                  isActive={ch.id === activeChannelId}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ChannelRow({
  channel,
  isActive,
  onSelect,
}: {
  channel: RealChannel;
  isActive: boolean;
  onSelect: (c: RealChannel) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
        isActive
          ? 'bg-rose-600/20 border-rose-500 text-white'
          : 'bg-[#0B0E14]/70 border-white/10 hover:border-white/25 text-white'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <span className="font-mono text-rose-400 shrink-0">{channel.number}</span>
          <span className="truncate">{channel.name}</span>
        </div>
        <div className="text-[11px] font-medium text-slate-400 truncate">
          {channel.language} · {channel.quality}
        </div>
      </div>
      <span className="inline-flex items-center text-[11px] font-mono font-bold text-slate-300 shrink-0">
        {isActive ? (
          <span className="text-rose-400">LIVE</span>
        ) : (
          <Play className="w-3.5 h-3.5 text-slate-400" />
        )}
      </span>
    </button>
  );
}
