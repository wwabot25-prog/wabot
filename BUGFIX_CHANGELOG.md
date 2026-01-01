# Bug Fix Changelog

## 2026-01-01 - Fix Greeting & Bold Formatting

### 🐛 Bugs Fixed:

1. **Sapaan "Sampurasun" Tidak Terkendali**
   - **Masalah**: Greeting "Sampurasun" muncul terus menerus setiap kali user chat
   - **Penyebab**: Tidak ada tracking apakah user sudah pernah menerima greeting sebelumnya
   - **Solusi**: 
     - Menambahkan `greetingFile` untuk menyimpan daftar user yang sudah di-greet
     - Menambahkan fungsi `loadGreetingTracker()` dan `saveGreetingTracker()`
     - Greeting "Sampurasun" hanya muncul untuk user baru yang belum pernah chat
     - User lama akan mendapat sapaan singkat: "Halo Kak! Ada yang bisa Lucky bantu lagi?"

2. **Bold Formatting (`**`) Tidak Terkendali**
   - **Masalah**: AI menggunakan `**bold**` (double asterisk) yang tidak support di WhatsApp
   - **Penyebab**: Typo di system prompt yang menulis `** Bold **` alih-alih `*Bold*`
   - **Solusi**:
     - Memperbaiki system prompt: "Gunakan *Bold* (satu asterisk)" dengan instruksi jelas
     - Menambahkan peringatan: "JANGAN gunakan **double asterisk**"
     - Menambahkan reminder di guidance: "Format: Gunakan *bold* (1 asterisk), BUKAN **bold** (2 asterisk)"
     - Fungsi `cleanMarkdown()` tetap ada sebagai backup untuk convert `**` → `*`

### 📝 File yang Diubah:

- `src/services/aiService.js`:
  - Menambahkan greeting tracker system
  - Memperbaiki system prompt untuk formatting
  - Menambahkan fungsi `clearGreeting()` untuk testing/reset

### 🧪 Testing:

1. **Test Greeting untuk User Baru**:
   - Chat pertama kali → Harus muncul "Sampurasun Kak! 🙏..."
   - Chat kedua dan seterusnya → Tidak boleh muncul "Sampurasun" lagi

2. **Test Bold Formatting**:
   - Semua response harus menggunakan `*bold*` (1 asterisk)
   - Tidak boleh ada `**bold**` (2 asterisk) di response

### 🔧 Cara Reset Greeting (untuk Testing):

Jika ingin reset greeting tracker untuk testing:

```javascript
// Di console atau test file
const aiService = require('./src/services/aiService');

// Reset greeting untuk user tertentu
aiService.clearGreeting('628123456789@c.us');

// Reset semua greeting
aiService.clearGreeting();
```

### 📂 File Data Baru:

- `data/userGreeting.json` - Menyimpan daftar user yang sudah di-greet (auto-created)

### ✅ Status:

- [x] Bug greeting fixed
- [x] Bug bold formatting fixed
- [x] Tested on Termux
- [x] Documentation updated
