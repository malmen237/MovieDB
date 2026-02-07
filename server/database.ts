import Database from 'better-sqlite3';
import path from 'path';
import { MediaItem } from './types';

const db = new Database(path.join(__dirname, '../moviedb.db'));

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
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
  `);

  const columns = db.prepare('PRAGMA table_info(media)').all() as { name: string }[];
  const columnNames = columns.map(col => col.name);

  if (!columnNames.includes('userId')) {
    db.exec(`ALTER TABLE media ADD COLUMN userId TEXT NOT NULL DEFAULT 'default'`);
  }
  if (!columnNames.includes('seasons')) {
    db.exec(`ALTER TABLE media ADD COLUMN seasons TEXT`);
  }
  if (!columnNames.includes('totalSeasons')) {
    db.exec(`ALTER TABLE media ADD COLUMN totalSeasons INTEGER`);
  }

  const rowsToMigrate = db.prepare(
    `SELECT id, extras FROM media WHERE type = 'tv-series' AND extras LIKE 'Seasons:%' AND seasons IS NULL`
  ).all() as { id: number; extras: string }[];

  const migrateStmt = db.prepare(`UPDATE media SET seasons = ?, extras = NULL WHERE id = ?`);
  for (const row of rowsToMigrate) {
    const match = row.extras.match(/^Seasons:\s*(.+)$/);
    if (match) {
      const seasonNumbers = match[1].split(',').map(s => s.trim()).join(',');
      migrateStmt.run(seasonNumbers, row.id);
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_userId ON media(userId);
    CREATE INDEX IF NOT EXISTS idx_type ON media(type);
    CREATE INDEX IF NOT EXISTS idx_originalTitle ON media(originalTitle);
    CREATE INDEX IF NOT EXISTS idx_swedishTitle ON media(swedishTitle);
    CREATE INDEX IF NOT EXISTS idx_partOf ON media(partOf);
  `);
}

export function getAllMedia(userId: string, type?: string, search?: string): MediaItem[] {
  let query = 'SELECT * FROM media WHERE userId = ?';
  const params: any[] = [userId];

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

export function getMediaById(userId: string, id: number): MediaItem | undefined {
  const stmt = db.prepare('SELECT * FROM media WHERE id = ? AND userId = ?');
  return stmt.get(id, userId) as MediaItem | undefined;
}

export function addMedia(item: MediaItem): number {
  const stmt = db.prepare(`
    INSERT INTO media (
      userId, type, originalTitle, swedishTitle, company, director,
      format, productionYear, extras, seasons, totalSeasons, partOf, tmdbId, posterPath, overview
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    item.userId,
    item.type,
    item.originalTitle,
    item.swedishTitle || null,
    item.company || null,
    item.director || null,
    item.format,
    item.productionYear,
    item.extras || null,
    item.seasons || null,
    item.totalSeasons || null,
    item.partOf || null,
    item.tmdbId || null,
    item.posterPath || null,
    item.overview || null
  );

  return result.lastInsertRowid as number;
}

export function updateMedia(userId: string, id: number, item: Partial<MediaItem>): boolean {
  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = [
    'type', 'originalTitle', 'swedishTitle', 'company', 'director',
    'format', 'productionYear', 'extras', 'seasons', 'totalSeasons', 'partOf', 'tmdbId', 'posterPath', 'overview'
  ];

  for (const [key, value] of Object.entries(item)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id, userId);

  const stmt = db.prepare(`UPDATE media SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
  const result = stmt.run(...values);

  return result.changes > 0;
}

export function deleteMedia(userId: string, id: number): boolean {
  const stmt = db.prepare('DELETE FROM media WHERE id = ? AND userId = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

export function getStats(userId: string) {
  const movieCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE userId = ? AND type = ?').get(userId, 'movie') as { count: number };
  const tvCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE userId = ? AND type = ?').get(userId, 'tv-series') as { count: number };
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE userId = ?').get(userId) as { count: number };

  return {
    movies: movieCount.count,
    tvSeries: tvCount.count,
    total: totalCount.count
  };
}

export function getUnenrichedMedia(userId: string): MediaItem[] {
  const stmt = db.prepare('SELECT * FROM media WHERE userId = ? AND tmdbId IS NULL');
  return stmt.all(userId) as MediaItem[];
}

export function getUsersWithUnenrichedMedia(): string[] {
  const stmt = db.prepare('SELECT DISTINCT userId FROM media WHERE tmdbId IS NULL');
  return (stmt.all() as { userId: string }[]).map(r => r.userId);
}

export function getTVSeriesMissingTotalSeasons(): MediaItem[] {
  const stmt = db.prepare(
    `SELECT * FROM media WHERE type = 'tv-series' AND tmdbId IS NOT NULL AND totalSeasons IS NULL`
  );
  return stmt.all() as MediaItem[];
}

export default db;
