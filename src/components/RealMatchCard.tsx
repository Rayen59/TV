import { Play, Tv } from 'lucide-react';
import type { RealMatch } from '../types/broadcast';
import { TeamBadge } from './TeamBadge';

interface RealMatchCardProps {
  match: RealMatch;
  isActive: boolean;
  onSelect: (match: RealMatch) => void;
}

export function RealMatchCard({ match, isActive, onSelect }: RealMatchCardProps) {
  const localTime = new Date(match.dateIso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusText =
    match.status === 'live'
      ? `DIRECT · ${match.clock || match.statusDetail}`
      : match.status === 'finished'
      ? `TERMINÉ · ${match.statusDetail}`
      : `À VENIR · ${localTime}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(match)}
      className={`group w-full text-left rounded-xl border p-4 space-y-3 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-rose-500 ${
        isActive
          ? 'bg-[#181E2B] border-rose-500'
          : 'bg-[#11151E] border-white/10 hover:border-white/25 hover:bg-[#151B27]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-300 font-bold truncate">{match.competition}</span>
        <span
          className={`font-mono tabular-nums font-bold whitespace-nowrap shrink-0 ${
            match.status === 'live'
              ? 'text-rose-400'
              : match.status === 'finished'
              ? 'text-slate-400'
              : 'text-emerald-400'
          }`}
        >
          {statusText}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <TeamBadge
              name={match.homeTeam.name}
              shortName={match.homeTeam.shortName}
              logo={match.homeTeam.logo}
              color={match.homeTeam.color}
              size="sm"
            />
            <span className="text-sm font-bold text-white truncate">
              {match.homeTeam.name}
            </span>
          </div>
          <span className="font-mono tabular-nums text-base font-bold text-white shrink-0">
            {match.status === 'upcoming' ? '—' : match.homeTeam.score}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <TeamBadge
              name={match.awayTeam.name}
              shortName={match.awayTeam.shortName}
              logo={match.awayTeam.logo}
              color={match.awayTeam.color}
              size="sm"
            />
            <span className="text-sm font-bold text-white truncate">
              {match.awayTeam.name}
            </span>
          </div>
          <span className="font-mono tabular-nums text-base font-bold text-white shrink-0">
            {match.status === 'upcoming' ? '—' : match.awayTeam.score}
          </span>
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
          <Tv className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-bold truncate">{match.beinChannel}</span>
        </div>
        <span className="inline-flex items-center gap-1 font-bold text-white group-hover:text-rose-400 transition-colors shrink-0">
          <Play className="w-3 h-3 fill-current" />
          <span>{isActive ? 'Sélectionné' : 'Regarder'}</span>
        </span>
      </div>
    </button>
  );
}
