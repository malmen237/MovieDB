import Database from 'better-sqlite3';
import path from 'path';
import { MediaItem } from './types';

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

// Get all media items
export function getAllMedia(type?: string, search?: string): MediaItem[] {
  let query = 'SELECT * FROM media WHERE 1=1';
  const params: (string | number)[] = [];

  if (type && (type === 'movie' || type === 'tv-series')) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (search) {
    query += ' AND (originalTitle LIKE ? OR swedishTitle LIKE ? OR partOf LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY originalTitle ASC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as MediaItem[];
}

// Get media item by ID
export function getMediaById(id: number): MediaItem | undefined {
  const stmt = db.prepare('SELECT * FROM media WHERE id = ?');
  return stmt.get(id) as MediaItem | undefined;
}

// Add new media item
export function addMedia(item: MediaItem): number {
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
}

// Batch insert media items with transaction support
// This ensures all-or-nothing behavior - either all items are inserted or none are
export function addMediaBatch(items: MediaItem[]): { success: number; errors: string[] } {
  const errors: string[] = [];
  let successCount = 0;

  // Prepare the insert statement once
  const stmt = db.prepare(`
    INSERT INTO media (
      type, originalTitle, swedishTitle, company, director,
      format, productionYear, extras, partOf, tmdbId, posterPath, overview
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Use transaction for atomic batch insert
  const insertMany = db.transaction((itemsToInsert: MediaItem[]) => {
    for (const item of itemsToInsert) {
      try {
        stmt.run(
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
        successCount++;
      } catch (error) {
        // Collect errors but continue transaction
        errors.push(`Error adding ${item.originalTitle}: ${error}`);
      }
    }
  });

  try {
    // Execute the transaction
    insertMany(items);
  } catch (error) {
    errors.push(`Transaction error: ${error}`);
    return { success: 0, errors };
  }

  return { success: successCount, errors };
}

// Update media item
export function updateMedia(id: number, item: Partial<MediaItem>): boolean {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  // Explicit whitelist mapping to prevent SQL injection
  const allowedFields: Record<string, boolean> = {
    'type': true,
    'originalTitle': true,
    'swedishTitle': true,
    'company': true,
    'director': true,
    'format': true,
    'productionYear': true,
    'extras': true,
    'partOf': true,
    'tmdbId': true,
    'posterPath': true,
    'overview': true
  };

  for (const [key, value] of Object.entries(item)) {
    // Strict validation: only allow whitelisted fields
    if (allowedFields[key] === true) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
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
}

// Delete media item
export function deleteMedia(id: number): boolean {
  const stmt = db.prepare('DELETE FROM media WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Get statistics
export function getStats() {
  const movieCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE type = ?').get('movie') as { count: number };
  const tvCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE type = ?').get('tv-series') as { count: number };
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM media').get() as { count: number };

  return {
    movies: movieCount.count,
    tvSeries: tvCount.count,
    total: totalCount.count
  };
}

export default db;
