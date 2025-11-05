const { getCollection } = require('../mongodb_db');

/**
 * Log user actions (page views, searches, etc.)
 */
async function logUserAction(req, res) {
  try {
    const { userId, username, action, details } = req.body;
    
    const logsCollection = getCollection('user_logs');
    const logEntry = {
      userId: userId || null,
      username: username || 'anonymous',
      action, // e.g., 'view_anime', 'search', 'add_review', 'login'
      details: details || {},
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    };
    
    await logsCollection.insertOne(logEntry);
    res.json({ success: true, message: 'Action logged' });
  } catch (error) {
    console.error('Error logging action:', error);
    res.status(500).json({ success: false, message: 'Failed to log action' });
  }
}

/**
 * Get user activity logs (for analytics)
 */
async function getUserLogs(req, res) {
  try {
    const { userId, action, limit = 50 } = req.query;
    
    const logsCollection = getCollection('user_logs');
    const filter = {};
    
    if (userId) filter.userId = parseInt(userId);
    if (action) filter.action = action;
    
    const logs = await logsCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .toArray();
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
}

/**
 * Get activity statistics
 */
async function getActivityStats(req, res) {
  try {
    const logsCollection = getCollection('user_logs');
    
    // Get stats for last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stats = await logsCollection.aggregate([
      { $match: { timestamp: { $gte: yesterday } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();
    
    const totalActions = await logsCollection.countDocuments({
      timestamp: { $gte: yesterday },
    });
    
    res.json({
      success: true,
      data: {
        totalActions,
        actionBreakdown: stats,
        period: 'last_24_hours',
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
}

/**
 * Helper function to log actions from other controllers
 */
async function logAction(userId, username, action, details = {}) {
  try {
    const logsCollection = getCollection('user_logs');
    await logsCollection.insertOne({
      userId,
      username: username || 'anonymous',
      action,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log action:', error);
    // Don't throw error - logging failure shouldn't break main functionality
  }
}

module.exports = {
  logUserAction,
  getUserLogs,
  getActivityStats,
  logAction, // Export for use in other controllers
};
