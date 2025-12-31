const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// POST /webhook/fonnte - Receive messages from Fonnte
router.post('/fonnte', webhookController.handleIncoming.bind(webhookController));

// GET /webhook/test - Test endpoint
router.get('/test', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
