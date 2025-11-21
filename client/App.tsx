import { useState, useEffect, useCallback } from 'react';
import { api, MediaItem, Stats } from './api';
import MediaList from './components/MediaList';
import MediaForm from './components/MediaForm';
import ImportCSV from './components/ImportCSV';

type View = 'all' | 'movies' | 'tv-series' | 'add' | 'import';

function App() {
  const [view, setView] = useState<View>('all');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<Stats>({ movies: 0, tvSeries: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const type = view === 'movies' ? 'movie' : view === 'tv-series' ? 'tv-series' : undefined;
      const items = await api.getMedia(type, search);
      setMedia(items);
    } catch (err) {
      setError('Failed to load media items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [view, search]);

  const loadStats = useCallback(async () => {
    try {
      const stats = await api.getStats();
      setStats(stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadMedia();
    loadStats();
  }, [loadMedia, loadStats]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.deleteMedia(id);
      await loadMedia();
      await loadStats();
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  const handleEdit = (item: MediaItem) => {
    setEditingItem(item);
    setView('add');
  };

  const handleSave = async () => {
    setEditingItem(null);
    setView('all');
    await loadMedia();
    await loadStats();
  };

  const handleCancel = () => {
    setEditingItem(null);
    setView('all');
  };

  const handleImportComplete = async () => {
    await loadMedia();
    await loadStats();
    setView('all');
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>Movie Database</h1>
          <div className="stats">
            <div className="stat-item">
              <span>📽️ Movies:</span>
              <strong>{stats.movies}</strong>
            </div>
            <div className="stat-item">
              <span>📺 TV Series:</span>
              <strong>{stats.tvSeries}</strong>
            </div>
            <div className="stat-item">
              <span>📚 Total:</span>
              <strong>{stats.total}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="nav">
          <button
            className={view === 'all' ? 'active' : ''}
            onClick={() => setView('all')}
          >
            All Items
          </button>
          <button
            className={view === 'movies' ? 'active' : ''}
            onClick={() => setView('movies')}
          >
            Movies
          </button>
          <button
            className={view === 'tv-series' ? 'active' : ''}
            onClick={() => setView('tv-series')}
          >
            TV Series
          </button>
          <button
            className={view === 'add' ? 'active' : ''}
            onClick={() => {
              setEditingItem(null);
              setView('add');
            }}
          >
            Add New
          </button>
          <button
            className={view === 'import' ? 'active' : ''}
            onClick={() => setView('import')}
          >
            Import CSV
          </button>
        </div>

        {error && (
          <div className="message message-error">
            {error}
          </div>
        )}

        {view === 'add' && (
          <MediaForm
            item={editingItem}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {view === 'import' && (
          <ImportCSV onComplete={handleImportComplete} />
        )}

        {view !== 'add' && view !== 'import' && (
          <>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by title or collection..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <MediaList
              media={media}
              loading={loading}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
