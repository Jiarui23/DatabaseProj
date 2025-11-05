const { pool } = require('../mysql_db');
const crypto = require('crypto');
const { logAction } = require('./logsController');

// Hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be between 3 and 30 characters' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if username already exists
    const checkUserSql = 'SELECT id FROM anime_hub.Users WHERE username = ?';
    const [existingUsers] = await pool.query(checkUserSql, [username]);

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Insert new user (is_admin defaults to 0/false)
    const insertSql = `
      INSERT INTO anime_hub.Users (username, password, is_admin)
      VALUES (?, ?, 0)
    `;
    const [result] = await pool.query(insertSql, [username, hashedPassword]);

    // Log registration
    logAction(result.insertId, username, 'register', { timestamp: new Date() });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: result.insertId,
        username: username,
        is_admin: false
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: error.message 
    });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // First, get the user by username
    const getUserSql = `
      SELECT id, username, password, is_admin
      FROM anime_hub.Users
      WHERE username = ?
      LIMIT 1
    `;
    const [users] = await pool.query(getUserSql, [username]);

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    const user = users[0];
    const storedPassword = user.password;

    // Check if password matches (support both plain text and hashed)
    const hashedPassword = hashPassword(password);
    const isPasswordValid = (storedPassword === password) || (storedPassword === hashedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Log successful login
    logAction(user.id, user.username, 'login', { 
      timestamp: new Date(),
      isAdmin: user.is_admin === 1 || user.is_admin === true
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin === 1 || user.is_admin === true
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: error.message 
    });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  // Since we're using localStorage on the client side, 
  // logout is handled client-side
  res.json({
    success: true,
    message: 'Logout successful'
  });
}

module.exports = { register, login, logout };
