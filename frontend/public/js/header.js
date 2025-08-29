document.addEventListener('DOMContentLoaded', () => {
    if (typeof apiCall === 'undefined') {
        console.error("Erro: O script api.js deve ser carregado antes de header.js");
        return;
    }

    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');
    const logoutButton = document.getElementById('logout-button');
    const logoutButtonSettings = document.getElementById('logout-button-settings');

    const profileModal = document.getElementById('profile-modal');
    const settingsModal = document.getElementById('settings-modal');
    const profileForm = document.getElementById('profile-form');

    const loadUserProfile = async () => {
        const profile = await fetchProfile();
        const { data: { user } } = await _supabase.auth.getUser();

        if (profile) {
            document.querySelectorAll('#user-points').forEach(el => el.textContent = profile.points || 0);
            document.querySelectorAll('#user-streak').forEach(el => el.textContent = profile.current_streak || 0);

            if (profileModal) {
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
    
    const handleLogout = async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    };

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

    logoutButton?.addEventListener('click', handleLogout);
    logoutButtonSettings?.addEventListener('click', handleLogout);


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

        const result = await updateProfile(dataToUpdate);

        setButtonIdle(submitButton, 'Salvar Alterações');

        if (result) {
            showToast('Perfil atualizado com sucesso!', 'success');
            hideModal(profileModal);
            document.getElementById('profile-password').value = '';
            await loadUserProfile(); // Recarrega os dados do perfil
        }
    });
    
    // Fechar modais
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
             const modalId = btn.getAttribute('data-modal-id');
             hideModal(document.getElementById(modalId));
        });
    });

    loadUserProfile();
});

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
    if (!button) return;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function setButtonIdle(button, text) {
    if (!button) return;
    button.disabled = false;
    button.innerHTML = text;
}