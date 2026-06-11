const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trucode_jwt_secret_key_123456';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'trucode_jwt_refresh_secret_key_789012';

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, department: user.department },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
