require('dotenv').config();
const XLSX = require('xlsx');
const path = require('path');

console.log('📊 DEEP ANALYSIS OF EXCEL FILE\n');
console.log('='.repeat(80));

// Read Excel
const excelPath = path.join(__dirname, '../harga_motor.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log(`\n✅ Excel file: ${excelPath}`);
console.log(`📋 Sheets: ${workbook.SheetNames.join(', ')}\n`);

workbook.SheetNames.forEach((sheetName) => {
    console.log('='.repeat(80));
    console.log(`\nSHEET: "${sheetName}"\n`);
    console.log('─'.repeat(80));

    const worksheet = workbook.Sheets[sheetName];

    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`Range: ${worksheet['!ref']}`);
    console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}\n`);

    // Read as array (preserves structure)
    const dataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('First 10 rows (raw data):\n');
    dataArray.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, row.filter(cell => cell !== undefined && cell !== '').join(' | '));
    });

    console.log('\n');
});

console.log('='.repeat(80));
console.log('\n� RECOMMENDATION:');
console.log('Please check the Excel file structure manually.');
console.log('The data might be in a non-standard format (e.g., pivot table).\n');
