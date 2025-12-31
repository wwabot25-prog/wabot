const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

// Configuration
const IMAGES_DIR = path.join(__dirname, '../images/motors');
const MIN_IMAGES = 2; // If folder has fewer than this, download more
const DOWNLOAD_COUNT = 4; // Number of images to download per motor

// Helper to delay execution (respectful scraping)
// Wait 2-5 seconds between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Download image from URL
async function downloadImage(url, filepath) {
    try {
        const writer = fs.createWriteStream(filepath);

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 10000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Handle loose SSL
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        // Silent fail for individual image download
        throw new Error(`Failed download: ${error.message}`);
    }
}

// Helper: Get Image URLs from DuckDuckGo (Simple API simulation)
// Note: This matches DuckDuckGo's internal API for images
async function getImageUrls(query) {
    try {
        console.log(`🔍 Searching images for: ${query}...`);

        // 1. Get Token
        // DDG requires a 'vqd' token for search
        const searchPage = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const vqdMatch = searchPage.data.match(/vqd="([^"]+)"/);
        if (!vqdMatch) {
            console.log('⚠️ Could not extract VQD token');
            return [];
        }
        const vqd = vqdMatch[1];

        // 2. Fetch Images
        const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;

        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (res.data && res.data.results) {
            // Return array of image URLs
            return res.data.results.map(item => item.image);
        }

        return [];

    } catch (error) {
        console.error(`❌ Search error for ${query}:`, error.message);
        return [];
    }
}

// Main logic
async function main() {
    console.log('🚀 Starting Auto Image Downloader...');
    console.log(`📂 Scanning directory: ${IMAGES_DIR}`);

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error('❌ Images directory not found!');
        return;
    }

    const folders = fs.readdirSync(IMAGES_DIR).filter(file => {
        return fs.statSync(path.join(IMAGES_DIR, file)).isDirectory();
    });

    for (const folder of folders) {
        const folderPath = path.join(IMAGES_DIR, folder);
        const files = fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

        console.log(`\n🏍️ Checking: ${folder} (${files.length} images)`);

        if (files.length < MIN_IMAGES) {
            console.log(`📉 Needs more images! (Found ${files.length}, Target ${MIN_IMAGES}+)`);

            // Generate search query from folder name
            // "ALL_NEW_CBR_150R" -> "Honda All New CBR 150R Official"
            const searchQuery = `Honda ${folder.replace(/_/g, ' ')} official color studio`;

            const urls = await getImageUrls(searchQuery);

            if (urls.length > 0) {
                let downloaded = 0;
                let attempt = 0;

                // Try to download until we hit DOWNLOAD_COUNT or run out of URLs
                while (downloaded < DOWNLOAD_COUNT && attempt < urls.length) {
                    const imageUrl = urls[attempt];
                    const ext = path.extname(imageUrl) || '.jpg';
                    // Limit messy extensions
                    const cleanExt = (ext.includes('?') ? ext.split('?')[0] : ext) || '.jpg';
                    const filename = `auto_${Date.now()}_${downloaded + 1}${cleanExt}`;
                    const filepath = path.join(folderPath, filename);

                    try {
                        process.stdout.write(`   ⬇️ Downloading image ${downloaded + 1}... `);
                        await downloadImage(imageUrl, filepath);
                        console.log('✅ OK');
                        downloaded++;
                    } catch (err) {
                        console.log('❌ Failed (Skip)');
                    }

                    attempt++;
                }

                if (downloaded > 0) {
                    console.log(`✨ Successfully added ${downloaded} new images for ${folder}`);
                } else {
                    console.log(`⚠️ Failed to download any valid images for ${folder}`);
                }

            } else {
                console.log(`⚠️ No images found on search for ${folder}`);
            }

            // Random delay to be polite
            await sleep(2000 + Math.random() * 3000);

        } else {
            console.log(`✅ Sufficient images.`);
        }
    }

    console.log('\n🎉 All checks done!');
}

main();
