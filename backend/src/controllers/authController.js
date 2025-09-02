const supabase = require('../config/supabaseClient');
const logger = require('../config/logger'); 

const signup = async (req, res) => {
  const { email, password, full_name, username } = req.body;

  // Validações
  if (!email || !password || !full_name || !username) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios: Email, Senha, Nome Completo e Nome de Usuário.' });
  }

  // Validar formato do username (apenas letras, números e underscore)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: 'Nome de usuário inválido. Use apenas letras, números e underscore.' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Nome de usuário deve ter entre 3 e 20 caracteres.' });
  }

  try {
    console.log("Dados recebidos no backend:", { email, full_name, username });
    
    // 1. Verificar se o username já existe
    console.log("Verificando se username já existe...");
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      console.log("Username já existe:", username);
      return res.status(400).json({ 
        error: 'Este nome de usuário já está em uso.',
        field: 'username',
        type: 'FIELD_ERROR'
      });
    }
    
    console.log("Username disponível, criando usuário no Supabase Auth...");
    
    // 2. Criar usuário no Supabase Auth (sem metadata para evitar conflitos)
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password
    });

    if (error) {
      console.error("Erro do Supabase Auth:", error);
      
      // Verificar se é erro de email duplicado
      if (error.message && (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('email'))) {
        return res.status(400).json({ 
          error: 'Este e-mail já está cadastrado.',
          field: 'email',
          type: 'FIELD_ERROR'
        });
      }
      
      return res.status(400).json({ error: error.message });
    }
    
    // IMPORTANTE: O Supabase pode retornar sucesso mesmo sem criar o usuário em alguns casos
    if (!data.user) {
      return res.status(400).json({ error: 'Falha ao criar usuário. Verifique se o email já está cadastrado.' });
    }

    // 3. Verificar se o perfil já existe (pode ter sido criado automaticamente)
    console.log("Verificando se perfil já existe para user.id:", data.user.id);
    
    const { data: existingProfile, error: checkProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    let savedProfile;
    let profileError;
    
    if (existingProfile) {
      console.log("Perfil já existe, atualizando dados:", existingProfile);
      // Perfil já existe, vamos atualizá-lo com os dados corretos
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
        console.error("Erro ao atualizar perfil:", updateError);
        profileError = updateError;
      } else {
        savedProfile = updatedProfile;
        console.log("Perfil atualizado com sucesso:", savedProfile);
      }
    } else {
      console.log("Perfil não existe, criando novo...");
      
      // Verificar novamente se o perfil foi criado entre a verificação e agora
      console.log("Verificando novamente se perfil foi criado automaticamente...");
      const { data: recheckProfile, error: recheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (recheckProfile) {
        console.log("Perfil foi criado automaticamente durante o processo:", recheckProfile);
        // Perfil foi criado automaticamente, vamos atualizá-lo
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
          console.error("Erro ao atualizar perfil criado automaticamente:", updateError);
          profileError = updateError;
        } else {
          savedProfile = updatedProfile;
          console.log("Perfil atualizado com sucesso:", savedProfile);
        }
      } else {
        // Garantir que os campos não estão vazios para satisfazer as constraints
        const profileData = {
          id: data.user.id,
          full_name: full_name.trim() || 'Usuário Recall',
          username: username.trim() || `user-${data.user.id.substring(0, 8)}`,
          points: 0,
          current_streak: 0
        };

        console.log("Dados do perfil a serem inseridos:", profileData);
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
          
        if (insertError) {
          console.error("Erro ao criar perfil:", insertError);
          profileError = insertError;
        } else {
          savedProfile = newProfile;
          console.log("Perfil criado com sucesso:", savedProfile);
        }
      }
    }


    if (profileError) {
      console.error("Erro ao criar perfil:", profileError);
      
      // Se falhar ao criar o perfil, tentar deletar o usuário
      // Nota: Isso requer permissões de admin. Se não tiver, registre o erro
      try {
        // Este método pode não funcionar sem service_role key
        await supabase.auth.admin.deleteUser(data.user.id);
      } catch (deleteError) {
        console.error("Não foi possível reverter a criação do usuário:", deleteError);
      }

      // Verificar se é erro de constraint
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

      console.log("Enviando resposta de erro para o frontend...");
      return res.status(400).json({ 
        error: 'Erro ao criar perfil do usuário. Por favor, tente novamente.',
        details: profileError.message 
      });
    }

    console.log("Signup concluído com sucesso! Enviando resposta para o frontend...");

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
    console.error("Erro inesperado no signup:", err);
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
      console.error("Erro no login:", error);
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({ error: 'Falha ao criar sessão.' });
    }

    // Buscar dados do perfil incluindo username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, full_name, points, current_streak')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error("Erro ao buscar perfil:", profileError);
      // Continuar mesmo sem o perfil, mas avisar
    }

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
    console.error("Erro inesperado no login:", err);
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
    console.log("Verificando perfil Google para user:", userId);

    // Verificar se o perfil já existe
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Erro ao verificar perfil:", checkError);
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }

    if (existingProfile && existingProfile.username && existingProfile.full_name) {
      // Perfil já existe e está completo
      console.log("Perfil Google já existe e está completo:", existingProfile);
      return res.status(200).json({ 
        hasProfile: true,
        profile: existingProfile
      });
    }

    // Perfil não existe ou está incompleto
    console.log("Perfil Google não existe ou está incompleto");
    return res.status(200).json({ 
      hasProfile: false,
      existingProfile: existingProfile || null
    });

  } catch (err) {
    console.error("Erro inesperado ao verificar perfil Google:", err);
    logger.error(`Erro ao verificar perfil Google: ${err.message}`);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const completeGoogleProfile = async (req, res) => {
  const { userId, fullName, username, email, avatarUrl } = req.body;

  // Validações
  if (!userId || !fullName || !username || !email) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  // Validar formato do username
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
    console.log("Completando perfil Google para user:", userId);

    // 1. Verificar se o username já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .neq('id', userId) // Excluir o próprio usuário
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Este nome de usuário já está em uso.',
        field: 'username',
        type: 'FIELD_ERROR'
      });
    }

    // 2. Verificar se o perfil já existe
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let savedProfile;

    if (existingProfile) {
      // Atualizar perfil existente
      console.log("Atualizando perfil Google existente");
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
        console.error("Erro ao atualizar perfil:", updateError);
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
      // Criar novo perfil
      console.log("Criando novo perfil Google");
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
        console.error("Erro ao criar perfil:", insertError);
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

    console.log("Perfil Google completado com sucesso:", savedProfile);

    res.status(200).json({
      message: 'Perfil completado com sucesso!',
      profile: savedProfile
    });

  } catch (err) {
    console.error("Erro inesperado ao completar perfil Google:", err);
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