const supabase = require('../config/supabaseClient');

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

    res.status(201).json({ message: 'Usuário registrado com sucesso! Verifique seu email para confirmação.', user: data.user });
  } catch (err) {
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