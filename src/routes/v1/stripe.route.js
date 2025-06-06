const express = require('express');
const router = express.Router();

const {webhookController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');

// Debug middleware for webhook requests
router.use('/webhook', (req, res, next) => {
  console.log('Webhook request received:', {
    contentType: req.headers['content-type'],
    signature: req.headers['stripe-signature'],
    hasBody: !!req.body,
    hasRawBody: !!req.rawBody,
  });
  next();
});

// Stripe webhook needs raw body for signature verification
router.post('/webhook', express.raw({type: 'application/json'}), webhookController.processWebhook);

module.exports = router;