export type SportCategoryId =
  | 'all'
  | 'bein'
  | 'tunisie'
  | 'qatar'
  | 'algerie'
  | 'maroc'
  | 'football'
  | 'channels'
  | 'basketball'
  | 'tennis'
  | 'motorsport'
  | 'combat';

export type ChannelNetwork =
  | 'beIN SPORTS'
  | 'Tunisie'
  | 'Qatar & Golfe'
  | 'Algérie'
  | 'Maroc'
  | 'Sport International';

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
  network: ChannelNetwork;
  category: Exclude<SportCategoryId, 'all' | 'bein'>;
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
    label: 'Tout En Direct',
    description: 'Toutes les chaînes TV et matchs réels du jour en direct HD',
  },
  {
    id: 'bein',
    label: 'beIN SPORTS',
    description: 'Chaînes beIN SPORTS XTRA et Live HD',
  },
  {
    id: 'tunisie',
    label: 'Tunisie',
    description: 'Chaînes tunisiennes en direct : El Watania 1, El Watania 2, Mosaïque FM, StoryChannel',
  },
  {
    id: 'qatar',
    label: 'Qatar & Golfe',
    description: 'Chaînes qataries et sportives du Golfe : Qatar TV 1 & 2, Al Rayyan, Al Jazeera, KTV Sport, Bahrain Sports',
  },
  {
    id: 'algerie',
    label: 'Algérie',
    description: 'Chaînes algériennes en direct : TV2 Canal Algérie, AL24 News, Amou Yazid, Qudsuna',
  },
  {
    id: 'maroc',
    label: 'Maroc',
    description: 'Chaînes marocaines en direct : Arryadia, 2M, 2M Monde, Al Maghribia, Medi1TV, Chada TV, MBC 5',
  },
  {
    id: 'football',
    label: 'Football',
    description: 'Ligue des Champions, Europa League, Premier League, LaLiga, Ligue 1, Serie A, Bundesliga',
  },
  {
    id: 'channels',
    label: 'Toutes les Chaînes',
    description: 'Bouquet complet de toutes les chaînes TV incluses sur MK.tv',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    description: 'Rencontres NBA en direct et chaîne basketball',
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
