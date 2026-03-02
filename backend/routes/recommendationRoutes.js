const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const {
  getRecommendations,
  reindexRecommendations,
  getReindexStatus
} = require('../controllers/recommendationController');

const router = express.Router();

router.post('/ai', authenticate, getRecommendations);
router.post('/reindex', authenticate, adminOnly, reindexRecommendations);
router.get('/reindex/status', authenticate, adminOnly, getReindexStatus);

module.exports = router;
