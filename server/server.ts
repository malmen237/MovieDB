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
import { validateMediaItem, validateId, sanitizeSearchQuery } from './validation';
import { generalRateLimiter, writeRateLimiter, importRateLimiter, tmdbRateLimiter } from './rateLimit';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads with size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

// Middleware
// CORS configuration - restrict in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3001'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

// Body parser with size limit to prevent DoS
app.use(express.json({ limit: '1mb' }));

// Apply general rate limiting to all API routes
app.use('/api', generalRateLimiter.middleware());

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

    // Validate type parameter
    if (type && !['movie', 'tv-series'].includes(type)) {
      res.status(400).json({ error: 'Type must be "movie" or "tv-series"' });
      return;
    }

    // Sanitize search query
    const sanitizedSearch = search ? sanitizeSearchQuery(search) : undefined;

    const items = getAllMedia(type, sanitizedSearch);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
});

// Get single media item
app.get('/api/media/:id', (req: Request, res: Response) => {
  try {
    // Validate ID
    const validation = validateId(req.params.id);
    if (!validation.isValid) {
      res.status(400).json({ error: 'Invalid ID', details: validation.errors });
      return;
    }

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
app.post('/api/media', writeRateLimiter.middleware(), (req: Request, res: Response) => {
  try {
    const item: MediaItem = req.body;

    // Comprehensive validation
    const validation = validateMediaItem(item, false);
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
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
app.put('/api/media/:id', writeRateLimiter.middleware(), (req: Request, res: Response) => {
  try {
    // Validate ID
    const idValidation = validateId(req.params.id);
    if (!idValidation.isValid) {
      res.status(400).json({ error: 'Invalid ID', details: idValidation.errors });
      return;
    }

    const id = parseInt(req.params.id);
    const item: Partial<MediaItem> = req.body;

    // Validate item data (for updates, required fields are not enforced)
    const validation = validateMediaItem(item, true);
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }

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
app.delete('/api/media/:id', writeRateLimiter.middleware(), (req: Request, res: Response) => {
  try {
    // Validate ID
    const validation = validateId(req.params.id);
    if (!validation.isValid) {
      res.status(400).json({ error: 'Invalid ID', details: validation.errors });
      return;
    }

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
app.get('/api/tmdb/search', tmdbRateLimiter.middleware(), async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as 'movie' | 'tv' | undefined;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter required' });
      return;
    }

    if (query.length > 200) {
      res.status(400).json({ error: 'Query must be less than 200 characters' });
      return;
    }

    // Validate type if provided
    if (type && !['movie', 'tv'].includes(type)) {
      res.status(400).json({ error: 'Type must be "movie" or "tv"' });
      return;
    }

    const results = await searchTMDB(query, type);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search TMDB' });
  }
});

// Get TMDB details
app.get('/api/tmdb/:type/:id', tmdbRateLimiter.middleware(), async (req: Request, res: Response) => {
  try {
    const type = req.params.type as 'movie' | 'tv';

    if (!['movie', 'tv'].includes(type)) {
      res.status(400).json({ error: 'Type must be movie or tv' });
      return;
    }

    // Validate ID
    const validation = validateId(req.params.id);
    if (!validation.isValid) {
      res.status(400).json({ error: 'Invalid ID', details: validation.errors });
      return;
    }

    const id = parseInt(req.params.id);
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
app.post('/api/import/csv', importRateLimiter.middleware(), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      res.status(400).json({ error: 'Only CSV files are allowed' });
      return;
    }

    // Validate file size (already limited by multer, but double-check)
    if (req.file.size > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File size must be less than 10MB' });
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
    if (error instanceof Error && error.message.includes('File too large')) {
      res.status(413).json({ error: 'File too large. Maximum size is 10MB' });
    } else {
      res.status(500).json({ error: 'Failed to import CSV' });
    }
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
