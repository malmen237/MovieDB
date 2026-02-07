import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { MediaItem } from '../shared/types';
import { addMedia } from './database';

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

  const isBluray = notesCol === 'BR' || notesCol.startsWith('BR ') || notesCol.startsWith('BR,');
  const extras = isBluray ? notesCol.replace(/^BR[, ]*/, '').trim() : notesCol;

  return {
    userId,
    type: 'movie',
    originalTitle: title,
    swedishTitle: swedish,
    format: isBluray ? 'bluray' : 'dvd',
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
    type: 'tv-series',
    originalTitle: title,
    swedishTitle: title,
    format: 'dvd',
    productionYear: 0,
    seasons: seasons.length > 0 ? seasons.join(',') : undefined
  };
}

export async function importCSV(fileContent: string, userId: string, csvFormat: string = 'movies'): Promise<{ success: number; errors: string[] }> {
  if (!fileContent.trim()) {
    return { success: 0, errors: ['File is empty'] };
  }

  const results: MediaItem[] = [];
  const errors: string[] = [];
  const delimiter = detectDelimiter(fileContent);
  const parseRow = csvFormat === 'tv-series' ? parseTVSeriesRow : parseMovieRow;

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
          const item = parseRow(cols, userId);
          if (item) results.push(item);
        } catch (error) {
          errors.push(`Error parsing row: ${JSON.stringify(cols)} - ${error}`);
        }
      })
      .on('end', () => {
        let successCount = 0;
        for (const item of results) {
          try {
            addMedia(item);
            successCount++;
          } catch (error) {
            errors.push(`Error adding ${item.originalTitle}: ${error}`);
          }
        }

        resolve({ success: successCount, errors });
      })
      .on('error', (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve({ success: 0, errors });
      });
  });
}
