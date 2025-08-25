const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');

// Retorna o número de revisões feitas nos últimos 7 dias
const getReviewsLast7Days = async (req, res) => {
    const userId = req.user.id;
    try {
        // Esta função RPC precisa ser criada no Supabase
        const { data, error } = await supabase.rpc('get_daily_review_counts', { user_id_param: userId });

        if (error) throw error;

        // Formata os dados para o gráfico
        const labels = [];
        const counts = [];
        const date = new Date();
        date.setDate(date.getDate() - 6); // Começa há 6 dias

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

module.exports = { getReviewsLast7Days };