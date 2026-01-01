const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        // Cek API Key GEMINI (Pastikan sudah ada di .env)
        if (!process.env.GEMINI_API_KEY) {
            logger.error('GEMINI_API_KEY not found!');
            this.enabled = false;
            return;
        }

        // Initialize Gemini Client
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        this.modelName = 'gemini-2.5-flash';
        this.enabled = true;

        // Cache untuk data motor
        this.cachedDataMotor = null;
        this.cacheTimestamp = null;
        this.cacheExpiry = 30 * 60 * 1000; // 30 menit

        // Conversation history
        this.conversationHistory = new Map();
        this.historyExpiry = 1000 * 60 * 60; // 1 hour
        this.maxHistoryLength = 20;

        // Context Memory (Persistent)
        this.contextFile = require('path').join(__dirname, '../../data/userContext.json');
        this.userContext = this.loadContext();

        // Greeting Tracker (Prevent repeated greetings)
        this.greetingFile = require('path').join(__dirname, '../../data/userGreeting.json');
        this.hasGreeted = this.loadGreetingTracker();

        logger.info(`AI Service initialized (${this.modelName})`);
    }

    /**
     * Clean Markdown formatting untuk WhatsApp
     * Konversi **bold** menjadi *bold* (format WhatsApp)
     */
    cleanMarkdown(text) {
        if (!text) return text;

        let cleaned = text;

        // Konversi **bold** menjadi *bold* (WhatsApp format)
        cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '*$1*');

        // Hapus ``` code blocks (tidak support di WhatsApp)
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`(.+?)`/g, '$1');

        // Bersihkan multiple asterisks yang berlebihan
        cleaned = cleaned.replace(/\*{3,}/g, '*');

        return cleaned;
    }

    /**
     * Load context from file
     */
    loadContext() {
        const fs = require('fs');
        if (fs.existsSync(this.contextFile)) {
            try {
                const data = fs.readFileSync(this.contextFile, 'utf8');
                // Convert JSON object back to Map
                return new Map(JSON.parse(data));
            } catch (err) {
                logger.error('Failed to load context:', err);
                return new Map();
            }
        }
        return new Map();
    }

    /**
     * Load greeting tracker from file
     */
    loadGreetingTracker() {
        const fs = require('fs');
        if (fs.existsSync(this.greetingFile)) {
            try {
                const data = fs.readFileSync(this.greetingFile, 'utf8');
                return new Set(JSON.parse(data));
            } catch (err) {
                logger.error('Failed to load greeting tracker:', err);
                return new Set();
            }
        }
        return new Set();
    }

    /**
     * Save greeting tracker to file
     */
    saveGreetingTracker() {
        const fs = require('fs');
        const dir = require('path').dirname(this.greetingFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        try {
            const data = JSON.stringify(Array.from(this.hasGreeted));
            fs.writeFileSync(this.greetingFile, data);
        } catch (err) {
            logger.error('Failed to save greeting tracker:', err);
        }
    }

    /**
     * Save context to file
     */
    saveContext() {
        const fs = require('fs');
        const dir = require('path').dirname(this.contextFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        try {
            // Convert Map to JSON array of entries
            const data = JSON.stringify(Array.from(this.userContext.entries()));
            fs.writeFileSync(this.contextFile, data);
        } catch (err) {
            logger.error('Failed to save context:', err);
        }
    }

    /**
     * Get or create conversation history for user
     */
    getConversationHistory(userId) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }

        const history = this.conversationHistory.get(userId);

        // Clean expired messages
        const now = Date.now();
        const validHistory = history.filter(msg =>
            (now - msg.timestamp) < this.historyExpiry
        );

        // Keep only last N messages
        const trimmedHistory = validHistory.slice(-this.maxHistoryLength);

        this.conversationHistory.set(userId, trimmedHistory);
        return trimmedHistory;
    }

    /**
     * Add message to conversation history
     * Role: 'user' or 'assistant' (DeepSeek standard)
     */
    addToHistory(userId, role, content) {
        // Map 'model' (Gemini legacy) to 'assistant'
        const standardizedRole = role === 'model' ? 'assistant' : role;

        const history = this.getConversationHistory(userId);
        history.push({
            role: standardizedRole,
            content: content,
            timestamp: Date.now()
        });

        // Update context based on content
        this.updateUserContext(userId, content);
    }

    /**
     * Clear conversation history for user
     */
    clearHistory(userId) {
        this.conversationHistory.delete(userId);
        logger.info(`Cleared conversation history for user: ${userId} `);
    }

    /**
     * Clear greeting tracker for user (for testing or reset)
     */
    clearGreeting(userId = null) {
        if (userId) {
            this.hasGreeted.delete(userId);
            logger.info(`Cleared greeting for user: ${userId}`);
        } else {
            this.hasGreeted.clear();
            logger.info('Cleared all greeting trackers');
        }
        this.saveGreetingTracker();
    }

    /**
     * Helper: Detect motor name and update user context
     */
    updateUserContext(userId, content) {
        if (!content) return;

        const lowerContent = content.toLowerCase();
        // List motor untuk deteksi konteks
        const motors = [
            'beat', 'bit', 'vario', 'scoopy', 'scopy', 'genio', 'pcx', 'adv',
            'stylo', 'forza', 'cbr', 'cb150', 'sonic', 'gtr', 'supra', 'revo',
            'crf', 'em1', 'icon', 'cuv'
        ];

        let found = false;
        for (const motor of motors) {
            if (lowerContent.includes(motor)) {
                // Normalize name
                let cleanName = motor;
                if (motor === 'bit') cleanName = 'beat';
                if (motor === 'scopy') cleanName = 'scoopy';

                this.userContext.set(userId, { lastMotor: cleanName, timestamp: Date.now() });
                this.saveContext(); // SAVE TO FILE!

                logger.info(`Context updated for ${userId}: ${cleanName} (Saved to file)`);
                found = true;
                break;
            }
        }
    }

    /**
     * Read spreadsheet data motor from Google Sheets (with caching)
     */
    async getDataMotor(forceRefresh = false) {
        try {
            // Cek cache masih valid?
            const now = Date.now();
            if (!forceRefresh && this.cachedDataMotor && this.cacheTimestamp) {
                const cacheAge = now - this.cacheTimestamp;
                if (cacheAge < this.cacheExpiry) {
                    logger.info('Using cached data motor (hemat token!)');
                    return this.cachedDataMotor;
                }
            }

            // Fetch fresh data
            const googleSheetsService = require('./googleSheetsService');
            const data = await googleSheetsService.getDataMotor();

            // Update cache
            this.cachedDataMotor = data;
            this.cacheTimestamp = now;

            logger.info('Data motor refreshed and cached');
            return data;
        } catch (error) {
            logger.error('Error reading spreadsheet:', error);
            return 'Data motor tersedia, silakan hubungi untuk info lengkap.';
        }
    }

    /**
     * Get relevant data based on user query
     * SIMPLIFIED: Always return FULL DATA to ensure AI has complete knowledge.
     * Matches logic: Sheets Data + User Query -> Gemini
     */
    async getRelevantData(message) {
        const fullData = await this.getDataMotor();
        // Return semua data, biarkan AI yang memilah informasinya
        logger.info(`Sending FULL DATA to AI(${fullData.length} chars)`);
        return fullData;
    }

    /**
     * Get diskon info
     */
    getDiskon() {
        return `POTONGAN TENOR ALL UNIT:

✨ Angsuran 23 bulan → Potongan 1 bulan(bayar hanya 22 bulan)
✨ Angsuran 29 bulan → Potongan 2 bulan(bayar hanya 27 bulan)
✨ Angsuran 35 bulan → Potongan 2 bulan(bayar hanya 33 bulan)

💰 DP minimal: 10 - 15 % dari harga OTR`;
    }

    /**
     * Generate the System Prompt for AI
     */
    generateSystemPrompt(dataMotor, diskon) {
        return `Kamu adalah Lucky, Customer Service di NSS Honda Cibadak.
Gaya bicaramu ramah, solutif, dan profesional(menggunakan Bahasa Indonesia santai + sedikit sentuhan lokal akrab).

🎨 ATURAN FORMATTING (BIAR RAPI):
1. Gunakan *Bold* (satu asterisk) untuk harga, nama motor, dan poin penting. JANGAN gunakan **double asterisk**.
2. Gunakan Emoji secukupnya sebagai bullet points (✅, 📝, 💰, 🚚).
3. Pisahkan setiap poin dengan BARIS BARU (Enter) agar tidak menumpuk.
4. Jangan kirim tembok teks panjang! Pecah jadi paragraf pendek.
5. PENTING: Format WhatsApp hanya support *bold* (1 asterisk), BUKAN **bold** (2 asterisk).

👋 GREETING (HANYA UNTUK USER BARU YANG BELUM PERNAH CHAT):
⚠️ PERHATIAN: Greeting "Sampurasun" HANYA boleh digunakan jika user BENAR-BENAR BARU pertama kali chat.

- Jika user BARU PERTAMA KALI dan menyapa (halo/hi/assalamualaikum), gunakan:
  "Sampurasun Kak! 🙏 Kenalin, saya Lucky dari Nusantara Sakti (NSS) Honda Cibadak.
   Makasih ya udah mampir tanya-tanya. Lagi nyari motor buat nemenin kerja atau buat jalan-jalan santai nih Kak?
   Oh iya, mumpung lagi di NSS Cibadak, lagi banyak promo menarik lho. Kakak lagi ngelirik tipe apa? Beat, Vario, atau motor gagah kayak PCX?"

- Jika user SUDAH PERNAH CHAT atau langsung tanya spesifik, JANGAN pakai greeting "Sampurasun" lagi.
  Langsung jawab dengan: "Halo Kak! Ada yang bisa Lucky bantu lagi?" atau langsung to the point.

📘 SOP & FAQ JAWABAN(JADIKAN ACUAN UTAMA):

A.CEK KETERSEDIAAN STOK(PENTING!)
    - Lihat data di bawah bagian "INFO STOK UNIT".
- Jika motor yang ditanya ** ADA ** di daftar, sebutkan warnanya.
- Jika motor yang ditanya ** TIDAK ADA ** di daftar stok, jawab: "Mohon maaf Kak, untuk unit tersebut saat ini sedang **KOSONG/INDENT**. Mau saya pesankan (booking) dulu biar dapat prioritas angkatan?"
    - Jangan pernah bilang "Ready" kalau tidak ada di data stok!

⚠️ PERINGATAN PENTING - ANTI HALUSINASI:
1. HANYA gunakan informasi yang ADA di DATA MOTOR di bawah.JANGAN mengarang!
2. Jika user bertanya sesuatu yang TIDAK ada di data, katakan dengan jujur: "Maaf Kak, info itu belum Lucky miliki. Bisa diulang pertanyaannya atau Lucky bantu tanyakan ke tim dulu ya?"
3. JANGAN asumsikan harga, spesifikasi, atau fitur yang tidak tercantum.
4. Untuk pertanyaan di luar topik motor / dealer, arahkan dengan ramah kembali ke topik.
5. Jika ragu, lebih baik mengaku tidak tahu daripada memberi info salah.

    B.PERSYARATAN & ADMINISTRASI
    - Syarat Kredit: "Syarat kredit sangat mudah, Kak! Cukup fotokan: 1. KTP Suami & Istri (jika menikah) atau KTP Pemohon & Ortu (jika lajang), 2. Kartu Keluarga (KK), 3. Bukti Penghasilan (Slip Gaji/Foto Usaha/Rekening Koran). Data bisa dikirim lewat WA ini biar kami bantu checking GRATIS."
        - KTP Daerah / Luar Kota: "Bisa Kak, asalkan saat ini Kakak tinggal/domisili di wilayah Sukabumi/Cianjur/sekitarnya. Cukup lampirkan Surat Domisili RT atau Bukti Bayar Listrik/Air tempat tinggal sekarang."
            - Status Ngontrak / Kost: "Bisa banget. Biar peluang ACC leasing lebih besar, disarankan DP-nya mulai 15-20% ya Kak. Mau Lucky hitungkan simulasi DP-nya?"

C.PEMBAYARAN & PENGIRIMAN
    - Pembayaran: "Demi keamanan, sarannya: 1. Transfer ke Rekening Dealer Resmi (PT Nusantara Sakti), atau 2. Bayar saat motor sampai (COD). ⚠️ Jangan transfer ke rekening pribadi sales ya Kak."
        - Pengiriman: "Jika berkas lengkap dan ACC hari ini (atau Cash lunas), motor bisa dikirim Besok Pagi/Sore. Gratis ongkir sampai depan rumah! 🚚"

🔴 ATURAN KRISIAL(MARKER GAMBAR):
Setiap kali User meminta GAMBAR, FOTO, WARNA, atau HARGA / DP, kamu ** WAJIB ** memulai jawabanmu dengan ** COMMAND MARKER ** berikut.

CARA MENDAPATKAN KODE FOLDER GAMBAR:
1. Lihat ** DATA MOTOR ** di bawah.
2. Cari motor yang dimaksud user.
3. Di sebelah nama motor, ada teks seperti '(Kode Gambar: [FOLDER_IMG: NAMA_FOLDER])'.
4. Gunakan 'NAMA_FOLDER' tersebut untuk marker jawabanmu.

    COMMANDS:
1.[SEND_IMAGE:FOLDER_NAME]-> Jika user minta lihat gambar / foto motor.
2.[SEND_PRICELIST:FOLDER_NAME]-> Jika user tanya harga, DP, cicilan, atau kredit.
3.[SEND_ALL_COLORS:FOLDER_NAME]-> Jika user tanya "warna lain", "pilihan warna", kode warna.

💡 PRINSIP JAWABAN(WAJIB DIPATUHI):
1. GUNAKAN DATA TABEL DI BAWAH.Jangan mengarang harga / spesifikasi.
2. JANGAN TANYA VARIAN jika user MINTA GAMBAR.Langsung kirim varian paling umum.
3. ** JAGA KONTEKS **: Jika user bertanya lanjut, ** ASUMSIKAN ** user membahas motor yang sama.
4. ** VERIFIKASI DATA **: Sebelum menjawab harga / spesifikasi, PASTIKAN ada di DATA MOTOR.Jika tidak ada, katakan tidak tersedia.
5. ** JELAS & JUJUR **: Jika tidak yakin atau data tidak lengkap, akui saja.Jangan pura - pura tahu.
6. ** HINDARI INFO LUAR **: Jangan tambahkan info dari luar pengetahuan yang diberikan.

📊 DATA MOTOR:
${dataMotor}

🎁 PROMO:
${diskon}

Sekarang, jawab user.INGAT MARKER IMAGE JIKA DIPERLUKAN!`;
    }

    /**
     * Process chat with DeepSeek AI
     */
    async processChat(message, userId = 'default') {
        logger.info(`Processing chat for user: ${userId} `);
        if (!this.enabled) return 'Maaf, sistem sedang maintenance.';

        try {
            // --- 1. Context Awareness Logic ---
            let contextMessage = message;
            const currentContext = this.userContext.get(userId);

            if (currentContext && (Date.now() - currentContext.timestamp < 3600000)) {
                const motorMentioned = ['beat', 'vario', 'scoopy', 'cbr', 'crf', 'adv', 'icon', 'stylo', 'pcx', 'genio', 'revo', 'supra'].some(m => message.toLowerCase().includes(m));
                if (!motorMentioned) {
                    logger.info(`💡 Context Injection: User didn't mention motor. Using context: ${currentContext.lastMotor}`);
                    contextMessage = `[SYSTEM CONTEXT: User sedang bertanya tentang motor ${currentContext.lastMotor.toUpperCase()}. Jawablah pertanyaan berikut dalam konteks motor tersebut.]\n\nUser: ${message}`;
                }
            }

            // --- 2. Load Data ---
            const dataMotor = await this.getRelevantData(contextMessage);
            const diskon = this.getDiskon();

            // --- 3. Build Prompt (Gemini Format) ---
            const systemPrompt = this.generateSystemPrompt(dataMotor, diskon);

            // Build chat history for Gemini
            const history = this.getConversationHistory(userId);
            const geminiHistory = history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // Add guidance to current message
            const isNewUser = !this.hasGreeted.has(userId);
            const greetingGuidance = isNewUser
                ? `\n\n(SYSTEM: User ini BARU PERTAMA KALI chat. Boleh pakai greeting "Sampurasun".)`
                : `\n\n(SYSTEM: User ini SUDAH PERNAH chat sebelumnya. JANGAN pakai greeting "Sampurasun" lagi. Langsung jawab pertanyaannya.)`;

            const guidance = `\n\n(SYSTEM REMINDER: Jika user meminta gambar, WAJIB sertakan marker [SEND_IMAGE:NAMA_MOTOR] atau [SEND_ALL_COLORS:NAMA_MOTOR] di awal jawaban. Format: Gunakan *bold* (1 asterisk), BUKAN **bold** (2 asterisk).)${greetingGuidance}`;
            const fullPrompt = systemPrompt + '\n\n' + contextMessage + guidance;

            logger.info(`Data sent to AI: ${dataMotor.length} chars. Using Context: ${message !== contextMessage ? 'YES' : 'NO'}`);

            // --- 4. Call Gemini API ---
            let result;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    // Gunakan models.generateContent sesuai SDK @google/genai
                    result = await this.ai.models.generateContent({
                        model: this.modelName,
                        contents: fullPrompt
                    });
                    break; // Success, exit retry loop
                } catch (apiError) {
                    // Check if rate limit error (429) or other retryable errors
                    if (apiError.status === 429 || apiError.message?.includes('quota') || apiError.message?.includes('rate')) {
                        retryCount++;
                        const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s

                        if (retryCount < maxRetries) {
                            logger.warn(`Rate limit hit. Retry ${retryCount}/${maxRetries} after ${waitTime}ms...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        } else {
                            throw apiError; // Max retries reached
                        }
                    } else {
                        throw apiError; // Other error, don't retry
                    }
                }
            }

            // Akses response text (sesuai SDK @google/genai)
            logger.info('Raw result from API:', JSON.stringify(result, null, 2).substring(0, 500));
            const reply = result.text;
            const trimmedReply = reply?.trim();

            if (!trimmedReply || trimmedReply.length === 0) {
                logger.warn('AI returned empty response, using fallback');
                return 'Halo 👋 Maaf, saya sedang kesulitan memproses pertanyaan Kakak. Bisa diulang lagi atau hubungi kami langsung ya? 😊';
            }

            // Clean Markdown formatting untuk WhatsApp
            const cleanedReply = this.cleanMarkdown(trimmedReply);

            logger.info(`AI response: ${cleanedReply.substring(0, 100)}...`);

            // Mark user as greeted (save to file)
            if (!this.hasGreeted.has(userId)) {
                this.hasGreeted.add(userId);
                this.saveGreetingTracker();
                logger.info(`User ${userId} marked as greeted (saved to file)`);
            }

            // Save to history
            this.addToHistory(userId, 'user', message);
            this.addToHistory(userId, 'model', cleanedReply);

            return cleanedReply;

        } catch (error) {
            logger.error('Process error:', error);
            // Log full error for debugging
            if (error.response) console.error(JSON.stringify(error.response, null, 2));
            return 'Maaf, ada kendala teknis. Mohon coba lagi atau hubungi kami langsung. 🙏';
        }
    }
}

module.exports = new AIService();

