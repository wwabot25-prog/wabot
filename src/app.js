require('dotenv').config();
const express = require('express');
const whatsappService = require('./services/whatsappService');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
    const status = whatsappService.getStatus();
    res.json({
        status: 'running',
        service: 'WA Automation - whatsapp-web.js',
        version: '3.0',
        whatsapp: status
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    const status = whatsappService.getStatus();
    res.json(status);
});

// Start server
app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info('Initializing WhatsApp...');

    try {
        // Initialize WhatsApp
        await whatsappService.initialize();
    } catch (error) {
        logger.error('Failed to initialize WhatsApp:', error);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await whatsappService.destroy();
    process.exit(0);
});

module.exports = app;
