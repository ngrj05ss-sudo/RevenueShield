const express = require('express');
const router = express.Router();
const { createEngagement, getEngagementByCreator, getAllEngagement } = require('../controllers/engagementController');

router.post('/', createEngagement);
router.get('/', getAllEngagement);
router.get('/:creatorId', getEngagementByCreator);

module.exports = router;
