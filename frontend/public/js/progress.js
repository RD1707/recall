/**
 * Arquivo: progress.js
 * Descrição: Gerencia toda a lógica da página de progresso, incluindo a busca de
 * dados analíticos, a renderização de gráficos interativos e a exibição de insights.
 */

// Objeto para armazenar o estado da página, como a instância do gráfico.
const pageState = {
    reviewsChart: null,
};

document.addEventListener('DOMContentLoaded', () => {
    // Carrega todos os dados da página de forma assíncrona.
    loadAllProgressData();
    // Configura os event listeners para os botões de controle.
    setupEventListeners();
});

/**
 * Função principal que orquestra o carregamento de todos os dados necessários.
 * Utiliza Promise.all para buscar dados em paralelo e otimizar o tempo de carregamento.
 */
async function loadAllProgressData() {
    // Mostra os skeletons de carregamento enquanto os dados são buscados.
    renderSkeletons();

    // Busca os dados do resumo, do gráfico (inicialmente 7 dias) e os insights da IA.
    const [summaryData, chartData, insightsData] = await Promise.all([
        fetchAnalyticsSummary(), // NOVO: Busca os dados para os cards de métricas
        fetchReviewsOverTime(7),   // NOVO: Busca dados do gráfico para um período específico
        fetchPerformanceInsights() // Busca os insights e os baralhos com dificuldade
    ]);

    updateStatCards(summaryData);
    renderReviewsChart(chartData);
    renderInsights(insightsData);
}

/**
 * Busca e renderiza os dados do gráfico para um período de tempo específico.
 * @param {number} range - O período em dias (7, 30, ou 90).
 */
async function loadAndRenderChart(range) {
    const chartData = await fetchReviewsOverTime(range);
    renderReviewsChart(chartData);
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Preenche os cards de métricas chave com os dados recebidos da API.
 * @param {object} data - Objeto contendo as métricas (totalReviews, accuracy, etc.).
 */
function updateStatCards(data) {
    document.getElementById('total-reviews-stat').textContent = data?.totalReviews || 0;
    document.getElementById('accuracy-stat').textContent = `${data?.averageAccuracy || 0}%`;
    document.getElementById('max-streak-stat').textContent = `${data?.maxStreak || 0} dias`;
    document.getElementById('mastered-cards-stat').textContent = data?.masteredCards || 0;
}

/**
 * Renderiza ou atualiza o gráfico de revisões.
 * @param {object} chartData - Objeto com 'labels' e 'counts' para o gráfico.
 */
function renderReviewsChart(chartData) {
    const ctx = document.getElementById('reviewsChart').getContext('2d');
    const chartContainer = document.querySelector('.chart-container');

    // Se a instância do gráfico já existe, a destrói antes de criar uma nova.
    if (pageState.reviewsChart) {
        pageState.reviewsChart.destroy();
    }
    
    if (!chartData || !chartData.labels || !chartData.counts) {
        chartContainer.innerHTML = '<p>Não foi possível carregar os dados de revisões para este período.</p>';
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
                        stepSize: 1
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
 * Renderiza os insights da IA e a lista de baralhos com dificuldade.
 * @param {object} insightsData - Objeto contendo o insight da IA e os baralhos.
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
        difficultDecksList.innerHTML = '<p>Ótimo trabalho! Nenhum baralho com alta taxa de erro detectado.</p>';
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
 * Configura os event listeners da página, como os botões de período do gráfico.
 */
function setupEventListeners() {
    const timeRangeSelector = document.querySelector('.time-range-selector');
    if (!timeRangeSelector) return;

    timeRangeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.time-range-btn');
        if (button) {
            // Remove a classe 'active' de todos os botões e a adiciona ao clicado.
            timeRangeSelector.querySelectorAll('.time-range-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const range = parseInt(button.dataset.range, 10);
            loadAndRenderChart(range);
        }
    });
}