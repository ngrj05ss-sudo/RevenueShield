const User = require('../models/User');

/**
 * Protect routes - ensures user is logged in
 */
exports.protect = async (req, res, next) => {
  if (!req.session.userId) {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Please log in to access this resource' });
    }
    return res.redirect('/auth/login');
  }
  
  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.redirect('/auth/login');
  }

  req.user = user;
  res.locals.user = user; // Make user available in EJS
  next();
};

/**
 * Role-based restriction
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      return res.status(403).render('error', { 
        title: 'Access Denied', 
        statusCode: 403, 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};

/**
 * Legacy support for simulation (can be removed later)
 */
exports.isAdmin = (req, res, next) => {
  if (req.session.role === 'admin' || req.query.admin === 'true') {
    req.user = req.user || { role: 'admin' };
    return next();
  }
  req.user = req.user || { role: 'creator' };
  next();
};
