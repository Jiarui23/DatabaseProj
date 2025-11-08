const { pool } = require('../mysql_db');
const { logAction } = require('./logsController');

// Helpers
function sanitizeUser(input) {
  const s = (input || '').trim();
  if (!s) return 'Anonymous';
  // limit length
  return s.slice(0, 60);
}

function normalizeScore(input) {
  if (input === undefined || input === null || input === '') return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  // Accept 0..10 (some datasets use 0), clamp to [0,10]
  return Math.max(0, Math.min(10, Math.round(n)));
}

function sanitizeReviewText(input) {
  const s = (input || '').trim();
  // Minimal validation: require some non-empty text
  if (!s) return '';
  // Limit size to avoid abuse (e.g., 5000 chars)
  return s.slice(0, 5000);
}

// GET /api/anime/:id/reviews
async function listReviews(req, res) {
  try {
    const animeId = req.params.id;

    const sql = `
      SELECT id, anime_id,
             \`username\` AS \`user\`,
             \`score\`, \`review\`,
             DATE_FORMAT(\`post_date\`, '%Y-%m-%d') AS postDate,
             TIME_FORMAT(\`post_time\`, '%H:%i:%s') AS postTime
        FROM anime_hub.\`review\`
       WHERE \`anime_id\` = ?
       ORDER BY \`post_date\` DESC, \`post_time\` DESC
       LIMIT 200`;

    const [rows] = await pool.query(sql, [animeId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('listReviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews', error: error.message });
  }
}

// POST /api/anime/:id/reviews  { user, score, review }
async function createReview(req, res) {
  try {
    const animeId = req.params.id;
    const username = sanitizeUser(req.body?.user);
    const score = normalizeScore(req.body?.score);
    const reviewText = sanitizeReviewText(req.body?.review);

    if (!reviewText) {
      return res.status(400).json({ success: false, message: 'Review text is required' });
    }

    const insertSql = `
      INSERT INTO anime_hub.\`review\` (\`anime_id\`, \`username\`, \`score\`, \`review\`, \`post_date\`, \`post_time\`)
      VALUES (?, ?, ?, ?, CURDATE(), CURTIME())
    `;
    const [result] = await pool.query(insertSql, [animeId, username, score, reviewText]);

    const id = result.insertId;
    const selectSql = `
      SELECT id, anime_id, \`username\` AS \`user\`, \`score\`, \`review\`,
             DATE_FORMAT(\`post_date\`, '%Y-%m-%d') AS postDate,
             TIME_FORMAT(\`post_time\`, '%H:%i:%s') AS postTime
        FROM anime_hub.\`review\`
       WHERE id = ?
       LIMIT 1`;
    const [rows] = await pool.query(selectSql, [id]);

    // Log review creation
    logAction(null, username, 'add_review', { 
      animeId, 
      reviewId: id,
      score 
    });

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('createReview error:', error);
    res.status(500).json({ success: false, message: 'Failed to create review', error: error.message });
  }
}

// DELETE /api/reviews/:id
// Body should include: { userId, isAdmin, username }
async function deleteReview(req, res) {
  try {
    const reviewId = req.params.id;
    const { userId, isAdmin, username } = req.body;

    // Check if user is logged in
    if (!userId || !username) {
      return res.status(401).json({ 
        success: false, 
        message: 'You must be logged in to delete reviews' 
      });
    }

    // Get the review to check ownership
    const getReviewSql = 'SELECT id, username FROM anime_hub.`review` WHERE id = ?';
    const [reviews] = await pool.query(getReviewSql, [reviewId]);

    if (reviews.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const review = reviews[0];

    // Check permissions: either admin or the review owner
    if (!isAdmin && review.username !== username) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own reviews' 
      });
    }

    // Delete the review
    const delSql = 'DELETE FROM anime_hub.`review` WHERE id = ?';
    const [result] = await pool.query(delSql, [reviewId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    
    // Log review deletion
    logAction(userId, username, 'delete_review', { 
      reviewId,
      isAdmin 
    });
    
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('deleteReview error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review', error: error.message });
  }
}

// PUT /api/reviews/:id
// Body should include: { userId, username, score, review }
async function updateReview(req, res) {
  try {
    const reviewId = req.params.id;
    const { userId, username, score, review: reviewText } = req.body;

    // Check if user is logged in
    if (!userId || !username) {
      return res.status(401).json({ 
        success: false, 
        message: 'You must be logged in to edit reviews' 
      });
    }

    // Validate review text
    const sanitizedReview = sanitizeReviewText(reviewText);
    if (!sanitizedReview) {
      return res.status(400).json({ success: false, message: 'Review text is required' });
    }

    const normalizedScore = normalizeScore(score);

    // Get the review to check ownership AND existence (integrity constraint)
    const getReviewSql = 'SELECT id, username FROM anime_hub.`review` WHERE id = ?';
    const [reviews] = await pool.query(getReviewSql, [reviewId]);

    if (reviews.length === 0) {
      return res.status(410).json({ 
        success: false, 
        message: 'Review no longer exists. It may have been deleted by an admin.',
        code: 'REVIEW_DELETED'
      });
    }

    const existingReview = reviews[0];

    // Check permissions: only the review owner can edit
    if (existingReview.username !== username) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only edit your own reviews' 
      });
    }

    // Update the review
    const updateSql = `
      UPDATE anime_hub.\`review\`
      SET \`score\` = ?, \`review\` = ?
      WHERE id = ?
    `;
    const [result] = await pool.query(updateSql, [normalizedScore, sanitizedReview, reviewId]);
    
    if (result.affectedRows === 0) {
      return res.status(410).json({ 
        success: false, 
        message: 'Review no longer exists. It may have been deleted by an admin.',
        code: 'REVIEW_DELETED'
      });
    }

    // Get updated review
    const selectSql = `
      SELECT id, anime_id, \`username\` AS \`user\`, \`score\`, \`review\`,
             DATE_FORMAT(\`post_date\`, '%Y-%m-%d') AS postDate,
             TIME_FORMAT(\`post_time\`, '%H:%i:%s') AS postTime
        FROM anime_hub.\`review\`
       WHERE id = ?
       LIMIT 1`;
    const [updatedRows] = await pool.query(selectSql, [reviewId]);
    
    // Log review edit
    logAction(userId, username, 'edit_review', { 
      reviewId,
      score: normalizedScore
    });
    
    res.json({ 
      success: true, 
      message: 'Review updated successfully',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('updateReview error:', error);
    res.status(500).json({ success: false, message: 'Failed to update review', error: error.message });
  }
}

module.exports = { listReviews, createReview, deleteReview, updateReview };
