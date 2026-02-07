import { getUnenrichedMedia, updateMedia, getUsersWithUnenrichedMedia, getTVSeriesMissingTotalSeasons } from './database';
import { searchTMDB, getTMDBDetails } from './tmdb';
import { MediaItem } from './types';

type Listener = (event: EnrichEvent) => void;

export interface EnrichEvent {
  type: 'progress' | 'done' | 'idle';
  processed: number;
  total: number;
  currentTitle?: string;
}

const listeners = new Set<Listener>();
const pendingUsers = new Set<string>();
let processing = false;
let processed = 0;
let total = 0;

function broadcast(event: EnrichEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

async function applyMatch(item: MediaItem, results: Awaited<ReturnType<typeof searchTMDB>>) {
  const match = item.productionYear > 0
    ? results.find(r => {
        const date = r.release_date || r.first_air_date || '';
        return date.startsWith(String(item.productionYear));
      }) || results[0]
    : results[0];

  if (!match) return;

  const year = match.release_date?.slice(0, 4) || match.first_air_date?.slice(0, 4);
  const updates: Partial<MediaItem> = {
    tmdbId: match.id,
    posterPath: match.poster_path || undefined,
    overview: match.overview || undefined,
  };
  if (item.productionYear === 0 && year) {
    updates.productionYear = parseInt(year);
  }

  if (item.type === 'tv-series') {
    const details = await getTMDBDetails(match.id, 'tv');
    if (details?.number_of_seasons) {
      updates.totalSeasons = details.number_of_seasons;
    }
  }

  updateMedia(item.userId, item.id!, updates);
}

async function drain() {
  if (processing) return;
  processing = true;

  while (pendingUsers.size > 0) {
    const userId = pendingUsers.values().next().value!;
    pendingUsers.delete(userId);

    const items = getUnenrichedMedia(userId);
    if (items.length === 0) continue;

    total = items.length;
    processed = 0;

    for (const item of items) {
      broadcast({ type: 'progress', processed, total, currentTitle: item.originalTitle });

      const tmdbType = item.type === 'tv-series' ? 'tv' : 'movie';
      const results = await searchTMDB(item.originalTitle, tmdbType);
      await applyMatch(item, results);

      processed++;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    broadcast({ type: 'done', processed, total });
  }

  processing = false;
  broadcast({ type: 'idle', processed: 0, total: 0 });
}

export function nudgeQueue(userId: string) {
  pendingUsers.add(userId);
  setTimeout(drain, 100);
}

async function backfillTotalSeasons() {
  const items = getTVSeriesMissingTotalSeasons();
  if (items.length === 0) return;

  console.log(`Backfilling totalSeasons for ${items.length} TV series...`);
  for (const item of items) {
    if (!item.tmdbId) continue;
    const details = await getTMDBDetails(item.tmdbId, 'tv');
    if (details?.number_of_seasons) {
      updateMedia(item.userId, item.id!, { totalSeasons: details.number_of_seasons });
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  console.log('Backfill complete.');
}

export function startQueue() {
  const users = getUsersWithUnenrichedMedia();
  for (const userId of users) {
    pendingUsers.add(userId);
  }
  if (pendingUsers.size > 0) {
    setTimeout(drain, 1000);
  }
  setTimeout(backfillTotalSeasons, 2000);
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  if (processing) {
    listener({ type: 'progress', processed, total });
  } else {
    listener({ type: 'idle', processed: 0, total: 0 });
  }
  return () => listeners.delete(listener);
}
