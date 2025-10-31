const { pool } = require('../mysql_db');

// GET /api/anime?q=...
async function listAnime(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const cols = ['anime_id', 'title', 'score'];

    let sql = `SELECT ${cols.join(', ')} FROM anime_hub.anime`;
    const params = [];
    if (q) {
      sql += ' WHERE title LIKE ? OR synopsis LIKE ?';
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY score IS NULL, score DESC, title ASC LIMIT 200';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
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

module.exports = { listAnime, getAnimeById };
