export type SportCategoryId =
  | 'all'
  | 'bein'
  | 'football'
  | 'channels'
  | 'basketball'
  | 'tennis'
  | 'motorsport'
  | 'combat';

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
  network: 'beIN SPORTS' | 'Football TV' | 'Tennis & Auto' | 'NBA & Combat';
  category: 'channels' | 'football' | 'basketball' | 'tennis' | 'motorsport' | 'combat';
  language: string;
  quality: '1080p60' | '720p60';
  description: string;
  isLiveStreamVerified: boolean;
  servers: RealChannelServer[];
}

export interface RealMatch {
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

export const CATEGORIES: { id: SportCategoryId; label: string; description: string }[] = [
  {
    id: 'all',
    label: 'Tous les Directs',
    description: 'Tous les matchs réels du jour et chaînes sportives en direct HD',
  },
  {
    id: 'bein',
    label: 'Chaînes beIN SPORTS',
    description: 'Bouquet beIN SPORTS XTRA, Live HD et chaînes sportives type Yacine TV',
  },
  {
    id: 'football',
    label: 'Football',
    description: 'Ligue des Champions, Premier League, LaLiga, Ligue 1, Serie A, Bundesliga',
  },
  {
    id: 'channels',
    label: 'Chaînes TV Sport',
    description: 'FIFA+, Arryadia, Real Madrid TV, Oman Sports et chaînes HD continues',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    description: 'Rencontres NBA en direct et chaînes basketball',
  },
  {
    id: 'tennis',
    label: 'Tennis',
    description: 'Tournois ATP et chaînes Tennis Channel 1080p',
  },
  {
    id: 'motorsport',
    label: 'Formule 1 & Auto',
    description: 'Grands Prix F1, rallye et chaînes Red Bull TV / FloRacing',
  },
  {
    id: 'combat',
    label: 'UFC & Combat',
    description: 'Soirées UFC, PFL MMA, DAZN Combat et Kickboxing en direct',
  },
];

export const FOOTBALL_LEAGUES = [
  'Toutes',
  'Ligue des Champions',
  'Europa League',
  'Premier League',
  'LaLiga',
  'Ligue 1',
  'Serie A',
  'Bundesliga',
] as const;
