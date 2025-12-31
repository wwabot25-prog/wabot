const aiService = require('../services/aiService');
const logger = require('../utils/logger');

class WebhookController {
    /**
     * Handle incoming message
     */
    async handle(req, res) {
        try {
            logger.info('Message received');

            // Extract data
            const sender = req.body.sender || req.body.from || req.body.phone;
            const message = req.body.message || req.body.text;

            if (!sender || !message) {
                return res.status(400).json({ error: 'Invalid data' });
            }

            logger.info(`From ${sender}: ${message}`);

            // Process with AI
            const aiResponse = await aiService.processChat(message);

            // Return response
            res.json({
                status: 'success',
                response: aiResponse
            });

            logger.info('Message processed');

        } catch (error) {
            logger.error('Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new WebhookController();
