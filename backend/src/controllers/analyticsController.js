const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');
const { generateStudyInsight } = require('../services/cohereService');

const getReviewsOverTime = async (req, res) => {
    const userId = req.user.id;
    const range = parseInt(req.query.range, 10) || 7;

    try {
        const { data, error } = await supabase.rpc('get_daily_review_counts', {
            user_id_param: userId,
            days_param: range
        });

        if (error) throw error;

        const labels = data.map(d => new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
        const counts = data.map(d => d.count);

        res.status(200).json({ labels, counts });
    } catch (error) {
        logger.error(`Error in getReviewsOverTime for user ${userId} with range ${range}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar as estatísticas de revisão.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const getAnalyticsSummary = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase.rpc('get_analytics_summary', { user_id_param: userId });

        if (error) throw error;
        
        res.status(200).json(data[0] || {
            total_reviews: 0,
            average_accuracy: 0,
            mastered_cards: 0,
            max_streak: 0
        });
    } catch (error) {
        logger.error(`Error fetching analytics summary for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar o resumo das estatísticas.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const getPerformanceInsights = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data: difficultDecks, error } = await supabase.rpc('get_performance_insights', { user_id_param: userId });

        if (error) throw error;

        const insight = await generateStudyInsight(difficultDecks);

        res.status(200).json({ insight, difficultDecks });
    } catch (error) {
        logger.error(`Error fetching performance insights for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao gerar o insight de desempenho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = {
    getPerformanceInsights,
    getReviewsOverTime,
    getAnalyticsSummary
};