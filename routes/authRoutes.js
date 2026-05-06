const express = require('express');
const router = express.Router();
const { 
  getAdminLogin, 
  getCreatorLogin, 
  getRegister, 
  adminLogin, 
  creatorLogin, 
  register, 
  logout, 
  createAdmin 
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Redirect old login path to the new selection landing page
router.get('/login', (req, res) => res.redirect('/'));

// Admin Auth
router.get('/admin/login', getAdminLogin);
router.post('/admin/login', adminLogin);

// Creator Auth
router.get('/creator/login', getCreatorLogin);
router.post('/creator/login', creatorLogin);

// Registration (Creators only)
router.get('/register', getRegister);
router.post('/register', register);

// Common
router.get('/logout', logout);

// Protected Admin creation (Only admins can create other admins)
router.post('/admin/create', protect, restrictTo('admin'), createAdmin);

module.exports = router;
