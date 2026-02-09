import { useEffect, useState } from 'react';
import { api, MediaItem, TMDBDetailsResult } from '../api';

interface MediaDetailProps {
  item: MediaItem;
  onClose: () => void;
  onEdit: (item: MediaItem) => void;
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

const TOP_CAST_COUNT = 8;

function MediaDetail({ item, onClose, onEdit }: MediaDetailProps) {
  const [tmdbDetails, setTmdbDetails] = useState<TMDBDetailsResult | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!item.tmdbId || item.tmdbId <= 0) return;
    let cancelled = false;
    const tmdbType = item.type === 'movie' ? 'movie' : 'tv';
    api.getTMDBDetails(item.tmdbId, tmdbType).then(details => {
      if (!cancelled) setTmdbDetails(details);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [item.tmdbId, item.type]);

  const directors = tmdbDetails?.credits?.crew.filter(c => c.job === 'Director') || [];
  const cast = tmdbDetails?.credits?.cast.slice(0, TOP_CAST_COUNT) || [];
  const countries = tmdbDetails?.production_countries?.map(c => c.name) || [];
  const genres = tmdbDetails?.genres?.map(g => g.name) || [];
  const tmdbSeasons = tmdbDetails?.seasons?.filter(s => s.season_number > 0) || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item.swedishTitle || item.originalTitle}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="detail-top">
            {item.posterPath && (
              <img
                src={item.posterPath}
                alt={item.originalTitle}
                className="detail-poster"
              />
            )}
            <div className="detail-meta">
              {item.swedishTitle && item.swedishTitle !== item.originalTitle && (
                <div className="detail-row">
                  <span className="detail-label">Original Title:</span>
                  <span className="detail-value">{item.originalTitle}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{item.type === 'movie' ? 'Movie' : 'TV Series'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Year:</span>
                <span className="detail-value">{item.productionYear}</span>
              </div>
              {genres.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Genres:</span>
                  <span className="detail-value">{genres.join(', ')}</span>
                </div>
              )}
              {directors.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Director:</span>
                  <span className="detail-value">{directors.map(d => d.name).join(', ')}</span>
                </div>
              )}
              {!directors.length && item.director && (
                <div className="detail-row">
                  <span className="detail-label">Director:</span>
                  <span className="detail-value">{item.director}</span>
                </div>
              )}
              {countries.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Country:</span>
                  <span className="detail-value">{countries.join(', ')}</span>
                </div>
              )}
              {item.company && (
                <div className="detail-row">
                  <span className="detail-label">Company:</span>
                  <span className="detail-value">{item.company}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Format:</span>
                <span className="detail-value">
                  {item.format.split(',').map(f => (
                    <span key={f} className="media-badge">{f.toUpperCase()}</span>
                  ))}
                </span>
              </div>
              {item.partOf && (
                <div className="detail-row">
                  <span className="detail-label">Part of:</span>
                  <span className="detail-value">{item.partOf}</span>
                </div>
              )}
              {item.type === 'tv-series' && (item.seasons || item.totalSeasons) && (
                <div className="detail-row">
                  <span className="detail-label">Owned:</span>
                  <span className="detail-value">
                    <SeasonBadges seasons={item.seasons} totalSeasons={item.totalSeasons} />
                  </span>
                </div>
              )}
              {item.extras && (
                <div className="detail-row">
                  <span className="detail-label">Extras:</span>
                  <span className="detail-value">{item.extras}</span>
                </div>
              )}
            </div>
          </div>

          {cast.length > 0 && (
            <div className="detail-section">
              <h3>Cast</h3>
              <div className="detail-cast-grid">
                {cast.map(member => (
                  <div key={member.id} className="detail-cast-member">
                    {member.profile_path ? (
                      <img src={member.profile_path} alt={member.name} className="detail-cast-photo" />
                    ) : (
                      <div className="detail-cast-photo detail-cast-placeholder" />
                    )}
                    <div>
                      <span className="detail-cast-name">{member.name}</span>
                      <span className="detail-cast-role">{member.character}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tmdbSeasons.length > 0 && (
            <div className="detail-section">
              <h3>Seasons</h3>
              <div className="detail-seasons">
                {tmdbSeasons.map(season => {
                  const owned = (item.seasons || '').split(',').filter(Boolean).map(Number);
                  const isOwned = owned.includes(season.season_number);
                  return (
                    <div key={season.id} className={`detail-season-item ${isOwned ? 'owned' : ''}`}>
                      <div className="detail-season-header">
                        <strong>{season.name}</strong>
                        <span className="detail-season-meta">
                          {season.episode_count} episodes
                          {season.air_date && ` · ${season.air_date.substring(0, 4)}`}
                        </span>
                      </div>
                      {season.overview && (
                        <p className="detail-season-overview">{season.overview}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {item.overview && (
            <div className="detail-section">
              <h3>Overview</h3>
              <p className="detail-overview-text">{item.overview}</p>
            </div>
          )}

          <div className="detail-actions">
            <button className="btn btn-primary" onClick={() => onEdit(item)}>
              Edit
            </button>
            {item.tmdbId && item.tmdbId > 0 && (
              <a
                className="btn btn-secondary"
                href={`https://www.themoviedb.org/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdbId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on TMDB
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaDetail;
