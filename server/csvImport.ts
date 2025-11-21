import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { MediaItem } from './types';
import { addMediaBatch } from './database';

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
          if (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 5) {
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
          errors.push(`Error parsing row: ${JSON.stringify(row)} - ${error}`);
        }
      })
      .on('end', () => {
        // Insert all valid items into database using batch insert with transaction
        // This ensures atomicity - either all valid items are inserted or none
        if (results.length > 0) {
          const batchResult = addMediaBatch(results);
          // Merge batch insert errors with parsing errors
          errors.push(...batchResult.errors);
          resolve({ success: batchResult.success, errors });
        } else {
          resolve({ success: 0, errors });
        }
      })
      .on('error', (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve({ success: 0, errors });
      });
  });
}
