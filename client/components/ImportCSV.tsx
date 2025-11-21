import { useState } from 'react';
import { api } from '../api';
import { IMPORT_SUCCESS_DELAY } from '../constants';

interface ImportCSVProps {
  onComplete: () => void;
}

function ImportCSV({ onComplete }: ImportCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

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
      const data = await api.importCSV(file);
      setResult(data);

      if (data.success > 0) {
        setTimeout(() => {
          onComplete();
        }, IMPORT_SUCCESS_DELAY);
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

  const downloadTemplate = () => {
    const template = `type,originalTitle,swedishTitle,company,director,format,productionYear,extras,partOf
movie,The Lord of the Rings: The Fellowship of the Ring,Sagan om ringen: Härskarringen,New Line Cinema,Peter Jackson,bluray,2001,Extended Edition,The Lord of the Rings
movie,The Matrix,Matrix,Warner Bros.,The Wachowskis,dvd,1999,Special Features,
tv-series,Breaking Bad,Breaking Bad,AMC,Vince Gilligan,bluray,2008,Complete Series,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moviedb_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="import-section">
      <h2>Import from CSV</h2>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ marginBottom: '10px' }}>
          Upload a CSV file with your movie and TV series data. The CSV should have the following columns:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px', lineHeight: '1.8' }}>
          <li><strong>type</strong>: "movie" or "tv-series" (required)</li>
          <li><strong>originalTitle</strong>: The original title (required)</li>
          <li><strong>swedishTitle</strong>: Swedish title (optional)</li>
          <li><strong>company</strong>: Production company (optional)</li>
          <li><strong>director</strong>: Director name (optional)</li>
          <li><strong>format</strong>: "bluray", "dvd", or "other" (required)</li>
          <li><strong>productionYear</strong>: Year of production (required)</li>
          <li><strong>extras</strong>: Special features (optional)</li>
          <li><strong>partOf</strong>: Collection name (optional)</li>
        </ul>
        <button className="btn btn-secondary" onClick={downloadTemplate}>
          Download CSV Template
        </button>
      </div>

      <div className="file-input-wrapper">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          id="csv-file"
        />
        <label htmlFor="csv-file">
          {file ? (
            <div>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>📄 {file.name}</p>
              <p style={{ color: '#666' }}>Click to choose a different file</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>📤 Drop CSV file here or click to browse</p>
              <p style={{ color: '#666' }}>Supported format: .csv</p>
            </div>
          )}
        </label>
      </div>

      {file && (
        <div style={{ marginTop: '20px' }}>
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
        <div style={{ marginTop: '20px' }}>
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
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ marginBottom: '10px', color: '#742a2a' }}>Errors:</h4>
              <ul style={{ marginLeft: '20px', fontSize: '0.9rem', color: '#742a2a' }}>
                {result.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImportCSV;
