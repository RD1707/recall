const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');
const { z } = require('zod');

// Esquema de validação para a atualização do perfil
const profileUpdateSchema = z.object({
    full_name: z.string().min(3, 'O nome completo deve ter pelo menos 3 caracteres.').optional().nullable(),
    password: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.').optional(),
}).strict();


const getProfile = async (req, res) => {
    try {
        // Agora também busca o nome completo do perfil
        const { data, error } = await supabase
            .from('profiles')
            .select('points, current_streak, full_name')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        
        // Adiciona o email do usuário autenticado para conveniência
        res.status(200).json({ ...data, email: req.user.email });

    } catch (error) {
        logger.error(`Error fetching profile for user ${req.user.id}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar o perfil do usuário.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const updateProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const { full_name, password } = profileUpdateSchema.parse(req.body);
        let profileDataToUpdate = {};
        
        // 1. Atualizar a senha no Supabase Auth, se fornecida
        if (password) {
            const { error: authError } = await supabase.auth.updateUser({ password });
            if (authError) throw new Error(`Erro ao atualizar senha: ${authError.message}`);
        }

        // 2. Atualizar o nome completo na tabela 'profiles', se fornecido
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