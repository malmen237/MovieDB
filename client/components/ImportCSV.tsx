import { useState } from 'react';
import { api } from '../api';

interface ImportCSVProps {
  onComplete: () => void;
}

function ImportCSV({ onComplete }: ImportCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [csvFormat, setCsvFormat] = useState<'movies' | 'tv-series'>('movies');
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await api.importCSV(file, csvFormat);
      setResult(data);

      if (data.success > 0) {
        setTimeout(() => {
          onComplete();
        }, 3000);
      }
    } catch (err) {
      setResult({
        success: 0,
        errors: ['Failed to import CSV file']
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import-section">
      <h2>Import from CSV</h2>

      <div>
        <div>
          <label className="import-format-label">What are you importing?</label>
          <select
            className="import-format-select"
            value={csvFormat}
            onChange={(e) => setCsvFormat(e.target.value as 'movies' | 'tv-series')}
          >
            <option value="movies">Movies</option>
            <option value="tv-series">TV Series</option>
          </select>
        </div>

        <div className="import-info-box">
          {csvFormat === 'movies' ? (
            <>
              <p>Expected columns (no header row):</p>
              <ul>
                <li><strong>Column 1</strong>: Swedish title</li>
                <li><strong>Column 2</strong>: Extras / notes (optional)</li>
                <li><strong>Column 3</strong>: Original title</li>
                <li><strong>Column 4</strong>: Release year (optional)</li>
              </ul>
            </>
          ) : (
            <>
              <p>Expected columns (no header row):</p>
              <ul>
                <li><strong>Column 1</strong>: Title</li>
                <li><strong>Column 2+</strong>: Season numbers (e.g. 1, 2, 3...)</li>
              </ul>
            </>
          )}
        </div>
      </div>

      <div
        className="file-input-wrapper"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped && dropped.name.endsWith('.csv')) {
            setFile(dropped);
            setResult(null);
          }
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          id="csv-file"
        />
        <label htmlFor="csv-file">
          {file ? (
            <div>
              <p>{file.name}</p>
              <p>Click to choose a different file</p>
            </div>
          ) : (
            <div>
              <p>Drop CSV file here or click to browse</p>
              <p>Supported format: .csv</p>
            </div>
          )}
        </label>
      </div>

      {file && (
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
        </div>
      )}

      {result && (
        <div>
          {result.success > 0 ? (
            <div className="message message-success">
              Successfully imported {result.success} items!
              {result.errors.length > 0 && ` (${result.errors.length} errors)`}
            </div>
          ) : (
            <div className="message message-error">
              Import failed. No items were added.
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="import-info-box">
              <p><strong>Errors:</strong></p>
              <ul>
                {result.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="export-section">
        <h2>Export to CSV</h2>
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={async () => {
              setExportStatus(null);
              try {
                await api.exportMoviesCSV();
                setExportStatus({ type: 'success', message: 'Movies CSV exported!' });
              } catch {
                setExportStatus({ type: 'error', message: 'Failed to export movies.' });
              }
            }}
          >
            Export Movies CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              setExportStatus(null);
              try {
                await api.exportTVSeriesCSV();
                setExportStatus({ type: 'success', message: 'TV Series CSV exported!' });
              } catch {
                setExportStatus({ type: 'error', message: 'Failed to export TV series.' });
              }
            }}
          >
            Export TV Series CSV
          </button>
        </div>
        {exportStatus && (
          <div>
            <div className={`message message-${exportStatus.type}`}>
              {exportStatus.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportCSV;
