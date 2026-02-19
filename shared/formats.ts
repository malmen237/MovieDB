import { getAllValidFormats } from './sections';

export const VALID_FORMATS: Set<string> = getAllValidFormats();

export function validateFormat(format: string): boolean {
  return format.split(',').every(f => VALID_FORMATS.has(f));
}
