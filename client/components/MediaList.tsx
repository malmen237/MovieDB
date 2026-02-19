import { MediaItem } from '../api';
import { SECTION_CONFIG, getSectionForType } from '../../shared/sections';

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

function getTypeLabel(item: MediaItem): string {
  const section = item.section || getSectionForType(item.type) || 'video';
  const config = SECTION_CONFIG[section];
  const typeOption = config.types.find(t => t.value === item.type);
  return typeOption?.label || item.type;
}

function getDirectorLabel(item: MediaItem): string {
  const section = item.section || getSectionForType(item.type) || 'video';
  return SECTION_CONFIG[section].directorLabel;
}

function MediaList({ media, loading, onSelect }: MediaListProps) {
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (media.length === 0) {
    return (
      <div className="empty-state">
        <h3>No items found</h3>
        <p>Try adding some items to your collection!</p>
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
                <span className="media-badge">{getTypeLabel(item)}</span>
                {item.format.split(',').map(f => (
                  <span key={f} className="media-badge">{f.toUpperCase()}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="media-details">
            <p><strong>Year:</strong> {item.productionYear}</p>
            {item.director && <p><strong>{getDirectorLabel(item)}:</strong> {item.director}</p>}
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
