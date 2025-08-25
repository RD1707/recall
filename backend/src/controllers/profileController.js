const supabase = require('../config/supabaseClient');
const logger = require('../config/logger'); 

const getProfile = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('points, current_streak')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching profile for user ${req.user.id}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar o perfil do usuário.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = { getProfile };