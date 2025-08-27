/**
 * Arquivo: progress.js
 * Descrição: Gerencia toda a lógica da página de progresso, incluindo a busca de
 * dados analíticos do backend, a renderização de gráficos interativos e a exibição de insights.
 * VERSÃO INTEGRADA E CORRIGIDA.
 */

// Objeto para armazenar o estado da página, como a instância do gráfico.
const pageState = {
    reviewsChart: null,
};

document.addEventListener('DOMContentLoaded', () => {
    // Carrega todos os dados da página de forma assíncrona.
    loadAllProgressData();
    // A função de event listeners foi simplificada pois a API só retorna dados de 7 dias.
    setupEventListeners();
});

/**
 * Função principal que orquestra o carregamento de todos os dados necessários do backend.
 * Utiliza Promise.all para buscar dados em paralelo e otimizar o tempo de carregamento.
 */
async function loadAllProgressData() {
    // Mostra os skeletons de carregamento enquanto os dados são buscados.
    renderSkeletons();

    // Busca os dados do gráfico e os insights da IA a partir das funções reais da API.
    const [chartData, insightsData, profileData] = await Promise.all([
        fetchLast7DaysReviews(),    // Endpoint REAL: /api/analytics/reviews-last-7-days
        fetchPerformanceInsights(), // Endpoint REAL: /api/analytics/insights
        fetchProfile()              // Endpoint REAL: /api/profile para pegar o streak
    ]);

    // Atualiza os componentes da UI com os dados reais do backend.
    updateStatCards(insightsData, profileData); // Passando os dados necessários
    renderReviewsChart(chartData);
    renderInsights(insightsData);
}

// A função loadAndRenderChart(range) foi removida pois a API só suporta 7 dias.

// --- FUNÇÕES DE RENDERIZAÇÃO (Render Functions) ---

/**
 * Preenche os cards de métricas chave com os dados recebidos da API.
 * @param {object} insights - Objeto contendo as métricas de performance (accuracy, mastered).
 * @param {object} profile - Objeto contendo os dados do perfil (streak).
 */
function updateStatCards(insights, profile) {
    // O backend não fornece todas as métricas, então usamos o que temos e marcamos o resto.
    document.getElementById('total-reviews-stat').textContent = insights?.totalReviews || 'N/A';
    document.getElementById('accuracy-stat').textContent = `${insights?.averageAccuracy || 0}%`;
    document.getElementById('max-streak-stat').textContent = `${profile?.current_streak || 0} dias`;
    document.getElementById('mastered-cards-stat').textContent = insights?.masteredCards || 'N/A';
}

/**
 * Renderiza ou atualiza o gráfico de revisões com os dados do backend.
 * @param {object} chartData - Objeto com 'labels' e 'counts' para o gráfico.
 */
function renderReviewsChart(chartData) {
    const ctx = document.getElementById('reviewsChart').getContext('2d');
    const chartContainer = document.querySelector('.chart-container');

    if (pageState.reviewsChart) {
        pageState.reviewsChart.destroy();
    }
    
    if (!chartData || !chartData.labels || !chartData.counts) {
        chartContainer.innerHTML = '<p>Não há dados de revisões para exibir.</p>';
        return;
    }

    pageState.reviewsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Flashcards Revisados',
                data: chartData.counts,
                backgroundColor: 'rgba(79, 70, 229, 0.5)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1, // Garante que o eixo Y só mostre números inteiros
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Renderiza os insights da IA e a lista de baralhos com dificuldade, conforme recebido do backend.
 * @param {object} insightsData - Objeto contendo a propriedade 'insight' (string) e 'difficultDecks' (array).
 */
function renderInsights(insightsData) {
    const insightsContent = document.getElementById('insights-content');
    const difficultDecksList = document.getElementById('difficult-decks-list');

    // Renderiza o insight do Tutor IA
    if (insightsData && insightsData.insight) {
        const formattedInsight = insightsData.insight.replace(/\n/g, '<br><br>');
        insightsContent.innerHTML = `<p>${formattedInsight}</p>`;
    } else {
        insightsContent.innerHTML = '<p>Continue a estudar para receber insights personalizados do seu tutor IA!</p>';
    }

    // Renderiza a lista de baralhos com dificuldade
    difficultDecksList.innerHTML = '';
    if (insightsData && insightsData.difficultDecks && insightsData.difficultDecks.length > 0) {
        insightsData.difficultDecks.forEach(deck => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="deck-info">
                    <span class="deck-name">${deck.deck_title}</span>
                    <span class="error-rate">Taxa de erro: ${Math.round(deck.error_rate)}%</span>
                </div>
                <a href="study.html?deckId=${deck.deck_id}" class="btn btn-secondary">Revisar</a>
            `;
            difficultDecksList.appendChild(listItem);
        });
    } else {
        difficultDecksList.innerHTML = '<li><p>Ótimo trabalho! Nenhum baralho com alta taxa de erro detectado.</p></li>';
    }
}

/**
 * Mostra os skeletons de carregamento para uma melhor experiência do usuário.
 */
function renderSkeletons() {
    document.getElementById('insights-content').innerHTML = `
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>`;
    
    document.getElementById('difficult-decks-list').innerHTML = `
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>`;
}

/**
 * Configura os event listeners da página.
 * Simplificado para remover os botões de período que não são suportados pela API.
 */
function setupEventListeners() {
    const timeRangeSelector = document.querySelector('.time-range-selector');
    if (timeRangeSelector) {
        // Esconde os botões de 30 e 90 dias, já que a API não os suporta.
        const buttons = timeRangeSelector.querySelectorAll('.time-range-btn');
        buttons.forEach(btn => {
            if (btn.dataset.range !== '7') {
                btn.style.display = 'none';
            }
        });
    }
}