# WhatsApp Bot - Honda Dealer Automation

Bot WhatsApp otomatis untuk dealer Honda menggunakan AI (Google Gemini) dan integrasi Google Sheets.

## 🚀 Fitur

- ✅ AI-powered chat menggunakan Google Gemini
- ✅ Integrasi Google Sheets untuk data motor
- ✅ Auto-reply dengan informasi harga, cicilan, dan stok
- ✅ Context-aware conversation
- ✅ Support gambar motor
- ✅ Filter chat grup (hanya balas chat personal)

## 📋 Requirements

- Node.js v18 atau lebih baru
- Google Gemini API Key
- Google Service Account untuk Sheets API
- WhatsApp account

## 🛠️ Installation

1. Clone repository:
```bash
git clone <your-repo-url>
cd WA_Automation
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

Edit `.env` dan isi dengan kredensial Anda:
- `GEMINI_API_KEY` - Dapatkan dari https://aistudio.google.com/apikey
- `GOOGLE_SHEET_ID` - ID dari Google Sheet Anda
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Email service account
- `GOOGLE_PRIVATE_KEY` - Private key dari service account

4. Jalankan bot:
```bash
npm run dev
```

5. Scan QR code yang muncul dengan WhatsApp Anda

## 📁 Struktur Project

```
WA_Automation/
├── src/
│   ├── app.js              # Entry point
│   ├── services/
│   │   ├── aiService.js    # Gemini AI integration
│   │   ├── whatsappService.js  # WhatsApp client
│   │   └── googleSheetsService.js  # Google Sheets API
│   └── utils/
│       └── logger.js       # Winston logger
├── data/                   # User context storage
├── wa-session/            # WhatsApp session (auto-generated)
└── package.json
```

## 🚀 Deployment

### Render.com (Recommended - Free)

1. Push ke GitHub
2. Buat Web Service di Render.com
3. Connect ke GitHub repo
4. Set environment variables
5. Deploy!

### Railway.app

1. Push ke GitHub
2. Connect Railway ke repo
3. Set environment variables
4. Deploy otomatis

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_SHEET_ID` | ID Google Sheet untuk data motor |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `PORT` | Server port (default: 3000) |

## 🤝 Contributing

Pull requests are welcome!

## 📄 License

ISC

## 👨‍💻 Author

Your Name
