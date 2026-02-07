import { useState, useEffect, useCallback } from 'react';
import { api, MediaItem, Stats } from '../api';

export function useMediaData(view: string, debouncedSearch: string, user: string) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<Stats>({ movies: 0, tvSeries: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const type = view === 'movies' ? 'movie' : view === 'tv-series' ? 'tv-series' : undefined;
        const [items, s] = await Promise.all([
          api.getMedia(type, debouncedSearch),
          api.getStats(),
        ]);
        if (!cancelled) {
          setMedia(items);
          setStats(s);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load media items');
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [view, debouncedSearch, user, refreshCount]);

  const refresh = useCallback(() => {
    setRefreshCount(c => c + 1);
  }, []);

  return { media, stats, loading, error, setError, refresh };
}
