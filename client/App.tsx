import { useState, useEffect, useRef, useMemo } from 'react';
import { api, MediaItem, getCurrentUser, setCurrentUser } from './api';
import { TMDB_REJECTED_ID } from '../shared/types';
import { SECTION_CONFIG, Section, ALL_SECTIONS } from '../shared/sections';
import { useDebounce } from './hooks/useDebounce';
import { useMediaData } from './hooks/useMediaData';
import { useEnrichmentStream } from './hooks/useEnrichmentStream';
import MediaList from './components/MediaList';
import MediaDetail from './components/MediaDetail';
import MediaForm from './components/MediaForm';
import ImportCSV from './components/ImportCSV';

function App() {
  const [section, setSection] = useState<Section>('video');
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [previousView, setPreviousView] = useState('all');
  const scrollTargetId = useRef<number | null>(null);
  const [user, setUser] = useState(getCurrentUser());
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const userInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [formatFilter, setFormatFilter] = useState<Set<string>>(new Set());
  const [formatMatchAll, setFormatMatchAll] = useState(false);

  const sectionConfig = SECTION_CONFIG[section];

  const { media, stats, loading, error, setError, refresh } = useMediaData(view, debouncedSearch, user, section);

  const filteredMedia = useMemo(() => {
    if (formatFilter.size === 0) return media;
    return media.filter(item => {
      const itemFormats = item.format.split(',');
      if (formatMatchAll) {
        return [...formatFilter].every(f => itemFormats.includes(f));
      }
      return itemFormats.some(f => formatFilter.has(f));
    });
  }, [media, formatFilter, formatMatchAll]);

  const enrichStatus = useEnrichmentStream(refresh);

  useEffect(() => {
    if (!loading && scrollTargetId.current !== null) {
      const el = document.getElementById(`media-${scrollTargetId.current}`);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
      scrollTargetId.current = null;
    }
  }, [loading, media]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSectionSwitch = (newSection: Section) => {
    setSection(newSection);
    setView('all');
    setFormatFilter(new Set());
    setSearch('');
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteMedia(id);
      setEditingItem(null);
      setView(previousView);
      await refresh();
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  const handleDismissTmdb = async (id: number) => {
    try {
      await api.updateMedia(id, { tmdbId: TMDB_REJECTED_ID, posterPath: '', overview: '' });
      if (editingItem?.id === id) {
        setEditingItem({ ...editingItem, tmdbId: TMDB_REJECTED_ID, posterPath: '', overview: '' });
      }
      refresh();
    } catch (err) {
      setError('Failed to dismiss TMDB match');
      console.error(err);
    }
  };

  const handleEdit = (item: MediaItem) => {
    setDetailItem(null);
    setPreviousView(view);
    setEditingItem(item);
    setView('add');
  };

  const handleSave = async () => {
    const itemId = editingItem?.id ?? null;
    setEditingItem(null);
    setView(previousView);
    scrollTargetId.current = itemId;
    await refresh();
  };

  const handleCancel = () => {
    const itemId = editingItem?.id ?? null;
    setEditingItem(null);
    setView(previousView);
    scrollTargetId.current = itemId;
  };

  const applyUser = () => {
    const value = userInputRef.current?.value.trim();
    if (value && value !== user) {
      setCurrentUser(value);
      setUser(value);
    }
  };

  const handleImportComplete = async () => {
    await refresh();
    setView('all');
  };

  const isListView = view !== 'add' && view !== 'csv';

  return (
    <div>
      <div className="header">
        <div className="header-left">
          <span className="header-logo">Media Database</span>
          <div className="section-tabs">
            {ALL_SECTIONS.map(s => (
              <button
                key={s}
                className={`section-tab ${section === s ? 'active' : ''}`}
                onClick={() => handleSectionSwitch(s)}
              >
                {SECTION_CONFIG[s].label}
              </button>
            ))}
          </div>
          <div className="stats">
            {sectionConfig.types.map(t => (
              <div key={t.value} className="stat-item">
                <span>{t.label}:</span>
                <strong>{stats.counts[t.value] || 0}</strong>
              </div>
            ))}
            <div className="stat-item">
              <span>Total:</span>
              <strong>{stats.total}</strong>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="user-switcher">
            <input
              id="user-input"
              ref={userInputRef}
              type="text"
              defaultValue={user}
              onBlur={applyUser}
              onKeyDown={(e) => e.key === 'Enter' && applyUser()}
            />
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
          {sectionConfig.types.map(t => (
            <button
              key={t.value}
              className={view === t.value ? 'active' : ''}
              onClick={() => setView(t.value)}
            >
              {t.label}
            </button>
          ))}
          <div className="add-menu-wrapper" ref={addMenuRef}>
            <button
              className={`add-menu-trigger ${addMenuOpen ? 'open' : ''}`}
              onClick={() => setAddMenuOpen(!addMenuOpen)}
            >
              +
            </button>
            {addMenuOpen && (
              <div className="add-menu-dropdown">
                <button onClick={() => { setEditingItem(null); setView('add'); setAddMenuOpen(false); }}>
                  Add New
                </button>
                {sectionConfig.hasCsvSupport && (
                  <button onClick={() => { setView('csv'); setAddMenuOpen(false); }}>
                    Import / Export CSV
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {section === 'video' && enrichStatus?.type === 'progress' && (
          <div className="message message-info">
            Fetching TMDB info... {enrichStatus.processed}/{enrichStatus.total}
          </div>
        )}

        {error && (
          <div className="message message-error">
            {error}
          </div>
        )}

        {view === 'add' && (
          <MediaForm
            section={section}
            item={editingItem}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onDismissTmdb={handleDismissTmdb}
          />
        )}

        {view === 'csv' && (
          <ImportCSV onComplete={handleImportComplete} />
        )}

        {isListView && (
          <>
            <div className="search-bar">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search by title or collection..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="search-clear"
                    onClick={() => setSearch('')}
                    type="button"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            <div className="format-filter-bar">
              {sectionConfig.formats.map(({ value, label }) => (
                <button
                  key={value}
                  className={`format-filter-btn ${formatFilter.has(value) ? 'active' : ''}`}
                  onClick={() => {
                    setFormatFilter(prev => {
                      const next = new Set(prev);
                      if (next.has(value)) next.delete(value);
                      else next.add(value);
                      return next;
                    });
                  }}
                >
                  {label}
                </button>
              ))}
              <label className={`format-match-all ${formatFilter.size < 2 ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={formatMatchAll}
                  disabled={formatFilter.size < 2}
                  onChange={(e) => setFormatMatchAll(e.target.checked)}
                />
                Match all
              </label>
            </div>

            <MediaList
              media={filteredMedia}
              loading={loading}
              onSelect={setDetailItem}
            />

            {detailItem && (
              <MediaDetail
                item={detailItem}
                onClose={() => setDetailItem(null)}
                onEdit={handleEdit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
