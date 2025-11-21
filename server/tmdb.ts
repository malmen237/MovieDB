import axios from 'axios';
import NodeCache from 'node-cache';
import { TMDBResponse, TMDBSearchResult, TMDBDetails } from './types';
import { TMDB_CACHE_TTL } from './constants';
import logger from './logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Cache TMDB responses (TTL in seconds)
const cache = new NodeCache({ stdTTL: TMDB_CACHE_TTL });

export async function searchTMDB(query: string, type?: 'movie' | 'tv'): Promise<TMDBSearchResult[]> {
  if (!TMDB_API_KEY) {
    logger.warn('TMDB_API_KEY not set. TMDB features disabled.');
    return [];
  }

  const cacheKey = `search:${type || 'multi'}:${query}`;
  const cached = cache.get<TMDBSearchResult[]>(cacheKey);
  if (cached) {
    return cached;
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

    const results = response.data.results.map(item => ({
      ...item,
      poster_path: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : undefined
    }));

    cache.set(cacheKey, results);
    return results;
  } catch (error) {
    logger.error('TMDB API search error', { error, query, type });
    return [];
  }
}

export async function getTMDBDetails(id: number, type: 'movie' | 'tv'): Promise<TMDBDetails | null> {
  if (!TMDB_API_KEY) {
    return null;
  }

  const cacheKey = `details:${type}:${id}`;
  const cached = cache.get<TMDBDetails>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get<TMDBDetails>(`${TMDB_BASE_URL}/${type}/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });

    const details: TMDBDetails = {
      ...response.data,
      poster_path: response.data.poster_path ? `${TMDB_IMAGE_BASE_URL}${response.data.poster_path}` : undefined
    };

    cache.set(cacheKey, details);
    return details;
  } catch (error) {
    logger.error('TMDB API details error', { error, id, type });
    return null;
  }
}
