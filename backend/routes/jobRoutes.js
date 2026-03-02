const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const { addJob, getAllJobs, applyJob } = require('../controllers/jobController');

const router = express.Router();

router.post('/', authenticate, adminOnly, addJob);
router.get('/', getAllJobs);
router.get('/filter', getAllJobs);
router.post('/:jobId/apply', authenticate, applyJob);

module.exports = router;