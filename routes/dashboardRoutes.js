const express = require('express');
const router = express.Router();
const { getAdminDashboard, getCreatorPortal, getAdminCreatorView } = require('../controllers/dashboardController');
const { restrictTo } = require('../middleware/authMiddleware');

// Admin Routes
router.get('/admin', restrictTo('admin'), getAdminDashboard);
router.get('/admin/creator/:id', restrictTo('admin'), getAdminCreatorView);

// Creator Routes
router.get('/portal', restrictTo('creator'), getCreatorPortal);

// Default redirect based on role
router.get('/', (req, res) => {
  if (req.user.role === 'admin') return res.redirect('/dashboard/admin');
  res.redirect('/dashboard/portal');
});

module.exports = router;
