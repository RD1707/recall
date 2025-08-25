const supabase = require('../config/supabaseClient');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado: nenhum token fornecido.' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }

    req.user = user;

    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor ao validar o token.' });
  }
};

module.exports = authMiddleware;