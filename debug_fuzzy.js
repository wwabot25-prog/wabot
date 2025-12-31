const whatsappService = {
    findBestMatchFolder: function (targetName, basePath) {
        const fs = require('fs');
        const path = require('path');
        const folders = ['NEW_BEAT_STREET', 'BEAT_SPORTY_CBS', 'ALL_NEW_VARIO_160_CBS']; // Simulasi folder

        let bestMatch = null;
        let highestScore = 0;
        const normalizedTarget = targetName.replace(/_/g, ' ').toLowerCase();

        console.log(`Matching target: '${normalizedTarget}'`);

        for (const folder of folders) {
            const normalizedFolder = folder.replace(/_/g, ' ').toLowerCase();
            let score = this.calculateSimilarity(normalizedTarget, normalizedFolder);

            // Boost score logic
            if (normalizedFolder.includes(normalizedTarget) || normalizedTarget.includes(normalizedFolder)) {
                console.log(`   -> Substring match found for '${folder}'`);
                if (score < 0.8) score = 0.8;
            }

            console.log(`   -> Check '${folder}': Score = ${score.toFixed(4)}`);

            if (score > highestScore) {
                highestScore = score;
                bestMatch = folder;
            }
        }

        return highestScore > 0.4 ? bestMatch : null;
    },

    calculateSimilarity: function (str1, str2) {
        const getBigrams = (str) => {
            const bigrams = new Set();
            for (let i = 0; i < str.length - 1; i++) {
                bigrams.add(str.substring(i, i + 2));
            }
            return bigrams;
        };
        const bigrams1 = getBigrams(str1);
        const bigrams2 = getBigrams(str2);
        let intersection = 0;
        for (const bg of bigrams1) { if (bigrams2.has(bg)) intersection++; }
        const combinedSize = bigrams1.size + bigrams2.size;
        return combinedSize === 0 ? 0 : (2.0 * intersection) / combinedSize;
    }
};

// Test Case
console.log("--- TEST 1: AI sends 'BEAT_STREET' ---");
const result1 = whatsappService.findBestMatchFolder('BEAT_STREET', 'dummy_path');
console.log(`RESULT: ${result1}\n`);

console.log("--- TEST 2: AI sends 'Beat Street' ---");
const result2 = whatsappService.findBestMatchFolder('Beat Street', 'dummy_path');
console.log(`RESULT: ${result2}\n`);
