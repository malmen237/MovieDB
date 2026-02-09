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
