import { MediaItem } from '../api';

interface MediaListProps {
  media: MediaItem[];
  loading: boolean;
  onSelect: (item: MediaItem) => void;
}

function SeasonBadges({ seasons, totalSeasons }: { seasons?: string; totalSeasons?: number }) {
  const owned = new Set(
    (seasons || '').split(',').filter(Boolean).map(Number)
  );
  const total = totalSeasons || Math.max(...owned, 0);
  if (total === 0) return null;

  const allSeasons = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="season-badges">
      {allSeasons.map(s => (
        <span key={s} className={`season-badge ${owned.has(s) ? 'owned' : 'missing'}`}>
          S{s}
        </span>
      ))}
    </div>
  );
}

function MediaList({ media, loading, onSelect }: MediaListProps) {
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (media.length === 0) {
    return (
      <div className="empty-state">
        <h3>No items found</h3>
        <p>Try adding some movies or TV series to your collection!</p>
      </div>
    );
  }

  return (
    <div className="media-grid">
      {media.map((item) => (
        <div key={item.id} id={`media-${item.id}`} className="media-card" onClick={() => onSelect(item)}>
          <div className="media-card-header">
            {item.posterPath && (
              <img
                src={item.posterPath}
                alt={item.originalTitle}
                className="media-poster"
              />
            )}
            <div className="media-info">
              <h3 className="media-title">{item.swedishTitle || item.originalTitle}</h3>
              <p className="media-subtitle">{item.originalTitle}</p>
              <div>
                <span className="media-badge">
                  {item.type === 'movie' ? '📽️ Movie' : '📺 TV Series'}
                </span>
                {item.format.split(',').map(f => (
                  <span key={f} className="media-badge">{f.toUpperCase()}</span>
                ))}
                {item.tmdbId && item.tmdbId > 0 && (
                  <a
                    className="btn btn-secondary btn-icon"
                    href={`https://www.themoviedb.org/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on TMDB"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8.667V12.667A1.333 1.333 0 0 1 10.667 14H3.333A1.333 1.333 0 0 1 2 12.667V5.333A1.333 1.333 0 0 1 3.333 4H7.333" />
                      <path d="M10 2H14V6" />
                      <path d="M6.667 9.333L14 2" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="media-details">
            <p><strong>Year:</strong> {item.productionYear}</p>
            {item.director && <p><strong>Director:</strong> {item.director}</p>}
            {item.company && <p><strong>Company:</strong> {item.company}</p>}
            {item.partOf && <p><strong>Part of:</strong> {item.partOf}</p>}
            {item.type === 'tv-series' && (item.seasons || item.totalSeasons) && (
              <SeasonBadges seasons={item.seasons} totalSeasons={item.totalSeasons} />
            )}
            {item.extras && <p><strong>Extras:</strong> {item.extras}</p>}
            {item.overview && (
              <p><strong>Overview:</strong> {item.overview.length > 200 ? item.overview.slice(0, 200) + '...' : item.overview}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MediaList;
