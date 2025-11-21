import Database from 'better-sqlite3';
import path from 'path';
import { MediaItem, PaginatedResponse } from './types';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants';
import logger from './logger';

const db = new Database(path.join(__dirname, '../moviedb.db'));

// Initialize database schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('movie', 'tv-series')),
      originalTitle TEXT NOT NULL,
      swedishTitle TEXT,
      company TEXT,
      director TEXT,
      format TEXT NOT NULL CHECK(format IN ('bluray', 'dvd', 'other')),
      productionYear INTEGER NOT NULL,
      extras TEXT,
      partOf TEXT,
      tmdbId INTEGER,
      posterPath TEXT,
      overview TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_type ON media(type);
    CREATE INDEX IF NOT EXISTS idx_originalTitle ON media(originalTitle);
    CREATE INDEX IF NOT EXISTS idx_swedishTitle ON media(swedishTitle);
    CREATE INDEX IF NOT EXISTS idx_partOf ON media(partOf);
  `);
}

// Get all media items with pagination
export function getAllMedia(
  type?: string,
  search?: string,
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE
): PaginatedResponse<MediaItem> {
  try {
    // Validate and sanitize pagination params
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const offset = (safePage - 1) * safeLimit;

    // Build query
    let query = 'SELECT * FROM media WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM media WHERE 1=1';
    const params: (string | number)[] = [];

    if (type && (type === 'movie' || type === 'tv-series')) {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (originalTitle LIKE ? OR swedishTitle LIKE ? OR partOf LIKE ?)';
      countQuery += ' AND (originalTitle LIKE ? OR swedishTitle LIKE ? OR partOf LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY originalTitle ASC LIMIT ? OFFSET ?';

    // Get total count
    const countStmt = db.prepare(countQuery);
    const { total } = countStmt.get(...params) as { total: number };

    // Get paginated results
    const stmt = db.prepare(query);
    const data = stmt.all(...params, safeLimit, offset) as MediaItem[];

    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  } catch (error) {
    logger.error('Database error in getAllMedia', { error, type, search, page, limit });
    throw new Error('Failed to retrieve media items');
  }
}

// Get media item by ID
export function getMediaById(id: number): MediaItem | undefined {
  try {
    const stmt = db.prepare('SELECT * FROM media WHERE id = ?');
    return stmt.get(id) as MediaItem | undefined;
  } catch (error) {
    logger.error('Database error in getMediaById', { error, id });
    throw new Error('Failed to retrieve media item');
  }
}

// Add new media item
export function addMedia(item: MediaItem): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO media (
        type, originalTitle, swedishTitle, company, director,
        format, productionYear, extras, partOf, tmdbId, posterPath, overview
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      item.type,
      item.originalTitle,
      item.swedishTitle || null,
      item.company || null,
      item.director || null,
      item.format,
      item.productionYear,
      item.extras || null,
      item.partOf || null,
      item.tmdbId || null,
      item.posterPath || null,
      item.overview || null
    );

    return result.lastInsertRowid as number;
  } catch (error) {
    logger.error('Database error in addMedia', { error, item });
    throw new Error('Failed to add media item');
  }
}

// Update media item
export function updateMedia(id: number, item: Partial<MediaItem>): boolean {
  try {
    const fields: string[] = [];
    const values: (string | number | null | undefined)[] = [];

    const allowedFields = [
      'type', 'originalTitle', 'swedishTitle', 'company', 'director',
      'format', 'productionYear', 'extras', 'partOf', 'tmdbId', 'posterPath', 'overview'
    ] as const;

    for (const [key, value] of Object.entries(item)) {
      if (allowedFields.includes(key as typeof allowedFields[number])) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`UPDATE media SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    return result.changes > 0;
  } catch (error) {
    logger.error('Database error in updateMedia', { error, id, item });
    throw new Error('Failed to update media item');
  }
}

// Delete media item
export function deleteMedia(id: number): boolean {
  try {
    const stmt = db.prepare('DELETE FROM media WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    logger.error('Database error in deleteMedia', { error, id });
    throw new Error('Failed to delete media item');
  }
}

// Get statistics
export function getStats() {
  try {
    const movieCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE type = ?').get('movie') as { count: number };
    const tvCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE type = ?').get('tv-series') as { count: number };
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM media').get() as { count: number };

    return {
      movies: movieCount.count,
      tvSeries: tvCount.count,
      total: totalCount.count
    };
  } catch (error) {
    logger.error('Database error in getStats', { error });
    throw new Error('Failed to retrieve statistics');
  }
}

export default db;
