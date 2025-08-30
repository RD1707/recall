// ===================================================================================
// ==                          RECALL HEADER COMPONENT                            ==
// ==                          v1.0.0 - por Trapp                                 ==
// ==                                                                               ==
// ==  INSTRUÇÕES:                                                                ==
// ==  1. Salve este arquivo como 'headerComponent.js' na sua pasta `js`.           ==
// ==  2. Adicione as seguintes tags no <head> do seu HTML, ANTES de fechar a tag:==
// ==     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> ==
// ==     <script src="js/api.js"></script>                                         ==
// ==  3. Adicione a seguinte tag ANTES de fechar a tag </body> no seu HTML:       ==
// ==     <script src="js/headerComponent.js"></script>                              ==
// ===================================================================================

class HeaderComponent {
    constructor() {
        this.render();
    }

    getCSS() {
        return `
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
            position: relative; /* Para o tooltip */
        }
        
        .user-stat .tooltip-text {
            visibility: hidden;
            width: 120px;
            background-color: var(--color-dark-900);
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 5px 0;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -60px;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .user-stat:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }

        .user-stat .stat-icon { color: var(--color-primary-500); }
        .user-stat span { color: var(--color-dark-800); font-weight: 600; }

        .user-menu {
            position: relative;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--color-primary-500);
            color: white;
            border: 2px solid var(--color-surface);
            box-shadow: 0 0 0 2px var(--color-primary-100);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition-fast);
        }

        .user-avatar:hover {
            transform: scale(1.1);
            box-shadow: 0 0 0 3px var(--color-primary-500);
        }

        .dropdown-menu {
            position: absolute;
            top: calc(100% + 0.75rem);
            right: 0;
            width: 280px;
            background: var(--color-surface);
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--color-border);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
            z-index: 110;
        }

        .dropdown-menu.visible {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .dropdown-user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
        }

        .dropdown-user-info .user-avatar { width: 36px; height: 36px; font-size: 0.9rem; box-shadow: none; }
        .user-details span:first-child { font-weight: 600; color: var(--color-dark-900); word-break: break-all; }
        .user-plan { font-size: var(--font-size-sm); color: var(--color-text-muted); }
        .dropdown-divider { height: 1px; background: var(--color-border); margin: 0.5rem 0; }

        .dropdown-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            color: var(--color-text-default);
            text-decoration: none;
            transition: var(--transition-fast);
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            font-size: var(--font-size-sm);
        }
        .dropdown-item:hover { background: var(--color-primary-100); color: var(--color-primary-600); }
        .dropdown-item i { width: 18px; text-align: center; margin-right: 0.25rem; }
        
        /* Estilo para o botão de sair */
        .dropdown-item.logout-btn:hover {
            background-color: #fee2e2; /* Fundo vermelho claro no hover */
            color: #ef4444; /* Texto vermelho no hover */
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
                    <a href="dashboard.html">
                        <i class="fas fa-brain"></i> Recall
                    </a>
                </div>
                <nav class="app-nav">
                    <a href="progress.html" class="nav-link">
                        <i class="fas fa-chart-line"></i> Meu Progresso
                    </a>
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
                        <button id="user-menu-button" class="user-avatar" aria-label="Menu do usuário">
                            <span id="user-avatar-text"></span>
                        </button>
                        <div id="user-dropdown" class="dropdown-menu">
                            <div class="dropdown-user-info">
                                <div class="user-avatar">
                                    <span id="dropdown-avatar-text"></span>
                                </div>
                                <div class="user-details">
                                    <span id="user-email"></span>
                                    <span class="user-plan">Plano Free</span>
                                </div>
                            </div>
                            <div class="dropdown-divider"></div>
                            <a href="#" id="profile-link" class="dropdown-item">
                                <i class="fas fa-user"></i> Meu Perfil
                            </a>
                            <a href="#" id="settings-link" class="dropdown-item">
                                <i class="fas fa-cog"></i> Configurações
                            </a>
                            <div class="dropdown-divider"></div>
                            <a href="#" id="logout-link" class="dropdown-item logout-btn">
                                <i class="fas fa-sign-out-alt"></i> Sair
                            </a>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
        `;
    }

    run() {
        // Verificar se os scripts de dependência foram carregados
        if (typeof supabase === 'undefined' || typeof apiCall === 'undefined') {
            console.error("ERRO: O cliente Supabase e/ou api.js não foram carregados antes de headerComponent.js. Verifique a ordem dos scripts no seu HTML.");
            return;
        }

        // --- Injeção de CSS ---
        const style = document.createElement('style');
        style.textContent = this.getCSS();
        document.head.appendChild(style);
        
        // --- Injeção de FontAwesome ---
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fontAwesome);
        }

        // --- Injeção de HTML ---
        document.body.insertAdjacentHTML('afterbegin', this.getHTML());

        // --- Lógica do Header ---
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        const profileLink = document.getElementById('profile-link');
        const settingsLink = document.getElementById('settings-link');
        const logoutLink = document.getElementById('logout-link');

        const loadUserProfile = async () => {
            try {
                // `apiCall` já redireciona se não houver sessão
                const profile = await fetchProfile(); 
                const { data: { user } } = await _supabase.auth.getUser();

                if (profile) {
                    document.getElementById('user-points').textContent = profile.points || 0;
                    document.getElementById('user-streak').textContent = profile.current_streak || 0;
                }

                if (user && user.email) {
                    const initial = user.email.charAt(0).toUpperCase();
                    document.getElementById('user-avatar-text').textContent = initial;
                    document.getElementById('dropdown-avatar-text').textContent = initial;
                    document.getElementById('user-email').textContent = user.email;
                }
            } catch (error) {
                console.error("Erro ao carregar perfil do usuário:", error);
            }
        };

        const toggleUserMenu = (forceClose = false) => {
            if (userDropdown) {
                userDropdown.classList.toggle('visible', !forceClose && !userDropdown.classList.contains('visible'));
            }
        };

        userMenuButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleUserMenu();
        });

        document.addEventListener('click', (e) => {
            if (userDropdown?.classList.contains('visible') && !userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                toggleUserMenu(true);
            }
        });

        logoutLink?.addEventListener('click', async (e) => {
            e.preventDefault();
            await _supabase.auth.signOut();
            window.location.href = 'login.html'; // Redireciona para a página de login
        });
        
        profileLink?.addEventListener('click', (e) => {
            e.preventDefault();
            // Adicione aqui a lógica para abrir o modal de perfil
            alert('Funcionalidade "Meu Perfil" a ser implementada!');
            toggleUserMenu(true);
        });

        settingsLink?.addEventListener('click', (e) => {
            e.preventDefault();
            // Adicione aqui a lógica para abrir o modal de configurações
            alert('Funcionalidade "Configurações" a ser implementada!');
            toggleUserMenu(true);
        });
        
        // Ativa o link "Meu Progresso" se estiver na página correspondente
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