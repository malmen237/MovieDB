import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { MediaItem } from './types';
import { addMedia } from './database';
import { MIN_YEAR, MAX_YEAR_OFFSET } from './constants';
import logger from './logger';

export interface CSVRow {
  type?: string;
  originalTitle?: string;
  swedishTitle?: string;
  company?: string;
  director?: string;
  format?: string;
  productionYear?: string;
  extras?: string;
  partOf?: string;
}

export async function importCSV(fileContent: string): Promise<{ success: number; errors: string[] }> {
  const results: MediaItem[] = [];
  const errors: string[] = [];

  return new Promise((resolve) => {
    const stream = Readable.from([fileContent]);

    stream
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true
        })
      )
      .on('data', (row: CSVRow) => {
        try {
          // Validate required fields
          if (!row.originalTitle) {
            errors.push(`Row missing originalTitle: ${JSON.stringify(row)}`);
            return;
          }

          if (!row.type || !['movie', 'tv-series'].includes(row.type.toLowerCase())) {
            errors.push(`Row has invalid type (must be 'movie' or 'tv-series'): ${row.originalTitle}`);
            return;
          }

          if (!row.format || !['bluray', 'dvd', 'other'].includes(row.format.toLowerCase())) {
            errors.push(`Row has invalid format (must be 'bluray', 'dvd', or 'other'): ${row.originalTitle}`);
            return;
          }

          const year = parseInt(row.productionYear || '0');
          if (isNaN(year) || year < MIN_YEAR || year > new Date().getFullYear() + MAX_YEAR_OFFSET) {
            errors.push(`Row has invalid production year: ${row.originalTitle}`);
            return;
          }

          const mediaItem: MediaItem = {
            type: row.type.toLowerCase() as 'movie' | 'tv-series',
            originalTitle: row.originalTitle,
            swedishTitle: row.swedishTitle || undefined,
            company: row.company || undefined,
            director: row.director || undefined,
            format: row.format.toLowerCase() as 'bluray' | 'dvd' | 'other',
            productionYear: year,
            extras: row.extras || undefined,
            partOf: row.partOf || undefined
          };

          results.push(mediaItem);
        } catch (error) {
          const errorMsg = `Error parsing row: ${JSON.stringify(row)} - ${error}`;
          errors.push(errorMsg);
          logger.error('CSV row parsing error', { error, row });
        }
      })
      .on('end', () => {
        // Insert all valid items into database
        let successCount = 0;
        for (const item of results) {
          try {
            addMedia(item);
            successCount++;
          } catch (error) {
            const errorMsg = `Error adding ${item.originalTitle}: ${error}`;
            errors.push(errorMsg);
            logger.error('CSV import database error', { error, item });
          }
        }

        resolve({ success: successCount, errors });
      })
      .on('error', (error) => {
        const errorMsg = `CSV parsing error: ${error.message}`;
        errors.push(errorMsg);
        logger.error('CSV parsing error', { error });
        resolve({ success: 0, errors });
      });
  });
}
