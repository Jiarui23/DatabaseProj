const { getCollection } = require('../mongodb_db');

/**
 * Cache anime data with TTL (Time To Live)
 */
async function cacheAnimeData(animeId, data, ttlMinutes = 60) {
  try {
    const cacheCollection = getCollection('anime_cache');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    await cacheCollection.updateOne(
      { animeId: parseInt(animeId) },
      {
        $set: {
          data,
          cachedAt: new Date(),
          expiresAt,
          ttlMinutes,
        },
      },
      { upsert: true } // Create if doesn't exist
    );
    
    return true;
  } catch (error) {
    console.error('Error caching anime data:', error);
    return false;
  }
}

/**
 * Get cached anime data (if not expired)
 */
async function getCachedAnime(animeId) {
  try {
    const cacheCollection = getCollection('anime_cache');
    const cached = await cacheCollection.findOne({
      animeId: parseInt(animeId),
      expiresAt: { $gt: new Date() }, // Not expired
    });
    
    return cached ? cached.data : null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

/**
 * Cache search results
 */
async function cacheSearchResults(query, results, ttlMinutes = 30) {
  try {
    console.log(`[Cache] Caching search results for query: "${query}", ${results.length} results`);
    const cacheCollection = getCollection('search_cache');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    await cacheCollection.updateOne(
      { query: query.toLowerCase() },
      {
        $set: {
          results,
          cachedAt: new Date(),
          expiresAt,
          ttlMinutes,
        },
      },
      { upsert: true }
    );
    
    console.log(`[Cache] Successfully cached search for: "${query}"`);
    return true;
  } catch (error) {
    console.error('Error caching search results:', error);
    return false;
  }
}

/**
 * Get cached search results
 */
async function getCachedSearch(query) {
  try {
    console.log(`[Cache] Checking cache for query: "${query}"`);
    const cacheCollection = getCollection('search_cache');
    const cached = await cacheCollection.findOne({
      query: query.toLowerCase(),
      expiresAt: { $gt: new Date() },
    });
    
    if (cached) {
      console.log(`[Cache] Found cached results for: "${query}", ${cached.results.length} results`);
    } else {
      console.log(`[Cache] No cache found for: "${query}"`);
    }
    
    return cached ? cached.results : null;
  } catch (error) {
    console.error('Error getting cached search:', error);
    return null;
  }
}

/**
 * Clear expired cache entries
 */
async function clearExpiredCache(req, res) {
  try {
    const animeCacheCollection = getCollection('anime_cache');
    const searchCacheCollection = getCollection('search_cache');
    
    const animeResult = await animeCacheCollection.deleteMany({
      expiresAt: { $lte: new Date() },
    });
    
    const searchResult = await searchCacheCollection.deleteMany({
      expiresAt: { $lte: new Date() },
    });
    
    res.json({
      success: true,
      message: 'Expired cache cleared',
      deleted: {
        animeCache: animeResult.deletedCount,
        searchCache: searchResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cache' });
  }
}

/**
 * Clear all cache
 */
async function clearAllCache(req, res) {
  try {
    const animeCacheCollection = getCollection('anime_cache');
    const searchCacheCollection = getCollection('search_cache');
    
    const animeResult = await animeCacheCollection.deleteMany({});
    const searchResult = await searchCacheCollection.deleteMany({});
    
    res.json({
      success: true,
      message: 'All cache cleared',
      deleted: {
        animeCache: animeResult.deletedCount,
        searchCache: searchResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cache' });
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats(req, res) {
  try {
    const animeCacheCollection = getCollection('anime_cache');
    const searchCacheCollection = getCollection('search_cache');
    
    const now = new Date();
    
    const animeStats = {
      total: await animeCacheCollection.countDocuments({}),
      active: await animeCacheCollection.countDocuments({ expiresAt: { $gt: now } }),
      expired: await animeCacheCollection.countDocuments({ expiresAt: { $lte: now } }),
    };
    
    const searchStats = {
      total: await searchCacheCollection.countDocuments({}),
      active: await searchCacheCollection.countDocuments({ expiresAt: { $gt: now } }),
      expired: await searchCacheCollection.countDocuments({ expiresAt: { $lte: now } }),
    };
    
    res.json({
      success: true,
      data: {
        animeCache: animeStats,
        searchCache: searchStats,
      },
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ success: false, message: 'Failed to get cache stats' });
  }
}

module.exports = {
  cacheAnimeData,
  getCachedAnime,
  cacheSearchResults,
  getCachedSearch,
  clearExpiredCache,
  clearAllCache,
  getCacheStats,
};
