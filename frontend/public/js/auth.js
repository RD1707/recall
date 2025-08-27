document.addEventListener('DOMContentLoaded', () => {
    // --- SELEÇÃO DE ELEMENTOS DO DOM ---
    const authPanel = document.getElementById('auth-panel');
    const resetPasswordPanel = document.getElementById('reset-password-panel');
    const updatePasswordPanel = document.getElementById('update-password-panel');

    const authForm = document.getElementById('auth-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const updatePasswordForm = document.getElementById('update-password-form');

    const toggleFormLink = document.getElementById('toggle-form-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLinks = document.querySelectorAll('.back-to-login');
    const logoutButton = document.getElementById('logout-button');

    // Elementos da UI
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const toggleText = document.getElementById('toggle-text');
    const authButton = document.getElementById('auth-button');
    const errorMessage = document.getElementById('error-message');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('toggle-password');

    let isLogin = true;

    // --- FUNÇÕES AUXILIARES ---

    /**
     * Mostra um painel específico e esconde os outros.
     * @param {HTMLElement} panelToShow - O painel a ser exibido.
     */
    function showPanel(panelToShow) {
        [authPanel, resetPasswordPanel, updatePasswordPanel].forEach(panel => {
            if (panel) panel.classList.add('hidden');
        });
        if (panelToShow) panelToShow.classList.remove('hidden');
    }

    /**
     * Atualiza a UI do formulário principal para alternar entre Login e Registro.
     */
    function updateAuthFormUI() {
        errorMessage.textContent = '';
        if (isLogin) {
            formTitle.textContent = 'Acesse sua conta';
            formSubtitle.textContent = 'Bem-vindo de volta! Por favor, insira seus dados.';
            authButton.textContent = 'Entrar';
            toggleText.textContent = 'Não tem uma conta?';
            toggleFormLink.textContent = 'Registre-se agora';
            forgotPasswordLink.style.display = 'block';
        } else {
            formTitle.textContent = 'Crie sua conta';
            formSubtitle.textContent = 'É rápido e fácil. Comece a usar o Recall hoje mesmo!';
            authButton.textContent = 'Registrar';
            toggleText.textContent = 'Já tem uma conta?';
            toggleFormLink.textContent = 'Entre agora';
            forgotPasswordLink.style.display = 'none';
        }
    }

    /**
     * Configura a funcionalidade de mostrar/esconder senha.
     */
    function setupPasswordToggle() {
        if (!passwordToggle || !passwordInput) return;

        const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        passwordToggle.innerHTML = eyeIcon;

        passwordToggle.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.innerHTML = eyeOffIcon;
                passwordToggle.setAttribute('aria-label', 'Esconder senha');
            } else {
                passwordInput.type = 'password';
                passwordToggle.innerHTML = eyeIcon;
                passwordToggle.setAttribute('aria-label', 'Mostrar senha');
            }
        });
    }


    // --- EVENT LISTENERS ---

    // Ouve mudanças no estado de autenticação (ex: recuperação de senha)
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showPanel(updatePasswordPanel);
        }
    });

    // Alternar entre Login e Registro
    if (toggleFormLink) {
        toggleFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            updateAuthFormUI();
        });
    }

    // Abrir painel de "Esqueceu a senha"
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPanel(resetPasswordPanel);
        });
    }
    
    // Voltar para o painel de login
    backToLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            isLogin = true;
            updateAuthFormUI();
            showPanel(authPanel);
        });
    });

    // Submissão do formulário de Login/Registro
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = passwordInput.value;
            errorMessage.textContent = '';
            authButton.disabled = true;

            try {
                const { error } = isLogin 
                    ? await _supabase.auth.signInWithPassword({ email, password })
                    : await _supabase.auth.signUp({ email, password });

                if (error) {
                    errorMessage.textContent = error.message;
                } else {
                    if (!isLogin) {
                        showToast('Registro realizado! Verifique seu e-mail para confirmar a conta.', 'success');
                        authForm.reset();
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }
            } finally {
                authButton.disabled = false;
            }
        });
    }

    // Submissão do formulário de Recuperar Senha
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const resetButton = document.getElementById('reset-button');
            resetButton.disabled = true;
            resetButton.textContent = 'A Enviar...';

            try {
                const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + window.location.pathname,
                });
                if (error) {
                    showToast(error.message, 'error');
                } else {
                    showToast('Se o e-mail existir, um link de recuperação foi enviado.', 'success');
                }
            } finally {
                resetButton.disabled = false;
                resetButton.textContent = 'Enviar Link de Recuperação';
            }
        });
    }

    // Submissão do formulário de Atualizar Senha
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const updateButton = document.getElementById('update-button');
            
            if (newPassword.length < 6) {
                showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
                return;
            }

            updateButton.disabled = true;
            updateButton.textContent = 'A Salvar...';

            try {
                const { error } = await _supabase.auth.updateUser({ password: newPassword });
                if (error) {
                    showToast(error.message, 'error');
                } else {
                    showToast('Senha atualizada com sucesso! Pode fazer o login.', 'success');
                    setTimeout(() => {
                        window.location.hash = ''; // Limpa o hash da URL
                        window.location.reload(); // Recarrega a página para o estado de login
                    }, 2000);
                }
            } finally {
                updateButton.disabled = false;
                updateButton.textContent = 'Salvar Nova Senha';
            }
        });
    }
    
    // Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    // --- INICIALIZAÇÃO ---
    // Verifica se a URL já contém o hash para recuperação de senha na carga inicial
    if (window.location.hash.includes('type=recovery')) {
         showPanel(updatePasswordPanel);
    } else {
        showPanel(authPanel);
    }
    updateAuthFormUI();
    setupPasswordToggle();
});