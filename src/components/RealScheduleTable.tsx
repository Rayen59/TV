import { Bell, Check, Play } from 'lucide-react';
import type { RealMatch } from '../types/broadcast';

interface RealScheduleTableProps {
  matches: RealMatch[];
  activeMatchId?: string;
  remindedIds: string[];
  onWatch: (match: RealMatch) => void;
  onToggleReminder: (id: string) => void;
}

export function RealScheduleTable({
  matches,
  activeMatchId,
  remindedIds,
  onWatch,
  onToggleReminder,
}: RealScheduleTableProps) {
  return (
    <div className="bg-[#11151E] border border-white/15 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/15 text-[11px] font-bold text-slate-300 bg-[#0B0E14]">
              <th className="py-3 px-4 whitespace-nowrap">Heure / État</th>
              <th className="py-3 px-4 whitespace-nowrap">Compétition</th>
              <th className="py-3 px-4 whitespace-nowrap">Match Réel</th>
              <th className="py-3 px-4 whitespace-nowrap">Chaîne beIN / TV</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Score</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-xs sm:text-sm">
            {matches.map((m) => {
              const isReminded = remindedIds.includes(m.id);
              const isPlaying = m.id === activeMatchId;
              const dateObj = new Date(m.dateIso);
              const dateStr = dateObj.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
              });
              const timeStr = dateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <tr
                  key={m.id}
                  className={`transition-colors hover:bg-white/[0.04] ${
                    isPlaying ? 'bg-rose-600/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-bold whitespace-nowrap">
                    {m.status === 'live' ? (
                      <span className="text-rose-400">
                        DIRECT · {m.clock || m.statusDetail}
                      </span>
                    ) : m.status === 'finished' ? (
                      <span className="text-slate-400">{dateStr} · Terminé</span>
                    ) : (
                      <span className="text-slate-200">
                        {dateStr} · {timeStr}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">
                    {m.competition}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-white min-w-[200px]">
                    <div className="truncate text-xs sm:text-sm">{m.title}</div>
                    <div className="text-[11px] font-medium text-slate-400 truncate">
                      {m.venue}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs font-bold text-slate-200 whitespace-nowrap">
                    {m.beinChannel}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-xs sm:text-sm font-bold text-white text-right whitespace-nowrap">
                    {m.status === 'upcoming'
                      ? '—'
                      : `${m.homeTeam.score} - ${m.awayTeam.score}`}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    {m.status === 'upcoming' ? (
                      <button
                        type="button"
                        onClick={() => onToggleReminder(m.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          isReminded
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-transparent border-white/20 hover:border-white/40 text-white'
                        }`}
                      >
                        {isReminded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Rappel</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3 h-3" />
                            <span>Rappeler</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onWatch(m)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isPlaying
                            ? 'bg-rose-600 text-white'
                            : 'bg-white/15 hover:bg-rose-600 text-white'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isPlaying ? 'En lecture' : 'Regarder'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
