import { useState } from 'react';
import { api, ImportPreviewResult, ImportCommitItem, ImportCommitResult } from '../api';
import type { ImportPreviewRow } from '../../shared/types';

interface ImportCSVProps {
  onComplete: () => void;
}

type Phase = 'idle' | 'previewing' | 'preview' | 'committing' | 'done';

function ImportCSV({ onComplete }: ImportCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvFormat, setCsvFormat] = useState<'movies' | 'tv-series'>('movies');
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, 'keep' | 'use-csv'>>({});
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = async (exportFn: () => Promise<void>, successMsg: string, errorMsg: string) => {
    setExportStatus(null);
    try {
      await exportFn();
      setExportStatus({ type: 'success', message: successMsg });
    } catch {
      setExportStatus({ type: 'error', message: errorMsg });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setCommitResult(null);
      setError(null);
      setPhase('idle');
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPhase('previewing');
    setError(null);

    try {
      const result = await api.previewCSV(file, csvFormat);
      setPreview(result);

      const resolutions: Record<number, 'keep' | 'use-csv'> = {};
      for (const conflict of result.conflicts) {
        resolutions[conflict.csvIndex] = 'keep';
      }
      setConflictResolutions(resolutions);

      setPhase('preview');
    } catch {
      setError('Failed to preview CSV file');
      setPhase('idle');
    }
  };

  const handleCommit = async () => {
    if (!preview) return;

    setPhase('committing');
    setError(null);

    const items: ImportCommitItem[] = [];

    for (const row of preview.newItems) {
      items.push({ csvIndex: row.csvIndex, action: 'add', data: row.incoming });
    }

    for (const row of preview.duplicates) {
      items.push({ csvIndex: row.csvIndex, action: 'skip' });
    }

    for (const row of preview.conflicts) {
      const resolution = conflictResolutions[row.csvIndex] || 'keep';
      if (resolution === 'use-csv') {
        items.push({ csvIndex: row.csvIndex, action: 'update', existingId: row.existingId, data: row.incoming });
      } else {
        items.push({ csvIndex: row.csvIndex, action: 'skip' });
      }
    }

    try {
      const result = await api.commitCSVImport(items);
      setCommitResult(result);
      setPhase('done');

      const REDIRECT_MS = 3000;
      if (result.added > 0 || result.updated > 0) {
        setTimeout(() => onComplete(), REDIRECT_MS);
      }
    } catch {
      setError('Failed to commit import');
      setPhase('preview');
    }
  };

  const toggleResolution = (csvIndex: number) => {
    setConflictResolutions(prev => ({
      ...prev,
      [csvIndex]: prev[csvIndex] === 'keep' ? 'use-csv' : 'keep'
    }));
  };

  const renderConflictItem = (row: ImportPreviewRow) => (
    <div key={row.csvIndex} className="import-conflict-item">
      <div className="import-conflict-header">
        <strong>{row.incoming.originalTitle}</strong>
        <div className="import-conflict-toggle">
          <button
            className={`nav button ${conflictResolutions[row.csvIndex] === 'keep' ? 'active' : ''}`}
            onClick={() => toggleResolution(row.csvIndex)}
          >
            {conflictResolutions[row.csvIndex] === 'keep' ? 'Keep existing' : 'Use CSV'}
          </button>
        </div>
      </div>
      {row.diffs?.map(diff => (
        <div key={diff.field} className="import-conflict-diff">
          <span className="import-conflict-field">{diff.field}</span>
          <span className="import-conflict-label">In database:</span>
          <span className="import-conflict-existing">{String(diff.existing ?? '(empty)')}</span>
          <span className="import-conflict-arrow">&rarr;</span>
          <span className="import-conflict-label">In CSV:</span>
          <span className="import-conflict-incoming">{String(diff.incoming ?? '(empty)')}</span>
        </div>
      ))}
    </div>
  );

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
            disabled={phase !== 'idle'}
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
            setPreview(null);
            setCommitResult(null);
            setError(null);
            setPhase('idle');
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

      {error && (
        <div className="message message-error">{error}</div>
      )}

      {file && phase === 'idle' && (
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handlePreview}>
            Import CSV
          </button>
        </div>
      )}

      {phase === 'previewing' && (
        <div className="form-actions">
          <button className="btn btn-primary" disabled>Analyzing...</button>
        </div>
      )}

      {phase === 'preview' && preview && (
        <div className="import-preview">
          <div className="import-preview-summary">
            <span className="import-preview-count import-preview-new">{preview.newItems.length} new</span>
            <span className="import-preview-count import-preview-dup">{preview.duplicates.length} duplicates (skipped)</span>
            <span className="import-preview-count import-preview-conflict">{preview.conflicts.length} conflicts</span>
          </div>

          {preview.warnings && preview.warnings.length > 0 && (
            <div className="import-info-box">
              <p><strong>Warnings:</strong></p>
              <ul>
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.conflicts.length > 0 && (
            <div className="import-conflicts">
              <h3>Resolve conflicts</h3>
              {preview.conflicts.map(renderConflictItem)}
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCommit}>
              Confirm Import
            </button>
            <button className="btn btn-secondary" onClick={() => { setPhase('idle'); setPreview(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'committing' && (
        <div className="form-actions">
          <button className="btn btn-primary" disabled>Importing...</button>
        </div>
      )}

      {phase === 'done' && commitResult && (
        <div>
          <div className="message message-success">
            Import complete: {commitResult.added} added, {commitResult.updated} updated, {commitResult.skipped} skipped.
          </div>
          {commitResult.errors.length > 0 && (
            <div className="import-info-box">
              <p><strong>Errors:</strong></p>
              <ul>
                {commitResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
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
            onClick={() => handleExport(api.exportMoviesCSV, 'Movies CSV exported!', 'Failed to export movies.')}
          >
            Export Movies CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleExport(api.exportTVSeriesCSV, 'TV Series CSV exported!', 'Failed to export TV series.')}
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
