import express, { Request, Response } from 'express';
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
import { MediaItem } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Movie Database API is running' });
});

// Get all media items
app.get('/api/media', (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const items = getAllMedia(type, search);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
});

// Get single media item
app.get('/api/media/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = getMediaById(id);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media item' });
  }
});

// Add new media item
app.post('/api/media', (req: Request, res: Response) => {
  try {
    const item: MediaItem = req.body;

    // Validate required fields
    if (!item.originalTitle || !item.type || !item.format || !item.productionYear) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const id = addMedia(item);
    const newItem = getMediaById(id);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add media item' });
  }
});

// Update media item
app.put('/api/media/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item: Partial<MediaItem> = req.body;

    const success = updateMedia(id, item);
    if (success) {
      const updatedItem = getMediaById(id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update media item' });
  }
});

// Delete media item
app.delete('/api/media/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteMedia(id);
    if (success) {
      res.json({ message: 'Media item deleted successfully' });
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media item' });
  }
});

// Get statistics
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Search TMDB
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

// Get TMDB details
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

// Import CSV
app.post('/api/import/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const result = await importCSV(fileContent);

    res.json({
      message: `Import completed. ${result.success} items added.`,
      success: result.success,
      errors: result.errors
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client')));

  app.get('*', (req: Request, res: Response) => {
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
