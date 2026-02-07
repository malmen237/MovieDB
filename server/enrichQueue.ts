import { getUnenrichedMedia, updateMedia, getUsersWithUnenrichedMedia, getTVSeriesMissingTotalSeasons } from './database';
import { searchTMDB, getTMDBDetails } from './tmdb';
import { MediaItem, EnrichEvent } from '../shared/types';

type Listener = (event: EnrichEvent) => void;

const TMDB_RATE_LIMIT_MS = 300;
const NUDGE_DELAY_MS = 100;
const STARTUP_DRAIN_DELAY_MS = 1000;
const STARTUP_BACKFILL_DELAY_MS = 2000;

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
  if (!item.id) return;

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

  updateMedia(item.userId, item.id, updates);
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
      await new Promise(resolve => setTimeout(resolve, TMDB_RATE_LIMIT_MS));
    }

    broadcast({ type: 'done', processed, total });
  }

  processing = false;
  broadcast({ type: 'idle', processed: 0, total: 0 });
}

export function nudgeQueue(userId: string) {
  pendingUsers.add(userId);
  setTimeout(drain, NUDGE_DELAY_MS);
}

async function backfillTotalSeasons() {
  try {
    const items = getTVSeriesMissingTotalSeasons();
    if (items.length === 0) return;

    console.log(`Backfilling totalSeasons for ${items.length} TV series...`);
    for (const item of items) {
      if (!item.tmdbId || !item.id) continue;
      try {
        const details = await getTMDBDetails(item.tmdbId, 'tv');
        if (details?.number_of_seasons) {
          updateMedia(item.userId, item.id, { totalSeasons: details.number_of_seasons });
        }
      } catch (err) {
        console.error(`Failed to backfill ${item.originalTitle}:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, TMDB_RATE_LIMIT_MS));
    }
    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill failed:', err);
  }
}

export function startQueue() {
  const users = getUsersWithUnenrichedMedia();
  for (const userId of users) {
    pendingUsers.add(userId);
  }
  if (pendingUsers.size > 0) {
    setTimeout(drain, STARTUP_DRAIN_DELAY_MS);
  }
  setTimeout(backfillTotalSeasons, STARTUP_BACKFILL_DELAY_MS);
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
