export const TMDB_REJECTED_ID = -1;

export interface MediaItem {
  id?: number;
  userId: string;
  type: 'movie' | 'tv-series';
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
}

export interface Stats {
  movies: number;
  tvSeries: number;
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
