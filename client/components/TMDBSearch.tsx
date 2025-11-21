import { useState } from 'react';
import { api } from '../api';
import { TMDBSearchResult } from '../../shared/types';

interface TMDBSearchProps {
  type?: string;
  onSelect: (data: TMDBSearchResult) => void;
  onClose: () => void;
}

function TMDBSearch({ type, onSelect, onClose }: TMDBSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchType = type === 'tv-series' ? 'tv' : type === 'movie' ? 'movie' : undefined;
      const data = await api.searchTMDB(query, searchType);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: TMDBSearchResult) => {
    setSelectedId(result.id);
    onSelect(result);
  };

  return (
    <div className="tmdb-search">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Search The Movie Database (TMDB)</h3>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search for a movie or TV show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="tmdb-results">
          {results.map((result) => (
            <div
              key={result.id}
              className={`tmdb-result ${selectedId === result.id ? 'selected' : ''}`}
              onClick={() => handleSelect(result)}
            >
              {result.poster_path ? (
                <img src={result.poster_path} alt={result.title || result.name} />
              ) : (
                <div style={{ width: '100%', height: '250px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                  No Image
                </div>
              )}
              <h4>{result.title || result.name}</h4>
              <p>{result.release_date || result.first_air_date}</p>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <div className="message message-info">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
}

export default TMDBSearch;
