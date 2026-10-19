// ...existing code from peer-evaluation-backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    const err = new Error('No token provided.');
    err.code = 'UNAUTHORIZED';
    err.status = 401;
    return next(err);
  }
  jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key', (err, user) => {
    if (err) {
      const error = new Error('Invalid or expired token.');
      error.code = 'UNAUTHORIZED';
      error.status = 401;
      return next(error);
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
