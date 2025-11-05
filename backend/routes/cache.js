const express = require('express');
const router = express.Router();
const { clearExpiredCache, clearAllCache, getCacheStats } = require('../controllers/cacheController');

// Get cache statistics
router.get('/cache/stats', getCacheStats);

// Clear expired cache entries
router.delete('/cache/expired', clearExpiredCache);

// Clear all cache (use with caution!)
router.delete('/cache/all', clearAllCache);

module.exports = router;
