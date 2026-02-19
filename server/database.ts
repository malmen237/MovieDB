import Database from 'better-sqlite3';
import path from 'path';
import { MediaItem } from '../shared/types';
import { validateFormat } from '../shared/formats';

type SqlParam = string | number | null;

const ALLOWED_UPDATE_FIELDS = new Set([
  'section', 'type', 'originalTitle', 'swedishTitle', 'company', 'director',
  'format', 'productionYear', 'extras', 'seasons', 'totalSeasons',
  'partOf', 'tmdbId', 'posterPath', 'overview',
]);

const db = new Database(path.join(__dirname, '..', 'moviedb.db'));

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
      format TEXT NOT NULL,
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

  if (!columnNames.includes('section')) {
    db.exec(`ALTER TABLE media ADD COLUMN section TEXT NOT NULL DEFAULT 'video'`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_section ON media(section)`);
  }

  const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='media'`).get() as { sql: string } | undefined;

  if (tableInfo && tableInfo.sql.includes("CHECK(type IN ('movie', 'tv-series'))")) {
    console.log('Migrating media table: widening type CHECK constraint for sections...');
    db.exec(`BEGIN TRANSACTION;
      CREATE TABLE media_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        section TEXT NOT NULL DEFAULT 'video',
        type TEXT NOT NULL,
        originalTitle TEXT NOT NULL,
        swedishTitle TEXT,
        company TEXT,
        director TEXT,
        format TEXT NOT NULL,
        productionYear INTEGER NOT NULL,
        extras TEXT,
        seasons TEXT,
        totalSeasons INTEGER,
        partOf TEXT,
        tmdbId INTEGER,
        posterPath TEXT,
        overview TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO media_new SELECT id, userId, COALESCE(section, 'video'), type, originalTitle, swedishTitle, company, director, format, productionYear, extras, seasons, totalSeasons, partOf, tmdbId, posterPath, overview, createdAt, updatedAt FROM media;
      DROP TABLE media;
      ALTER TABLE media_new RENAME TO media;
      CREATE INDEX idx_userId ON media(userId);
      CREATE INDEX idx_type ON media(type);
      CREATE INDEX idx_section ON media(section);
      CREATE INDEX idx_originalTitle ON media(originalTitle);
      CREATE INDEX idx_swedishTitle ON media(swedishTitle);
      CREATE INDEX idx_partOf ON media(partOf);
    COMMIT;`);
    console.log('Migration complete.');
  } else if (tableInfo && tableInfo.sql.includes("CHECK(format IN")) {
    console.log('Migrating media table: removing format CHECK constraint...');
    db.exec(`BEGIN TRANSACTION;
      CREATE TABLE media_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('movie', 'tv-series')),
        originalTitle TEXT NOT NULL,
        swedishTitle TEXT,
        company TEXT,
        director TEXT,
        format TEXT NOT NULL,
        productionYear INTEGER NOT NULL,
        extras TEXT,
        seasons TEXT,
        totalSeasons INTEGER,
        partOf TEXT,
        tmdbId INTEGER,
        posterPath TEXT,
        overview TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO media_new SELECT id, userId, type, originalTitle, swedishTitle, company, director, format, productionYear, extras, seasons, totalSeasons, partOf, tmdbId, posterPath, overview, createdAt, updatedAt FROM media;
      DROP TABLE media;
      ALTER TABLE media_new RENAME TO media;
      CREATE INDEX idx_userId ON media(userId);
      CREATE INDEX idx_type ON media(type);
      CREATE INDEX idx_originalTitle ON media(originalTitle);
      CREATE INDEX idx_swedishTitle ON media(swedishTitle);
      CREATE INDEX idx_partOf ON media(partOf);
    COMMIT;`);
    console.log('Migration complete.');
  } else {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_userId ON media(userId);
      CREATE INDEX IF NOT EXISTS idx_type ON media(type);
      CREATE INDEX IF NOT EXISTS idx_section ON media(section);
      CREATE INDEX IF NOT EXISTS idx_originalTitle ON media(originalTitle);
      CREATE INDEX IF NOT EXISTS idx_swedishTitle ON media(swedishTitle);
      CREATE INDEX IF NOT EXISTS idx_partOf ON media(partOf);
    `);
  }
}

export function getAllMedia(userId: string, type?: string, search?: string, section?: string): MediaItem[] {
  let query = 'SELECT * FROM media WHERE userId = ?';
  const params: SqlParam[] = [userId];

  if (section) {
    query += ' AND section = ?';
    params.push(section);
  }

  if (type) {
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
  if (!validateFormat(item.format)) {
    throw new Error(`Invalid format: "${item.format}"`);
  }

  const stmt = db.prepare(`
    INSERT INTO media (
      userId, section, type, originalTitle, swedishTitle, company, director,
      format, productionYear, extras, seasons, totalSeasons, partOf, tmdbId, posterPath, overview
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    item.userId,
    item.section || 'video',
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
  if (item.format !== undefined && !validateFormat(item.format)) {
    throw new Error(`Invalid format: "${item.format}"`);
  }

  const setClauses: string[] = [];
  const values: SqlParam[] = [];

  for (const [key, value] of Object.entries(item)) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value as SqlParam);
    }
  }

  if (setClauses.length === 0) {
    return false;
  }

  setClauses.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id, userId);

  const sql = `UPDATE media SET ${setClauses.join(', ')} WHERE id = ? AND userId = ?`;
  const stmt = db.prepare(sql);
  const result = stmt.run(...values);

  return result.changes > 0;
}

export function deleteMedia(userId: string, id: number): boolean {
  const stmt = db.prepare('DELETE FROM media WHERE id = ? AND userId = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

export function getStats(userId: string, section?: string) {
  let countQuery = 'SELECT type, COUNT(*) as count FROM media WHERE userId = ?';
  const countParams: SqlParam[] = [userId];
  if (section) {
    countQuery += ' AND section = ?';
    countParams.push(section);
  }
  countQuery += ' GROUP BY type';

  const rows = db.prepare(countQuery).all(...countParams) as { type: string; count: number }[];
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    counts[row.type] = row.count;
    total += row.count;
  }

  return { counts, total };
}

export function getUnenrichedMedia(userId: string): MediaItem[] {
  const stmt = db.prepare("SELECT * FROM media WHERE userId = ? AND section = 'video' AND tmdbId IS NULL");
  return stmt.all(userId) as MediaItem[];
}

export function getUsersWithUnenrichedMedia(): string[] {
  const stmt = db.prepare("SELECT DISTINCT userId FROM media WHERE section = 'video' AND tmdbId IS NULL");
  return (stmt.all() as { userId: string }[]).map(r => r.userId);
}

export function getTVSeriesMissingTotalSeasons(): MediaItem[] {
  const stmt = db.prepare(
    `SELECT * FROM media WHERE type = 'tv-series' AND tmdbId IS NOT NULL AND tmdbId > 0 AND totalSeasons IS NULL`
  );
  return stmt.all() as MediaItem[];
}

export default db;
