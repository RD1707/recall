document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const authButton = document.getElementById('auth-button');
    const toggleFormLink = document.getElementById('toggle-form');
    const errorMessage = document.getElementById('error-message');
    const logoutButton = document.getElementById('logout-button');

    let isLogin = true; 

    if (toggleFormLink) {
    toggleFormLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        
        const formTitle = document.getElementById('form-title'); 
        const toggleText = document.getElementById('toggle-text');

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

        errorMessage.textContent = '';
    });
}
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            errorMessage.textContent = '';

            let response;
            if (isLogin) {
                response = await _supabase.auth.signInWithPassword({ email, password });
            } else {
                response = await _supabase.auth.signUp({ email, password });
            }

            if (response.error) {
                errorMessage.textContent = response.error.message;
            } else {
                if (!isLogin) {
                    alert('Registro realizado! Verifique seu e-mail para confirmar a conta.');
                    authForm.reset();
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        });
    }

    if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html'; 
    });
}
});