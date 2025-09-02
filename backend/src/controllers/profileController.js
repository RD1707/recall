const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');
const { z } = require('zod');

const profileUpdateSchema = z.object({
    full_name: z.string().min(3, 'O nome completo deve ter pelo menos 3 caracteres.').optional().nullable(),
    username: z.string()
        .min(3, 'O nome de usuário deve ter pelo menos 3 caracteres.')
        .max(20, 'O nome de usuário deve ter no máximo 20 caracteres.')
        .regex(/^[a-zA-Z0-9_]+$/, 'Nome de usuário deve conter apenas letras, números e underscore.')
        .optional(),
    password: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.').optional(),
}).strict();


const getProfile = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('points, current_streak, full_name, username')
            .eq('id', req.user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            logger.warn(`Perfil não encontrado para o usuário ${req.user.id}. Retornando perfil padrão.`);
            return res.status(200).json({ 
                points: 0, 
                current_streak: 0, 
                full_name: '', 
                username: '',
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

const updateProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const { full_name, username, password } = profileUpdateSchema.parse(req.body);
        let profileDataToUpdate = {};
        
        // Se estiver atualizando o username, verificar se já existe
        if (username) {
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', userId)
                .single();

            if (existingUser) {
                return res.status(400).json({ 
                    message: 'Este nome de usuário já está em uso.', 
                    code: 'USERNAME_TAKEN' 
                });
            }
            
            profileDataToUpdate.username = username;
        }
        
        // Atualizar senha se fornecida
        if (password) {
            const { error: authError } = await supabase.auth.updateUser({ password });
            if (authError) throw new Error(`Erro ao atualizar senha: ${authError.message}`);
        }

        // Atualizar full_name se fornecido
        if (full_name !== undefined) {
            profileDataToUpdate.full_name = full_name;
        }
        
        // Atualizar profile se houver dados para atualizar
        if (Object.keys(profileDataToUpdate).length > 0) {
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

// Nova função para buscar perfil por username (útil para rankings e gamificação)
const getProfileByUsername = async (req, res) => {
    const { username } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, full_name, points, current_streak')
            .eq('username', username)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' });
        }
        
        res.status(200).json(data);

    } catch (error) {
        logger.error(`Error fetching profile by username ${username}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar perfil.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

// Nova função para buscar ranking de usuários
const getLeaderboard = async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, full_name, points, current_streak')
            .order('points', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        
        res.status(200).json(data);

    } catch (error) {
        logger.error(`Error fetching leaderboard: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar ranking.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = { 
    getProfile, 
    updateProfile,
    getProfileByUsername,
    getLeaderboard
};