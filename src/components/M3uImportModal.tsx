import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { RealChannel } from '../types/broadcast';

interface M3uImportModalProps {
  onClose: () => void;
  onImported: (channels: RealChannel[]) => void;
}

export function M3uImportModal({ onClose, onImported }: M3uImportModalProps) {
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/parse-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), content: content.trim() }),
      });
      const data = (await res.json()) as { channels?: RealChannel[]; error?: string };
      if (!res.ok || !data.channels) {
        setError(data.error ?? 'Impossible de lire la playlist.');
        return;
      }
      onImported(data.channels);
      onClose();
    } catch {
      setError('Erreur réseau lors de l’importation de la playlist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-[#12161F] border border-white/15 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">
            Importer une playlist M3U / beIN SPORTS
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Ajoutez vos propres liens M3U / M3U8 (beIN SPORTS 1-9, chaînes sportives locales) en
          collant une URL M3U ou directement le texte du fichier M3U.
        </p>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">URL de la playlist (.m3u / .m3u8)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.com/sports.m3u"
            className="w-full px-3 py-2.5 rounded-lg bg-[#090B0F] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">
            Ou coller le contenu M3U (#EXTINF...)
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'#EXTM3U\n#EXTINF:-1,beIN SPORTS 1 HD\nhttps://.../stream.m3u8'}
            className="w-full px-3 py-2 rounded-lg bg-[#090B0F] border border-white/15 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-rose-600/15 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || (!url.trim() && !content.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition-colors"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Importer les chaînes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
