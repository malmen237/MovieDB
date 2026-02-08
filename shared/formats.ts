export const FORMATS = [
  { value: 'bluray', label: 'Blu-ray' },
  { value: 'dvd', label: 'DVD' },
  { value: 'vhs', label: 'VHS' },
  { value: 'other', label: 'Other' },
] as const;

export const VALID_FORMATS: Set<string> = new Set(FORMATS.map(f => f.value));

export function validateFormat(format: string): boolean {
  return format.split(',').every(f => VALID_FORMATS.has(f));
}
