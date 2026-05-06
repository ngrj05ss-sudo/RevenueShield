const express = require('express');
const router = express.Router();
const { runDistribution, getDistributions } = require('../controllers/distributionController');
const { isAdmin, restrictTo } = require('../middleware/authMiddleware');

router.use(isAdmin);

router.get('/', restrictTo('admin'), runDistribution);
router.get('/history', restrictTo('admin'), getDistributions);

module.exports = router;
