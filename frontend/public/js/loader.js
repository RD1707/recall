/**
 * Arquivo: loader.js
 * Descrição: Controla a lógica da tela de carregamento global.
 */

function showPageContent() {
    const loader = document.getElementById('page-loader');
    const content = document.getElementById('page-content');

    if (loader) {
        loader.classList.add('hidden');
    }

    if (content) {
        // Adiciona um pequeno delay para garantir que a transição seja suave
        setTimeout(() => {
            content.classList.add('visible');
        }, 50); 
    }
}