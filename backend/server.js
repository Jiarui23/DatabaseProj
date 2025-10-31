const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./mysql_db');

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

// API endpoint to get anime list data from anime_hub.anime
app.get('/api/anime', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    // Columns inferred from databases/anime_table.csv header
    const cols = [
      'anime_id','title','synopsis','type','source_type','num_episodes','status',
      'start_date','end_date','season','score','score_count','score_rank'
    ];

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - GET http://localhost:${PORT}/api/anime`);
});
