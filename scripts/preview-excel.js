const XLSX = require('xlsx');
const path = require('path');

// Read Excel file
const filePath = path.join(__dirname, '../harga_motor.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Excel File Preview:\n');
console.log('Sheet Name:', sheetName);
console.log('Total Rows:', data.length);
console.log('\nFirst 3 rows:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

console.log('\nColumn Names:');
if (data.length > 0) {
    console.log(Object.keys(data[0]));
}
