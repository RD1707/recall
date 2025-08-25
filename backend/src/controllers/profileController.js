const supabase = require('../config/supabaseClient');

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
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getProfile };