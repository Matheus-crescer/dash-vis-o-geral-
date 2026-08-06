// ============================================================
// DASHBOARD DATA
// ============================================================

const chartData = {
    // City revenue
    cities: {
        labels: ['Teófilo Otoni', 'Vila Velha', 'Vitória', 'Nanuque', 'Carlos Chagas', 'Colatina', 'Cachoeiro', 'Itapemirim', 'Linhares', 'São Mateus'],
        revenue: [35080, 9667, 3346, 2284, 1897, 1635, 1421, 1389, 1246, 1198]
    },

    // Payment methods distribution (orders)
    paymentDistribution: {
        labels: ['Pix', 'Mastercard', 'Visa', 'Outros'],
        values: [607, 120, 40, 14]
    },

    // Payment methods revenue
    paymentRevenue: {
        labels: ['Pix', 'Mastercard', 'Visa', 'Outros'],
        values: [39093, 17428, 6294, 1000]
    },

    // SLA categories
    sla: {
        labels: ['Flash Delivery', 'Retire em Loja', 'Correios', 'Outro'],
        orders: [520, 180, 60, 21],
        revenue: [53020, 7800, 2995, 0]
    },

    // Channels
    channels: {
        labels: ['App Android', 'App iOS', 'Google', 'Outros', 'Não rastreado'],
        orders: [424, 230, 45, 32, 50],
        ticket: [68.97, 97.74, 85.50, 72.30, 60.00]
    },

    // Daily evolution (31 days)
    daily: {
        dates: ['28/06','29/06','30/06','01/07','02/07','03/07','04/07','05/07','06/07','07/07','08/07','09/07','10/07','11/07','12/07','13/07','14/07','15/07','16/07','17/07','18/07','19/07','20/07','21/07','22/07','23/07','24/07','25/07','26/07','27/07','28/07'],
        revenue: [2100, 1850, 8548, 2450, 2200, 1900, 2100, 1750, 2300, 2050, 1950, 2400, 2100, 1800, 2250, 1900, 2500, 2100, 1850, 2200, 1950, 2350, 2100, 1750, 2400, 2050, 1900, 2200, 1850, 2100, 2000],
        orders: [26, 22, 35, 28, 25, 23, 26, 20, 27, 24, 22, 29, 25, 21, 27, 22, 30, 26, 21, 26, 23, 28, 25, 19, 29, 24, 22, 26, 21, 25, 24]
    },

    // Top products
    products: {
        labels: ['Pó Facial 10g', 'Base Líquida', 'Paleta Sombras', 'Batom Matte', 'Kit Skincare', 'Máscara Cílios', 'Blush', 'Delineador', 'Corretivo', 'Sérum Vit C'],
        revenue: [8540, 6230, 5890, 4760, 4120, 3890, 3450, 3120, 2890, 2670]
    }
};

// Chart colors
const colors = {
    primary: '#1F4E79',
    primaryLight: '#2E75B6',
    primaryLighter: '#5B9BD5',
    accent: '#FFC000',
    danger: '#C62828',
    warning: '#F57C00',
    success: '#2E7D32',
    info: '#1565C0',
    palette: ['#1F4E79', '#2E75B6', '#5B9BD5', '#9DC3E6', '#BDD7EE', '#DEEBF7', '#FFC000', '#C65911', '#2E7D32', '#C62828']
};
