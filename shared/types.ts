import type { Section, MediaType } from './sections';

export const TMDB_REJECTED_ID = -1;

export interface MediaItem {
  id?: number;
  userId: string;
  section: Section;
  type: MediaType;
  originalTitle: string;
  swedishTitle?: string;
  company?: string;
  director?: string;
  format: string;
  productionYear: number;
  extras?: string;
  seasons?: string;
  totalSeasons?: number;
  partOf?: string;
  tmdbId?: number;
  posterPath?: string;
  overview?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  overview?: string;
  media_type?: string;
}

export interface TMDBResponse {
  results: TMDBSearchResult[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  overview?: string;
  poster_path?: string;
}

export interface TMDBDetailsResult {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  genres?: { id: number; name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  origin_country?: string[];
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  seasons?: TMDBSeason[];
}

export interface Stats {
  counts: Record<string, number>;
  total: number;
}

export interface EnrichEvent {
  type: 'progress' | 'done' | 'idle';
  processed: number;
  total: number;
  currentTitle?: string;
}

export interface ImportResult {
  message: string;
  success: number;
  errors: string[];
}

export interface ConflictFieldDiff {
  field: string;
  existing: string | number | undefined;
  incoming: string | number | undefined;
}

export interface ImportPreviewRow {
  csvIndex: number;
  classification: 'new' | 'duplicate' | 'conflict';
  incoming: MediaItem;
  existingId?: number;
  diffs?: ConflictFieldDiff[];
}

export interface ImportPreviewResult {
  newItems: ImportPreviewRow[];
  duplicates: ImportPreviewRow[];
  conflicts: ImportPreviewRow[];
  warnings?: string[];
}

export interface ImportCommitItem {
  csvIndex: number;
  action: 'add' | 'update' | 'skip';
  existingId?: number;
  data?: MediaItem;
}

export interface ImportCommitResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}
