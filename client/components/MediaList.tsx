import { MediaItem } from '../api';

interface MediaListProps {
  media: MediaItem[];
  loading: boolean;
  onDelete: (id: number) => void;
  onEdit: (item: MediaItem) => void;
}

function MediaList({ media, loading, onDelete, onEdit }: MediaListProps) {
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
        <div key={item.id} className="media-card">
          <div className="media-card-header">
            {item.posterPath && (
              <img
                src={item.posterPath}
                alt={item.originalTitle}
                className="media-poster"
              />
            )}
            <div className="media-info">
              <h3 className="media-title">{item.originalTitle}</h3>
              {item.swedishTitle && (
                <p className="media-subtitle">{item.swedishTitle}</p>
              )}
              <div>
                <span className="media-badge">
                  {item.type === 'movie' ? '📽️ Movie' : '📺 TV Series'}
                </span>
                <span className="media-badge">
                  {item.format.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="media-details">
            <p><strong>Year:</strong> {item.productionYear}</p>
            {item.director && <p><strong>Director:</strong> {item.director}</p>}
            {item.company && <p><strong>Company:</strong> {item.company}</p>}
            {item.partOf && <p><strong>Part of:</strong> {item.partOf}</p>}
            {item.extras && <p><strong>Extras:</strong> {item.extras}</p>}
            {item.overview && (
              <p><strong>Overview:</strong> {item.overview}</p>
            )}
          </div>

          <div className="media-actions">
            <button
              className="btn btn-secondary"
              onClick={() => onEdit(item)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger"
              onClick={() => onDelete(item.id!)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MediaList;
