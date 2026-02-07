import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import {
  initDatabase,
  getAllMedia,
  getMediaById,
  addMedia,
  updateMedia,
  deleteMedia,
  getStats
} from './database';
import { searchTMDB, getTMDBDetails } from './tmdb';
import { importCSV } from './csvImport';
import { exportMoviesCSV, exportTVSeriesCSV } from './csvExport';
import { MediaItem } from './types';
import { nudgeQueue, startQueue, subscribe } from './enrichQueue';

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

initDatabase();
startQueue();

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Movie Database API is running' });
});

app.get('/api/tmdb/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as 'movie' | 'tv' | undefined;

    if (!query) {
      res.status(400).json({ error: 'Query parameter required' });
      return;
    }

    const results = await searchTMDB(query, type);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search TMDB' });
  }
});

app.get('/api/tmdb/:type/:id', async (req: Request, res: Response) => {
  try {
    const type = req.params.type as 'movie' | 'tv';
    const id = parseInt(req.params.id);

    if (!['movie', 'tv'].includes(type)) {
      res.status(400).json({ error: 'Type must be movie or tv' });
      return;
    }

    const details = await getTMDBDetails(id, type);
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch TMDB details' });
  }
});

app.get('/api/enrich/stream', (_req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const unsubscribe = subscribe((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  _req.on('close', unsubscribe);
});

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user'] as string;
  if (!userId) {
    res.status(401).json({ error: 'X-User header is required' });
    return;
  }
  req.userId = userId;
  next();
});

app.get('/api/media', (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const items = getAllMedia(req.userId, type, search);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
});

app.get('/api/media/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = getMediaById(req.userId, id);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media item' });
  }
});

app.post('/api/media', (req: Request, res: Response) => {
  try {
    const item: MediaItem = { ...req.body, userId: req.userId };

    if (!item.originalTitle || !item.type || !item.format) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const id = addMedia(item);
    const newItem = getMediaById(req.userId, id);
    nudgeQueue(req.userId);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add media item' });
  }
});

app.put('/api/media/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item: Partial<MediaItem> = req.body;

    const success = updateMedia(req.userId, id, item);
    if (success) {
      const updatedItem = getMediaById(req.userId, id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update media item' });
  }
});

app.delete('/api/media/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteMedia(req.userId, id);
    if (success) {
      res.json({ message: 'Media item deleted successfully' });
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media item' });
  }
});

app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = getStats(req.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.get('/api/export/movies', (req: Request, res: Response) => {
  try {
    const items = getAllMedia(req.userId, 'movie');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="movies.csv"');
    res.send(exportMoviesCSV(items));
  } catch (error) {
    res.status(500).json({ error: 'Failed to export movies' });
  }
});

app.get('/api/export/tv-series', (req: Request, res: Response) => {
  try {
    const items = getAllMedia(req.userId, 'tv-series');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tv-series.csv"');
    res.send(exportTVSeriesCSV(items));
  } catch (error) {
    res.status(500).json({ error: 'Failed to export TV series' });
  }
});

app.post('/api/import/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const csvFormat = (req.body.csvFormat as string) || 'movies';
    const result = await importCSV(fileContent, req.userId, csvFormat);
    nudgeQueue(req.userId);

    res.json({
      message: `Import completed. ${result.success} items added.`,
      success: result.success,
      errors: result.errors
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client')));

  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  if (!process.env.TMDB_API_KEY) {
    console.warn('⚠️  TMDB_API_KEY not set. Get one at https://www.themoviedb.org/settings/api');
  }
});
