// analytics.js

let catChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('groupReady', loadAnalyticsData);
    window.addEventListener('groupChanged', loadAnalyticsData);

    if (getActiveGroupId()) {
        loadAnalyticsData();
    }
});

async function loadAnalyticsData() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const res = await apiFetch(`/api/dashboard/analytics?group_id=${groupId}`);
        if (res.success && res.data) {
            renderCharts(res.data);
        }
    } catch (error) {
        console.error("Analytics data load failed", error);
    }
}

function renderCharts(data) {
    const { categories, trend } = data;
    
    // Process categories
    const catLabels = Object.keys(categories).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const catData = Object.values(categories);
    const catColors = ['#2F80ED', '#56CCF2', '#a8f5c4', '#f2f2f2', '#ffc107', '#dc3545'];
    
    const ctxCat = document.getElementById('categoryChart');
    if (ctxCat) {
        if (catChartInstance) catChartInstance.destroy();
        catChartInstance = new Chart(ctxCat.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: catLabels.length ? catLabels : ['None'],
                datasets: [{
                    data: catData.length ? catData : [1],
                    backgroundColor: catData.length ? catColors : ['#e0e0e0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    // Process trend
    const trendLabels = trend.map(t => t.date);
    const trendData = trend.map(t => t.amount);
    
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        if (trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new Chart(ctxTrend.getContext('2d'), {
            type: 'bar',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Group Total Spent (₹)',
                    data: trendData,
                    backgroundColor: '#2F80ED',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}
