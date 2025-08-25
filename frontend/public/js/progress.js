document.addEventListener('DOMContentLoaded', () => {
    loadAnalyticsData();
});

async function loadAnalyticsData() {
    const reviewsData = await fetchLast7DaysReviews();

    if (reviewsData && reviewsData.labels && reviewsData.counts) {
        renderReviewsChart(reviewsData.labels, reviewsData.counts);
    } else {
        // Mostra uma mensagem de erro ou estado vazio se não houver dados
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.innerHTML = '<p>Não foi possível carregar os dados ou ainda não há revisões registadas.</p>';
    }
}

function renderReviewsChart(labels, data) {
    const ctx = document.getElementById('reviewsChart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Flashcards Revisados',
                data: data,
                backgroundColor: 'rgba(79, 70, 229, 0.5)', // Cor primária com transparência
                borderColor: 'rgba(79, 70, 229, 1)', // Cor primária
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
                        stepSize: 1 // Força o eixo Y a usar apenas números inteiros
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Esconde a legenda para um visual mais limpo
                }
            }
        }
    });
}