require('dotenv').config({ path: '.env' });
const googleSheetsService = require('../src/services/googleSheetsService');
const logger = require('../src/utils/logger');

// Data transkripsi LENGKAP (REVISI: TANPA KODE BARANG)
// Format Columns Baru: [TAHUN, KODE KE 2, WARNA, TOTAL]
const stockData = [
    // === 2024 ===
    ['2024', 'CUV E', 'WH', '1'],
    ['2024', 'NEW PCX 160 ROADSYNC', 'BK', '1'],

    // === 2025 ===
    ['2025', 'ADV160ABS', 'BW', '1'],
    ['2025', 'BEAT SPORTY CBS', 'MH', '2'],
    ['2025', 'BEAT SPORTY CBS', 'GN', '4'],
    ['2025', 'BEAT SPORTY CBS ISS', 'BK', '18'],
    ['2025', 'BEAT SPORTY DLX', 'BK', '16'],
    ['2025', 'BEAT SPORTY DLX', 'BL', '8'],
    ['2025', 'BEAT SPORTY DLX', 'BW', '17'],
    ['2025', 'BEAT SPORTY DLX NEW', 'BK', '7'],
    ['2025', 'BEAT STREET', 'BW', '12'],
    ['2025', 'BEAT STREET', 'WH', '20'],
    ['2025', 'CUV E', 'BK', '1'],
    ['2025', 'CUV E', 'WH', '1'],
    ['2025', 'CUV E', 'SV', '1'],
    ['2025', 'CUV E', 'WH', '2'],
    ['2025', 'GENIO CBS', 'PD', '1'],
    ['2025', 'GENIO CBS', 'PH', '1'],
    ['2025', 'GENIO CBS ISS', 'BK', '1'],
    ['2025', 'GENIO CBS ISS', 'GN', '1'],
    ['2025', 'ICON E', 'GN', '1'],
    ['2025', 'ICON E', 'OR', '2'],
    ['2025', 'ICON E', 'RD', '1'],
    ['2025', 'ICON E', 'WH', '1'],
    ['2025', 'NEW BEAT SPORTY CBS', 'MH', '3'],
    ['2025', 'NEW PCX 160 ABS', 'BK', '5'],
    ['2025', 'NEW PCX 160 ABS', 'SV', '3'],
    ['2025', 'NEW PCX 160 ABS', 'WH', '5'],
    ['2025', 'NEW PCX 160 CBS', 'BK', '4'],
    ['2025', 'NEW PCX 160 CBS', 'RD', '20'],
    ['2025', 'NEW PCX 160 CBS', 'SV', '6'],
    ['2025', 'NEW PCX 160 CBS', 'WH', '9'],
    ['2025', 'NEW PCX 160 ROADSYNC', 'BK', '6'],
    ['2025', 'NEW PCX 160 ROADSYNC', 'RD', '7'],
    ['2025', 'NEW SCOOPY ENERGETIC', 'MH', '1'],
    ['2025', 'NEW SCOOPY FASHION', 'BP', '2'],
    ['2025', 'NEW SCOOPY FASHION', 'CW', '4'],
    ['2025', 'NEW SCOOPY FASHION', 'BK', '3'],
    ['2025', 'NEW SCOOPY FASHION', 'CR', '1'],
    ['2025', 'NEW SCOOPY FASHION', 'RD', '3'],
    ['2025', 'NEW SCOOPY PRESTIGE', 'RD', '1'],
    ['2025', 'NEW SCOOPY STYLISH', 'GN', '6'],
    ['2025', 'NEW SCOOPY STYLISH', 'RD', '1'],
    ['2025', 'REVO FIT', 'BB', '4'],
    ['2025', 'REVO FIT', 'BR', '1'],
    ['2025', 'SUPRA X 125 FI CW', 'MH', '1'],
    ['2025', 'VARIO 125 STREET', 'BR', '1'],
    ['2025', 'VARIO 160 ABS', 'BK', '1'],
    ['2025', 'VARIO 160 CBS', 'BK', '2'],
    ['2025', 'VARIO 160 CBS', 'BL', '4'],
    ['2025', 'VARIO 160 CBS', 'RD', '2'],

    // === 2026 ===
    ['2026', 'BEAT SPORTY CBS', 'BK', '3'],
    ['2026', 'BEAT SPORTY CBS', 'GN', '2'],
    ['2026', 'BEAT STREET', 'BK', '3'],
    ['2026', 'BEAT STREET', 'BW', '1'],
    ['2026', 'GENIO CBS ISS', 'BW', '1'],
    ['2026', 'GENIO CBS ISS', 'GN', '1'],
    ['2026', 'NEW SCOOPY PRESTIGE', 'BK', '2'],
    ['2026', 'NEW SCOOPY PRESTIGE', 'RD', '1'],
    ['2026', 'NEW SCOOPY PRESTIGE', 'WH', '1'],
    ['2026', 'NEW SCOOPY STYLISH', 'CR', '2'],
    ['2026', 'NEW SCOOPY STYLISH', 'GN', '3'],
    ['2026', 'NEW SCOOPY STYLISH', 'GR', '2']
];

async function deploy() {
    console.log('🚀 Deploying CLEAN Stock Data (No Barcode)...');

    // Perlu update logic deploy sedikit
    const result = await googleSheetsService.writeStockData(stockData);

    if (result) {
        console.log('✅ SUCCESS! Sheet "DATA_STOK" cleaned up.');
        console.log('Cek Google Sheet sekarang!');
    } else {
        console.error('❌ FAILED to deploy data.');
    }
}

deploy();
