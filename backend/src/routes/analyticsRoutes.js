const express = require('express');
const router = express.Router();
const { getReviewsOverTime, getPerformanceInsights, getAnalyticsSummary } = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.authenticateToken);

router.get('/reviews-over-time', getReviewsOverTime);
router.get('/insights', getPerformanceInsights);
router.get('/summary', getAnalyticsSummary);


module.exports = router;