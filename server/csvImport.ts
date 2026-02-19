import { parse } from 'csv-parse';
import { Readable } from 'stream';
import {
  MediaItem,
  ImportPreviewRow,
  ImportPreviewResult,
  ImportCommitItem,
  ImportCommitResult,
  ConflictFieldDiff
} from '../shared/types';
import { addMedia, getAllMedia, updateMedia } from './database';

function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function parseMovieRow(cols: string[], userId: string): MediaItem | null {
  const swedishTitle = (cols[0] || '').trim();
  const notesCol = (cols[1] || '').trim();
  const originalTitle = (cols[2] || '').trim();
  const yearStr = (cols[3] || '').trim();

  if (!originalTitle && !swedishTitle) return null;

  const title = originalTitle || swedishTitle;
  const swedish = swedishTitle || originalTitle;

  const year = parseInt(yearStr);
  const validYear = !isNaN(year) && year >= 1800 && year <= new Date().getFullYear() + 5;

  const isBoth = notesCol === 'BR/DVD' || notesCol.startsWith('BR/DVD ') || notesCol.startsWith('BR/DVD,');
  const isBluray = !isBoth && (notesCol === 'BR' || notesCol.startsWith('BR ') || notesCol.startsWith('BR,'));
  const isVHS = !isBoth && !isBluray && (notesCol === 'VHS' || notesCol.startsWith('VHS ') || notesCol.startsWith('VHS,'));

  const extras = (isBoth || isBluray)
    ? notesCol.replace(/^BR(?:\/DVD)?[, ]*/, '').trim()
    : isVHS
      ? notesCol.replace(/^VHS[, ]*/, '').trim()
      : notesCol;

  let format = 'dvd';
  if (isBoth) format = 'bluray,dvd';
  else if (isBluray) format = 'bluray';
  else if (isVHS) format = 'vhs';

  return {
    userId,
    section: 'video',
    type: 'movie',
    originalTitle: title,
    swedishTitle: swedish,
    format,
    productionYear: validYear ? year : 0,
    extras: extras || undefined
  };
}

function parseTVSeriesRow(cols: string[], userId: string): MediaItem | null {
  const title = (cols[0] || '').trim();
  if (!title) return null;

  const seasonSet = new Set<number>();
  cols.slice(1).forEach((c, i) => {
    if ((c || '').trim()) seasonSet.add(i + 1);
  });
  const seasons = Array.from(seasonSet).sort((a, b) => a - b);

  return {
    userId,
    section: 'video',
    type: 'tv-series',
    originalTitle: title,
    swedishTitle: title,
    format: 'dvd',
    productionYear: 0,
    seasons: seasons.length > 0 ? seasons.join(',') : undefined
  };
}

function parseCSV(fileContent: string, userId: string, csvFormat: string): Promise<{ items: MediaItem[]; errors: string[] }> {
  const items: MediaItem[] = [];
  const errors: string[] = [];
  const delimiter = detectDelimiter(fileContent);
  const isTVSeries = csvFormat === 'tv-series';

  return new Promise((resolve) => {
    const stream = Readable.from([fileContent]);

    stream
      .pipe(
        parse({
          columns: false,
          delimiter,
          skip_empty_lines: true,
          trim: true,
          bom: true,
          relax_column_count: true
        })
      )
      .on('data', (cols: string[]) => {
        try {
          if (isTVSeries) {
            const item = parseTVSeriesRow(cols, userId);
            if (item) items.push(item);
          } else {
            const item = parseMovieRow(cols, userId);
            if (item) items.push(item);
          }
        } catch (error) {
          errors.push(`Error parsing row: ${JSON.stringify(cols)} - ${error}`);
        }
      })
      .on('end', () => resolve({ items, errors }))
      .on('error', (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve({ items: [], errors });
      });
  });
}

function matchKey(item: MediaItem): string {
  return item.originalTitle.toLowerCase() + '|' + item.type;
}

function getMovieDiffs(existing: MediaItem, incoming: MediaItem): ConflictFieldDiff[] {
  const diffs: ConflictFieldDiff[] = [];
  const fields: (keyof MediaItem)[] = ['originalTitle', 'swedishTitle', 'format', 'productionYear', 'extras'];

  for (const field of fields) {
    const csvVal = incoming[field];
    if (csvVal === undefined || csvVal === '' || (field === 'productionYear' && csvVal === 0)) continue;
    if (csvVal !== existing[field]) {
      diffs.push({ field, existing: existing[field] as string | number | undefined, incoming: csvVal as string | number | undefined });
    }
  }
  return diffs;
}

function getTVSeriesDiffs(existing: MediaItem, incoming: MediaItem): ConflictFieldDiff[] {
  const diffs: ConflictFieldDiff[] = [];

  if (incoming.originalTitle !== existing.originalTitle) {
    diffs.push({ field: 'originalTitle', existing: existing.originalTitle, incoming: incoming.originalTitle });
  }

  const incomingSeasons = incoming.seasons ?? undefined;
  const existingSeasons = existing.seasons ?? undefined;
  if (incomingSeasons !== existingSeasons) {
    diffs.push({ field: 'seasons', existing: existingSeasons, incoming: incomingSeasons });
  }

  return diffs;
}

export async function previewCSV(fileContent: string, userId: string, csvFormat: string = 'movies'): Promise<ImportPreviewResult> {
  if (!fileContent.trim()) {
    return { newItems: [], duplicates: [], conflicts: [] };
  }

  const { items } = await parseCSV(fileContent, userId, csvFormat);
  const existingItems = getAllMedia(userId, csvFormat === 'tv-series' ? 'tv-series' : 'movie');

  const warnings: string[] = [];
  const existingByKey = new Map<string, MediaItem>();
  const dbKeyCounts = new Map<string, number>();
  for (const item of existingItems) {
    const key = matchKey(item);
    const count = (dbKeyCounts.get(key) || 0) + 1;
    dbKeyCounts.set(key, count);
    if (count === 2) {
      warnings.push(`Duplicate in database: "${item.originalTitle}" (${item.format}) appears more than once`);
    }
    existingByKey.set(key, item);
  }

  const newItems: ImportPreviewRow[] = [];
  const duplicates: ImportPreviewRow[] = [];
  const conflicts: ImportPreviewRow[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const incoming = items[i];
    const key = matchKey(incoming);

    if (seenKeys.has(key)) {
      duplicates.push({ csvIndex: i, classification: 'duplicate', incoming });
      continue;
    }
    seenKeys.add(key);

    const existing = existingByKey.get(key);
    if (!existing) {
      newItems.push({ csvIndex: i, classification: 'new', incoming });
      continue;
    }

    const diffs = incoming.type === 'tv-series'
      ? getTVSeriesDiffs(existing, incoming)
      : getMovieDiffs(existing, incoming);

    if (diffs.length === 0) {
      duplicates.push({ csvIndex: i, classification: 'duplicate', incoming, existingId: existing.id });
    } else {
      conflicts.push({ csvIndex: i, classification: 'conflict', incoming, existingId: existing.id, diffs });
    }
  }

  return { newItems, duplicates, conflicts, warnings: warnings.length > 0 ? warnings : undefined };
}

export async function commitImport(userId: string, items: ImportCommitItem[]): Promise<ImportCommitResult> {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      if (item.action === 'add' && item.data) {
        addMedia({ ...item.data, userId });
        added++;
      } else if (item.action === 'update' && item.existingId && item.data) {
        const { tmdbId, posterPath, overview, id, userId: _u, createdAt, updatedAt, ...csvFields } = item.data;
        updateMedia(userId, item.existingId, csvFields);
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      errors.push(`Error processing item ${item.csvIndex}: ${error}`);
    }
  }

  return { added, updated, skipped, errors };
}

export async function importCSV(fileContent: string, userId: string, csvFormat: string = 'movies'): Promise<{ success: number; errors: string[] }> {
  if (!fileContent.trim()) {
    return { success: 0, errors: ['File is empty'] };
  }

  const { items, errors } = await parseCSV(fileContent, userId, csvFormat);

  let successCount = 0;
  for (const item of items) {
    try {
      addMedia(item);
      successCount++;
    } catch (error) {
      errors.push(`Error adding ${item.originalTitle}: ${error}`);
    }
  }

  return { success: successCount, errors };
}
