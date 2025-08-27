const express = require('express');
const router = express.Router();
// CORREÇÃO: Importe todas as funções necessárias do controlador.
const { getReviewsOverTime, getPerformanceInsights, getAnalyticsSummary } = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Agora as funções são reconhecidas e as rotas funcionarão corretamente.
router.get('/reviews-over-time', getReviewsOverTime);
router.get('/insights', getPerformanceInsights);
router.get('/summary', getAnalyticsSummary);

// Rota antiga que pode ser mantida para compatibilidade ou removida.
// router.get('/reviews-last-7-days', getReviewsLast7Days);

module.exports = router;