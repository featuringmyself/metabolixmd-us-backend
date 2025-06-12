const express = require('express');
const webhookController = require('../controllers/webhook.controller');
const router = express.Router();

/**
 * @api {post} /webhooks Square Payment Webhook
 * @apiName SquareWebhook
 * @apiGroup Webhooks
 * @apiDescription Handles Square payment webhooks for payment status updates
 */
router.post('/', webhookController.handleWebhook);

module.exports = router; 