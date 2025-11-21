export interface MediaItem {
  id?: number;
  type: 'movie' | 'tv-series';
  originalTitle: string;
  swedishTitle?: string;
  company?: string;
  director?: string;
  format: 'bluray' | 'dvd' | 'other';
  productionYear: number;
  extras?: string;
  partOf?: string; // e.g., "Lord of the Rings", "Marvel Cinematic Universe"
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
