const { pool } = require('../mysql_db');

// GET /api/anime?q=...
async function listAnime(req, res) {
  try {
    const q = (req.query.q || '').trim();
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
    
    res.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Database error (listAnime):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime list', error: error.message });
  }
}

// GET /api/anime/:id
async function getAnimeById(req, res) {
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
