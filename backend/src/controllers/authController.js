const supabase = require('../config/supabaseClient');
const logger = require('../config/logger'); 

const signup = async (req, res) => {
  const { email, password, full_name, username } = req.body;

  if (!email || !password || !full_name || !username) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios: Email, Senha, Nome Completo e Nome de Usuário.' });
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: 'Nome de usuário inválido. Use apenas letras, números e underscore.' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Nome de usuário deve ter entre 3 e 20 caracteres.' });
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Este nome de usuário já está em uso.',
        field: 'username',
        type: 'FIELD_ERROR'
      });
    }
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password
    });

    if (error) {
      if (error.message && (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('email'))) {
        return res.status(400).json({ 
          error: 'Este e-mail já está cadastrado.',
          field: 'email',
          type: 'FIELD_ERROR'
        });
      }
      
      return res.status(400).json({ error: error.message });
    }
    
    if (!data.user) {
      return res.status(400).json({ error: 'Falha ao criar usuário. Verifique se o email já está cadastrado.' });
    }

    const { data: existingProfile, error: checkProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    let savedProfile;
    let profileError;
    
    if (existingProfile) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: full_name.trim() || 'Usuário Recall',
          username: username.trim() || `user-${data.user.id.substring(0, 8)}`,
          points: existingProfile.points || 0,
          current_streak: existingProfile.current_streak || 0
        })
        .eq('id', data.user.id)
        .select()
        .single();
        
      if (updateError) {
        profileError = updateError;
      } else {
        savedProfile = updatedProfile;
      }
    } else {
      const { data: recheckProfile, error: recheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (recheckProfile) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: full_name.trim() || 'Usuário Recall',
            username: username.trim() || `user-${data.user.id.substring(0, 8)}`,
            points: recheckProfile.points || 0,
            current_streak: recheckProfile.current_streak || 0
          })
          .eq('id', data.user.id)
          .select()
          .single();
          
        if (updateError) {
          profileError = updateError;
        } else {
          savedProfile = updatedProfile;
        }
      } else {
        const profileData = {
          id: data.user.id,
          full_name: full_name.trim() || 'Usuário Recall',
          username: username.trim() || `user-${data.user.id.substring(0, 8)}`,
          points: 0,
          current_streak: 0
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
          
        if (insertError) {
          profileError = insertError;
        } else {
          savedProfile = newProfile;
        }
      }
    }

    if (profileError) {
      try {
        await supabase.auth.admin.deleteUser(data.user.id);
      } catch (deleteError) {
        // Ignore deletion errors
      }

      if (profileError.code === '23505') {
        if (profileError.message && profileError.message.includes('username')) {
          return res.status(400).json({ 
            error: 'Este nome de usuário já está em uso.',
            field: 'username',
            type: 'FIELD_ERROR'
          });
        }
        return res.status(400).json({ error: 'Username ou email já está em uso.' });
      }
      
      if (profileError.code === '23514') {
        return res.status(400).json({ error: 'Dados inválidos. Verifique se todos os campos foram preenchidos corretamente.' });
      }

      return res.status(400).json({ 
        error: 'Erro ao criar perfil do usuário. Por favor, tente novamente.',
        details: profileError.message 
      });
    }

    res.status(201).json({ 
      message: 'Usuário registrado com sucesso! Verifique seu email para confirmação.', 
      user: {
        id: data.user.id,
        email: data.user.email,
        username: username,
        full_name: full_name
      }
    });
    
  } catch (err) {
    logger.error(`Erro inesperado no signup: ${err.message}`);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao criar conta.',
      details: err.message 
    });
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

    if (!data.session) {
      return res.status(400).json({ error: 'Falha ao criar sessão.' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, full_name, points, current_streak')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({ 
      message: 'Login bem-sucedido!', 
      session: data.session,
      user: {
        ...data.user,
        username: profile?.username || '',
        full_name: profile?.full_name || '',
        points: profile?.points || 0,
        current_streak: profile?.current_streak || 0
      }
    });
  } catch (err) {
    logger.error(`Erro no login: ${err.message}`);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const checkGoogleProfile = async (req, res) => {
  const { userId, email, fullName, avatarUrl } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'User ID e email são obrigatórios.' });
  }

  try {
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }

    if (existingProfile && existingProfile.username && existingProfile.full_name) {
      return res.status(200).json({ 
        hasProfile: true,
        profile: existingProfile
      });
    }

    return res.status(200).json({ 
      hasProfile: false,
      existingProfile: existingProfile || null
    });

  } catch (err) {
    logger.error(`Erro ao verificar perfil Google: ${err.message}`);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const completeGoogleProfile = async (req, res) => {
  const { userId, fullName, username, email, avatarUrl } = req.body;

  if (!userId || !fullName || !username || !email) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ 
      error: 'Nome de usuário inválido. Use apenas letras, números e underscore.',
      field: 'username',
      type: 'FIELD_ERROR'
    });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ 
      error: 'Nome de usuário deve ter entre 3 e 20 caracteres.',
      field: 'username',
      type: 'FIELD_ERROR'
    });
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .neq('id', userId)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Este nome de usuário já está em uso.',
        field: 'username',
        type: 'FIELD_ERROR'
      });
    }

    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let savedProfile;

    if (existingProfile) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
          points: existingProfile.points || 0,
          current_streak: existingProfile.current_streak || 0
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === '23505' && updateError.message.includes('username')) {
          return res.status(400).json({
            error: 'Este nome de usuário já está em uso.',
            field: 'username',
            type: 'FIELD_ERROR'
          });
        }
        return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
      }

      savedProfile = updatedProfile;
    } else {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          full_name: fullName.trim(),
          username: username.trim(),
          points: 0,
          current_streak: 0
        }])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505' && insertError.message.includes('username')) {
          return res.status(400).json({
            error: 'Este nome de usuário já está em uso.',
            field: 'username',
            type: 'FIELD_ERROR'
          });
        }
        return res.status(500).json({ error: 'Erro ao criar perfil.' });
      }

      savedProfile = newProfile;
    }

    res.status(200).json({
      message: 'Perfil completado com sucesso!',
      profile: savedProfile
    });

  } catch (err) {
    logger.error(`Erro ao completar perfil Google: ${err.message}`);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  signup,
  login,
  checkGoogleProfile,
  completeGoogleProfile,
};