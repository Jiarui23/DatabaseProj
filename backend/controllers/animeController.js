const { pool } = require('../mysql_db');
const { logAction } = require('./logsController');
const { getCachedSearch, cacheSearchResults, getCachedAnime, cacheAnimeData } = require('./cacheController');

// GET /api/anime?q=...&userId=...&username=...
async function listAnime(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const userId = req.query.userId || null;
    const username = req.query.username || 'anonymous';
    
    // Check cache for search results (if query exists)
    if (q) {
      const cachedResults = await getCachedSearch(q);
      if (cachedResults) {
        // Log search action
        logAction(userId, username, 'search', { 
          query: q, 
          resultsCount: cachedResults.length,
          fromCache: true 
        });
        return res.json({ success: true, data: cachedResults, cached: true });
      }
    }
    
    const cols = ['a.anime_id', 'a.title', 'a.score'];

    let sql = `SELECT DISTINCT ${cols.join(', ')} FROM anime_hub.anime a`;
    const params = [];
    
    if (q) {
      // Join with genre tables to search by genre name as well
      sql += `
        LEFT JOIN anime_hub.anime_genre ag ON a.anime_id = ag.anime_id
        LEFT JOIN anime_hub.genre g ON ag.genre_id = g.genre_id
        WHERE (
          a.title LIKE ? OR 
          a.synopsis LIKE ? OR 
          LOWER(g.name) LIKE LOWER(?)
        )
      `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    
    // Sort by best rank first; put rows without a rank at the bottom
    sql += ' ORDER BY a.score_rank IS NULL, a.score_rank ASC, a.title ASC LIMIT 200';

    const [rows] = await pool.query(sql, params);
    
    // Format the results to remove the table alias from keys
    const formattedRows = rows.map(row => ({
      anime_id: row.anime_id,
      title: row.title,
      score: row.score
    }));
    
    // Cache search results (if query exists) - 30 minutes TTL
    if (q) {
      await cacheSearchResults(q, formattedRows, 30);
      logAction(userId, username, 'search', { 
        query: q, 
        resultsCount: formattedRows.length,
        fromCache: false 
      });
    }
    
    res.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Database error (listAnime):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime list', error: error.message });
  }
}

// GET /api/anime/:id?userId=...&username=...
async function getAnimeById(req, res) {
  try {
    const id = req.params.id;
    const userId = req.query.userId || null;
    const username = req.query.username || 'anonymous';
    
    // Check cache first
    const cachedData = await getCachedAnime(id);
    if (cachedData) {
      // Log anime view action
      logAction(userId, username, 'view_anime', { 
        animeId: id, 
        animeTitle: cachedData.title,
        fromCache: true
      });
      return res.json({ success: true, data: cachedData, cached: true });
    }
    
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
    
    // Cache anime data - 60 minutes TTL
    await cacheAnimeData(id, rows[0], 60);
    
    // Log anime view action
    logAction(userId, username, 'view_anime', { 
      animeId: id, 
      animeTitle: rows[0].title,
      fromCache: false
    });
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Database error (getAnimeById):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime', error: error.message });
  }
}

// exports are defined at the bottom to include all controller functions
 
// GET /api/anime/:id/genres
async function listGenresForAnime(req, res) {
  try {
    const id = req.params.id;
    const sql = `
      SELECT g.genre_id, g.name AS name
      FROM anime_hub.anime_genre AS ag
      INNER JOIN anime_hub.genre AS g ON g.genre_id = ag.genre_id
      WHERE ag.anime_id = ?
      ORDER BY g.name ASC
    `;
    const [rows] = await pool.query(sql, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database error (listGenresForAnime):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch genres', error: error.message });
  }
}

module.exports = { listAnime, getAnimeById, listGenresForAnime };
