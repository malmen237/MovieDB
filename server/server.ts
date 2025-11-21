import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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
import {
  validateMediaCreate,
  validateMediaUpdate,
  validateId,
  validateSearch,
  validateTMDBSearch,
  validateTMDBDetails
} from './validators';
import { getAllowedOrigins, validateEnv } from './config';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from './constants';
import logger from './logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Validate environment on startup
validateEnv();

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload config
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true
}));
app.use(express.json());
app.use('/api', limiter);

// Initialize database
initDatabase();

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Movie Database API is running' });
});

// Get all media items (with pagination)
app.get('/api/media', validateSearch, (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || undefined;

    const result = getAllMedia(type, search, page, limit);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching media items', { error });
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
});

// Get single media item
app.get('/api/media/:id', validateId, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = getMediaById(id);

    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    logger.error('Error fetching media item', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch media item' });
  }
});

// Add new media item
app.post('/api/media', validateMediaCreate, (req: Request, res: Response) => {
  try {
    const item: MediaItem = req.body;
    const id = addMedia(item);
    const newItem = getMediaById(id);

    res.status(201).json(newItem);
  } catch (error) {
    logger.error('Error adding media item', { error, body: req.body });
    res.status(500).json({ error: 'Failed to add media item' });
  }
});

// Update media item
app.put('/api/media/:id', validateMediaUpdate, (req: Request, res: Response) => {
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
    logger.error('Error updating media item', { error, id: req.params.id, body: req.body });
    res.status(500).json({ error: 'Failed to update media item' });
  }
});

// Delete media item
app.delete('/api/media/:id', validateId, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteMedia(id);

    if (success) {
      res.json({ message: 'Media item deleted successfully' });
    } else {
      res.status(404).json({ error: 'Media item not found' });
    }
  } catch (error) {
    logger.error('Error deleting media item', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete media item' });
  }
});

// Get statistics
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching statistics', { error });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Search TMDB
app.get('/api/tmdb/search', validateTMDBSearch, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as 'movie' | 'tv' | undefined;

    const results = await searchTMDB(query, type);
    res.json(results);
  } catch (error) {
    logger.error('Error searching TMDB', { error, query: req.query });
    res.status(500).json({ error: 'Failed to search TMDB' });
  }
});

// Get TMDB details
app.get('/api/tmdb/:type/:id', validateTMDBDetails, async (req: Request, res: Response) => {
  try {
    const type = req.params.type as 'movie' | 'tv';
    const id = parseInt(req.params.id);

    const details = await getTMDBDetails(id, type);

    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    logger.error('Error fetching TMDB details', { error, type: req.params.type, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch TMDB details' });
  }
});

// Import CSV
app.post('/api/import/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const result = await importCSV(fileContent);

    res.json({
      message: `Import completed. ${result.success} items added.`,
      success: result.success,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Error importing CSV', { error });
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
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`API available at http://localhost:${PORT}/api`);
});
