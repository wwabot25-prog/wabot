const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const aiService = require('./aiService');
const logger = require('../utils/logger');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
    }

    /**
     * Initialize WhatsApp client
     */
    async initialize() {
        try {
            logger.info('Initializing WhatsApp client...');

            // Create client with local auth
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './wa-session'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ]
                }
            });

            // QR Code event
            this.client.on('qr', (qr) => {
                logger.info('QR Code received! Scan dengan WhatsApp Anda:');
                console.log('\n');
                qrcode.generate(qr, { small: true });
                console.log('\n');
                logger.info('Scan QR code di atas dengan WhatsApp → Linked Devices');
            });

            // Ready event
            this.client.on('ready', () => {
                this.isReady = true;
                logger.info('✅ WhatsApp client is ready!');
                logger.info('Bot siap menerima pesan!');
            });

            // Authenticated event
            this.client.on('authenticated', () => {
                logger.info('WhatsApp authenticated successfully');
            });

            // Auth failure event
            this.client.on('auth_failure', (msg) => {
                logger.error('Authentication failed:', msg);
            });

            // Disconnected event
            this.client.on('disconnected', (reason) => {
                logger.warn('WhatsApp disconnected:', reason);
                this.isReady = false;
            });

            // Message event
            this.client.on('message', async (message) => {
                await this.handleMessage(message);
            });

            // Initialize client
            await this.client.initialize();

        } catch (error) {
            logger.error('Failed to initialize WhatsApp:', error);
            throw error;
        }
    }

    /**
     * Helper: Convert to Title Case
     */
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    /**
     * Helper: Find motor image in various folder structures
     */
    /**
     * Helper: Find motor image in various folder structures (With FUZZY MATCH)
     */
    findMotorImage(motorName) {
        const path = require('path');
        const fs = require('fs');
        const motorsBasePath = path.join(__dirname, '../../images/motors');

        // 1. Coba Fuzzy Match Folder dulu (paling powerful)
        const bestMatchFolder = this.findBestMatchFolder(motorName, motorsBasePath);
        if (bestMatchFolder) {
            const folderPath = path.join(motorsBasePath, bestMatchFolder);
            // Ambil gambar pertama saja
            const images = this.getImagesFromFolder(folderPath);
            if (images && images.length > 0) {
                logger.info(`Found image via Fuzzy Match: ${bestMatchFolder}/${path.basename(images[0])}`);
                return images[0];
            }
        }

        // 2. Fallback: Direct file check (legacy support)
        const directExtensions = ['.png', '.jpg', '.jpeg'];
        for (const ext of directExtensions) {
            const directPath = path.join(motorsBasePath, `${motorName}${ext}`);
            if (fs.existsSync(directPath)) {
                return directPath;
            }
        }

        logger.warn(`Image NOT found for: ${motorName}`);
        return null;
    }

    /**
     * Helper: Find price list image (from informasi-tambahan folder)
     */
    /**
     * Helper: Find price list image (from informasi-tambahan folder) WITH FUZZY MATCH
     */
    findPriceListImage(motorName) {
        const path = require('path');
        const fs = require('fs');

        const basePath = path.join(__dirname, '../../images/informasi-tambahan');
        if (!fs.existsSync(basePath)) return null;

        // 1. Coba exact/simple matches dulu (Prioritas)
        const exactMatches = [
            `${motorName}.jpeg`, `${motorName}.jpg`, `${motorName}.png`,
            `${motorName.replace(/_/g, ' ')}.jpeg`, `${motorName.replace(/_/g, ' ')}.jpg`
        ];

        for (const file of exactMatches) {
            if (fs.existsSync(path.join(basePath, file))) {
                logger.info(`Found price list (Exact): ${file}`);
                return path.join(basePath, file);
            }
        }

        // 2. Coba Fuzzy Match File
        const files = fs.readdirSync(basePath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        const normalizedTarget = motorName.toLowerCase().replace(/_/g, ' ');

        let bestMatch = null;
        let highestScore = 0;

        for (const file of files) {
            const fileNameWithoutExt = path.parse(file).name.toLowerCase();
            const score = this.calculateSimilarity(normalizedTarget, fileNameWithoutExt);

            // Boost logic: check if one contains the other
            if (fileNameWithoutExt.includes(normalizedTarget) || normalizedTarget.includes(fileNameWithoutExt)) {
                if (score < 0.8) score = 0.8;
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = file;
            }
        }

        if (bestMatch && highestScore > 0.4) {
            logger.info(`Found price list (Fuzzy Score ${highestScore.toFixed(2)}): ${bestMatch}`);
            return path.join(basePath, bestMatch);
        }

        logger.warn(`Price list not found for: ${motorName}`);
        return null;
    }

    /**
     * Helper: Find ALL motor images (all colors)
     */
    /**
     * Helper: Find ALL motor images (all colors) with FUZZY MATCHING
     */
    findAllMotorImages(motorName) {
        const path = require('path');
        const fs = require('fs');
        const motorsBasePath = path.join(__dirname, '../../images/motors');

        // 1. Coba exact match dulu (cepat)
        const exactPath = path.join(motorsBasePath, motorName);
        if (fs.existsSync(exactPath) && fs.statSync(exactPath).isDirectory()) {
            return this.getImagesFromFolder(exactPath);
        }

        // 2. Coba Fuzzy Match (cari folder yang paling mirip namanya)
        const bestMatchFolder = this.findBestMatchFolder(motorName, motorsBasePath);
        if (bestMatchFolder) {
            logger.info(`Fuzzy match found: '${motorName}' -> '${bestMatchFolder}'`);
            return this.getImagesFromFolder(path.join(motorsBasePath, bestMatchFolder));
        }

        logger.warn(`No images found (even with fuzzy match) for: ${motorName}`);
        return null;
    }

    /**
     * Helper: Get all images from a specific folder
     */
    getImagesFromFolder(folderPath) {
        const path = require('path');
        const fs = require('fs');

        try {
            const files = fs.readdirSync(folderPath);
            const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

            if (imageFiles.length > 0) {
                return imageFiles.map(f => path.join(folderPath, f));
            }
        } catch (err) {
            logger.error(`Error reading folder ${folderPath}:`, err);
        }
        return null;
    }

    /**
     * Helper: Cari nama folder yang paling mirip (Fuzzy Search)
     */
    findBestMatchFolder(targetName, basePath) {
        const fs = require('fs');

        if (!fs.existsSync(basePath)) return null;

        const folders = fs.readdirSync(basePath).filter(f => fs.statSync(require('path').join(basePath, f)).isDirectory());

        let bestMatch = null;
        let highestScore = 0;

        // Normalisasi target: "ALL_NEW_BEAT_STREET" -> "all new beat street"
        const normalizedTarget = targetName.replace(/_/g, ' ').toLowerCase();

        for (const folder of folders) {
            const normalizedFolder = folder.replace(/_/g, ' ').toLowerCase();
            const score = this.calculateSimilarity(normalizedTarget, normalizedFolder);

            // Jika folder mengandung kata kunci target (atau sebaliknya), boost score
            if (normalizedFolder.includes(normalizedTarget) || normalizedTarget.includes(normalizedFolder)) {
                if (score < 0.8) score = 0.8; // Boost minimal jadi 0.8 kalau substring match
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = folder;
            }
        }

        // Threshold 0.4 sudah cukup untuk kemiripan kasar
        return highestScore > 0.4 ? bestMatch : null;
    }

    /**
     * Helper: Hitung kemiripan string (Dice Coefficient - Simple Version)
     * Mengembalikan 0.0 sampai 1.0
     */
    calculateSimilarity(str1, str2) {
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
        for (const bg of bigrams1) {
            if (bigrams2.has(bg)) intersection++;
        }

        const combinedSize = bigrams1.size + bigrams2.size;
        return combinedSize === 0 ? 0 : (2.0 * intersection) / combinedSize;
    }

    /**
     * Handle incoming message
     */
    async handleMessage(message) {
        try {
            // Log semua pesan yang masuk untuk debugging
            logger.info(`[DEBUG] Received message from: ${message.from}, isGroup: ${message.isGroupMsg}, body: ${message.body}`);

            // Skip if from status broadcast
            if (message.from === 'status@broadcast') {
                logger.info('Skipping status broadcast message');
                return;
            }

            // Skip if from group (double check with chat ID format)
            // Group chat IDs end with @g.us, personal chats end with @c.us or @lid
            if (message.isGroupMsg || message.from.includes('@g.us')) {
                logger.info(`Skipping group message from: ${message.from}`);
                return;
            }

            // Get message details
            const sender = message.from;
            const text = message.body;

            logger.info(`Message from ${sender}: ${text}`);

            // Process with AI (with conversation history)
            const aiResponse = await aiService.processChat(text, sender);

            // DEBUG LOG: Show exactly what AI returned
            console.log('\n--- RAW AI RESPONSE START ---');
            console.log(aiResponse);
            console.log('--- RAW AI RESPONSE END ---\n');

            // Check for 3 types of markers
            const allColorsMarker = aiResponse.match(/\[SEND_ALL_COLORS:(.+?)\]/);
            const priceListMarker = aiResponse.match(/\[SEND_PRICELIST:(.+?)\]/);
            const imageMarker = aiResponse.match(/\[SEND_IMAGE:(.+?)\]/);

            if (allColorsMarker) {
                // Send ALL color images
                const motorName = allColorsMarker[1];
                const cleanResponse = aiResponse.replace(/\[SEND_ALL_COLORS:.+?\]/g, '').trim();
                const allImages = this.findAllMotorImages(motorName);

                if (allImages && allImages.length > 0) {
                    // Send text first
                    await message.reply(cleanResponse);

                    // Send all images one by one with delay
                    for (const imagePath of allImages) {
                        await this.sendMessageWithMedia(sender, '', imagePath);
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    }

                    logger.info(`Sent ${allImages.length} color images for: ${motorName}`);
                } else {
                    logger.warn(`No color images found for: ${motorName}`);
                    await message.reply(cleanResponse);
                }
            } else if (priceListMarker) {
                // Send price list (from informasi-tambahan)
                const motorName = priceListMarker[1];
                const cleanResponse = aiResponse.replace(/\[SEND_PRICELIST:.+?\]/g, '').trim();
                const priceListPath = this.findPriceListImage(motorName);

                if (priceListPath) {
                    await this.sendMessageWithMedia(sender, cleanResponse, priceListPath);
                    logger.info(`Price list sent for: ${motorName}`);
                } else {
                    logger.warn(`Price list not found for: ${motorName}`);
                    await message.reply(cleanResponse);
                }
            } else if (imageMarker) {
                // Send motor photo
                const motorName = imageMarker[1];
                const cleanResponse = aiResponse.replace(/\[SEND_IMAGE:.+?\]/g, '').trim();
                const imagePath = this.findMotorImage(motorName);

                if (imagePath) {
                    await this.sendMessageWithMedia(sender, cleanResponse, imagePath);
                    logger.info(`Motor image sent for: ${motorName}`);
                } else {
                    logger.warn(`Motor image not found for: ${motorName}`);
                    await message.reply(cleanResponse);
                }
            } else {
                // Text only
                logger.info(`Attempting to send text response (${aiResponse.length} chars)...`);
                await message.reply(aiResponse);
                logger.info('Response sent successfully');
            }

        } catch (error) {
            logger.error('Error handling message:', error);

            // Send error message
            try {
                await message.reply('Maaf, ada kendala teknis. Mohon coba lagi. 🙏');
            } catch (e) {
                logger.error('Failed to send error message:', e);
            }
        }
    }

    /**
     * Send message to number
     */
    async sendMessage(number, text) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client not ready');
            }

            // Format number
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

            // Send message
            await this.client.sendMessage(chatId, text);

            logger.info(`Message sent to ${number}`);

        } catch (error) {
            logger.error('Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Send message with media (image)
     */
    async sendMessageWithMedia(chatId, text, mediaPath) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client not ready');
            }

            const MessageMedia = require('whatsapp-web.js').MessageMedia;
            const fs = require('fs');
            const path = require('path');

            // Check if file exists
            if (!fs.existsSync(mediaPath)) {
                logger.warn(`Media file not found: ${mediaPath}`);
                // Send text only if image not found
                await this.client.sendMessage(chatId, text);
                return;
            }

            // Create media from file
            const media = MessageMedia.fromFilePath(mediaPath);

            // Send message with media
            await this.client.sendMessage(chatId, media, { caption: text });

            logger.info(`Message with media sent to ${chatId}`);

        } catch (error) {
            logger.error('Failed to send message with media:', error);
            // Fallback to text only
            try {
                await this.client.sendMessage(chatId, text);
            } catch (e) {
                logger.error('Fallback text message also failed:', e);
            }
        }
    }

    /**
     * Get client status
     */
    getStatus() {
        return {
            ready: this.isReady,
            connected: this.client?.info?.pushname ? true : false
        };
    }

    /**
     * Logout and destroy client
     */
    async destroy() {
        try {
            if (this.client) {
                await this.client.destroy();
                this.isReady = false;
                logger.info('WhatsApp client destroyed');
            }
        } catch (error) {
            logger.error('Error destroying client:', error);
        }
    }
}

module.exports = new WhatsAppService();
