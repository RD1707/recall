const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado: nenhum token fornecido.' });
  }

  try {
    // Verificar token JWT do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }

    // Adicionar informações do usuário à requisição
    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    logger.error(`Erro na autenticação: ${error.message}`);
    return res.status(403).json({ error: 'Token inválido.' });
  }
};

module.exports = {
  authenticateToken
};