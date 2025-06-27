const config = require('../config/config');

const {sid, authToken, phone} = config.twilio;
const isTestMode = process.env.NODE_ENV === 'test';

const client = isTestMode ? null : require('twilio')(sid, authToken);

// Helper function to validate Twilio configuration
function validateTwilioConfig() {
    if (!sid || !authToken || !phone) {
        throw new Error('Twilio configuration is missing. Please check your environment variables.');
    }
    
    if (!isTestMode) {
        console.log('Twilio Configuration:');
        console.log('- Account SID:', sid);
        console.log('- Phone Number:', phone);
        console.log('- Auth Token:', authToken ? '****' + authToken.slice(-4) : 'missing');
    }
}

// Helper function to format phone numbers
function formatPhoneNumber(number) {
    if (!number) return null;
    
    // Remove any non-digit characters
    const digits = number.replace(/\D/g, '');
    
    // If number doesn't start with country code, assume it's US/Canada
    if (!digits.startsWith('1') && digits.length === 10) {
        return `+1${digits}`;
    }
    
    // If number starts with country code, add + prefix
    if (digits.startsWith('1') || digits.startsWith('91')) {
        return `+${digits}`;
    }
    
    // Return original number if it's already properly formatted
    return number;
}

// Helper function to format order details for SMS
function formatOrderDetails(order, user) {
    return {
        orderNumber: order.orderNo,
        customerName: user?.name || 'Customer',
        totalAmount: order.totalValue,
        status: order.status,
        paymentStatus: order.paymentStatus
    };
}

// Generate status-specific messages
function generateStatusMessage(type, details) {
    const messages = {
        orderCreated: `New order #${details.orderNumber} received from ${details.customerName}.`,
        orderPlaced: `Order #${details.orderNumber} has been placed successfully.`,
        paymentPending: `Payment pending for order #${details.orderNumber}. Please complete the payment to proceed.`,
        paymentReceived: `Payment received for order #${details.orderNumber}. Amount: $${details.totalAmount}`,
        meetScheduled: `Meeting scheduled for order #${details.orderNumber}. Please check your email for details.`,
        orderProcessing: `Order #${details.orderNumber} is now being processed.`,
        orderShipped: `Order #${details.orderNumber} has been shipped and is on its way to you.`,
        orderDelivered: `Order #${details.orderNumber} has been delivered successfully.`,
        orderCancelled: `Order #${details.orderNumber} has been cancelled.`
    };
    return messages[type] || `Order #${details.orderNumber} status updated to ${details.status}`;
}

// Send SMS to multiple contacts
async function sendSMSToContacts(contacts, body) {
    validateTwilioConfig();
    
    const formattedFromNumber = formatPhoneNumber(phone);
    const msgPromises = contacts.map(async user => {
        if (!user.phone) {
            console.log(`Skipping SMS for user without phone number`);
            return user;
        }

        const formattedToNumber = formatPhoneNumber(user.phone);
        console.log(`Attempting to send SMS from ${formattedFromNumber} to ${formattedToNumber}`);

        if (isTestMode) {
            console.log('[TEST MODE] Would send SMS:', {
                from: formattedFromNumber,
                to: formattedToNumber,
                body
            });
            return false;
        }

        try {
            await client.messages.create({
                body,
                from: formattedFromNumber,
                to: formattedToNumber
            });
            console.log(`SMS sent successfully to ${formattedToNumber}`);
            return false;
        } catch (error) {
            console.error(`Failed to send SMS to ${formattedToNumber}:`, {
                code: error.code,
                message: error.message,
                moreInfo: error.moreInfo
            });
            
            // Provide more specific guidance for common errors
            if (error.code === 21606) {
                console.error('Troubleshooting tips:');
                console.error('1. Verify your Twilio phone number is enabled for international messaging');
                console.error('2. Check if the destination country is enabled in your Twilio account');
                console.error('3. Ensure you have sufficient balance for international messaging');
                console.error('4. Consider using a local Twilio number for the destination country');
            }
            
            return user;
        }
    });

    const failures = await Promise.all(msgPromises);
    return failures.filter(f => !!f);
}

// Send order status update to both admin and customer
async function sendOrderStatusUpdate(order, user, statusType) {
    try {
        const details = formatOrderDetails(order, user);
        const message = generateStatusMessage(statusType, details);
        
        // Send to admin
        const adminContacts = [
            {phone: config.clientPhone},
            {phone: config.clientPhone2}
        ].filter(contact => contact.phone); // Filter out empty phone numbers

        if (adminContacts.length > 0) {
            await sendSMSToContacts(adminContacts, `[Admin] ${message}`);
        } else {
            console.log('No admin phone numbers configured');
        }

        // Send to customer if they have a phone number
        if (user?.phone) {
            await sendSMSToContacts(
                [{phone: user.phone}],
                `[MetabolixMD] ${message}`
            );
        } else {
            console.log('No customer phone number available');
        }
    } catch (error) {
        console.error('Error in sendOrderStatusUpdate:', error);
        throw error;
    }
}

module.exports = {
    sendSMSToContacts,
    sendOrderStatusUpdate
};