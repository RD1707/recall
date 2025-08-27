const express = require('express');
const router = express.Router();
const { getReviewsLast7Days, getPerformanceInsights } = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/reviews-over-time', getReviewsOverTime);
router.get('/insights', getPerformanceInsights);
router.get('/summary', analyticsController.getAnalyticsSummary);

module.exports = router;