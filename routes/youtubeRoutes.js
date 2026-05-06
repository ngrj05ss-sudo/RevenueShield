const express = require('express');
const router = express.Router();
const { getYouTubeStats } = require('../controllers/youtubeController');
const { protect } = require('../middleware/authMiddleware');

// Get top channel stats (Protected, Admin only can access full audit data)
router.get('/stats', protect, getYouTubeStats);

module.exports = router;
