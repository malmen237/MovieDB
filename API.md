# API Documentation

## Media Endpoints

- `GET /api/media` - Get all media (supports ?type=movie|tv-series, ?search=query, ?page=N, ?limit=N)
- `GET /api/media/:id` - Get single item
- `POST /api/media` - Create item (requires: originalTitle, type, format, productionYear)
- `PUT /api/media/:id` - Update item
- `DELETE /api/media/:id` - Delete item
- `GET /api/stats` - Get counts (movies, tvSeries, total)

## TMDB Endpoints

- `GET /api/tmdb/search?q=query&type=movie|tv` - Search TMDB
- `GET /api/tmdb/:type/:id` - Get TMDB details (type: movie|tv)

## Import

- `POST /api/import/csv` - Upload CSV file (multipart/form-data with 'file' field)

## Rate Limiting

- 100 requests per 15 minutes per IP

## Error Responses

- `400` - Bad request / validation error
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Server error

All endpoints return JSON. Successful responses have data, errors have {error: "message"}.
