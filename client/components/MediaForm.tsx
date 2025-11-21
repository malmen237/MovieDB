import { useState, useEffect } from 'react';
import { api, MediaItem } from '../api';
import { TMDBSearchResult } from '../../shared/types';
import TMDBSearch from './TMDBSearch';

interface MediaFormProps {
  item: MediaItem | null;
  onSave: () => void;
  onCancel: () => void;
}

function MediaForm({ item, onSave, onCancel }: MediaFormProps) {
  const [formData, setFormData] = useState<Partial<MediaItem>>({
    type: 'movie',
    format: 'bluray',
    productionYear: new Date().getFullYear(),
    originalTitle: '',
    swedishTitle: '',
    company: '',
    director: '',
    extras: '',
    partOf: '',
    overview: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTMDBSearch, setShowTMDBSearch] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.originalTitle || !formData.productionYear) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (item?.id) {
        await api.updateMedia(item.id, formData);
        setSuccess('Item updated successfully!');
      } else {
        await api.addMedia(formData as MediaItem);
        setSuccess('Item added successfully!');
      }

      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      setError('Failed to save item');
      console.error(err);
    }
  };

  const handleTMDBSelect = (tmdbData: TMDBSearchResult) => {
    const yearString = tmdbData.release_date || tmdbData.first_air_date || '';
    const year = yearString ? parseInt(yearString.substring(0, 4)) : formData.productionYear;

    setFormData({
      ...formData,
      originalTitle: tmdbData.title || tmdbData.name || formData.originalTitle,
      productionYear: !isNaN(year as number) ? year : formData.productionYear,
      overview: tmdbData.overview || formData.overview,
      posterPath: tmdbData.poster_path || formData.posterPath,
      tmdbId: tmdbData.id
    });
    setShowTMDBSearch(false);
  };

  return (
    <div className="form">
      <h2>{item ? 'Edit Item' : 'Add New Item'}</h2>

      {error && <div className="message message-error">{error}</div>}
      {success && <div className="message message-success">{success}</div>}

      {!showTMDBSearch && (
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowTMDBSearch(true)}
          >
            Search TMDB for Movie/TV Info
          </button>
        </div>
      )}

      {showTMDBSearch && (
        <TMDBSearch
          type={formData.type}
          onSelect={handleTMDBSelect}
          onClose={() => setShowTMDBSearch(false)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Type *</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'movie' | 'tv-series' })
              }
            >
              <option value="movie">Movie</option>
              <option value="tv-series">TV Series</option>
            </select>
          </div>

          <div className="form-group">
            <label>Format *</label>
            <select
              value={formData.format}
              onChange={(e) =>
                setFormData({ ...formData, format: e.target.value as 'bluray' | 'dvd' | 'other' })
              }
            >
              <option value="bluray">Blu-ray</option>
              <option value="dvd">DVD</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Production Year *</label>
            <input
              type="number"
              value={formData.productionYear}
              onChange={(e) =>
                setFormData({ ...formData, productionYear: parseInt(e.target.value) })
              }
              min="1800"
              max={new Date().getFullYear() + 5}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Original Title *</label>
          <input
            type="text"
            value={formData.originalTitle}
            onChange={(e) =>
              setFormData({ ...formData, originalTitle: e.target.value })
            }
            required
          />
        </div>

        <div className="form-group">
          <label>Swedish Title</label>
          <input
            type="text"
            value={formData.swedishTitle}
            onChange={(e) =>
              setFormData({ ...formData, swedishTitle: e.target.value })
            }
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Director</label>
            <input
              type="text"
              value={formData.director}
              onChange={(e) =>
                setFormData({ ...formData, director: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label>Part of Collection (e.g., "Lord of the Rings")</label>
          <input
            type="text"
            value={formData.partOf}
            onChange={(e) =>
              setFormData({ ...formData, partOf: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Extras/Special Features</label>
          <textarea
            value={formData.extras}
            onChange={(e) =>
              setFormData({ ...formData, extras: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Overview/Description</label>
          <textarea
            value={formData.overview}
            onChange={(e) =>
              setFormData({ ...formData, overview: e.target.value })
            }
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {item ? 'Update' : 'Add'} Item
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default MediaForm;
