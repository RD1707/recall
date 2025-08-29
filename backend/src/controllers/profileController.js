const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');
const { z } = require('zod');

// ... (o schema de validação permanece o mesmo)
const profileUpdateSchema = z.object({
    full_name: z.string().min(3, 'O nome completo deve ter pelo menos 3 caracteres.').optional().nullable(),
    password: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.').optional(),
}).strict();


const getProfile = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('points, current_streak, full_name')
            .eq('id', req.user.id)
            .single();

        // ✨ LÓGICA MODIFICADA: Verifica se o erro é porque o perfil não existe
        // O código de erro 'PGRST116' indica que a consulta com .single() não retornou linhas.
        if (error && error.code === 'PGRST116') {
            // Se o perfil não for encontrado, retorna um perfil padrão para o novo usuário.
            logger.warn(`Perfil não encontrado para o usuário ${req.user.id}. Retornando perfil padrão.`);
            return res.status(200).json({ 
                points: 0, 
                current_streak: 0, 
                full_name: '', 
                email: req.user.email 
            });
        }
        
        if (error) throw error;
        
        res.status(200).json({ ...data, email: req.user.email });

    } catch (error) {
        logger.error(`Error fetching profile for user ${req.user.id}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar o perfil do usuário.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

// ... (a função updateProfile permanece a mesma)
const updateProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const { full_name, password } = profileUpdateSchema.parse(req.body);
        let profileDataToUpdate = {};
        
        if (password) {
            const { error: authError } = await supabase.auth.updateUser({ password });
            if (authError) throw new Error(`Erro ao atualizar senha: ${authError.message}`);
        }

        if (full_name || full_name === '') {
            profileDataToUpdate.full_name = full_name;
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileDataToUpdate)
                .eq('id', userId);
            if (profileError) throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
        }
        
        res.status(200).json({ message: 'Perfil atualizado com sucesso!' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Error updating profile for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno ao atualizar o perfil.', code: 'INTERNAL_SERVER_ERROR' });
    }
};


module.exports = { getProfile, updateProfile };