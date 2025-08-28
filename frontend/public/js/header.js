/**
 * Arquivo: header.js
 * Descrição: Controla toda a lógica do cabeçalho da aplicação, incluindo
 * o carregamento de dados do perfil do usuário e a interatividade do menu.
 */
document.addEventListener('DOMContentLoaded', () => {
    // A função `apiCall` está definida em `api.js`, que deve ser carregado antes deste script.
    if (typeof apiCall === 'undefined') {
        console.error("Erro: O script api.js deve ser carregado antes de header.js");
        return;
    }

    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('logout-button');

    // Carrega dados do usuário e popula o header
    const loadUserProfile = async () => {
        // Esta função já existe no seu `api.js`, não precisa reescrever
        const profile = await fetchProfile(); 
        
        // As chaves do Supabase para pegar o email do usuário já estão em `api.js`
        const { data: { user } } = await _supabase.auth.getUser();

        if (profile) {
            document.querySelectorAll('#user-points').forEach(el => el.textContent = profile.points || 0);
            document.querySelectorAll('#user-streak').forEach(el => el.textContent = profile.current_streak || 0);
        }

        if (user && user.email) {
            const initial = user.email.charAt(0).toUpperCase();
            document.querySelectorAll('#user-avatar-text').forEach(el => el.textContent = initial);
            document.querySelectorAll('#dropdown-avatar-text').forEach(el => el.textContent = initial);
            document.getElementById('user-email').textContent = user.email;
        }
    };

    // Controla a visibilidade do dropdown
    const toggleUserMenu = () => {
        userDropdown?.classList.toggle('visible');
    };

    // Event listener para o botão do menu
    userMenuButton?.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique feche o menu imediatamente
        toggleUserMenu();
    });

    // Event listener para fechar o menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (userDropdown?.classList.contains('visible') && !userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('visible');
        }
    });

    // Event listener para o botão de logout
    logoutButton?.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    // Inicia o carregamento dos dados do perfil
    loadUserProfile();
});