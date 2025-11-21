import logger from './logger';

// Validate required env vars on startup
export function validateEnv() {
  if (!process.env.TMDB_API_KEY) {
    logger.warn('TMDB_API_KEY not set. TMDB features will be disabled. Get one at https://www.themoviedb.org/settings/api');
  }
}

// Get allowed origins for CORS
export function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    return origins.split(',').map(o => o.trim());
  }
  // Default for dev
  return process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:5173'];
}
