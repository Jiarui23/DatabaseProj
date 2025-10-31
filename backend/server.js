const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./mysql_db');
const reviewsRouter = require('./routes/reviews');
const animeRouter = require('./routes/anime');

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
app.use('/api', animeRouter);

// (Anime endpoints moved to routes/anime.js)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - GET http://localhost:${PORT}/api/anime`);
});
