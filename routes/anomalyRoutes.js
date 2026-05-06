const express = require('express');
const router = express.Router();
const { getAnomalies, detectAnomalies, resolveAnomaly, auditCreator } = require('../controllers/anomalyController');
const { isAdmin, restrictTo } = require('../middleware/authMiddleware');

router.use(isAdmin);

router.get('/', restrictTo('admin'), getAnomalies);
router.post('/detect', restrictTo('admin'), detectAnomalies);
router.post('/audit/:creatorId', restrictTo('admin'), auditCreator);
router.put('/:id/resolve', restrictTo('admin'), resolveAnomaly);

module.exports = router;
