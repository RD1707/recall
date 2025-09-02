class HeaderComponent {
    constructor() {
        this.render();
    }

    getCSS() {
        return `
        /* Estilos do Header */
        :root {
            --header-height: 70px;
            --header-z-index: 1000;
        }

        .app-header {
            background-color: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-bottom: 1px solid var(--color-border);
            position: sticky;
            top: 0;
            z-index: var(--header-z-index);
            width: 100%;
        }

        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: var(--header-height);
            max-width: var(--container-width);
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        .header-logo-section a {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-size: var(--font-size-xl);
            font-weight: 700;
            color: var(--color-dark-900);
            text-decoration: none;
            font-family: var(--font-family-heading);
            transition: color 0.2s ease;
        }

        .header-logo-section a:hover {
            color: var(--color-primary-500);
        }

        .app-nav {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .nav-link {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: var(--font-size-base);
            font-weight: 500;
            color: var(--color-text-default);
            text-decoration: none;
            position: relative;
            padding: 0.25rem 0;
        }

        .nav-link::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 0;
            height: 2px;
            background-color: var(--color-primary-500);
            transition: width 0.3s ease;
        }

        .nav-link:hover::after,
        .nav-link.active::after {
            width: 100%;
        }

        .nav-link.active {
            color: var(--color-primary-500);
        }

        .user-stats {
            display: flex;
            align-items: center;
            gap: 1rem;
            border-right: 1px solid var(--color-border);
            padding-right: 1.5rem;
            margin-right: -0.5rem;
        }

        .user-stat {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: var(--font-size-sm);
            color: var(--color-text-muted);
            font-weight: 500;
            position: relative;
        }
        
        .user-stat .tooltip-text {
            visibility: hidden; width: 120px; background-color: var(--color-dark-900); color: #fff !important; text-align: center; /* <--- LINHA CORRIGIDA */
            border-radius: 6px; padding: 5px 0; position: absolute; z-index: 1; top: calc(100% + 8px); left: 50%;
            margin-left: -60px; opacity: 0; transition: opacity 0.3s;
        }

        .user-stat:hover .tooltip-text { visibility: visible; opacity: 1; }
        .user-stat .stat-icon { color: var(--color-primary-500); }
        .user-stat span { color: var(--color-dark-800); font-weight: 600; }

        .user-menu { position: relative; }

        .user-avatar {
            width: 40px; height: 40px; border-radius: 50%; background: var(--color-primary-500); color: white;
            border: 2px solid var(--color-surface); box-shadow: 0 0 0 2px var(--color-primary-100);
            display: flex; align-items: center; justify-content: center; font-weight: 600; cursor: pointer;
            transition: var(--transition-fast);
        }

        .user-avatar:hover { transform: scale(1.1); box-shadow: 0 0 0 3px var(--color-primary-500); }

        .dropdown-menu {
            position: absolute; top: calc(100% + 0.75rem); right: 0; width: 280px; background: var(--color-surface);
            border-radius: var(--border-radius-md); box-shadow: var(--shadow-lg); border: 1px solid var(--color-border);
            opacity: 0; visibility: hidden; transform: translateY(-10px);
            transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s; z-index: 1010;
        }

        .dropdown-menu.visible { opacity: 1; visibility: visible; transform: translateY(0); }
        .dropdown-user-info { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; }
        .dropdown-user-info .user-avatar { width: 36px; height: 36px; font-size: 0.9rem; box-shadow: none; }
        .user-details span:first-child { font-weight: 600; color: var(--color-dark-900); word-break: break-all; }
        .user-plan { font-size: var(--font-size-sm); color: var(--color-text-muted); }
        .dropdown-divider { height: 1px; background: var(--color-border); margin: 0.5rem 0; }
        .dropdown-item {
            display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.25rem;
            color: var(--color-text-default); text-decoration: none; transition: var(--transition-fast);
            border: none; background: none; width: 100%; text-align: left; cursor: pointer;
            font-size: var(--font-size-sm);
        }
        .dropdown-item:hover { background: var(--color-primary-100); color: var(--color-primary-600); }
        .dropdown-item i { width: 18px; text-align: center; margin-right: 0.25rem; }
        .dropdown-item.logout-btn:hover { background-color: #fee2e2; color: #ef4444; }

        /* Estilos dos Modais */
        .modal-overlay {
            position: fixed; inset: 0; background-color: rgba(17, 24, 39, 0.6);
            backdrop-filter: blur(4px); display: flex; justify-content: center;
            align-items: center; z-index: 2000; opacity: 0; visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        }
        .modal-overlay.visible { opacity: 1; visibility: visible; }
        .modal {
            background-color: var(--color-surface); border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg); width: 90%; max-width: 550px;
            transform: translateY(-20px) scale(0.95);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal-overlay.visible .modal { transform: translateY(0) scale(1); }
        .modal-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 1.5rem; border-bottom: 1px solid var(--color-border);
        }
        .modal-header h2 { font-size: var(--font-size-xl); margin: 0; }
        .close-modal-btn { color: var(--color-text-muted); }
        .close-modal-btn:hover { color: var(--color-dark-900); }
        .modal-body { padding: 1.5rem; }
        .modal-footer {
            padding: 1.5rem; border-top: 1px solid var(--color-border);
            display: flex; justify-content: flex-end; gap: var(--space-sm);
            background-color: #f9fafb;
        }
        .btn-danger { background-color: #ef4444; color: white; }
        .btn-danger:hover { background-color: #dc2626; }
        .input-group { position: relative; }
        .password-toggle-icon {
            position: absolute; right: 1rem; top: 50%;
            transform: translateY(-50%); cursor: pointer; color: var(--color-text-muted);
        }
        
        /* Estilos específicos para o Modal de Configurações */
        .settings-section { margin-bottom: 1.5rem; }
        .settings-section h3 {
            font-size: 1rem; font-weight: 600; color: var(--color-dark-800);
            padding-bottom: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border);
        }
        .theme-selector { display: flex; gap: 1rem; }
        .theme-option {
            padding: 0.5rem 1rem; border: 1px solid var(--color-border);
            border-radius: var(--border-radius-sm); cursor: pointer; transition: all 0.2s ease;
        }
        .theme-option.active {
            background-color: var(--color-primary-500); color: white; border-color: var(--color-primary-500);
        }


        @media (max-width: 768px) {
            .header-container { padding: 0 1rem; }
            .user-stats, .nav-link { display: none; }
        }
        `;
    }

    getHTML() {
        return `
        <header class="app-header">
            <div class="header-container">
                <div class="header-logo-section">
                    <a href="dashboard.html"><i class="fas fa-brain"></i> Recall</a>
                </div>
                <nav class="app-nav">
                    <a href="progress.html" class="nav-link"><i class="fas fa-chart-line"></i> Meu Progresso</a>
                    <div class="user-stats">
                        <div class="user-stat">
                            <span class="stat-icon"><i class="fas fa-star"></i></span>
                            <span id="user-points">0</span> Pontos
                            <span class="tooltip-text">Pontuação</span>
                        </div>
                        <div class="user-stat">
                            <span class="stat-icon"><i class="fas fa-fire"></i></span>
                            <span id="user-streak">0</span> Dias
                            <span class="tooltip-text">Sequência</span>
                        </div>
                    </div>
                    <div class="user-menu">
                        <button id="user-menu-button" class="user-avatar" aria-label="Menu do usuário"><span id="user-avatar-text"></span></button>
                        <div id="user-dropdown" class="dropdown-menu">
                            <div class="dropdown-user-info">
                                <div class="user-avatar"><span id="dropdown-avatar-text"></span></div>
                                <div class="user-details">
                                    <span id="user-email"></span>
                                    <span class="user-plan">Plano Free</span>
                                </div>
                            </div>
                            <div class="dropdown-divider"></div>
                            <button id="profile-link" class="dropdown-item"><i class="fas fa-user"></i> Meu Perfil</button>
                            <button id="settings-link" class="dropdown-item"><i class="fas fa-cog"></i> Configurações</button>
                            <div class="dropdown-divider"></div>
                            <button id="logout-link" class="dropdown-item logout-btn"><i class="fas fa-sign-out-alt"></i> Sair</button>
                        </div>
                    </div>
                </nav>
            </div>
        </header>

        <div id="profile-modal" class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2>Meu Perfil</h2>
                    <button class="close-modal-btn" data-modal-id="profile-modal"><i class="fas fa-times"></i></button>
                </div>
                <form id="profile-form" novalidate>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="profile-email">E-mail</label>
                            <input type="email" id="profile-email" disabled>
                        </div>
                        <div class="form-group">
                            <label for="profile-name">Nome Completo</label>
                            <input type="text" id="profile-name" placeholder="Seu nome completo">
                        </div>
                        <div class="form-group">
                            <label for="profile-password">Nova Senha</label>
                            <div class="input-group">
                                <input type="password" id="profile-password" placeholder="Deixe em branco para não alterar">
                                <span class="password-toggle-icon"><i class="fas fa-eye"></i></span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-modal-btn" data-modal-id="profile-modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="settings-modal" class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2>Configurações</h2>
                    <button class="close-modal-btn" data-modal-id="settings-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                     <div class="settings-section">
                        <h3>Aparência</h3>
                        <label>Tema da Interface</label>
                        <div class="theme-selector">
                           <button class="theme-option" data-theme="light">Claro</button>
                           <button class="theme-option" data-theme="dark">Escuro</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal-btn" data-modal-id="settings-modal">Fechar</button>
                </div>
            </div>
        </div>
        `;
    }

    _setButtonLoading(button, text = 'Aguarde...') {
        if (!button) return;
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    _setButtonIdle(button, text) {
        if (!button) return;
        button.disabled = false;
        button.innerHTML = text;
    }

    run() {
        if (typeof supabase === 'undefined' || typeof apiCall === 'undefined' || typeof showToast === 'undefined') {
            console.error("ERRO: Scripts de dependência (Supabase, api.js, notifications.js) não carregados.");
            return;
        }

        // --- Injeção de CSS e HTML ---
        const style = document.createElement('style');
        style.textContent = this.getCSS();
        document.head.appendChild(style);

        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fontAwesome);
        }

        document.body.insertAdjacentHTML('afterbegin', this.getHTML());

        // --- Lógica Geral ---
        const loadUserProfile = async () => {
            try {
                const profile = await fetchProfile();
                const { data: { user } } = await _supabase.auth.getUser();

                if (profile) {
                    document.getElementById('user-points').textContent = profile.points || 0;
                    document.getElementById('user-streak').textContent = profile.current_streak || 0;
                    document.getElementById('profile-name').value = profile.full_name || '';
                }

                if (user && user.email) {
                    const initial = user.email.charAt(0).toUpperCase();
                    document.getElementById('user-avatar-text').textContent = initial;
                    document.getElementById('dropdown-avatar-text').textContent = initial;
                    document.getElementById('user-email').textContent = user.email;
                    document.getElementById('profile-email').value = user.email;
                }
            } catch (error) { console.error("Erro ao carregar perfil:", error); }
        };

        // --- Lógica do Dropdown do Usuário ---
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');

        const toggleUserMenu = (forceClose = false) => {
            userDropdown?.classList.toggle('visible', !forceClose && !userDropdown.classList.contains('visible'));
        };

        userMenuButton?.addEventListener('click', e => { e.stopPropagation(); toggleUserMenu(); });
        document.addEventListener('click', e => {
            if (userDropdown?.classList.contains('visible') && !userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                toggleUserMenu(true);
            }
        });

        // --- Lógica dos Modais ---
        const profileModal = document.getElementById('profile-modal');
        const settingsModal = document.getElementById('settings-modal');

        const showModal = (modal) => modal?.classList.add('visible');
        const hideModal = (modal) => modal?.classList.remove('visible');

        document.getElementById('profile-link')?.addEventListener('click', e => { e.preventDefault(); showModal(profileModal); toggleUserMenu(true); });
        document.getElementById('settings-link')?.addEventListener('click', e => { e.preventDefault(); showModal(settingsModal); toggleUserMenu(true); });
        document.getElementById('logout-link')?.addEventListener('click', async e => { e.preventDefault(); await _supabase.auth.signOut(); window.location.href = 'login.html'; });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', e => { if (e.target === modal) hideModal(modal); });
        });
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => hideModal(document.getElementById(btn.dataset.modalId)));
        });

        // --- Lógica do Formulário de Perfil ---
        const profileForm = document.getElementById('profile-form');
        profileForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('profile-name').value.trim();
            const password = document.getElementById('profile-password').value;
            const submitButton = profileForm.querySelector('button[type="submit"]');

            const dataToUpdate = { full_name: fullName };
            if (password) {
                if (password.length < 6) { return showToast('A nova senha deve ter no mínimo 6 caracteres.', 'error'); }
                dataToUpdate.password = password;
            }

            this._setButtonLoading(submitButton, 'Salvando...');
            const result = await updateProfile(dataToUpdate);
            this._setButtonIdle(submitButton, 'Salvar Alterações');

            if (result) {
                showToast('Perfil atualizado com sucesso!', 'success');
                hideModal(profileModal);
                document.getElementById('profile-password').value = '';
                await loadUserProfile();
            }
        });

        // --- Lógica do Toggle de Senha ---
        document.querySelector('.password-toggle-icon')?.addEventListener('click', e => {
            const icon = e.currentTarget.querySelector('i');
            const input = document.getElementById('profile-password');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        // --- Lógica de Configurações ---
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.dataset.theme;
                showToast(`Tema alterado para ${theme}`, 'info');
                document.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // --- Inicialização ---
        if (window.location.pathname.endsWith('progress.html')) {
            document.querySelector('.nav-link[href="progress.html"]')?.classList.add('active');
        }

        loadUserProfile();
    }

    render() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.run());
        } else {
            this.run();
        }
    }
}

// Inicializa o componente
new HeaderComponent();