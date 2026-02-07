const API_BASE = '/api';

let currentUser = 'linda';

export function setCurrentUser(user: string) {
  currentUser = user;
}

export function getCurrentUser(): string {
  return currentUser;
}

function userHeaders(): Record<string, string> {
  return { 'X-User': currentUser };
}

export interface MediaItem {
  id?: number;
  userId?: string;
  type: 'movie' | 'tv-series';
  originalTitle: string;
  swedishTitle?: string;
  company?: string;
  director?: string;
  format: 'bluray' | 'dvd' | 'other';
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

export interface Stats {
  movies: number;
  tvSeries: number;
  total: number;
}

export const api = {
  async getMedia(type?: string, search?: string): Promise<MediaItem[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE}/media?${params}`, {
      headers: userHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch media');
    return response.json();
  },

  async getMediaById(id: number): Promise<MediaItem> {
    const response = await fetch(`${API_BASE}/media/${id}`, {
      headers: userHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch media item');
    return response.json();
  },

  async addMedia(item: MediaItem): Promise<MediaItem> {
    const response = await fetch(`${API_BASE}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...userHeaders() },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to add media');
    return response.json();
  },

  async updateMedia(id: number, item: Partial<MediaItem>): Promise<MediaItem> {
    const response = await fetch(`${API_BASE}/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...userHeaders() },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to update media');
    return response.json();
  },

  async deleteMedia(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/media/${id}`, {
      method: 'DELETE',
      headers: userHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete media');
  },

  async getStats(): Promise<Stats> {
    const response = await fetch(`${API_BASE}/stats`, {
      headers: userHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async searchTMDB(query: string, type?: 'movie' | 'tv') {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);

    const response = await fetch(`${API_BASE}/tmdb/search?${params}`);
    if (!response.ok) throw new Error('Failed to search TMDB');
    return response.json();
  },

  async getTMDBDetails(id: number, type: 'movie' | 'tv') {
    const response = await fetch(`${API_BASE}/tmdb/${type}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch TMDB details');
    return response.json();
  },

  async exportMoviesCSV() {
    const response = await fetch(`${API_BASE}/export/movies`, {
      headers: userHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to export movies' }));
      throw new Error(err.error || 'Failed to export movies');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'movies.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async exportTVSeriesCSV() {
    const response = await fetch(`${API_BASE}/export/tv-series`, {
      headers: userHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to export TV series' }));
      throw new Error(err.error || 'Failed to export TV series');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tv-series.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async importCSV(file: File, csvFormat: 'movies' | 'tv-series' = 'movies') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('csvFormat', csvFormat);

    const response = await fetch(`${API_BASE}/import/csv`, {
      method: 'POST',
      headers: userHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error('Failed to import CSV');
    return response.json();
  }
};
