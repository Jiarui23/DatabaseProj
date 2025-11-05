require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./mysql_db');
const { connectMongoDB } = require('./mongodb_db');
const reviewsRouter = require('./routes/reviews');
const animeRouter = require('./routes/anime');
const authRouter = require('./routes/auth');
const autocompleteRouter = require('./routes/autocomplete');
const logsRouter = require('./routes/logs');
const cacheRouter = require('./routes/cache');

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
// IMPORTANT: Mount autocomplete BEFORE anime router to avoid :id catching 'autocomplete'
app.use('/api', autocompleteRouter);
app.use('/api', reviewsRouter);
app.use('/api', animeRouter);
app.use('/api', authRouter);
app.use('/api', logsRouter);
app.use('/api', cacheRouter);

// (Anime endpoints moved to routes/anime.js)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`GET http://localhost:${PORT}/api/anime`);
  
  // Connect to MongoDB for logs and caching
  try {
    await connectMongoDB();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    console.log('Server will continue without MongoDB (MySQL still works)');
  }
});
