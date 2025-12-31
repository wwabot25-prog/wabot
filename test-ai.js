/**
 * Script Test Kecerdasan AI WhatsApp
 * Menjalankan berbagai skenario pertanyaan untuk mengevaluasi kemampuan AI
 */

require('dotenv').config();
const aiService = require('./src/services/aiService');

// Test cases dengan berbagai kategori pertanyaan
const testCases = [
    {
        category: '🔍 DATA MOTOR & HARGA',
        tests: [
            { question: 'Halo, mau tanya harga Beat CBS', expect: ['harga', 'Beat', 'angsuran'] },
            { question: 'Vario 160 ada warna apa aja?', expect: ['warna', 'Vario', 'color'] },
            { question: 'Berapa DP PCX?', expect: ['DP', 'PCX'] },
        ]
    },
    {
        category: '📍 ALAMAT & LOKASI',
        tests: [
            { question: 'Dealer dimana alamatnya?', expect: ['Cibadak', 'Sukabumi', 'maps'] },
            { question: 'Dimana lokasi dealer?', expect: ['lokasi', 'alamat'] },
            { question: 'Buka jam berapa?', expect: ['08.00', '17.00', 'buka'] },
        ]
    },
    {
        category: '📋 KREDIT & SYARAT',
        tests: [
            { question: 'Apa syarat kredit?', expect: ['KTP', 'KK', 'Slip Gaji'] },
            { question: 'Gimana cara ajukan kredit?', expect: ['pilih', 'dokumen', 'survey', 'approval'] },
            { question: 'KTP luar kota bisa nggak?', expect: ['bisa', 'domisili', 'Sukabumi'] },
        ]
    },
    {
        category: '⚠️ ANTI-HALUSINASI TEST',
        tests: [
            { question: 'Berapa cc motor Kawasaki Ninja?', expect: ['tidak', 'Honda', 'motor Honda'] },
            { question: 'Ada motor Yamaha NMax nggak?', expect: ['tidak', 'Honda', 'NSS'] },
            { question: 'Berapa harga motor vespa?', expect: ['tidak', 'Honda'] },
        ]
    },
    {
        category: '💡 KONTEKS & FOLLOW-UP',
        tests: [
            { question: 'Berapa harga Beat?', expect: ['harga', 'Beat'] },
            { question: 'Warna apa aja?', expect: ['warna', 'Beat'] }, // harus context Beat
            { question: 'Gimana cara kreditnya?', expect: ['kredit', 'Beat'] }, // harus context Beat
        ]
    },
    {
        category: '🎯 MARKER GAMBAR',
        tests: [
            { question: 'Tolong dong fotoin Beat', expect: ['[SEND_IMAGE:', 'BEAT'] },
            { question: 'Minta foto warna Vario', expect: ['[SEND_ALL_COLORS:', 'VARIO'] },
            { question: 'Gimana simulasi kredit Scoopy?', expect: ['[SEND_PRICELIST:', 'SCOPY'] },
        ]
    },
];

// ANSI colors untuk output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

async function runTest(test, userId) {
    try {
        const response = await aiService.processChat(test.question, userId);

        // Check apakah response mengandung expected keywords
        const lowerResponse = response.toLowerCase();
        const matched = test.expect.some(keyword =>
            lowerResponse.includes(keyword.toLowerCase())
        );

        return {
            question: test.question,
            response: response,
            expected: test.expect,
            matched: matched,
            hasMarker: response.includes('[SEND_'),
        };
    } catch (error) {
        return {
            question: test.question,
            response: `ERROR: ${error.message}`,
            expected: test.expect,
            matched: false,
            hasMarker: false,
        };
    }
}

function printResult(result, index) {
    console.log(`\n${colors.cyan}═══ Test #${index + 1} ═══${colors.reset}`);
    console.log(`${colors.yellow}Question:${colors.reset} ${result.question}`);
    console.log(`${colors.blue}Expected Keywords:${colors.reset} ${result.expected.join(', ')}`);
    console.log(`${colors.blue}Response:${colors.reset}`);
    console.log('─'.repeat(60));
    console.log(result.response);
    console.log('─'.repeat(60));

    // Status
    if (result.response.includes('ERROR')) {
        console.log(`${colors.red}❌ ERROR${colors.reset}`);
    } else if (result.matched) {
        console.log(`${colors.green}✅ PASS${colors.reset} - Mengandung keyword yang diharapkan`);
    } else {
        console.log(`${colors.red}❌ FAIL${colors.reset} - Tidak mengandung keyword yang diharapkan`);
    }

    if (result.hasMarker) {
        console.log(`${colors.green}✅ Marker terdeteksi${colors.reset}`);
    }
}

async function main() {
    console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║     TEST KECERDASAN AI WHATSAPP HONDA NSS CIBADAK       ║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    if (!aiService.enabled) {
        console.log(`${colors.red}❌ AI Service tidak aktif! Cek GEMINI_API_KEY di .env${colors.reset}`);
        return;
    }

    const userId = 'test-user-' + Date.now();
    let totalTests = 0;
    let passedTests = 0;
    let markerTests = 0;

    for (const category of testCases) {
        console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
        console.log(`${colors.cyan}${category.category}${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);

        for (const test of category.tests) {
            const result = await runTest(test, userId);
            printResult(result, totalTests);

            totalTests++;
            if (result.matched && !result.response.includes('ERROR')) passedTests++;
            if (result.hasMarker) markerTests++;

            // Delay untuk menghindari rate limit (Gemini free tier: 5 req/min)
            await new Promise(resolve => setTimeout(resolve, 15000)); // 15 detik delay
        }
    }

    // Summary
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}                    SUMMARY                           ${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
    console.log(`${colors.yellow}Total Tests:${colors.reset} ${totalTests}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`${colors.blue}Marker Tests:${colors.reset} ${markerTests} tests menghasilkan marker`);
    console.log(`${colors.red}Failed:${colors.reset} ${totalTests - passedTests}/${totalTests}`);

    const score = Math.round((passedTests / totalTests) * 100);
    console.log(`\n${colors.cyan}AI Score:${colors.reset} ${score}/100`);

    if (score >= 90) {
        console.log(`${colors.green}🎉 SANGAT PINTAR!${colors.reset}`);
    } else if (score >= 70) {
        console.log(`${colors.yellow}👍 CUKUP PINTAR${colors.reset}`);
    } else if (score >= 50) {
        console.log(`${colors.yellow}😐 PERLU PENINGKATAN${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ BUTUH PERBAIKAN SERIUS${colors.reset}`);
    }

    console.log(`${colors.reset}\n`);
}

main().catch(console.error);
