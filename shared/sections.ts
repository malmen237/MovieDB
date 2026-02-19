export type Section = 'video' | 'music' | 'games';

export type MediaType = 'movie' | 'tv-series' | 'album' | 'single' | 'compilation' | 'game';

export interface TypeOption {
  value: MediaType;
  label: string;
}

export interface FormatOption {
  value: string;
  label: string;
}

export interface SectionConfig {
  label: string;
  types: TypeOption[];
  formats: FormatOption[];
  directorLabel: string;
  hasEnrichment: boolean;
  hasCsvSupport: boolean;
  externalSearchUrl?: (title: string, artist?: string) => string;
}

export const SECTION_CONFIG: Record<Section, SectionConfig> = {
  video: {
    label: 'Video',
    types: [
      { value: 'movie', label: 'Movie' },
      { value: 'tv-series', label: 'TV Series' },
    ],
    formats: [
      { value: 'bluray', label: 'Blu-ray' },
      { value: 'dvd', label: 'DVD' },
      { value: 'vhs', label: 'VHS' },
      { value: 'other', label: 'Other' },
    ],
    directorLabel: 'Director',
    hasEnrichment: true,
    hasCsvSupport: true,
  },
  music: {
    label: 'Music',
    types: [
      { value: 'album', label: 'Album' },
      { value: 'single', label: 'Single' },
      { value: 'compilation', label: 'Compilation' },
    ],
    formats: [
      { value: 'cd', label: 'CD' },
      { value: 'vinyl', label: 'Vinyl' },
      { value: 'cassette', label: 'Cassette' },
      { value: 'other', label: 'Other' },
    ],
    directorLabel: 'Artist',
    hasEnrichment: false,
    hasCsvSupport: false,
    externalSearchUrl: (title: string, artist?: string) => {
      const query = artist ? `${artist} ${title}` : title;
      return `https://www.discogs.com/search/?q=${encodeURIComponent(query)}&type=all`;
    },
  },
  games: {
    label: 'Games',
    types: [
      { value: 'game', label: 'Game' },
    ],
    formats: [
      { value: 'ps3', label: 'PS3' },
      { value: 'ps4', label: 'PS4' },
      { value: 'ps5', label: 'PS5' },
      { value: 'nes', label: 'NES' },
      { value: 'snes', label: 'SNES' },
      { value: 'n64', label: 'N64' },
      { value: 'nintendo-switch', label: 'Nintendo Switch' },
      { value: 'genesis', label: 'Genesis' },
      { value: 'amiga', label: 'Amiga' },
      { value: 'pc', label: 'PC' },
      { value: 'c64', label: 'C64' },
      { value: 'atari-xl', label: 'Atari XL' },
      { value: 'game-and-watch', label: 'Game&Watch' },
      { value: 'other', label: 'Other' },
    ],
    directorLabel: 'Developer',
    hasEnrichment: false,
    hasCsvSupport: false,
  },
};

export const ALL_SECTIONS = Object.keys(SECTION_CONFIG) as Section[];

export function getSectionForType(type: string): Section | undefined {
  for (const [section, config] of Object.entries(SECTION_CONFIG)) {
    if (config.types.some(t => t.value === type)) {
      return section as Section;
    }
  }
  return undefined;
}

export function getAllValidFormats(): Set<string> {
  const formats = new Set<string>();
  for (const config of Object.values(SECTION_CONFIG)) {
    for (const f of config.formats) {
      formats.add(f.value);
    }
  }
  return formats;
}
