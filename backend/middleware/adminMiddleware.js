const { adminEmails } = require('../config/env');

const adminOnly = (req, res, next) => {
  const email = req.user?.email;

  if (!email || !adminEmails.includes(email)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  return next();
};

module.exports = adminOnly;