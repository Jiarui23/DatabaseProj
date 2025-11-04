const { pool } = require('../mysql_db');

// GET /api/anime/autocomplete?q=...
async function autocomplete(req, res) {
  try {
    const q = (req.query.q || '').trim();
    console.log(`[Autocomplete] Query received: "${q}"`);
    
    if (!q || q.length < 2) {
      console.log('[Autocomplete] Query too short, returning empty array');
      return res.json({ success: true, data: [] });
    }

    // Simple query: Only search anime titles
    // Order by ranking (lower score_rank = higher ranked = more popular)
    const sql = `
      SELECT 
        anime_id,
        title,
        score,
        score_rank
      FROM anime_hub.anime
      WHERE title LIKE ?
      ORDER BY 
        score_rank IS NULL,          -- Non-null ranks first
        score_rank ASC,              -- Lower rank = higher priority
        score DESC,                  -- Higher score = better
        title ASC
      LIMIT 10
    `;
    
    const likePattern = `%${q}%`;
    const [rows] = await pool.query(sql, [likePattern]);
    
    console.log(`[Autocomplete] Found ${rows.length} results`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Autocomplete] Database error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch autocomplete suggestions', 
      error: error.message 
    });
  }
}

module.exports = { autocomplete };
