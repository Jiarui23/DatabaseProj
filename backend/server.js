const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./mysql_db');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the index page with external CSS/JS
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Mount API routers
app.use('/api', reviewsRouter);

// API endpoint to get anime list data from anime_hub.anime
app.get('/api/anime', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    // Columns inferred from databases/anime_table.csv header
    // Narrow list fields for homepage; details page fetches full record by id
    const cols = [ 'anime_id', 'title', 'score' ];

  let sql = `SELECT ${cols.join(', ')} FROM anime_hub.anime`;
    const params = [];
    if (q) {
      sql += ' WHERE title LIKE ? OR synopsis LIKE ?';
      params.push(`%${q}%`, `%${q}%`);
    }
    // Order by non-null scores first (NULLS LAST), then by score desc, then title asc
    sql += ' ORDER BY score IS NULL, score DESC, title ASC LIMIT 200';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch anime list',
      error: error.message 
    });
  }
});

// API endpoint to get a single anime by id
app.get('/api/anime/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const cols = [
      'anime_id',
      'title',
      'synopsis',
      'type',
      'source_type',
      'num_episodes',
      'status',
      "DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date",
      "DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date",
      'season',
      'score',
      'score_count',
      'score_rank'
    ];
    const sql = `SELECT ${cols.join(', ')} FROM anime_hub.anime WHERE anime_id = ? LIMIT 1`;
    const [rows] = await pool.query(sql, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Anime not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - GET http://localhost:${PORT}/api/anime`);
});
