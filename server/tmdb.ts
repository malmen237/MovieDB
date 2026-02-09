import axios from 'axios';
import { TMDBResponse, TMDBSearchResult, TMDBDetailsResult } from '../shared/types';

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

export async function getTMDBDetails(id: number, type: 'movie' | 'tv'): Promise<TMDBDetailsResult | null> {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    const response = await axios.get<TMDBDetailsResult>(`${TMDB_BASE_URL}/${type}/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        append_to_response: 'credits'
      }
    });

    const data = response.data;
    return {
      ...data,
      poster_path: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : undefined,
      seasons: data.seasons?.map(s => ({
        ...s,
        poster_path: s.poster_path ? `${TMDB_IMAGE_BASE_URL}${s.poster_path}` : undefined
      })),
      credits: data.credits ? {
        cast: data.credits.cast?.map(c => ({
          ...c,
          profile_path: c.profile_path ? `${TMDB_IMAGE_BASE_URL}${c.profile_path}` : undefined
        })),
        crew: data.credits.crew
      } : undefined
    };
  } catch (error) {
    console.error('TMDB API error:', error);
    return null;
  }
}
