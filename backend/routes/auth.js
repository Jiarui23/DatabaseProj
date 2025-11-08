const express = require('express');
const router = express.Router();
const { register, login, logout, resetPassword } = require('../controllers/authController');

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.post('/auth/reset-password', resetPassword);

module.exports = router;
