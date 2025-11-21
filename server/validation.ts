import { MediaItem } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a media item for required fields and correct formats
 */
export function validateMediaItem(item: Partial<MediaItem>, isUpdate: boolean = false): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields for creation (not updates)
  if (!isUpdate) {
    if (!item.originalTitle || item.originalTitle.trim().length === 0) {
      errors.push({ field: 'originalTitle', message: 'Original title is required' });
    }

    if (!item.type) {
      errors.push({ field: 'type', message: 'Type is required' });
    }

    if (!item.format) {
      errors.push({ field: 'format', message: 'Format is required' });
    }

    if (item.productionYear === undefined || item.productionYear === null) {
      errors.push({ field: 'productionYear', message: 'Production year is required' });
    }
  }

  // Validate type enum
  if (item.type && !['movie', 'tv-series'].includes(item.type)) {
    errors.push({ field: 'type', message: 'Type must be either "movie" or "tv-series"' });
  }

  // Validate format enum
  if (item.format && !['bluray', 'dvd', 'other'].includes(item.format)) {
    errors.push({ field: 'format', message: 'Format must be "bluray", "dvd", or "other"' });
  }

  // Validate production year
  if (item.productionYear !== undefined && item.productionYear !== null) {
    const currentYear = new Date().getFullYear();
    if (typeof item.productionYear !== 'number' || isNaN(item.productionYear)) {
      errors.push({ field: 'productionYear', message: 'Production year must be a valid number' });
    } else if (item.productionYear < 1800 || item.productionYear > currentYear + 5) {
      errors.push({
        field: 'productionYear',
        message: `Production year must be between 1800 and ${currentYear + 5}`
      });
    }
  }

  // Validate string lengths to prevent abuse
  if (item.originalTitle && item.originalTitle.length > 500) {
    errors.push({ field: 'originalTitle', message: 'Original title must be less than 500 characters' });
  }

  if (item.swedishTitle && item.swedishTitle.length > 500) {
    errors.push({ field: 'swedishTitle', message: 'Swedish title must be less than 500 characters' });
  }

  if (item.company && item.company.length > 300) {
    errors.push({ field: 'company', message: 'Company must be less than 300 characters' });
  }

  if (item.director && item.director.length > 300) {
    errors.push({ field: 'director', message: 'Director must be less than 300 characters' });
  }

  if (item.partOf && item.partOf.length > 300) {
    errors.push({ field: 'partOf', message: 'Collection name must be less than 300 characters' });
  }

  if (item.extras && item.extras.length > 1000) {
    errors.push({ field: 'extras', message: 'Extras must be less than 1000 characters' });
  }

  if (item.overview && item.overview.length > 2000) {
    errors.push({ field: 'overview', message: 'Overview must be less than 2000 characters' });
  }

  if (item.posterPath && item.posterPath.length > 500) {
    errors.push({ field: 'posterPath', message: 'Poster path must be less than 500 characters' });
  }

  // Validate TMDB ID if provided
  if (item.tmdbId !== undefined && item.tmdbId !== null) {
    if (typeof item.tmdbId !== 'number' || item.tmdbId < 0 || !Number.isInteger(item.tmdbId)) {
      errors.push({ field: 'tmdbId', message: 'TMDB ID must be a positive integer' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates pagination parameters
 */
export function validatePaginationParams(page?: any, limit?: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
      errors.push({ field: 'limit', message: 'Limit must be between 1 and 200' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes search query to prevent SQL injection in LIKE clauses
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove or escape special SQL LIKE characters
  return query.replace(/[%_]/g, '\\$&').substring(0, 200);
}

/**
 * Validates ID parameter
 */
export function validateId(id: any): ValidationResult {
  const errors: ValidationError[] = [];
  const idNum = parseInt(id);

  if (isNaN(idNum) || idNum < 1 || !Number.isInteger(idNum)) {
    errors.push({ field: 'id', message: 'ID must be a positive integer' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
