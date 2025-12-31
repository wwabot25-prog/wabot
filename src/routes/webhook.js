const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Simple webhook endpoint
router.post('/fonnte', (req, res) => webhookController.handle(req, res));

module.exports = router;
