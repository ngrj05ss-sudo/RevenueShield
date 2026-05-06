const express = require('express');
const router = express.Router();
const { getCreators, createCreator, getCreator, updateCreatorStatus } = require('../controllers/creatorController');
const { restrictTo } = require('../middleware/authMiddleware');

router.get('/', getCreators);
router.post('/', createCreator);
router.get('/:id', getCreator);
router.patch('/:id/status', restrictTo('admin'), updateCreatorStatus);

module.exports = router;
