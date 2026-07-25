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

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderCharts(data) {
    const { categories, trend } = data;
    
    const textColor = getCSSVar('--text-primary');
    const gridColor = getCSSVar('--border-color');
    const colorPrimary = getCSSVar('--color-primary');
    
    // Process categories
    const catLabels = Object.keys(categories).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const catData = Object.values(categories);
    const catColors = [
        getCSSVar('--color-primary'), 
        getCSSVar('--color-accent'), 
        getCSSVar('--warning'), 
        getCSSVar('--danger'), 
        getCSSVar('--success'), 
        getCSSVar('--info')
    ];
    
    const ctxCat = document.getElementById('categoryChart');
    if (ctxCat) {
        if (catChartInstance) catChartInstance.destroy();
        catChartInstance = new Chart(ctxCat.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: catLabels.length ? catLabels : ['None'],
                datasets: [{
                    data: catData.length ? catData : [1],
                    backgroundColor: catData.length ? catColors : [getCSSVar('--bg-surface-secondary')],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { color: textColor }
                    }
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
                    backgroundColor: colorPrimary,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });
    }
}

window.addEventListener('themeChanged', () => {
    loadAnalyticsData();
});

