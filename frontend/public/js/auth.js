document.addEventListener('DOMContentLoaded', () => {
    const authPanel = document.getElementById('auth-panel');
    const resetPasswordPanel = document.getElementById('reset-password-panel');
    const updatePasswordPanel = document.getElementById('update-password-panel');
    
    const authForm = document.getElementById('auth-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const updatePasswordForm = document.getElementById('update-password-form');

    const toggleFormLink = document.getElementById('toggle-form-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const logoutButton = document.getElementById('logout-button');

    const formTitle = document.getElementById('form-title');
    const toggleText = document.getElementById('toggle-text');
    const authButton = document.getElementById('auth-button');
    const errorMessage = document.getElementById('error-message');

    let isLogin = true;

    function showPanel(panelToShow) {
        [authPanel, resetPasswordPanel, updatePasswordPanel].forEach(panel => {
            if (panel) panel.classList.add('hidden');
        });
        if (panelToShow) panelToShow.classList.remove('hidden');

        const isAuthPanel = panelToShow === authPanel;
        toggleText.parentElement.style.display = isAuthPanel ? 'block' : 'none';
    }

    function updateAuthFormUI() {
        errorMessage.textContent = '';
        forgotPasswordLink.style.display = isLogin ? 'block' : 'none';

        if (isLogin) {
            formTitle.textContent = 'Acesse sua conta';
            authButton.textContent = 'Entrar';
            toggleText.textContent = 'Não tem uma conta?';
            toggleFormLink.textContent = 'Registre-se agora';
        } else {
            formTitle.textContent = 'Crie sua conta';
            authButton.textContent = 'Registrar';
            toggleText.textContent = 'Já tem uma conta?';
            toggleFormLink.textContent = 'Entre agora';
        }
    }

    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showPanel(updatePasswordPanel);
        }
    });

    if (toggleFormLink) {
        toggleFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            updateAuthFormUI();
            showPanel(authPanel);
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPanel(resetPasswordPanel);
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
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

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const resetButton = document.getElementById('reset-button');
            resetButton.disabled = true;
            resetButton.textContent = 'A Enviar...';

            try {
                const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.href.split('#')[0], 
                });

                if (error) {
                    showToast(error.message, 'error');
                } else {
                    showToast('Se o e-mail existir, um link de recuperação foi enviado.', 'success');
                }
            } finally {
                resetButton.disabled = false;
                resetButton.textContent = 'Enviar Link';
            }
        });
    }

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
                        _supabase.auth.signOut(); 
                        isLogin = true;
                        updateAuthFormUI();
                        showPanel(authPanel);
                    }, 2000);
                }
            } finally {
                updateButton.disabled = false;
                updateButton.textContent = 'Salvar Nova Senha';
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    if(authPanel) {
        updateAuthFormUI();
        showPanel(authPanel);
    }
});