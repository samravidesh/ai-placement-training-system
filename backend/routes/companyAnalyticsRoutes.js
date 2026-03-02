const express = require('express');
const {
  addCompanyAnalytics,
  getCompanyAnalyticsSummary,
  getCompanyAnalyticsStatistics
} = require('../controllers/companyAnalyticsController');

const router = express.Router();

router.post('/', addCompanyAnalytics);
router.get('/summary', getCompanyAnalyticsSummary);
router.get('/statistics', getCompanyAnalyticsStatistics);

module.exports = router;