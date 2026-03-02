const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { saveAssessment, getProfileAnalysis } = require('../controllers/assessmentController');

const router = express.Router();

router.post('/', authenticate, saveAssessment);
router.get('/profile-analysis', authenticate, getProfileAnalysis);

module.exports = router;