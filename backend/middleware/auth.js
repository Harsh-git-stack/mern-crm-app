const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('_id role active');
    if (!user || user.active === false) {
      return res.status(401).json({ msg: 'Account is unavailable' });
    }

    req.user = {
      id: user.id,
      role: user.role || 'user',
    };
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    console.error('Authentication middleware error:', err.message);
    return res.status(500).json({ msg: 'Authentication could not be verified' });
  }
};
