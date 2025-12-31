const XLSX = require('xlsx');

console.log('📊 CHECKING data_motor.xlsx\n');
console.log('='.repeat(80));

try {
    const wb = XLSX.readFile('data_motor.xlsx');

    console.log('\n✅ File found!');
    console.log(`📋 Sheets: ${wb.SheetNames.join(', ')}\n`);

    wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        console.log(`\n${sheetName}:`);
        console.log(`  Total rows: ${data.length}`);

        if (data.length > 0) {
            console.log(`  Columns: ${data[0].filter(c => c).join(', ')}`);
            console.log(`  Sample data (row 2): ${data[1] ? data[1].filter(c => c).join(' | ') : 'N/A'}`);
        }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Excel file is ready!\n');

} catch (error) {
    console.log('\n❌ Error:', error.message);
}
