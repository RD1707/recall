/**
 * Arquivo: header.js
 * Descrição: Controla toda a lógica do cabeçalho da aplicação, incluindo
 * o carregamento de dados do perfil, interatividade do menu e os modais de perfil e configurações.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Garante que a API esteja disponível
    if (typeof apiCall === 'undefined') {
        console.error("Erro: O script api.js deve ser carregado antes de header.js");
        return;
    }

    // --- SELEÇÃO DE ELEMENTOS DO DOM ---
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');
    const logoutButton = document.getElementById('logout-button');
    
    // Modais
    const profileModal = document.getElementById('profile-modal');
    const settingsModal = document.getElementById('settings-modal');
    const profileForm = document.getElementById('profile-form');

    // --- CARREGAMENTO DE DADOS DO USUÁRIO ---
    const loadUserProfile = async () => {
        const profile = await fetchProfile();
        const { data: { user } } = await _supabase.auth.getUser();

        if (profile) {
            document.querySelectorAll('#user-points').forEach(el => el.textContent = profile.points || 0);
            document.querySelectorAll('#user-streak').forEach(el => el.textContent = profile.current_streak || 0);
            
            // Preenche os campos do modal de perfil
            if(profileModal) {
                profileModal.querySelector('#profile-email').value = user?.email || '';
                profileModal.querySelector('#profile-name').value = profile.full_name || '';
            }
        }

        if (user && user.email) {
            const initial = user.email.charAt(0).toUpperCase();
            document.querySelectorAll('#user-avatar-text, #dropdown-avatar-text').forEach(el => el.textContent = initial);
            document.getElementById('user-email').textContent = user.email;
        }
    };

    // --- LÓGICA DE INTERAÇÃO (MENUS E MODAIS) ---
    const toggleUserMenu = (forceClose = false) => {
        if (userDropdown) {
            userDropdown.classList.toggle('visible', !forceClose && !userDropdown.classList.contains('visible'));
        }
    };

    // --- EVENT LISTENERS ---
    userMenuButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleUserMenu();
    });

    document.addEventListener('click', (e) => {
        if (userDropdown?.classList.contains('visible') && !userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
            toggleUserMenu(true);
        }
    });

    profileLink?.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(profileModal);
        toggleUserMenu(true);
    });

    settingsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(settingsModal);
        toggleUserMenu(true);
    });

    logoutButton?.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    // Submissão do formulário de perfil
    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('profile-name').value.trim();
        const password = document.getElementById('profile-password').value;
        const submitButton = profileForm.querySelector('button[type="submit"]');

        const dataToUpdate = {};
        if (fullName) dataToUpdate.full_name = fullName;
        if (password) {
            if (password.length < 6) {
                showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }
            dataToUpdate.password = password;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            showToast('Nenhuma alteração para salvar.', 'info');
            return;
        }

        setButtonLoading(submitButton, 'Salvando...');
        
        // A função updateProfile precisa ser adicionada em api.js
        const result = await updateProfile(dataToUpdate); 
        
        setButtonIdle(submitButton, 'Salvar Alterações');

        if (result) {
            showToast('Perfil atualizado com sucesso!', 'success');
            hideModal(profileModal);
            document.getElementById('profile-password').value = ''; // Limpa o campo de senha
        }
    });

    // Inicializa a aplicação
    loadUserProfile();
});

// Funções utilitárias (podem ser movidas para um arquivo separado se preferir)
function showModal(modal) {
    if (!modal) return;
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.style.overflow = '';
}

function setButtonLoading(button, text = 'Aguarde...') {
    if(!button) return;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function setButtonIdle(button, text) {
    if(!button) return;
    button.disabled = false;
    button.innerHTML = text;
}