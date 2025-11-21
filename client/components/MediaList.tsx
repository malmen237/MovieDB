import { MediaItem } from '../api';

interface MediaListProps {
  media: MediaItem[];
  loading: boolean;
  onDelete: (id: number) => void;
  onEdit: (item: MediaItem) => void;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  currentPage: number;
  onPageChange: (page: number) => void;
}

function MediaList({ media, loading, onDelete, onEdit, pagination, currentPage, onPageChange }: MediaListProps) {
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

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 7;
    const { totalPages } = pagination;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few enough
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 2);
      let end = Math.min(totalPages - 1, currentPage + 2);

      // Add ellipsis if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add pages around current
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <>
      {/* Pagination info */}
      <div style={{ marginBottom: '20px', color: '#666', fontSize: '0.95rem' }}>
        Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} items
      </div>

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

      {/* Pagination controls */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          <div className="pagination-numbers">
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <button
                  key={index}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </button>
              ) : (
                <span key={index} className="pagination-ellipsis">{page}</span>
              )
            ))}
          </div>

          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!pagination.hasMore}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

export default MediaList;
