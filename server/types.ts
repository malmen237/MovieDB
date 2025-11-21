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

export interface TMDBDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  overview?: string;
  production_companies?: Array<{ id: number; name: string }>;
  credits?: {
    crew?: Array<{ job: string; name: string }>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Stats {
  movies: number;
  tvSeries: number;
  total: number;
}
