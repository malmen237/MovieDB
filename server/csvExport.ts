import { MediaItem } from '../shared/types';

export function exportMoviesCSV(items: MediaItem[]): string {
  const rows = items.map(item => {
    const noteParts: string[] = [];
    const formats = item.format.split(',');
    const hasBluray = formats.includes('bluray');
    const hasDvd = formats.includes('dvd');
    if (hasBluray && hasDvd) noteParts.push('BR/DVD');
    else if (hasBluray) noteParts.push('BR');
    if (formats.includes('vhs')) noteParts.push('VHS');
    if (item.extras) noteParts.push(item.extras);
    const notes = noteParts.join(' ');
    const year = item.productionYear ? String(item.productionYear) : '';
    const swedish = item.swedishTitle === item.originalTitle ? '' : (item.swedishTitle || '');
    return [swedish, notes, item.originalTitle, year].join(';');
  });
  return rows.join('\n');
}

export function exportTVSeriesCSV(items: MediaItem[]): string {
  const rows = items.map(item => {
    const ownedSeasons = item.seasons
      ? item.seasons.split(',').map(Number)
      : [];
    const maxSeason = ownedSeasons.length > 0 ? Math.max(...ownedSeasons) : 0;
    const cols = [item.originalTitle];
    for (let s = 1; s <= maxSeason; s++) {
      cols.push(ownedSeasons.includes(s) ? 'x' : '');
    }
    return cols.join(';');
  });
  return rows.join('\n');
}
