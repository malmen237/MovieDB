import { useState, useEffect } from 'react';
import { api } from '../api';

interface TMDBSearchProps {
  type?: string;
  initialQuery?: string;
  onSelect: (data: any) => void;
  onClose: () => void;
}

function TMDBSearch({ type, initialQuery, onSelect, onClose }: TMDBSearchProps) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const search = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const searchType = type === 'tv-series' ? 'tv' : type === 'movie' ? 'movie' : undefined;
      const data = await api.searchTMDB(searchQuery, searchType);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) search(initialQuery);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const handleSelect = (result: any) => {
    setSelectedId(result.id);
    onSelect(result);
  };

  return (
    <div className="tmdb-search">
      <div className="search-bar" style={{ justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3>Search The Movie Database (TMDB)</h3>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search for a movie or TV show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
                <div style={{ width: '100%', height: '250px', background: '#2e2e44', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#5a5a70' }}>
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
