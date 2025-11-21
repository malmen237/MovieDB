const API_BASE = '/api';

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

export interface Stats {
  movies: number;
  tvSeries: number;
  total: number;
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

export const api = {
  // Media operations
  async getMedia(type?: string, search?: string, page?: number, limit?: number): Promise<MediaItem[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE}/media?${params}`);
    if (!response.ok) throw new Error('Failed to fetch media');
    const result: PaginatedResponse<MediaItem> = await response.json();
    // For now, just return the data array (pagination can be added to UI later)
    return result.data;
  },

  async getMediaById(id: number): Promise<MediaItem> {
    const response = await fetch(`${API_BASE}/media/${id}`);
    if (!response.ok) throw new Error('Failed to fetch media item');
    return response.json();
  },

  async addMedia(item: MediaItem): Promise<MediaItem> {
    const response = await fetch(`${API_BASE}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to add media');
    return response.json();
  },

  async updateMedia(id: number, item: Partial<MediaItem>): Promise<MediaItem> {
    const response = await fetch(`${API_BASE}/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to update media');
    return response.json();
  },

  async deleteMedia(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/media/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete media');
  },

  async getStats(): Promise<Stats> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  // TMDB operations
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

  // Import
  async importCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/import/csv`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to import CSV');
    return response.json();
  }
};
