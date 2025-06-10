const squareClient = require('../config/square.config');
const { GUIDE_MERCHANT_CATEGORY_CODE, revenueTypes } = require('../constants');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const { Payment } = require('../models/payment.models');
const httpStatus = require('http-status');
const crypto = require('crypto');
const axios = require('axios');

// Initialize Square API clients
const checkoutApi = squareClient.checkout;

const verifyWebhookSignature = (requestBody, signatureHeader) => {
  try {
    console.log('Verifying Square webhook signature...');
    if (!signatureHeader) {
      throw new Error('No signature header found');
    }
    
    if (!config.square.webhookSignatureKey) {
      throw new Error('Square webhook signature key is not configured');
    }

    // Square webhook verification
    const signatureKey = config.square.webhookSignatureKey;
    const hmac = crypto.createHmac('sha256', signatureKey);
    hmac.update(requestBody);
    const generatedSignature = hmac.digest('base64');
    
    if (generatedSignature !== signatureHeader) {
      throw new Error('Webhook signature verification failed');
    }
    
    console.log('Webhook signature verified successfully');
    const event = JSON.parse(requestBody);
    return event;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }
};

const createCheckoutSession = async (amount, user, orderId, product_data) => {
  try {
    console.log('Creating checkout session for order:', { orderId, userId: user._id, amount });
    
    // Ensure product_data is an array
    if (!product_data || !Array.isArray(product_data) || product_data.length === 0) {
      console.error('Invalid product data:', product_data);
      throw new Error('No products provided for checkout');
    }

    const baseUrl = config.env === 'production' 
      ? 'https://metabolixmd.com'
      : 'http://localhost:3000';
    
    // Use correct API URL based on environment
    const apiUrl = config.env === 'production' 
      ? 'https://connect.squareup.com/v2/online-checkout/payment-links'  // Production API
      : 'https://connect.squareupsandbox.com/v2/online-checkout/payment-links'; // Sandbox API
    
    console.log(`Using Square API URL: ${apiUrl}`);
    
    // Create a unique idempotency key for this transaction
    const idempotencyKey = crypto.randomUUID();
    console.log(`Using idempotency key: ${idempotencyKey} for order: ${orderId}`);
    
    // Log product data for debugging
    console.log('Product data for checkout:', JSON.stringify(product_data));
    
    const requestBody = {
      idempotency_key: idempotencyKey,
      quick_pay: {
        name: 'MetabolixMD Order',
        price_money: {
          amount: Math.round(amount * 100), // Convert to cents and round
          currency: 'USD'
        },
        location_id: config.square.locationId
      },
      checkout_options: {
        redirect_url: `${baseUrl}/profile-details?payment=success&order_id=${orderId}`,
        ask_for_shipping_address: false,
        merchant_support_email: 'support@metabolixmd.com',
      },
      pre_populated_data: {
        buyer_email: user.email,
      },
      note: `Order ID: ${orderId}, User ID: ${user._id}`
    };
    
    console.log('Square API request payload:', JSON.stringify(requestBody));
    console.log('Environment:', config.env);
    console.log('Access Token exists:', !!config.square.accessToken);
    
    console.log('Sending payment link request to Square API');
    try {
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Square-Version': '2025-05-21',
          'Authorization': `Bearer ${config.square.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Square API response status:', response.status);
      
      // Log response data for debugging
      if (response.data) {
        console.log('Square API response data:', JSON.stringify(response.data));
      }

      if (!response.data || !response.data.payment_link) {
        console.error('Invalid response from Square API:', response.data);
        throw new Error('Failed to create payment link: Invalid response structure');
      }

      console.log('Checkout session created successfully:', { 
        paymentLinkId: response.data.payment_link.id,
        orderId,
        userId: user._id 
      });

      return {
        id: response.data.payment_link.id,
        url: response.data.payment_link.url
      };
    } catch (axiosError) {
      if (axiosError.response) {
        console.error('Square API error response:', {
          status: axiosError.response.status,
          data: JSON.stringify(axiosError.response.data)
        });
        throw new Error(`Failed to create payment link: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      }
      throw axiosError;
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const createCustomer = async (user) => {
  try {
    console.log('Creating Square customer for user:', user._id);
    
    const customersApi = squareClient.customers;
    const response = await customersApi.createCustomer({
      emailAddress: user.email,
      givenName: user.name,
      phoneNumber: user.phone,
      referenceId: String(user._id)
    });
    
    if (!response.result || !response.result.customer) {
      throw new Error('Failed to create customer');
    }
    
    console.log('Square customer created successfully:', response.result.customer.id);
    return response.result.customer;
  } catch (err) {
    console.error('Error creating Square customer:', err);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create customer: ' + err.message
    );
  }
};

const handleWebhookEvent = async (event) => {
  try {
    console.log('Processing webhook event:', {
      type: event.type,
      id: event.id,
      createdAt: event.created_at,
      data: event.data
    });
    
    switch (event.type) {
      case 'payment.updated': {
        const payment = event.data.object.payment;
        
        if (payment.status !== 'COMPLETED') {
          console.log(`Payment status is ${payment.status}, not processing further`);
          return null;
        }
        
        console.log('Processing completed payment:', {
          paymentId: payment.id,
          orderId: payment.note ? payment.note.split('Order ID: ')[1]?.split(',')[0] : null,
          amount: payment.amount_money.amount,
          currency: payment.amount_money.currency,
          status: payment.status
        });
        
        // Extract order ID from payment note
        const noteMatch = payment.note ? payment.note.match(/Order ID: ([^,]+)/) : null;
        const userIdMatch = payment.note ? payment.note.match(/User ID: ([^,]+)/) : null;
        
        if (!noteMatch || !userIdMatch) {
          console.error('Missing required metadata in payment note:', payment.note);
          throw new Error('Missing required metadata: orderId or userId');
        }
        
        const orderId = noteMatch[1];
        const userId = userIdMatch[1];

        // Create payment record
        const paymentData = {
          user: userId,
          order: orderId,
          checkoutSessionId: payment.id,
          amount: payment.amount_money.amount / 100, // Convert from cents to dollars
          currency: payment.amount_money.currency,
          customer: {
            id: payment.customer_id,
            email: payment.buyer_email
          },
          paymentStatus: payment.status === 'COMPLETED' ? 'paid' : payment.status.toLowerCase()
        };

        console.log('Creating payment record with data:', paymentData);
        const paymentRecord = await Payment.create(paymentData);
        console.log('Payment record created successfully:', {
          paymentId: paymentRecord._id,
          status: paymentRecord.paymentStatus
        });
        return paymentRecord;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return null;
    }
  } catch (error) {
    console.error('Error processing webhook event:', {
      error: error.message,
      stack: error.stack,
      eventType: event?.type
    });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to process webhook event');
  }
};

module.exports = {
  createCustomer,
  createCheckoutSession,
  verifyWebhookSignature,
  handleWebhookEvent
};