const express = require('express');
const router = express.Router();
const { getReviewsLast7Days } = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/reviews-last-7-days', getReviewsLast7Days);
router.get('/insights', getPerformanceInsights);

module.exports = router;