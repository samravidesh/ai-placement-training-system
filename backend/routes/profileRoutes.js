const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const {
  saveMyProfile,
  getMyProfile,
  getProfileCompletion,
  completeOnboarding,
  getAllProfiles
} = require('../controllers/profileController');

const router = express.Router();

router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, saveMyProfile);
router.get('/completion', authenticate, getProfileCompletion);
router.patch('/onboarding-complete', authenticate, completeOnboarding);
router.get('/all', authenticate, adminOnly, getAllProfiles);

module.exports = router;
