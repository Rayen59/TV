import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

/* ============================================================================
   SSRF-Safe URL & IP Validation for HLS Proxying
   ============================================================================ */

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice(7);
      if (net.isIPv4(mapped)) return isPrivateOrReservedIp(mapped);
    }
    return false;
  }

  return true;
}

async function validateSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL invalide');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Protocole non autorisé');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Identifiants dans URL non autorisés');
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Hôte local bloqué');
  }

  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error('Adresse IP privée bloquée');
    }
    return parsed;
  }

  const records = await dns.lookup(host, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Hôte introuvable');
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error('Résolution IP privée bloquée');
    }
  }

  return parsed;
}

async function safeFetchWithRedirects(
  rawUrl: string,
  maxRedirects = 4
): Promise<{ response: globalThis.Response; finalUrl: string }> {
  let currentUrl = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const safeUrl = await validateSafePublicUrl(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(safeUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          throw new Error(`Redirection HTTP ${res.status} sans cible`);
        }
        currentUrl = new URL(location, safeUrl).toString();
        continue;
      }

      return { response: res, finalUrl: safeUrl.toString() };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('Trop de redirections');
}

/* ============================================================================
   Curated Verified Live TV & Sports Channels (beIN, TN, QA, DZ, MA, Global)
   ============================================================================ */

export interface RealChannelServer {
  id: string;
  label: string;
  quality: string;
  hlsUrl: string;
}

export interface RealChannel {
  id: string;
  number: string;
  name: string;
  network:
    | 'beIN SPORTS'
    | 'Tunisie'
    | 'Qatar & Golfe'
    | 'Algérie'
    | 'Maroc'
    | 'Sport International';
  category:
    | 'tunisie'
    | 'qatar'
    | 'algerie'
    | 'maroc'
    | 'channels'
    | 'football'
    | 'basketball'
    | 'tennis'
    | 'motorsport'
    | 'combat';
  language: string;
  quality: '1080p60' | '720p60';
  description: string;
  isLiveStreamVerified: boolean;
  servers: RealChannelServer[];
}

const VERIFIED_CHANNELS: RealChannel[] = [
  // === beIN SPORTS ===
  {
    id: 'bein-xtra-1',
    number: 'beIN X1',
    name: 'beIN SPORTS XTRA',
    network: 'beIN SPORTS',
    category: 'channels',
    language: 'Anglais / Multi',
    quality: '1080p60',
    description: 'Chaîne officielle beIN SPORTS XTRA en direct 24/7 — matchs, résumés et émissions.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'bx1-s1',
        label: 'Serveur Principal · beIN XTRA 1080p',
        quality: '1080p60',
        hlsUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
      },
      {
        id: 'bx1-s2',
        label: 'Serveur Secours · beIN Live',
        quality: '720p60',
        hlsUrl: 'https://tvsen6.aynaott.com/beinsports/index.m3u8',
      },
    ],
  },
  {
    id: 'bein-live-hd',
    number: 'beIN 1',
    name: 'beIN SPORTS Live HD',
    network: 'beIN SPORTS',
    category: 'channels',
    language: 'Multi-Langues',
    quality: '720p60',
    description: 'Flux direct beIN SPORTS avec basculement automatique multi-serveurs sans coupure.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'bl1-s1',
        label: 'Serveur Principal · beIN Live',
        quality: '720p60',
        hlsUrl: 'https://tvsen6.aynaott.com/beinsports/index.m3u8',
      },
      {
        id: 'bl1-s2',
        label: 'Serveur Secours · beIN XTRA 1080p',
        quality: '1080p60',
        hlsUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
      },
    ],
  },
  {
    id: 'bein-xtra-es',
    number: 'beIN X2',
    name: 'beIN SPORTS XTRA Español',
    network: 'beIN SPORTS',
    category: 'channels',
    language: 'Espagnol',
    quality: '1080p60',
    description: 'Chaîne officielle beIN SPORTS XTRA en espagnol — LaLiga, Copa Libertadores.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'bxe-s1',
        label: 'Serveur 1 · Cloudfront 1080p',
        quality: '1080p60',
        hlsUrl: 'https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol.m3u8',
      },
      {
        id: 'bxe-s2',
        label: 'Serveur 2 · Amagi 1080p',
        quality: '1080p60',
        hlsUrl: 'https://bein-esp-xumo.amagi.tv/playlistR1080p.m3u8',
      },
    ],
  },

  // === TUNISIE ===
  {
    id: 'tn-watania-1',
    number: 'TN 01',
    name: 'El Watania 1 (الوطنية 1)',
    network: 'Tunisie',
    category: 'tunisie',
    language: 'Arabe / Tunisie',
    quality: '1080p60',
    description: 'Télévision Tunisienne Nationale 1 en direct — Ligue 1 tunisienne, infos et programmes.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'tn1-s1',
        label: 'Serveur Principal · TanitWeb HD',
        quality: '1080p60',
        hlsUrl: 'https://sw1.tanitweb.net/TunisiaTV/_definst_/watania1/chunklist.m3u8',
      },
      {
        id: 'tn1-s2',
        label: 'Serveur Secours · Watania 2',
        quality: '1080p60',
        hlsUrl: 'https://sw1.tanitweb.net/TunisiaTV/_definst_/watania2/playlist.m3u8?DVR',
      },
    ],
  },
  {
    id: 'tn-watania-2',
    number: 'TN 02',
    name: 'El Watania 2 (الوطنية 2)',
    network: 'Tunisie',
    category: 'tunisie',
    language: 'Arabe / Tunisie',
    quality: '1080p60',
    description: 'Télévision Tunisienne 2 en direct — sport tunisien, football et handball.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'tn2-s1',
        label: 'Serveur Principal · TanitWeb DVR',
        quality: '1080p60',
        hlsUrl: 'https://sw1.tanitweb.net/TunisiaTV/_definst_/watania2/playlist.m3u8?DVR',
      },
      {
        id: 'tn2-s2',
        label: 'Serveur Secours · Watania 1',
        quality: '1080p60',
        hlsUrl: 'https://sw1.tanitweb.net/TunisiaTV/_definst_/watania1/chunklist.m3u8',
      },
    ],
  },
  {
    id: 'tn-mosaique',
    number: 'TN 03',
    name: 'Mosaïque FM TV',
    network: 'Tunisie',
    category: 'tunisie',
    language: 'Arabe / Français',
    quality: '1080p60',
    description: 'Plateau vidéo direct Mosaïque FM Tunisie — débats sportifs, actualités et émissions.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'tnm-s1',
        label: 'Serveur Principal · Studio Live 1080p',
        quality: '1080p60',
        hlsUrl: 'https://webcam.mosaiquefm.net/mosatv/_definst_/studio/playlist.m3u8?DVR',
      },
    ],
  },
  {
    id: 'tn-story',
    number: 'TN 04',
    name: 'StoryChannel TV Tunisie',
    network: 'Tunisie',
    category: 'tunisie',
    language: 'Arabe / Tunisie',
    quality: '720p60',
    description: 'Chaîne maghrébine et tunisienne en direct HD.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'tns-s1',
        label: 'Serveur Principal · CDN 720p',
        quality: '720p60',
        hlsUrl: 'https://136044159.r.cdnsun.net/storychannel.m3u8',
      },
    ],
  },

  // === QATAR & GOLFE (Al Kass / Qatar TV / Al Rayyan / KTV Sport / Bahrain Sport) ===
  {
    id: 'qa-qtv-1',
    number: 'QA 01',
    name: 'Qatar TV 1 (تلفزيون قطر)',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Qatar',
    quality: '1080p60',
    description: 'Chaîne nationale officielle Qatar Television 1 en 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'qtv1-s1',
        label: 'Serveur Principal · KwikMotion 1080p',
        quality: '1080p60',
        hlsUrl: 'https://live.kwikmotion.com/qtv1live/qtv1.smil/playlist.m3u8',
      },
      {
        id: 'qtv1-s2',
        label: 'Serveur Secours · Qatar TV 2',
        quality: '1080p60',
        hlsUrl: 'https://live.kwikmotion.com/qtv2live/qtv2.smil/playlist.m3u8',
      },
    ],
  },
  {
    id: 'qa-qtv-2',
    number: 'QA 02',
    name: 'Qatar TV 2 (تلفزيون قطر 2)',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Qatar',
    quality: '1080p60',
    description: 'Deuxième chaîne officielle du Qatar en direct haute définition 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'qtv2-s1',
        label: 'Serveur Principal · KwikMotion 1080p',
        quality: '1080p60',
        hlsUrl: 'https://live.kwikmotion.com/qtv2live/qtv2.smil/playlist.m3u8',
      },
    ],
  },
  {
    id: 'qa-alrayyan',
    number: 'QA 03',
    name: 'Al Rayyan TV (الريان)',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Qatar',
    quality: '1080p60',
    description: 'Chaîne qatarie Al Rayyan en direct 1080p — sports traditionnels, événements et Qatar Stars.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'ray1-s1',
        label: 'Serveur Principal · Vidgyor 1080p',
        quality: '1080p60',
        hlsUrl: 'https://alrayyancdn.vidgyor.com/pub-noalrayy3pwz0l/liveabr/playlist_dvr.m3u8',
      },
      {
        id: 'ray1-s2',
        label: 'Serveur Secours · Al Rayyan 2',
        quality: '1080p60',
        hlsUrl: 'https://alrayyancdn.vidgyor.com/pub-nooldraybinbdh/liveabr/playlist_dvr.m3u8',
      },
    ],
  },
  {
    id: 'qa-alrayyan-2',
    number: 'QA 04',
    name: 'Al Rayyan Heritage TV',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Qatar',
    quality: '1080p60',
    description: 'Deuxième flux officiel Al Rayyan Qatar en 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'ray2-s1',
        label: 'Serveur Principal · Vidgyor 1080p',
        quality: '1080p60',
        hlsUrl: 'https://alrayyancdn.vidgyor.com/pub-nooldraybinbdh/liveabr/playlist_dvr.m3u8',
      },
    ],
  },
  {
    id: 'qa-aljazeera',
    number: 'QA 05',
    name: 'Al Jazeera Arabic (الجزيرة)',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Qatar',
    quality: '1080p60',
    description: 'Chaîne Al Jazeera Qatar en direct 1080p continu 24/7.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'aja-s1',
        label: 'Serveur Principal · AJA 1080p',
        quality: '1080p60',
        hlsUrl: 'https://live-hls-apps-aja-fa.getaj.net/AJA/index.m3u8',
      },
      {
        id: 'aja-s2',
        label: 'Serveur Secours · Al Jazeera 2',
        quality: '1080p60',
        hlsUrl: 'https://live-hls-web-aja2-gcp.thehlive.com/AJA2/index.m3u8',
      },
    ],
  },
  {
    id: 'qa-qtv-quran',
    number: 'QA 06',
    name: 'Qatar TV Quran (قطر للقرآن)',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Qatar',
    quality: '1080p60',
    description: 'Chaîne Qatar TV Coran en direct Akamai 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'qqr-s1',
        label: 'Serveur Akamai 1080p',
        quality: '1080p60',
        hlsUrl: 'https://qatartv.akamaized.net/hls/live/20000612/qtvquran/master.m3u8',
      },
    ],
  },
  {
    id: 'qa-ktv-sport',
    number: 'GS 01',
    name: 'KTV Sport HD (الكويت الرياضية)',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Golfe',
    quality: '1080p60',
    description: 'Chaîne sportive du Golfe en direct 1080p — compétitions arabes et asiatiques.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'ktv1-s1',
        label: 'Serveur Principal · KTV Sport 1080p',
        quality: '1080p60',
        hlsUrl: 'https://kwtspta.cdn.mangomolo.com/sp/smil:sp.stream.smil/chunklist.m3u8',
      },
      {
        id: 'ktv1-s2',
        label: 'Serveur Secours · KTV Sport Plus',
        quality: '1080p60',
        hlsUrl: 'https://kwtsplta.cdn.mangomolo.com/spl/smil:spl.stream.smil/chunklist.m3u8',
      },
    ],
  },
  {
    id: 'qa-ktv-sport-plus',
    number: 'GS 02',
    name: 'KTV Sport Plus HD',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Golfe',
    quality: '1080p60',
    description: 'Deuxième chaîne sportive du Golfe en 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'ktv2-s1',
        label: 'Serveur Principal · KTV Plus 1080p',
        quality: '1080p60',
        hlsUrl: 'https://kwtsplta.cdn.mangomolo.com/spl/smil:spl.stream.smil/chunklist.m3u8',
      },
    ],
  },
  {
    id: 'qa-bahrain-1',
    number: 'GS 03',
    name: 'Bahrain Sports 1 & 2',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Golfe',
    quality: '720p60',
    description: 'Chaînes sportives du Bahreïn avec basculement entre canal 1 et canal 2.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'bh1-s1',
        label: 'Bahrain Sports 1',
        quality: '720p60',
        hlsUrl: 'https://5c7b683162943.streamlock.net/live/ngrp:sportsone_all/playlist.m3u8',
      },
      {
        id: 'bh1-s2',
        label: 'Bahrain Sports 2',
        quality: '720p60',
        hlsUrl: 'https://5c7b683162943.streamlock.net/live/ngrp:bahrainsportstwo_all/playlist.m3u8',
      },
    ],
  },
  {
    id: 'qa-oman-sport',
    number: 'GS 04',
    name: 'Oman Sports TV 1080p',
    network: 'Qatar & Golfe',
    category: 'qatar',
    language: 'Arabe / Golfe',
    quality: '1080p60',
    description: 'Chaîne sportive d’Oman en haute définition 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'om-s1',
        label: 'Serveur Principal · Oman Sports',
        quality: '1080p60',
        hlsUrl: 'https://partneta.cdn.mgmlcdn.com/omsport/smil:omsport.stream.smil/chunklist.m3u8',
      },
    ],
  },

  // === ALGÉRIE ===
  {
    id: 'dz-tv2',
    number: 'DZ 01',
    name: 'TV2 Canal Algérie (كنال ألجيري)',
    network: 'Algérie',
    category: 'algerie',
    language: 'Français / Arabe',
    quality: '1080p60',
    description: 'Chaîne nationale algérienne Canal Algérie en direct HD — actualités, sport et magazines.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'dz2-s1',
        label: 'Serveur Principal · Canal Algérie HD',
        quality: '1080p60',
        hlsUrl: 'http://185.9.2.18/chid_347/index.m3u8',
      },
    ],
  },
  {
    id: 'dz-al24',
    number: 'DZ 02',
    name: 'AL24 News Algérie',
    network: 'Algérie',
    category: 'algerie',
    language: 'Arabe / Français',
    quality: '720p60',
    description: 'Chaîne d’information internationale algérienne AL24 News en direct continu.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'al24-s1',
        label: 'Serveur Principal · EasyBroadcast',
        quality: '720p60',
        hlsUrl: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/corp/66_al24_u4yga6h_240p/chunks.m3u8',
      },
    ],
  },
  {
    id: 'dz-amou-yazid',
    number: 'DZ 03',
    name: 'Amou Yazid TV (عمو يزيد)',
    network: 'Algérie',
    category: 'algerie',
    language: 'Arabe / Algérie',
    quality: '720p60',
    description: 'Chaîne algérienne familiale Amou Yazid TV en direct.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'ay-s1',
        label: 'Serveur Principal · MKStream',
        quality: '720p60',
        hlsUrl: 'http://mkstream.servehttp.com:1940/AmouYazid/ay1/playlist.m3u8',
      },
    ],
  },
  {
    id: 'dz-qudsuna',
    number: 'DZ 04',
    name: 'Qudsuna TV Algérie',
    network: 'Algérie',
    category: 'algerie',
    language: 'Arabe / Algérie',
    quality: '1080p60',
    description: 'Chaîne algérienne Qudsuna TV en direct continu.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'qds-s1',
        label: 'Serveur Principal · CDN New',
        quality: '1080p60',
        hlsUrl: 'https://qudsunatv-live.cdnnew.com/qudsunatv/qudsuna.m3u8',
      },
    ],
  },

  // === MAROC ===
  {
    id: 'ma-arryadia',
    number: 'MA 01',
    name: 'Arryadia Sport (الرياضية)',
    network: 'Maroc',
    category: 'maroc',
    language: 'Arabe / Français',
    quality: '720p60',
    description: 'Chaîne sportive marocaine Arryadia en direct — Botola Pro, CAF et compétitions nationales.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'arr-s1',
        label: 'Serveur Principal · Arryadia Direct',
        quality: '720p60',
        hlsUrl: 'http://149.100.11.252:8000/play/a065/index.m3u8',
      },
      {
        id: 'arr-s2',
        label: 'Serveur Secours · 2M Monde',
        quality: '1080p60',
        hlsUrl: 'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/2m_monde/live.livx/playlist.m3u8',
      },
    ],
  },
  {
    id: 'ma-2m-monde',
    number: 'MA 02',
    name: '2M Monde HD (دوزيم)',
    network: 'Maroc',
    category: 'maroc',
    language: 'Arabe / Français',
    quality: '1080p60',
    description: 'Chaîne marocaine 2M en direct HD avec 3 serveurs redondants.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: '2mm-s1',
        label: 'Serveur 1 · 2M Monde HD',
        quality: '1080p60',
        hlsUrl: 'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/2m_monde/live.livx/playlist.m3u8',
      },
      {
        id: '2mm-s2',
        label: 'Serveur 2 · 2M Monde +1 1080p',
        quality: '1080p60',
        hlsUrl: 'https://d2qh3gh0k5vp3v.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-n6pess5lwbghr/2M_ES.m3u8',
      },
      {
        id: '2mm-s3',
        label: 'Serveur 3 · 2M National',
        quality: '720p60',
        hlsUrl: 'http://185.9.2.18/chid_218/index.m3u8',
      },
    ],
  },
  {
    id: 'ma-maghribia',
    number: 'MA 03',
    name: 'Al Maghribia (المغربية)',
    network: 'Maroc',
    category: 'maroc',
    language: 'Arabe / Maroc',
    quality: '1080p60',
    description: 'Chaîne nationale marocaine Al Maghribia (SNRT) en 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'mag-s1',
        label: 'Serveur Principal · Al Maghribia',
        quality: '1080p60',
        hlsUrl: 'http://185.9.2.18/chid_205/index.m3u8',
      },
    ],
  },
  {
    id: 'ma-medi1-maghreb',
    number: 'MA 04',
    name: 'Medi1TV Maghreb (ميدي 1)',
    network: 'Maroc',
    category: 'maroc',
    language: 'Arabe / Français',
    quality: '1080p60',
    description: 'Chaîne Medi1TV Maghreb en direct 1080p — info, sport et culture.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'm1m-s1',
        label: 'Medi1TV Maghreb 1080p',
        quality: '1080p60',
        hlsUrl: 'https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-maghreb_jnbspmg/playlist.m3u8',
      },
      {
        id: 'm1m-s2',
        label: 'Medi1TV Arabic 1080p',
        quality: '1080p60',
        hlsUrl: 'https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-arabic_g90v4ec/playlist.m3u8',
      },
      {
        id: 'm1m-s3',
        label: 'Medi1TV Afrique 1080p',
        quality: '1080p60',
        hlsUrl: 'https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-afrique_tm7tu45/playlist.m3u8',
      },
    ],
  },
  {
    id: 'ma-chada',
    number: 'MA 05',
    name: 'Chada TV (شدى تيفي)',
    network: 'Maroc',
    category: 'maroc',
    language: 'Arabe / Maroc',
    quality: '720p60',
    description: 'Chaîne marocaine Chada TV en direct 720p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'chd-s1',
        label: 'Serveur Principal · Infomaniak',
        quality: '720p60',
        hlsUrl: 'https://edge13.vedge.infomaniak.com/livecast/ik:chadatv/manifest.m3u8',
      },
    ],
  },
  {
    id: 'ma-mbc5',
    number: 'MA 06',
    name: 'MBC 5 Maghreb (إم بي سي 5)',
    network: 'Maroc',
    category: 'maroc',
    language: 'Arabe / Maghreb',
    quality: '1080p60',
    description: 'Chaîne MBC 5 dédiée au Maghreb en direct 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'mbc5-s1',
        label: 'Serveur Principal · MBC 5 1080p',
        quality: '1080p60',
        hlsUrl: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-5/ee6b000cee0629411b666ab26cb13e9b/index.m3u8',
      },
    ],
  },

  // === SPORT INTERNATIONAL ===
  {
    id: 'fifa-plus-fr',
    number: 'SP 01',
    name: 'FIFA+ Français HD',
    network: 'Sport International',
    category: 'football',
    language: 'Français',
    quality: '720p60',
    description: 'Chaîne officielle FIFA+ en français — matchs en direct, coupes et archives.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'ffr-s1',
        label: 'Serveur 1 · FIFA+ Français',
        quality: '720p60',
        hlsUrl: 'https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8',
      },
      {
        id: 'ffr-s2',
        label: 'Serveur 2 · FIFA+ World 1080p',
        quality: '1080p60',
        hlsUrl: 'https://95cedebd.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/Vml6aW9fRklGQVBsdXNFbmdsaXNoX0hMUw/playlist.m3u8',
      },
    ],
  },
  {
    id: 'fifa-plus-en',
    number: 'SP 02',
    name: 'FIFA+ World 1080p',
    network: 'Sport International',
    category: 'football',
    language: 'Anglais',
    quality: '1080p60',
    description: 'Flux international FIFA+ Full HD 1080p — compétitions mondiales FIFA.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'fen-s1',
        label: 'Serveur Principal · FIFA+ 1080p',
        quality: '1080p60',
        hlsUrl: 'https://95cedebd.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/Vml6aW9fRklGQVBsdXNFbmdsaXNoX0hMUw/playlist.m3u8',
      },
      {
        id: 'fen-s2',
        label: 'Serveur Secours · FIFA+ FR',
        quality: '720p60',
        hlsUrl: 'https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8',
      },
    ],
  },
  {
    id: 'nba-live-hd',
    number: 'SP 03',
    name: 'NBA Basket Live',
    network: 'Sport International',
    category: 'basketball',
    language: 'Anglais / Multi',
    quality: '720p60',
    description: 'Diffusion basketball NBA et temps forts en continu.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'nba-s1',
        label: 'Serveur Principal · NBA Stream',
        quality: '720p60',
        hlsUrl: 'https://stream1.antenaplay.ro/promo/nba-meci/playlist.m3u8',
      },
      {
        id: 'nba-s2',
        label: 'Serveur Secours · beIN XTRA',
        quality: '1080p60',
        hlsUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
      },
    ],
  },
  {
    id: 'tennis-channel-1',
    number: 'SP 04',
    name: 'Tennis Channel 1080p',
    network: 'Sport International',
    category: 'tennis',
    language: 'Anglais',
    quality: '1080p60',
    description: 'Tournois ATP, WTA et Grand Chelem en direct 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'tc1-s1',
        label: 'Serveur 1 · Tennis Channel 1080p',
        quality: '1080p60',
        hlsUrl: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8',
      },
      {
        id: 'tc1-s2',
        label: 'Serveur 2 · Tennis Channel 2',
        quality: '1080p60',
        hlsUrl: 'https://mumbai-edge.smartplaytv.in/Tennis2/index.m3u8',
      },
    ],
  },
  {
    id: 'redbull-motor-hd',
    number: 'SP 05',
    name: 'Red Bull TV & Motorsport 1080p',
    network: 'Sport International',
    category: 'motorsport',
    language: 'International',
    quality: '1080p60',
    description: 'Sports mécaniques, rallye WRC, F1 magazines et compétitions extrêmes en 1080p.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'rb-s1',
        label: 'Serveur 1 · Red Bull TV 1080p',
        quality: '1080p60',
        hlsUrl: 'https://3ea22335.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWdiX1JlZEJ1bGxUVl9ITFM/playlist.m3u8',
      },
      {
        id: 'rb-s2',
        label: 'Serveur 2 · Akamai Direct',
        quality: '1080p60',
        hlsUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      },
      {
        id: 'rb-s3',
        label: 'Serveur 3 · FloRacing 1080p',
        quality: '1080p60',
        hlsUrl: 'https://amg02278-amg02278c1-flosports-worldwide-7592.playouts.now.amagi.tv/playlist.m3u8',
      },
    ],
  },
  {
    id: 'combat-mma-hd',
    number: 'SP 06',
    name: 'PFL MMA & DAZN Combat',
    network: 'Sport International',
    category: 'combat',
    language: 'Anglais',
    quality: '1080p60',
    description: 'Arts martiaux mixtes, PFL MMA, Glory Kickboxing et galas de boxe en direct.',
    isLiveStreamVerified: true,
    servers: [
      {
        id: 'cmb-s1',
        label: 'Serveur 1 · PFL MMA HD',
        quality: '720p60',
        hlsUrl: 'https://jmp2.uk/plu-64f6180130ab3300083d896b.m3u8',
      },
      {
        id: 'cmb-s2',
        label: 'Serveur 2 · DAZN Combat',
        quality: '720p60',
        hlsUrl: 'https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8',
      },
      {
        id: 'cmb-s3',
        label: 'Serveur 3 · MMA-TV 1080p',
        quality: '1080p60',
        hlsUrl: 'https://stream8.cinerama.uz/1226/tracks-v1a1/mono.m3u8',
      },
      {
        id: 'cmb-s4',
        label: 'Serveur 4 · Glory Kickboxing',
        quality: '720p60',
        hlsUrl: 'https://6f972d29.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0dsb3J5S2lja2JveGluZ19ITFM/playlist.m3u8',
      },
    ],
  },
];

/* ============================================================================
   Real-Time Live Sports Fetcher (ESPN Official Public Scoreboard Endpoints)
   ============================================================================ */

interface LeagueConfig {
  endpoint: string;
  category: 'football' | 'basketball' | 'tennis' | 'motorsport' | 'combat';
  competition: string;
  defaultBeinChannel: string;
  linkedChannelId: string;
}

const LEAGUE_CONFIGS: LeagueConfig[] = [
  {
    endpoint: 'soccer/uefa.champions',
    category: 'football',
    competition: 'Ligue des Champions',
    defaultBeinChannel: 'beIN SPORTS 1 HD',
    linkedChannelId: 'bein-live-hd',
  },
  {
    endpoint: 'soccer/uefa.europa',
    category: 'football',
    competition: 'Europa League',
    defaultBeinChannel: 'beIN SPORTS 2 HD',
    linkedChannelId: 'bein-xtra-1',
  },
  {
    endpoint: 'soccer/eng.1',
    category: 'football',
    competition: 'Premier League',
    defaultBeinChannel: 'beIN SPORTS 1 Premium',
    linkedChannelId: 'bein-xtra-1',
  },
  {
    endpoint: 'soccer/esp.1',
    category: 'football',
    competition: 'LaLiga',
    defaultBeinChannel: 'beIN SPORTS 3 HD',
    linkedChannelId: 'bein-xtra-es',
  },
  {
    endpoint: 'soccer/fra.1',
    category: 'football',
    competition: 'Ligue 1',
    defaultBeinChannel: 'beIN SPORTS FR 1',
    linkedChannelId: 'fifa-plus-fr',
  },
  {
    endpoint: 'soccer/ita.1',
    category: 'football',
    competition: 'Serie A',
    defaultBeinChannel: 'beIN SPORTS 4 HD',
    linkedChannelId: 'fifa-plus-en',
  },
  {
    endpoint: 'soccer/ger.1',
    category: 'football',
    competition: 'Bundesliga',
    defaultBeinChannel: 'beIN SPORTS 5 HD',
    linkedChannelId: 'bein-live-hd',
  },
  {
    endpoint: 'basketball/nba',
    category: 'basketball',
    competition: 'NBA',
    defaultBeinChannel: 'beIN SPORTS NBA / FR 1',
    linkedChannelId: 'nba-live-hd',
  },
  {
    endpoint: 'tennis/atp',
    category: 'tennis',
    competition: 'ATP Tour',
    defaultBeinChannel: 'beIN SPORTS Max / Tennis',
    linkedChannelId: 'tennis-channel-1',
  },
  {
    endpoint: 'racing/f1',
    category: 'motorsport',
    competition: 'Formule 1',
    defaultBeinChannel: 'beIN SPORTS Motor / Canal+',
    linkedChannelId: 'redbull-motor-hd',
  },
  {
    endpoint: 'mma/ufc',
    category: 'combat',
    competition: 'UFC / MMA',
    defaultBeinChannel: 'beIN SPORTS Combat',
    linkedChannelId: 'combat-mma-hd',
  },
];

export interface RealMatchDTO {
  id: string;
  title: string;
  category: 'football' | 'basketball' | 'tennis' | 'motorsport' | 'combat';
  competition: string;
  status: 'live' | 'upcoming' | 'finished';
  dateIso: string;
  statusDetail: string;
  clock: string;
  venue: string;
  homeTeam: {
    name: string;
    shortName: string;
    logo?: string;
    color: string;
    score: string;
  };
  awayTeam: {
    name: string;
    shortName: string;
    logo?: string;
    color: string;
    score: string;
  };
  beinChannel: string;
  officialBroadcasts: string[];
  linkedChannelId: string;
}

let cachedMatches: { timestamp: number; data: RealMatchDTO[] } | null = null;

async function fetchRealMatches(): Promise<RealMatchDTO[]> {
  if (cachedMatches && Date.now() - cachedMatches.timestamp < 30_000) {
    return cachedMatches.data;
  }

  const results = await Promise.allSettled(
    LEAGUE_CONFIGS.map(async (cfg) => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.endpoint}/scoreboard`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return [];
        const json = (await res.json()) as {
          events?: Array<{
            id: string;
            name: string;
            date: string;
            status?: {
              displayClock?: string;
              type?: { state?: string; shortDetail?: string };
            };
            competitions?: Array<{
              venue?: { fullName?: string; address?: { city?: string } };
              broadcasts?: Array<{ names?: string[] }>;
              competitors?: Array<{
                homeAway?: string;
                score?: string;
                team?: {
                  shortDisplayName?: string;
                  displayName?: string;
                  abbreviation?: string;
                  logo?: string;
                  color?: string;
                };
                athlete?: {
                  displayName?: string;
                  shortName?: string;
                };
              }>;
            }>;
          }>;
        };

        const events = json.events ?? [];
        return events.slice(0, 12).map((ev, index): RealMatchDTO => {
          const comp = ev.competitions?.[0];
          const competitors = comp?.competitors ?? [];
          const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
          const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];

          const rawState = ev.status?.type?.state;
          const status: RealMatchDTO['status'] =
            rawState === 'in' ? 'live' : rawState === 'post' ? 'finished' : 'upcoming';

          const homeName =
            home?.team?.shortDisplayName ??
            home?.team?.displayName ??
            home?.athlete?.displayName ??
            ev.name.split(' vs ')[0] ??
            'Équipe A';
          const awayName =
            away?.team?.shortDisplayName ??
            away?.team?.displayName ??
            away?.athlete?.displayName ??
            ev.name.split(' vs ')[1] ??
            'Équipe B';

          const venueParts = [comp?.venue?.fullName, comp?.venue?.address?.city].filter(Boolean);
          const broadcasts =
            comp?.broadcasts?.flatMap((b) => b.names ?? []).filter(Boolean) ?? [];

          const beinNum = ((index % 6) + 1).toString();
          const beinChannel =
            cfg.category === 'football'
              ? `beIN SPORTS ${beinNum} HD`
              : cfg.defaultBeinChannel;

          return {
            id: `${cfg.endpoint}-${ev.id}`,
            title:
              competitors.length >= 2 && homeName !== awayName
                ? `${homeName} vs ${awayName}`
                : ev.name,
            category: cfg.category,
            competition: cfg.competition,
            status,
            dateIso: ev.date,
            statusDetail: ev.status?.type?.shortDetail ?? 'Programmé',
            clock: ev.status?.displayClock ?? '',
            venue: venueParts.join(', ') || cfg.competition,
            homeTeam: {
              name: homeName,
              shortName:
                home?.team?.abbreviation ?? homeName.slice(0, 3).toUpperCase(),
              logo: home?.team?.logo,
              color: home?.team?.color ? `#${home.team.color}` : '#E11D48',
              score: home?.score ?? '0',
            },
            awayTeam: {
              name: awayName,
              shortName:
                away?.team?.abbreviation ?? awayName.slice(0, 3).toUpperCase(),
              logo: away?.team?.logo,
              color: away?.team?.color ? `#${away.team.color}` : '#2563EB',
              score: away?.score ?? '0',
            },
            beinChannel,
            officialBroadcasts: broadcasts,
            linkedChannelId: cfg.linkedChannelId,
          };
        });
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const allMatches: RealMatchDTO[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allMatches.push(...r.value);
    }
  }

  const orderWeight = { live: 0, upcoming: 1, finished: 2 };
  allMatches.sort((a, b) => {
    const wDiff = orderWeight[a.status] - orderWeight[b.status];
    if (wDiff !== 0) return wDiff;
    return new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime();
  });

  cachedMatches = { timestamp: Date.now(), data: allMatches };
  return allMatches;
}

/* ============================================================================
   Express Server Bootstrap
   ============================================================================ */

async function startServer() {
  const app = express();

  app.get('/api/matches', async (_req: Request, res: Response) => {
    try {
      const matches = await fetchRealMatches();
      res.json({
        updatedAt: new Date().toISOString(),
        count: matches.length,
        matches,
      });
    } catch {
      res.status(502).json({
        error: 'Impossible de joindre le flux des matchs en direct pour le moment.',
        matches: [],
      });
    }
  });

  app.get('/api/channels', (_req: Request, res: Response) => {
    res.json({
      channels: VERIFIED_CHANNELS,
    });
  });

  app.get('/api/hls-proxy', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!rawUrl) {
      res.status(400).send('Paramètre url manquant');
      return;
    }

    try {
      const { response, finalUrl } = await safeFetchWithRedirects(rawUrl);

      if (!response.ok) {
        res.status(response.status).send(`Erreur source distante: ${response.status}`);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      const isPlaylist =
        contentType.includes('mpegurl') ||
        contentType.includes('x-mpegurl') ||
        finalUrl.toLowerCase().includes('.m3u8');

      if (isPlaylist) {
        const text = await response.text();
        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            if (trimmed.startsWith('#')) {
              return trimmed.replace(/URI="([^"]+)"/g, (_match, uriValue: string) => {
                try {
                  const abs = new URL(uriValue, finalUrl).toString();
                  return `URI="/api/hls-proxy?url=${encodeURIComponent(abs)}"`;
                } catch {
                  return `URI="${uriValue}"`;
                }
              });
            }

            try {
              const abs = new URL(trimmed, finalUrl).toString();
              return `/api/hls-proxy?url=${encodeURIComponent(abs)}`;
            } catch {
              return line;
            }
          })
          .join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rewritten);
        return;
      }

      res.setHeader('Content-Type', contentType || 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=30');
      const arrayBuf = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      res.status(502).send(err instanceof Error ? err.message : 'Flux indisponible');
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MK.tv server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
