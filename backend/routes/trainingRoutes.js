const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const {
  addCourse,
  getCourses,
  assignCourse,
  updateCourseCompletion,
  generateSixMonthTrainingPlan,
  getTrainingPlan,
  addWorkshop,
  getWorkshops,
  assignWorkshop,
  updateWorkshopCompletion,
  getCompletionProgress
} = require('../controllers/trainingController');

const router = express.Router();

router.post('/courses', authenticate, adminOnly, addCourse);
router.get('/courses', getCourses);
router.post('/courses/assign', authenticate, adminOnly, assignCourse);
router.patch('/courses/assignments/:assignmentId/completion', authenticate, updateCourseCompletion);

router.post('/plans/:userId/generate', authenticate, adminOnly, generateSixMonthTrainingPlan);
router.get('/plans/:userId', authenticate, getTrainingPlan);

router.post('/workshops', authenticate, adminOnly, addWorkshop);
router.get('/workshops', getWorkshops);
router.post('/workshops/assign', authenticate, adminOnly, assignWorkshop);
router.patch('/workshops/assignments/:assignmentId/completion', authenticate, updateWorkshopCompletion);

router.get('/progress/:userId', authenticate, getCompletionProgress);

module.exports = router;