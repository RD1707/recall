document.addEventListener('DOMContentLoaded', () => {
    const authPanel = document.getElementById('auth-panel');
    const resetPasswordPanel = document.getElementById('reset-password-panel');
    const updatePasswordPanel = document.getElementById('update-password-panel');

    const authForm = document.getElementById('auth-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const updatePasswordForm = document.getElementById('update-password-form');
    const googleLoginButton = document.getElementById('google-login-button');

    const toggleFormLink = document.getElementById('toggle-form-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLinks = document.querySelectorAll('.back-to-login');
    const logoutButton = document.getElementById('logout-button');
    
    // Elementos da UI
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const toggleText = document.getElementById('toggle-text');
    const authButton = document.getElementById('auth-button');
    
    // Campos de login
    const loginFields = document.querySelector('.login-fields');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('toggle-password');
    
    // Campos de registro
    const registerFields = document.querySelector('.register-fields');
    const registerEmailInput = document.getElementById('register-email');
    const fullnameInput = document.getElementById('fullname');
    const usernameInput = document.getElementById('username');
    const registerPasswordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const acceptTermsInput = document.getElementById('accept-terms');
    const acceptMarketingInput = document.getElementById('accept-marketing');
    
    // Toggles de senha
    const toggleRegisterPassword = document.getElementById('toggle-register-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');

    let isLogin = true;

    function showPanel(panelToShow) {
        [authPanel, resetPasswordPanel, updatePasswordPanel].forEach(panel => {
            if (panel) panel.classList.add('hidden');
        });
        if (panelToShow) panelToShow.classList.remove('hidden');
    }

    function updateAuthFormUI() {
        if (isLogin) {
            formTitle.textContent = 'Acesse sua conta';
            formSubtitle.textContent = 'Bem-vindo de volta! Por favor, insira seus dados.';
            authButton.textContent = 'Entrar';
            toggleText.textContent = 'Não tem uma conta?';
            toggleFormLink.textContent = 'Registre-se agora';
            
            // Mostrar campos de login, esconder campos de registro
            loginFields.classList.remove('hidden');
            registerFields.classList.remove('show');
            registerFields.classList.add('hidden');
        } else {
            formTitle.textContent = 'Crie sua conta';
            formSubtitle.textContent = 'É rápido e fácil. Comece a usar o Recall hoje mesmo!';
            authButton.textContent = 'Criar Conta';
            toggleText.textContent = 'Já tem uma conta?';
            toggleFormLink.textContent = 'Entre agora';
            
            // Esconder campos de login, mostrar campos de registro
            loginFields.classList.add('hidden');
            registerFields.classList.remove('hidden');
            registerFields.classList.add('show');
        }
    }

    function setupPasswordToggle(toggleButton, passwordField) {
        if (!toggleButton || !passwordField) return;

        const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        toggleButton.innerHTML = eyeIcon;

        toggleButton.addEventListener('click', () => {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                toggleButton.innerHTML = eyeOffIcon;
                toggleButton.setAttribute('aria-label', 'Esconder senha');
            } else {
                passwordField.type = 'password';
                toggleButton.innerHTML = eyeIcon;
                toggleButton.setAttribute('aria-label', 'Mostrar senha');
            }
        });
    }

    _supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
            showPanel(updatePasswordPanel);
        }
    });

    if (toggleFormLink) {
        toggleFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            updateAuthFormUI();
            authForm.reset();
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPanel(resetPasswordPanel);
        });
    }
    
    backToLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            isLogin = true;
            updateAuthFormUI();
            showPanel(authPanel);
        });
    });

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authButton.disabled = true;

            try {
                if (isLogin) {
                    // Login
                    const email = emailInput.value;
                    const password = passwordInput.value;
                    
                    const { error } = await _supabase.auth.signInWithPassword({ 
                        email, 
                        password 
                    });

                    if (error) {
                        showToast(error.message, 'error');
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // Registro
                    const email = registerEmailInput.value;
                    const password = registerPasswordInput.value;
                    const confirmPassword = confirmPasswordInput.value;
                    const fullname = fullnameInput.value;
                    const username = usernameInput.value;
                    const acceptTerms = acceptTermsInput.checked;
                    const acceptMarketing = acceptMarketingInput.checked;

                    // Validações
                    if (!acceptTerms) {
                        showToast('Você deve aceitar os termos de uso para continuar.', 'error');
                        authButton.disabled = false;
                        return;
                    }

                    if (password !== confirmPassword) {
                        showToast('As senhas não coincidem.', 'error');
                        authButton.disabled = false;
                        return;
                    }

                    if (password.length < 6) {
                        showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
                        authButton.disabled = false;
                        return;
                    }

                    // Validar username (apenas letras, números e underscore)
                    const usernameRegex = /^[a-zA-Z0-9_]+$/;
                    if (!usernameRegex.test(username)) {
                        showToast('Nome de usuário inválido. Use apenas letras, números e underscore.', 'error');
                        authButton.disabled = false;
                        return;
                    }

                    const { error } = await _supabase.auth.signUp({ 
                        email, 
                        password,
                        options: {
                            data: {
                                full_name: fullname,
                                username: username,
                                accept_marketing: acceptMarketing
                            }
                        }
                    });

                    if (error) {
                        showToast(error.message, 'error');
                    } else {
                        showToast('Conta criada com sucesso! Verifique seu e-mail para confirmar.', 'success');
                        authForm.reset();
                        isLogin = true;
                        updateAuthFormUI();
                    }
                }
            } catch (error) {
                showToast('Ocorreu um erro. Tente novamente.', 'error');
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
            resetButton.textContent = 'Enviando...';

            try {
                const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + window.location.pathname,
                });
                if (error) {
                    showToast(error.message, 'error');
                } else {
                    showToast('Se o e-mail existir, um link de recuperação foi enviado.', 'success');
                    resetPasswordForm.reset();
                }
            } finally {
                resetButton.disabled = false;
                resetButton.textContent = 'Enviar Link de Recuperação';
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
            updateButton.textContent = 'Salvando...';

            try {
                const { error } = await _supabase.auth.updateUser({ password: newPassword });
                if (error) {
                    showToast(error.message, 'error');
                } else {
                    showToast('Senha atualizada com sucesso! Você pode fazer login.', 'success');
                    setTimeout(() => {
                        window.location.hash = ''; 
                        window.location.reload(); 
                    }, 2000);
                }
            } finally {
                updateButton.disabled = false;
                updateButton.textContent = 'Salvar Nova Senha';
            }
        });
    }

    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
            try {
                const { error } = await _supabase.auth.signInWithOAuth({
                    provider: 'google',
                });

                if (error) {
                    showToast(error.message, 'error');
                }
            } catch (error) {
                showToast('Ocorreu um erro inesperado ao tentar logar com o Google.', 'error');
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
    
    // Configurar toggles de senha
    setupPasswordToggle(passwordToggle, passwordInput);
    setupPasswordToggle(toggleRegisterPassword, registerPasswordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);
    
    // Verificar se está na página de recuperação de senha
    if (window.location.hash.includes('type=recovery')) {
        showPanel(updatePasswordPanel);
    } else {
        showPanel(authPanel);
    }
    
    updateAuthFormUI();
});
