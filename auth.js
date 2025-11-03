
const USER = { email: 'admin', password: 'admin' };
const AUTH_KEY = 'ims_logged_in';

function login(email, password) {
  if (email === USER.email && password === USER.password) {
    localStorage.setItem(AUTH_KEY, 'true');
    window.location.href = 'dashboard.html';
  } else {
    showAuthError('Invalid email or password. Try: admin/ admin');
  }
}

function showAuthError(message) {
  const el = document.getElementById('error');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  } else {
    alert(message);
  }
}

function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' });

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Optionally re-load user from DB to get current role/status
    const { rows } = await pool.query('SELECT user_id, username, role FROM "UserAccount" WHERE user_id=$1', [payload.user_id]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid token (user not found)' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    next();
  };
}

module.exports = { authMiddleware, requireRole };

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);