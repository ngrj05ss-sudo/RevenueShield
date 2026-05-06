const express = require('express');
const router = express.Router();
const { createRevenue, getRevenue, updateRevenue, resetRevenue } = require('../controllers/revenueController');
const { isAdmin, restrictTo } = require('../middleware/authMiddleware');

router.use(isAdmin);

router.post('/', restrictTo('admin'), createRevenue);
router.get('/', restrictTo('admin'), getRevenue);
router.put('/:id', restrictTo('admin'), updateRevenue);
router.post('/:id/reset', restrictTo('admin'), resetRevenue);

module.exports = router;
