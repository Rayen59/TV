import { Play, Plus, Tv } from 'lucide-react';
import type { RealChannel } from '../types/broadcast';

interface ChannelDirectoryPanelProps {
  channels: RealChannel[];
  activeChannelId: string;
  onSelectChannel: (channel: RealChannel) => void;
  onOpenImport: () => void;
}

export function ChannelDirectoryPanel({
  channels,
  activeChannelId,
  onSelectChannel,
  onOpenImport,
}: ChannelDirectoryPanelProps) {
  const beinChannels = channels.filter((c) => c.network === 'beIN SPORTS');
  const otherChannels = channels.filter((c) => c.network !== 'beIN SPORTS');

  return (
    <aside className="relative h-80 lg:h-full bg-[#11151E] border border-white/15 rounded-xl overflow-hidden">
      <div className="lg:absolute lg:inset-0 flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0B0E14] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Tv className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">Chaînes beIN & TV</span>
          </div>
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Importer M3U</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
          <div className="space-y-1.5">
            <div className="px-1 text-[11px] font-bold text-slate-400">
              Bouquet beIN SPORTS
            </div>
            {beinChannels.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onSelect={onSelectChannel}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="px-1 text-[11px] font-bold text-slate-400">
              Chaînes Sportives
            </div>
            {otherChannels.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onSelect={onSelectChannel}
              />
            ))}
          </div>
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
