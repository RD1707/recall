document.addEventListener('DOMContentLoaded', () => {
    loadAnalyticsData();
    loadInsightsData(); 
});

async function loadAnalyticsData() {
    const reviewsData = await fetchLast7DaysReviews();
    const chartContainer = document.querySelector('.chart-container');
    
    if (reviewsData && reviewsData.labels && reviewsData.counts) {
        renderReviewsChart(reviewsData.labels, reviewsData.counts);
    } else {
        chartContainer.innerHTML = '<p>Não foi possível carregar os dados de revisões.</p>';
    }
}

async function loadInsightsData() {
    const insightsContent = document.getElementById('insights-content');
    const insightsData = await fetchPerformanceInsights();

    if (insightsData && insightsData.insight) {
        const formattedInsight = insightsData.insight.replace(/\n/g, '<br><br>');
        insightsContent.innerHTML = `<p>${formattedInsight}</p>`;
    } else {
        insightsContent.innerHTML = '<p>Continue a estudar para receber insights personalizados do seu tutor IA!</p>';
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