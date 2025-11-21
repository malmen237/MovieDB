# Movie Database

A full-stack TypeScript application for managing your personal movie and TV series collection. Built with Node.js, Express, SQLite, React, and integrated with The Movie Database (TMDB) API.

## Features

- **Add Movies and TV Series**: Manually add items with detailed information
- **TMDB Integration**: Search and auto-fill information from The Movie Database
- **CSV Import**: Bulk import your collection from Excel/CSV files
- **Search and Filter**: Find items by title, collection, type (movie/TV series)
- **Track Details**:
  - Original and Swedish titles
  - Director and production company
  - Format (Blu-ray, DVD, or other)
  - Production year
  - Special features/extras
  - Collection membership (e.g., "Lord of the Rings trilogy")
- **Statistics Dashboard**: View counts of movies, TV series, and total items

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MovieDB
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up TMDB API key:
   - Visit https://www.themoviedb.org/settings/api
   - Create a free account and get your API key
   - Create a `.env` file in the root directory:
   ```
   TMDB_API_KEY=your_api_key_here
   ```

   Note: The application works without TMDB API key, but you won't be able to search and auto-fill movie information.

## Running the Application

### Development Mode

Run both the server and client in development mode:

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Build

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## CSV Import Format

To import your existing collection from Excel or Google Sheets:

1. Export your spreadsheet as CSV
2. Ensure it has these columns (in any order):

| Column | Required | Values |
|--------|----------|--------|
| type | Yes | "movie" or "tv-series" |
| originalTitle | Yes | Any text |
| format | Yes | "bluray", "dvd", or "other" |
| productionYear | Yes | Year (number) |
| swedishTitle | No | Any text |
| company | No | Any text |
| director | No | Any text |
| extras | No | Any text |
| partOf | No | Collection name |

3. Use the "Import CSV" feature in the application

### Example CSV

```csv
type,originalTitle,swedishTitle,company,director,format,productionYear,extras,partOf
movie,The Lord of the Rings: The Fellowship of the Ring,Sagan om ringen: Härskarringen,New Line Cinema,Peter Jackson,bluray,2001,Extended Edition,The Lord of the Rings
movie,The Matrix,Matrix,Warner Bros.,The Wachowskis,dvd,1999,Special Features,
tv-series,Breaking Bad,Breaking Bad,AMC,Vince Gilligan,bluray,2008,Complete Series,
```

You can also download a CSV template directly from the Import page in the application.

## Project Structure

```
MovieDB/
├── client/                 # React frontend
│   ├── components/        # React components
│   ├── App.tsx           # Main app component
│   ├── api.ts            # API client
│   └── index.css         # Styles
├── server/                # Node.js backend
│   ├── server.ts         # Express server
│   ├── database.ts       # SQLite database operations
│   ├── tmdb.ts          # TMDB API integration
│   ├── csvImport.ts     # CSV import logic
│   └── types.ts         # TypeScript types
├── package.json
└── README.md
```

## API Endpoints

### Media Operations
- `GET /api/media` - Get all media items (supports ?type=movie|tv-series and ?search=query)
- `GET /api/media/:id` - Get specific media item
- `POST /api/media` - Add new media item
- `PUT /api/media/:id` - Update media item
- `DELETE /api/media/:id` - Delete media item
- `GET /api/stats` - Get collection statistics

### TMDB Integration
- `GET /api/tmdb/search?q=query&type=movie|tv` - Search TMDB
- `GET /api/tmdb/:type/:id` - Get TMDB details

### Import
- `POST /api/import/csv` - Import CSV file (multipart/form-data)

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **External API**: The Movie Database (TMDB)
- **File Processing**: csv-parse for CSV import
- **File Upload**: Multer

## Database Schema

The application uses SQLite with a single `media` table:

```sql
CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('movie', 'tv-series')),
  originalTitle TEXT NOT NULL,
  swedishTitle TEXT,
  company TEXT,
  director TEXT,
  format TEXT NOT NULL CHECK(format IN ('bluray', 'dvd', 'other')),
  productionYear INTEGER NOT NULL,
  extras TEXT,
  partOf TEXT,
  tmdbId INTEGER,
  posterPath TEXT,
  overview TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
