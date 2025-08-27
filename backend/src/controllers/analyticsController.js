const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');
const { generateStudyInsight } = require('../services/cohereService');

/**
 * Busca as contagens de revisão diária para um determinado período.
 * A função agora aceita um parâmetro 'range' na query string.
 */
const getReviewsOverTime = async (req, res) => {
    const userId = req.user.id;
    // Pega o 'range' da URL (ex: /api/analytics/reviews-over-time?range=30)
    // O padrão é 7 se nenhum for fornecido.
    const range = parseInt(req.query.range, 10) || 7;

    try {
        // CORREÇÃO CRÍTICA: Chama a função RPC com os dois parâmetros necessários.
        const { data, error } = await supabase.rpc('get_daily_review_counts', {
            user_id_param: userId,
            days_param: range
        });

        if (error) throw error;

        // O restante da lógica para formatar os dados para o gráfico permanece.
        const labels = data.map(d => new Date(d.day).toLocaleDateString('pt-BR', { weekday: 'short' }));
        const counts = data.map(d => d.count);

        res.status(200).json({ labels, counts });
    } catch (error) {
        // Log do erro específico para facilitar a depuração.
        logger.error(`Error in getReviewsOverTime for user ${userId} with range ${range}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar as estatísticas de revisão.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

/**
 * Gera insights de estudo e retorna os baralhos de maior dificuldade.
 */
const getPerformanceInsights = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data: difficultDecks, error } = await supabase.rpc('get_performance_insights', { user_id_param: userId });

        if (error) throw error;

        const insight = await generateStudyInsight(difficultDecks);

        // Retorna tanto o insight da IA quanto a lista de baralhos.
        res.status(200).json({ insight, difficultDecks });
    } catch (error) {
        logger.error(`Error fetching performance insights for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao gerar o insight de desempenho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

// Mantenha a função getReviewsLast7Days original para compatibilidade ou remova se não for mais usada.
const getReviewsLast7Days = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase.rpc('get_daily_review_counts', { user_id_param: userId, days_param: 7 });

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


module.exports = {
    getReviewsLast7Days,
    getPerformanceInsights,
    getReviewsOverTime // Exporte a nova função se for usá-la em uma nova rota
};