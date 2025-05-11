const express = require('express');
const router = express.Router();
const config = require('../config/config');
const { sendEmail } = require('../microservices/mail.service');
const ejs = require('ejs');
const path = require('path');

router.post('/test-email', async (req, res) => {
    // Only allow in development environment
    if (config.env !== 'development') {
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only available in development environment'
        });
    }

    const { to, customerName } = req.body;

    if (!to || !customerName) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: to and customerName are required'
        });
    }

    try {
        // Render the mail.ejs template
        const html = await ejs.renderFile(path.join(__dirname, '../views/ordermail.ejs'), {
            customerName: customerName
        });

        await sendEmail({
            to,
            subject: "Welcome to MetabolixMD",
            html: html
        });

        res.status(200).json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

module.exports = router; 