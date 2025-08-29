const supabase = require('../config/supabaseClient');
const logger = require('../config/logger'); 

const signup = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id }]);

      if (profileError) {
        logger.error(`Falha ao criar perfil para o usuário ${data.user.id}: ${profileError.message}`);
        return res.status(500).json({ error: 'A conta foi criada, mas houve um erro ao inicializar o perfil do usuário.' });
      }
    }

    res.status(201).json({ message: 'Usuário registrado com sucesso! Verifique seu email para confirmação.', user: data.user });
  } catch (err) {
    logger.error(`Erro inesperado no signup: ${err.message}`);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Login bem-sucedido!', session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  signup,
  login,
};