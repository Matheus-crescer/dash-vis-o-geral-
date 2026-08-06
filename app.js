// ============================================================
// PREMIUM DASHBOARD — JavaScript
// ============================================================

// --- NAVIGATION ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        navigateTo(section);
    });
});

function navigateTo(sectionId) {
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${sectionId}"]`)?.classList.add('active');

    document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        // Re-trigger animations
        target.querySelectorAll('.animate-in').forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; // trigger reflow
            el.style.animation = '';
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- COUNTER ANIMATION ---
function animateCounters() {
    document.querySelectorAll('.kpi-number[data-target]').forEach(el => {
        const target = parseFloat(el.dataset.target);
        const isDecimal = target % 1 !== 0;
        const duration = 1500;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;

            if (target > 100) {
                el.textContent = Math.floor(current).toLocaleString('pt-BR');
            } else if (isDecimal) {
                el.textContent = current.toFixed(2);
            } else {
                el.textContent = Math.floor(current).toLocaleString('pt-BR');
            }

            if (progress < 1) requestAnimationFrame(update);
            else {
                el.textContent = isDecimal ? target.toFixed(2) : Math.floor(target).toLocaleString('pt-BR');
            }
        }
        requestAnimationFrame(update);
    });
}

// --- CHART CONFIGURATION ---
const isDark = true;
const gridColor = 'rgba(255,255,255,0.06)';
const tickColor = '#CBD5E1';
const tooltipBg = 'rgba(15, 23, 42, 0.95)';
const tooltipBorder = 'rgba(255,255,255,0.1)';

Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = tickColor;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
Chart.defaults.plugins.tooltip.backgroundColor = tooltipBg;
Chart.defaults.plugins.tooltip.borderColor = tooltipBorder;
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 10;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 13 };
Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };

// --- CITY CHART ---
new Chart(document.getElementById('cityChart'), {
    type: 'bar',
    data: {
        labels: chartData.cities.labels,
        datasets: [{
            label: 'Faturamento (R$)',
            data: chartData.cities.revenue,
            backgroundColor: [
                'rgba(31, 78, 121, 0.85)',
                'rgba(46, 117, 182, 0.85)',
                'rgba(91, 155, 213, 0.85)',
                'rgba(157, 195, 230, 0.85)',
                'rgba(189, 215, 238, 0.85)',
                'rgba(222, 235, 247, 0.85)',
                'rgba(255, 192, 0, 0.85)',
                'rgba(198, 89, 17, 0.85)',
                'rgba(46, 125, 50, 0.85)',
                'rgba(198, 40, 40, 0.85)',
            ],
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 28,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: { label: ctx => `R$ ${ctx.parsed.y.toLocaleString('pt-BR')}` }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: v => `R$ ${(v/1000).toFixed(0)}K`, color: tickColor },
                grid: { color: gridColor, drawBorder: false }
            },
            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' }
    }
});

// --- PAYMENT PIE ---
function createDoughnut(canvasId) {
    new Chart(document.getElementById(canvasId), {
        type: 'doughnut',
        data: {
            labels: chartData.paymentDistribution.labels,
            datasets: [{
                data: chartData.paymentDistribution.values,
                backgroundColor: ['#10B981', '#DC2626', '#3B82F6', '#64748B'],
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, font: { size: 12, weight: '600' } }
                }
            },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });
}
createDoughnut('paymentChart');
createDoughnut('paymentChart2');

// --- SLA CHART ---
new Chart(document.getElementById('slaChart'), {
    type: 'bar',
    data: {
        labels: chartData.sla.labels,
        datasets: [{
            label: 'Pedidos',
            data: chartData.sla.orders,
            backgroundColor: 'rgba(91, 155, 213, 0.75)',
            borderRadius: 8,
            barThickness: 32,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' }
    }
});

// --- PAYMENT REVENUE CHART ---
new Chart(document.getElementById('paymentRevenueChart'), {
    type: 'bar',
    data: {
        labels: chartData.paymentRevenue.labels,
        datasets: [{
            label: 'Faturamento (R$)',
            data: chartData.paymentRevenue.values,
            backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(220, 38, 38, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(100, 116, 139, 0.8)'],
            borderRadius: 8,
            barThickness: 36,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `R$ ${ctx.parsed.y.toLocaleString('pt-BR')}` } }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: v => `R$ ${(v/1000).toFixed(0)}K`, color: tickColor },
                grid: { color: gridColor }
            },
            x: { grid: { display: false }, ticks: { color: tickColor } }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' }
    }
});

// --- CHANNEL CHART ---
new Chart(document.getElementById('channelChart'), {
    type: 'bar',
    data: {
        labels: chartData.channels.labels,
        datasets: [{
            label: 'Pedidos',
            data: chartData.channels.orders,
            backgroundColor: [
                'rgba(46, 125, 50, 0.8)',
                'rgba(31, 78, 121, 0.8)',
                'rgba(255, 192, 0, 0.8)',
                'rgba(100, 116, 139, 0.6)',
                'rgba(100, 116, 139, 0.4)',
            ],
            borderRadius: 8,
            barThickness: 30,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' }
    }
});

// --- SLA TICKET CHART ---
new Chart(document.getElementById('slaTicketChart'), {
    type: 'bar',
    data: {
        labels: chartData.sla.labels,
        datasets: [{
            label: 'Ticket Médio (R$)',
            data: [101.97, 43.33, 189.45, 52.00],
            backgroundColor: [
                'rgba(31, 78, 121, 0.8)',
                'rgba(100, 116, 139, 0.5)',
                'rgba(255, 192, 0, 0.8)',
                'rgba(100, 116, 139, 0.4)',
            ],
            borderRadius: 8,
            barThickness: 32,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `R$ ${ctx.parsed.y.toLocaleString('pt-BR')}` } }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { callback: v => `R$ ${v}`, color: tickColor } },
            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' }
    }
});

// --- DAILY REVENUE CHART ---
new Chart(document.getElementById('dailyRevenueChart'), {
    type: 'line',
    data: {
        labels: chartData.daily.dates,
        datasets: [{
            label: 'Faturamento (R$)',
            data: chartData.daily.revenue,
            borderColor: '#5B9BD5',
            backgroundColor: 'rgba(91, 155, 213, 0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#5B9BD5',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 2.5,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `R$ ${ctx.parsed.y.toLocaleString('pt-BR')}` } }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: v => `R$ ${(v/1000).toFixed(1)}K`, color: tickColor },
                grid: { color: gridColor, drawBorder: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: tickColor, maxTicksLimit: 12, font: { size: 10 } }
            }
        },
        animation: { duration: 1500, easing: 'easeOutQuart' }
    }
});

// --- DAILY ORDERS CHART ---
new Chart(document.getElementById('dailyOrdersChart'), {
    type: 'bar',
    data: {
        labels: chartData.daily.dates,
        datasets: [{
            label: 'Pedidos',
            data: chartData.daily.orders,
            backgroundColor: 'rgba(46, 117, 182, 0.6)',
            borderRadius: 4,
            barThickness: 14,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
            x: { grid: { display: false }, ticks: { color: tickColor, maxTicksLimit: 12, font: { size: 10 } } }
        },
        animation: { duration: 1500, easing: 'easeOutQuart' }
    }
});

// --- PRODUCTS CHART ---
new Chart(document.getElementById('productsChart'), {
    type: 'bar',
    data: {
        labels: chartData.products.labels,
        datasets: [{
            label: 'Faturamento (R$)',
            data: chartData.products.revenue,
            backgroundColor: [
                'rgba(31, 78, 121, 0.85)',
                'rgba(46, 117, 182, 0.85)',
                'rgba(91, 155, 213, 0.85)',
                'rgba(157, 195, 230, 0.85)',
                'rgba(189, 215, 238, 0.85)',
                'rgba(222, 235, 247, 0.85)',
                'rgba(255, 192, 0, 0.85)',
                'rgba(198, 89, 17, 0.85)',
                'rgba(46, 125, 50, 0.85)',
                'rgba(198, 40, 40, 0.85)',
            ],
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 24,
        }]
    },
    options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `R$ ${ctx.parsed.x.toLocaleString('pt-BR')}` } }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { callback: v => `R$ ${(v/1000).toFixed(1)}K`, color: tickColor },
                grid: { color: gridColor, drawBorder: false }
            },
            y: { grid: { display: false }, ticks: { color: tickColor, font: { size: 12, weight: '500' } } }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' }
    }
});

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    animateCounters();
});
