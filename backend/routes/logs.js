const express = require('express');
const router = express.Router();
const { logUserAction, getUserLogs, getActivityStats } = require('../controllers/logsController');

// Log a user action
router.post('/logs', logUserAction);

// Get user logs
router.get('/logs', getUserLogs);

// Get activity statistics
router.get('/logs/stats', getActivityStats);

module.exports = router;
