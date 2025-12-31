const { google } = require('googleapis');
const path = require('path');
const logger = require('../utils/logger');

class GoogleSheetsService {
    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
        this.auth = null;
        this.sheets = null;
    }

    /**
     * Initialize Google Sheets API
     */
    async initialize() {
        try {
            const credentialsPath = path.join(__dirname, '../../google-credentials.json');

            this.auth = new google.auth.GoogleAuth({
                keyFile: credentialsPath,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });

            logger.info('Google Sheets service initialized');
            return true;
        } catch (error) {
            logger.error('Failed to initialize Google Sheets:', error);
            return false;
        }
    }

    /**
     * Get available tenors from spreadsheet
     */
    async getAvailableTenors() {
        try {
            if (!this.sheets) {
                await this.initialize();
            }

            const metadata = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const sheetNames = metadata.data.sheets.map(sheet => sheet.properties.title);
            const allTenors = new Set();

            // Check each sheet for tenor columns
            for (const sheetName of sheetNames) {
                try {
                    const response = await this.sheets.spreadsheets.values.get({
                        spreadsheetId: this.spreadsheetId,
                        range: `${sheetName}!A1:Z2`, // Read first 2 rows to get headers
                    });

                    const rows = response.data.values;

                    if (rows && rows.length >= 2) {
                        // Row 2 contains tenor numbers (11, 17, 23, 29, 35, 41, 47)
                        const tenorRow = rows[1];

                        // Start from column D (index 3) where tenor columns begin
                        for (let i = 3; i < tenorRow.length; i++) {
                            const value = tenorRow[i]?.toString().trim();

                            // Check if it's a number (tenor in months)
                            if (value && /^\d+$/.test(value)) {
                                allTenors.add(`${value} bulan`);
                            }
                        }
                    }
                } catch (error) {
                    logger.warn(`Could not read tenors from sheet ${sheetName}:`, error.message);
                }
            }

            const tenorList = Array.from(allTenors).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                return numA - numB;
            });

            return tenorList.length > 0 ? tenorList : ['11 bulan']; // Default fallback
        } catch (error) {
            logger.error('Error getting tenor info:', error);
            return ['11 bulan']; // Default fallback
        }
    }

    /**
     * Read data from Google Sheets
     */
    async getDataMotor() {
        try {
            if (!this.sheets) {
                await this.initialize();
            }

            // Get all sheets in the spreadsheet
            const metadata = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const sheetNames = metadata.data.sheets.map(sheet => sheet.properties.title);

            // Get available tenors
            const availableTenors = await this.getAvailableTenors();

            let data = 'DAFTAR MOTOR HONDA:\n\n';
            data += `TENOR TERSEDIA: ${availableTenors.join(', ')}\n`;
            data += `CATATAN: Setiap motor menampilkan cicilan untuk semua tenor yang tersedia\n\n`;
            let motorCount = 0;

            // Read data from each sheet
            for (const sheetName of sheetNames) {
                const response = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}`, // Read ALL rows and columns (no limit)
                });

                const rows = response.data.values;

                if (!rows || rows.length < 3) {
                    logger.info(`Skipping sheet "${sheetName}" - not enough rows (${rows?.length || 0})`);
                    continue; // Need at least header, tenor row, and 1 data row
                }

                // Detect if this is a STOCK Sheet (Pivot Table Structure)
                // Check headers in first few rows
                const headerRowIndex = rows.findIndex(r => r && r.some(c => c && c.toString().toUpperCase().includes('KODE KE 2')));

                if (headerRowIndex !== -1) {
                    logger.info(`  → Detected STOCK Data in sheet "${sheetName}"`);
                    const stockData = this.processStockSheet(rows, headerRowIndex);
                    data += stockData + '\n';
                    continue; // Skip standard processing
                }

                logger.info(`Reading sheet: ${sheetName} (${rows.length} rows)`);
                data += `=== ${sheetName} ===\n`;

                // Row 1 = Main headers (TIPE, OTR, DP, TENOR)
                // Row 2 = Tenor sub-headers (11, 17, 23, 29, 35, 41, 47)
                const mainHeaders = rows[0];
                const tenorHeaders = rows[1];

                // Extract tenor columns (starting from column D, index 3)
                const tenorColumns = [];
                if (tenorHeaders) {
                    for (let i = 3; i < tenorHeaders.length; i++) {
                        const tenorValue = tenorHeaders[i]?.toString().trim();
                        if (tenorValue && /^\d+$/.test(tenorValue)) {
                            tenorColumns.push({
                                index: i,
                                tenor: `${tenorValue} bulan`
                            });
                        }
                    }
                }

                if (tenorColumns.length === 0) {
                    logger.warn(`  → Skipping sheet "${sheetName}" (Not a Standard Price List)`);
                    continue;
                }

                // Process data rows (skip header rows 1 and 2)
                const dataRows = rows.slice(2);

                let lastMotorName = ''; // Track last motor name for rows without name

                dataRows.forEach((row, index) => {
                    if (row && row.length > 0) {
                        const motorName = row[0]?.toString().trim();
                        const otr = row[1]?.toString().trim();
                        const dp = row[2]?.toString().trim();

                        // Check if this row has meaningful data
                        const hasData = otr || dp || row.slice(3).some(cell => cell && cell.toString().trim());

                        if (!hasData) return; // Skip empty rows

                        // Update last motor name if present
                        if (motorName) {
                            lastMotorName = motorName;
                        }

                        // Build motor info
                        let motorInfo = '';

                        // Motor name
                        if (motorName) {
                            motorInfo += motorName;

                            // --- AUTO-INJECT FOLDER NAME (User Requested Integration) ---
                            // Kita cari folder yang cocok agar AI tidak perlu menebak mapping
                            try {
                                const fs = require('fs');
                                const path = require('path');
                                const imagesDir = path.join(__dirname, '../../images/motors');

                                if (fs.existsSync(imagesDir)) {
                                    const folders = fs.readdirSync(imagesDir).filter(f => fs.statSync(path.join(imagesDir, f)).isDirectory());

                                    // Simple Fuzzy Match Logic (Embedded here to avoid dependencies)
                                    const targetNorm = motorName.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    let bestMatch = null;
                                    let bestScore = 0;

                                    for (const folder of folders) {
                                        const folderNorm = folder.toLowerCase().replace(/[^a-z0-9]/g, '');

                                        // Check similarity (Dice coeff simplified)
                                        const getBigrams = (str) => {
                                            const s = new Set();
                                            for (let i = 0; i < str.length - 1; i++) s.add(str.substring(i, i + 2));
                                            return s;
                                        };
                                        const b1 = getBigrams(targetNorm);
                                        const b2 = getBigrams(folderNorm);
                                        let intersect = 0;
                                        for (const x of b1) if (b2.has(x)) intersect++;
                                        const score = (2.0 * intersect) / (b1.size + b2.size || 1);

                                        // Boost exact containment
                                        let finalScore = score;
                                        if (folderNorm.includes(targetNorm) || targetNorm.includes(folderNorm)) {
                                            if (finalScore < 0.8) finalScore = 0.8;
                                        }

                                        if (finalScore > bestScore) {
                                            bestScore = finalScore;
                                            bestMatch = folder;
                                        }
                                    }

                                    if (bestMatch && bestScore > 0.4) {
                                        motorInfo += ` (Kode Gambar: [FOLDER_IMG: ${bestMatch}])`;
                                    }
                                }
                            } catch (err) {
                                // Silent fail for folder matching
                            }
                            // ------------------------------------------------------------

                        } else if (lastMotorName) {
                            motorInfo += `${lastMotorName} (variasi DP)`;
                        } else {
                            return; // Skip if no motor name available
                        }

                        // OTR and DP
                        if (otr) motorInfo += ` | OTR: ${otr}`;
                        if (dp) motorInfo += ` | DP: ${dp}`;

                        // Cicilan for each tenor
                        tenorColumns.forEach(tenorCol => {
                            const cicilan = row[tenorCol.index]?.toString().trim();
                            if (cicilan && cicilan !== '-' && cicilan !== '') {
                                motorInfo += ` | Cicilan ${tenorCol.tenor}: ${cicilan}`;
                            }
                        });

                        // Only add if we have OTR or DP (meaningful data)
                        if (otr || dp) {
                            motorCount++;
                            data += `${motorCount}. ${motorInfo}\n`;
                        }
                    }
                });

                const motorsInSheet = motorCount - (data.match(/===.*===/g)?.length - 1 || 0) * 0; // Count motors added in this sheet
                logger.info(`  → Found ${rows.length - 2} data rows in sheet "${sheetName}"`);

                data += '\n';
            }

            if (motorCount === 0) {
                return 'Data motor tersedia, silakan hubungi untuk info lengkap.';
            }

            logger.info(`✅ Loaded ${motorCount} motor entries from Google Sheets`);

            // Log first 3 motors for verification
            const firstMotors = data.split('\n').slice(0, 8).join('\n');
            logger.info(`Preview data:\n${firstMotors}...`);

            return data;

        } catch (error) {
            logger.error('Error reading Google Sheets:', error);
            return 'Data motor tersedia, silakan hubungi untuk info lengkap.';
        }
    }

    /**
     * Parse Stock Sheet (Pivot Table Hierarchical Structure)
     */
    processStockSheet(rows, headerIndex) {
        let output = '\n=== INFO STOK UNIT ===\n';

        // Find column indices
        const headerRow = rows[headerIndex];
        const colYear = headerRow.findIndex(c => c.toString().toUpperCase().includes('TAHUN')); // A
        const colModel = headerRow.findIndex(c => c.toString().toUpperCase().includes('KODE KE 2')); // B
        const colColor = headerRow.findIndex(c => c.toString().toUpperCase().includes('WARNA')); // D
        const colTotal = headerRow.findIndex(c => c.toString().toUpperCase().includes('TOTAL')); // E (Last)

        if (colModel === -1 || colColor === -1 || colTotal === -1) {
            return output + '(Gagal membaca format tabel stok)\n';
        }

        let currentYear = '';
        let currentModel = '';
        let stockCount = 0;

        // Iterate data rows
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // Extract values
            const yearVal = row[colYear]?.toString().trim();
            const modelVal = row[colModel]?.toString().trim();
            let colorVal = row[colColor]?.toString().trim();
            const totalVal = row[colTotal]?.toString().trim();

            // Logic Hierarki:
            // 1. Update Year jika ada
            if (yearVal && !yearVal.includes('Total')) {
                currentYear = yearVal;
            }

            // 2. Skip baris Total / Subtotal (misal "2024 Total")
            if ((yearVal && yearVal.toLowerCase().includes('total')) || (modelVal && modelVal.toLowerCase().includes('total'))) {
                continue;
            }

            // 3. Update Model jika ada
            if (modelVal) {
                currentModel = modelVal;
            }

            // COLOR MAPPING DICTIONARY
            const colorMap = {
                'WH': 'Putih (White)',
                'BK': 'Hitam (Black)',
                'RD': 'Merah (Red)',
                'SV': 'Silver',
                'BL': 'Biru (Blue)',
                'GY': 'Abu-abu (Grey)',
                'BR': 'Coklat (Brown)',
                'MH': 'Matte Hitam',
                'MB': 'Matte Biru',
                'MC': 'Matte Coklat',
                'MR': 'Matte Merah',
                'MS': 'Matte Silver',
                'GN': 'Hijau (Green)',
                'GR': 'Hijau (Green)',
                'OR': 'Orange',
                'YW': 'Kuning (Yellow)',
                'PK': 'Pink',
                'CR': 'Cream',
                'BW': 'Brown (Coklat)',
                'BP': 'Biru Putih',
                'BB': 'Biru Hitam',
                'PD': 'Putih Doff',
                'PH': 'Putih Hitam',
                'CW': 'Cream White'
            };

            // 4. Ambil Stok
            if (currentModel && colorVal && totalVal && totalVal !== '0') {
                // Decode Color Code if exists in map
                let displayColor = colorVal;
                const cleanCode = colorVal.trim().toUpperCase();
                if (colorMap[cleanCode]) {
                    displayColor = colorMap[cleanCode];
                }

                output += `• ${currentModel} (${currentYear}) - Warna ${displayColor} [${cleanCode}]: ${totalVal} unit\n`;
                stockCount++;
            }
        }

        if (stockCount === 0) output += 'Belum ada data stok tersedia.\n';
        return output;
    }

    /**
     * Create and Populate Stock Sheet
     */
    async writeStockData(dataRows) {
        try {
            if (!this.sheets) await this.initialize();

            const SHEET_NAME = 'DATA_STOK';

            // 1. Check if sheet exists
            const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
            let sheetId = null;
            const sheetExists = metadata.data.sheets.some(s => {
                if (s.properties.title === SHEET_NAME) {
                    sheetId = s.properties.sheetId;
                    return true;
                }
                return false;
            });

            // 2. Create sheet if not exists
            if (!sheetExists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }]
                    }
                });
                logger.info(`Sheet '${SHEET_NAME}' created.`);
            }

            // 3. Prepare Data
            // Header: TAHUN, KODE KE 2, WARNA, TOTAL (Simplified)
            const header = ['TAHUN', 'KODE KE 2', 'WARNA', 'TOTAL'];
            const values = [header, ...dataRows];

            // 4. Clear and Write
            // First, clear existing content to remove ghost columns (like the old barcode column)
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: SHEET_NAME, // Clear whole sheet
            });

            // Then write new clean data
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${SHEET_NAME}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: values }
            });

            logger.info(`Successfully wrote ${dataRows.length} stock rows to '${SHEET_NAME}'`);
            return true;

        } catch (error) {
            logger.error('Failed to write stock data:', error);
            return false;
        }
    }
}

module.exports = new GoogleSheetsService();
