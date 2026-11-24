import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Server,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { RealChannel, RealChannelServer, RealMatch } from '../types/broadcast';

interface RealVideoPlayerProps {
  channel: RealChannel;
  activeMatch?: RealMatch | null;
  compact?: boolean;
}

interface HlsQualityLevel {
  index: number;
  label: string;
}

export function RealVideoPlayer({
  channel,
  activeMatch,
  compact = false,
}: RealVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [serverIndex, setServerIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isBuffering, setIsBuffering] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [failoverNotice, setFailoverNotice] = useState<string | null>(null);

  const [levels, setLevels] = useState<HlsQualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(-1);
  const [openMenu, setOpenMenu] = useState<'server' | 'quality' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeServer: RealChannelServer =
    channel.servers[serverIndex] ?? channel.servers[0];

  useEffect(() => {
    setServerIndex(0);
    setStreamError(null);
    setFailoverNotice(null);
    setLevels([]);
    setSelectedLevel(-1);
  }, [channel.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const targetRawUrl = activeServer?.hlsUrl;
    if (!targetRawUrl) {
      setStreamError('Aucun flux vidéo configuré pour cette chaîne.');
      setIsBuffering(false);
      return;
    }

    const proxiedUrl = `/api/hls-proxy?url=${encodeURIComponent(targetRawUrl)}`;
    setIsBuffering(true);
    setStreamError(null);

    let mediaRecoverAttempts = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 800,
      });

      hlsRef.current = hls;
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        setIsBuffering(false);
        setStreamError(null);
        setFailoverNotice(null);

        const mappedLevels: HlsQualityLevel[] = (data.levels ?? []).map((lvl, idx) => ({
          index: idx,
          label: lvl.height ? `${lvl.height}p` : `Flux ${idx + 1}`,
        }));
        setLevels(mappedLevels);
        setSelectedLevel(-1);

        video.muted = isMuted;
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => setIsPlaying(false));
          });
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoverAttempts < 2) {
          mediaRecoverAttempts += 1;
          hls.recoverMediaError();
          return;
        }

        if (serverIndex + 1 < channel.servers.length) {
          const nextIdx = serverIndex + 1;
          setFailoverNotice(
            `Basculement automatique vers ${channel.servers[nextIdx].label}...`
          );
          setServerIndex(nextIdx);
          return;
        }

        setIsBuffering(false);
        setStreamError(
          'Ce flux distant est momentanément indisponible. Changez de serveur ou de chaîne.'
        );
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxiedUrl;
      const onMeta = () => {
        setIsBuffering(false);
        video.play().catch(() => setIsPlaying(false));
      };
      const onErr = () => {
        if (serverIndex + 1 < channel.servers.length) {
          setServerIndex((i) => i + 1);
        } else {
          setIsBuffering(false);
          setStreamError('Flux vidéo indisponible.');
        }
      };
      video.addEventListener('loadedmetadata', onMeta);
      video.addEventListener('error', onErr);
      return () => {
        video.removeEventListener('loadedmetadata', onMeta);
        video.removeEventListener('error', onErr);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.id, channel.servers, serverIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = volume / 100;
  }, [isMuted, volume]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSelectLevel = (levelIdx: number) => {
    setSelectedLevel(levelIdx);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx;
    }
    setOpenMenu(null);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/15 select-none group"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/55"
        aria-hidden="true"
      />

      {/* Top Broadcast Scorebug Overlay — Compact & Bounded */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-2 p-2.5 sm:p-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center bg-[#090B0F]/90 backdrop-blur-md border border-white/15 rounded-lg overflow-hidden shrink-0">
            <span className="px-2 py-1 bg-rose-600 text-white text-[10px] sm:text-[11px] font-bold tracking-wide uppercase">
              DIRECT
            </span>
            <span className="px-2.5 py-1 text-xs font-bold text-white whitespace-nowrap max-w-[160px] truncate">
              {channel.name}
            </span>
          </div>

          {activeMatch && !compact && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#090B0F]/90 backdrop-blur-md border border-white/15 text-xs text-white font-bold min-w-0">
              <span className="truncate max-w-[90px]">{activeMatch.homeTeam.shortName}</span>
              <span className="px-1.5 py-0.5 rounded bg-white/15 font-mono tabular-nums text-[11px]">
                {activeMatch.status === 'upcoming'
                  ? 'VS'
                  : `${activeMatch.homeTeam.score}-${activeMatch.awayTeam.score}`}
              </span>
              <span className="truncate max-w-[90px]">{activeMatch.awayTeam.shortName}</span>
              <span className="font-mono tabular-nums text-[11px] text-emerald-400">
                {activeMatch.statusDetail}
              </span>
            </div>
          )}
        </div>

        <div className="px-2.5 py-1 rounded-lg bg-[#090B0F]/90 backdrop-blur-md border border-white/15 text-xs font-display font-bold text-white whitespace-nowrap shrink-0">
          MK.tv <span className="text-rose-500 font-mono ml-1">{channel.number}</span>
        </div>
      </div>

      {/* Buffering Indicator */}
      {isBuffering && !streamError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/50 pointer-events-none px-4 text-center">
          <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
          <span className="text-xs font-bold text-white">
            {failoverNotice ?? `Connexion au flux HD (${activeServer?.label ?? 'Direct'})...`}
          </span>
        </div>
      )}

      {/* Stream Error Recovery */}
      {streamError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#090B0F]/95 p-4 text-center">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
          <p className="text-xs sm:text-sm font-bold text-white max-w-md">{streamError}</p>
          <button
            type="button"
            onClick={() => {
              setServerIndex((idx) => (idx + 1) % Math.max(1, channel.servers.length));
              setStreamError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Changer de serveur</span>
          </button>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 sm:p-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {!compact && (
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setIsMuted(v === 0);
              }}
              aria-label="Volume"
              className="hidden sm:block w-20 accent-rose-600 cursor-pointer shrink-0"
            />
          )}

          <span className="hidden lg:inline text-xs font-bold text-slate-200 ml-1 truncate max-w-[200px]">
            {activeServer?.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 relative shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'server' ? null : 'server')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors whitespace-nowrap"
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Serveurs ({channel.servers.length})</span>
            </button>
            {openMenu === 'server' && (
              <div className="absolute bottom-10 right-0 w-60 max-w-[85vw] bg-[#12161F] border border-white/15 rounded-xl p-1.5 shadow-2xl z-40">
                <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400">
                  Serveurs HLS
                </div>
                {channel.servers.map((srv, idx) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      setServerIndex(idx);
                      setOpenMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                      serverIndex === idx
                        ? 'bg-rose-600/25 text-white'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold truncate">{srv.label}</div>
                      <div className="text-[11px] text-slate-400">{srv.quality}</div>
                    </div>
                    {serverIndex === idx && (
                      <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'quality' ? null : 'quality')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-mono font-bold text-white transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {selectedLevel === -1
                  ? 'Auto'
                  : levels.find((l) => l.index === selectedLevel)?.label ?? 'HD'}
              </span>
            </button>
            {openMenu === 'quality' && (
              <div className="absolute bottom-10 right-0 w-40 bg-[#12161F] border border-white/15 rounded-xl p-1.5 shadow-2xl z-40">
                <button
                  type="button"
                  onClick={() => handleSelectLevel(-1)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                    selectedLevel === -1
                      ? 'bg-rose-600/25 text-white'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span>Auto (HD)</span>
                  {selectedLevel === -1 && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </button>
                {levels.map((lvl) => (
                  <button
                    key={lvl.index}
                    type="button"
                    onClick={() => handleSelectLevel(lvl.index)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                      selectedLevel === lvl.index
                        ? 'bg-rose-600/25 text-white'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span>{lvl.label}</span>
                    {selectedLevel === lvl.index && (
                      <Check className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
