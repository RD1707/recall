const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');
const { generateStudyInsight } = require('../services/cohereService');

const getReviewsLast7Days = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase.rpc('get_daily_review_counts', { user_id_param: userId });

        if (error) throw error;

        const labels = [];
        const counts = [];
        const date = new Date();
        date.setDate(date.getDate() - 6);

        for (let i = 0; i < 7; i++) {
            const dayString = date.toISOString().split('T')[0];
            const foundDay = data.find(d => d.day === dayString);
            labels.push(new Date(dayString).toLocaleDateString('pt-BR', { weekday: 'short' }));
            counts.push(foundDay ? foundDay.count : 0);
            date.setDate(date.getDate() + 1);
        }

        res.status(200).json({ labels, counts });
    } catch (error) {
        logger.error(`Error fetching last 7 days analytics for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar as estatísticas.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const getPerformanceInsights = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase.rpc('get_performance_insights', { user_id_param: userId });

        if (error) throw error;

        const insight = await generateStudyInsight(data);

        res.status(200).json({ insight });
    } catch (error) {
        logger.error(`Error fetching performance insights for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao gerar o insight de desempenho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = { getReviewsLast7Days, getPerformanceInsights };