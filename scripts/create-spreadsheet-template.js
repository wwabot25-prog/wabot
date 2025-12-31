const XLSX = require('xlsx');
const path = require('path');

console.log('📊 CREATING SPREADSHEET TEMPLATE\n');
console.log('='.repeat(80));

// Create workbook
const wb = XLSX.utils.book_new();

// SHEET 1: REGULER
const regulerData = [
    ['No', 'Nama Motor', 'Type', 'Harga OTR', 'DP Minimal', 'Cicilan 11', 'Cicilan 17', 'Cicilan 23', 'Keterangan'],
    [1, 'Honda Beat Street', 'Beat', 19075000, 2100000, 1750000, 1250000, 950000, 'Motor matic gesit untuk harian'],
    [2, 'Honda Vario 160', 'Vario', 28500000, 3500000, 2600000, 1850000, 1450000, 'Matic premium stylish'],
    [3, 'Honda PCX 160', 'PCX', 35500000, 4500000, 3250000, 2350000, 1850000, 'Motor premium mewah'],
    [4, 'Honda ADV 160', 'ADV', 38500000, 5000000, 3550000, 2550000, 2000000, 'Adventure matic'],
    [5, 'Honda Supra X 125', 'Supra', 19050000, 2100000, 1750000, 1250000, 950000, 'Bebek irit tangguh'],
    [6, 'Honda Revo Fit', 'Revo', 17925000, 2000000, 1650000, 1180000, 900000, 'Bebek tangguh'],
    [7, 'Honda CBR150R', 'CBR', 39500000, 5200000, 3650000, 2620000, 2050000, 'Sport racing'],
    [8, 'Honda CRF150L', 'CRF', 38500000, 5000000, 3550000, 2550000, 2000000, 'Trail adventure'],
    [9, 'Honda Sonic 150R', 'Sonic', 25500000, 3200000, 2350000, 1680000, 1320000, 'Sport matic'],
    [10, 'Honda CB150 Verza', 'CB', 23500000, 2900000, 2150000, 1550000, 1200000, 'Sport klasik']
];

const wsReguler = XLSX.utils.aoa_to_sheet(regulerData);
XLSX.utils.book_append_sheet(wb, wsReguler, 'REGULER');

// SHEET 2: EV
const evData = [
    ['No', 'Nama Motor', 'Type', 'Harga OTR', 'DP Minimal', 'Cicilan 11', 'Cicilan 17', 'Cicilan 23', 'Keterangan'],
    [1, 'Honda EM1 e:', 'EM1', 29900000, 3500000, 2750000, 1950000, 1550000, 'Motor listrik modern'],
    [2, 'Honda Icon e:', 'Icon', 25900000, 3000000, 2400000, 1700000, 1350000, 'Motor listrik retro']
];

const wsEV = XLSX.utils.aoa_to_sheet(evData);
XLSX.utils.book_append_sheet(wb, wsEV, 'EV');

// SHEET 3: WINGS
const wingsData = [
    ['No', 'Nama Motor', 'Type', 'Harga OTR', 'DP Minimal', 'Cicilan 11', 'Cicilan 17', 'Cicilan 23', 'Keterangan'],
    [1, 'Honda Genio', 'Genio', 19500000, 2200000, 1800000, 1280000, 980000, 'Matic stylish'],
    [2, 'Honda Scoopy', 'Scoopy', 23500000, 2800000, 2150000, 1550000, 1200000, 'Matic fashion']
];

const wsWings = XLSX.utils.aoa_to_sheet(wingsData);
XLSX.utils.book_append_sheet(wb, wsWings, 'WINGS');

// SHEET 4: DISKON
const diskonData = [
    ['Jenis Promo', 'Tenor', 'Benefit', 'Syarat', 'Berlaku Sampai'],
    ['Potongan Cicilan', '23 bulan', 'Gratis 1 bulan cicilan', 'Semua motor', '31 Des 2024'],
    ['Potongan Cicilan', '29 bulan', 'Gratis 1 bulan cicilan', 'Semua motor', '31 Des 2024'],
    ['Potongan Cicilan', '35 bulan', 'Gratis 1 bulan cicilan', 'Semua motor', '31 Des 2024'],
    ['Cashback', 'Semua', 'Cashback 500rb', 'Pembelian cash', '31 Des 2024'],
    ['DP Ringan', 'Semua', 'DP mulai 10%', 'Semua motor', '31 Des 2024']
];

const wsDiskon = XLSX.utils.aoa_to_sheet(diskonData);
XLSX.utils.book_append_sheet(wb, wsDiskon, 'DISKON');

// Save file
const filePath = path.join(__dirname, '../harga_motor_template.xlsx');
XLSX.writeFile(wb, filePath);

console.log('\n✅ Template created successfully!');
console.log(`📁 Location: ${filePath}\n`);
console.log('─'.repeat(80));
console.log('\n📋 Template includes:');
console.log('  ✅ REGULER sheet - 10 motors');
console.log('  ✅ EV sheet - 2 motors');
console.log('  ✅ WINGS sheet - 2 motors');
console.log('  ✅ DISKON sheet - 5 promos\n');
console.log('─'.repeat(80));
console.log('\n💡 Next steps:');
console.log('  1. Open harga_motor_template.xlsx');
console.log('  2. Edit data sesuai kebutuhan');
console.log('  3. Save as harga_motor.xlsx');
console.log('  4. Test dengan: node scripts/check-excel-data.js\n');
console.log('='.repeat(80));
console.log('\n🎉 Template ready to use!\n');
