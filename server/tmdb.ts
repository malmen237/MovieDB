import axios from 'axios';
import { TMDBResponse, TMDBSearchResult, TMDBDetails } from './types';

// TMDB API configuration
// Users should get their own API key from https://www.themoviedb.org/settings/api
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export async function searchTMDB(query: string, type?: 'movie' | 'tv'): Promise<TMDBSearchResult[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not set. Movie API features will not work.');
    return [];
  }

  try {
    const endpoint = type === 'movie' ? '/search/movie' : type === 'tv' ? '/search/tv' : '/search/multi';
    const response = await axios.get<TMDBResponse>(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
        language: 'en-US'
      }
    });

    return response.data.results.map(item => ({
      ...item,
      poster_path: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : undefined
    }));
  } catch (error) {
    console.error('TMDB API error:', error);
    return [];
  }
}

export async function getTMDBDetails(id: number, type: 'movie' | 'tv'): Promise<TMDBDetails | null> {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    const response = await axios.get<TMDBDetails>(`${TMDB_BASE_URL}/${type}/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });

    return {
      ...response.data,
      poster_path: response.data.poster_path ? `${TMDB_IMAGE_BASE_URL}${response.data.poster_path}` : undefined
    };
  } catch (error) {
    console.error('TMDB API error:', error);
    return null;
  }
}
