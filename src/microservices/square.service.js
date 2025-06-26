const squareClient = require('../config/square.config');
const { GUIDE_MERCHANT_CATEGORY_CODE, revenueTypes } = require('../constants');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const { Payment } = require('../models/payment.models');
const httpStatus = require('http-status');
const crypto = require('crypto');

// Initialize Square API clients
const checkoutApi = squareClient.checkout;
const paymentsApi = squareClient.payments;
const customersApi = squareClient.customers;

const verifyWebhookSignature = (requestBody, signatureHeaders, notificationUrl) => {
  try {
    console.log('Verifying Square webhook signature...');
    
    // Extract both possible signature headers
    const sha1Signature = signatureHeaders['x-square-signature'];
    const sha256Signature = signatureHeaders['x-square-hmacsha256-signature'];
    
    console.log('Available signatures:', {
      'x-square-signature': sha1Signature,
      'x-square-hmacsha256-signature': sha256Signature
    });
    
    if (!sha1Signature && !sha256Signature) {
      throw new Error('No Square signature header found');
    }
    
    if (!config.square.webhookSignatureKey) {
      throw new Error('Square webhook signature key is not configured');
    }
    
    const signatureKey = config.square.webhookSignatureKey;
    
    // Debug logging (remove in production)
    console.log('Notification URL:', notificationUrl);
    console.log('Signature key exists:', !!signatureKey);
    console.log('Request body type:', typeof requestBody);
    console.log('Request body length:', requestBody?.length);
    
    // Ensure we have the raw body as a string
    let bodyString;
    if (typeof requestBody === 'string') {
      bodyString = requestBody;
    } else if (Buffer.isBuffer(requestBody)) {
      bodyString = requestBody.toString('utf8');
    } else {
      bodyString = JSON.stringify(requestBody);
    }
    
    console.log('Body string length:', bodyString.length);
    console.log('Body string preview:', bodyString.substring(0, 200));
    
    // Square webhook signature verification: notification_url + request_body
    const stringToSign = notificationUrl + bodyString;
    
    console.log('String to sign length:', stringToSign.length);
    console.log('String to sign preview:', stringToSign.substring(0, 300));
    
    let verified = false;
    
    // Try SHA-256 signature first (newer method)
    if (sha256Signature) {
      console.log('Trying SHA-256 signature verification...');
      const hmac256 = crypto.createHmac('sha256', signatureKey);
      hmac256.update(stringToSign, 'utf8');
      const generated256 = hmac256.digest('base64');
      
      console.log('Generated SHA-256 signature:', generated256);
      console.log('Expected SHA-256 signature:', sha256Signature);
      
      if (generated256 === sha256Signature) {
        console.log('SHA-256 signature verified successfully');
        verified = true;
      } else {
        // Try with body only (fallback)
        console.log('Trying SHA-256 with body only...');
        const hmac256Body = crypto.createHmac('sha256', signatureKey);
        hmac256Body.update(bodyString, 'utf8');
        const generated256Body = hmac256Body.digest('base64');
        
        console.log('Generated SHA-256 signature (body only):', generated256Body);
        
        if (generated256Body === sha256Signature) {
          console.log('SHA-256 signature (body only) verified successfully');
          verified = true;
        }
      }
    }
    
    // Try SHA-1 signature if SHA-256 didn't work (legacy method)
    if (!verified && sha1Signature) {
      console.log('Trying SHA-1 signature verification...');
      const hmac1 = crypto.createHmac('sha1', signatureKey);
      hmac1.update(stringToSign, 'utf8');
      const generated1 = hmac1.digest('base64');
      
      console.log('Generated SHA-1 signature:', generated1);
      console.log('Expected SHA-1 signature:', sha1Signature);
      
      if (generated1 === sha1Signature) {
        console.log('SHA-1 signature verified successfully');
        verified = true;
      } else {
        // Try with body only (fallback)
        console.log('Trying SHA-1 with body only...');
        const hmac1Body = crypto.createHmac('sha1', signatureKey);
        hmac1Body.update(bodyString, 'utf8');
        const generated1Body = hmac1Body.digest('base64');
        
        console.log('Generated SHA-1 signature (body only):', generated1Body);
        
        if (generated1Body === sha1Signature) {
          console.log('SHA-1 signature (body only) verified successfully');
          verified = true;
        }
      }
    }
    
    if (!verified) {
      throw new Error('All signature verification attempts failed');
    }
    
    console.log('Webhook signature verified successfully');
    return JSON.parse(bodyString);
    
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }
};

const createCheckoutSession = async (amount, user, orderId, product_data) => {
  try {
    console.log('Creating checkout session for order:', { 
      orderId, 
      userId: user._id, 
      amount 
    });
    
    // Validate inputs
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount provided');
    }
    
    if (!user || !user._id || !user.email) {
      throw new Error('Invalid user data provided');
    }
    
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    // Ensure product_data is valid
    if (!product_data || !Array.isArray(product_data) || product_data.length === 0) {
      console.error('Invalid product data:', product_data);
      throw new Error('No products provided for checkout');
    }

    const baseUrl = config.env === 'production' 
      ? 'https://metabolixmd.com'
      : 'http://localhost:3000';
    
    // Create a unique idempotency key
    const idempotencyKey = crypto.randomUUID();
    console.log(`Using idempotency key: ${idempotencyKey} for order: ${orderId}`);
    
    // Build line items from product data
    const lineItems = product_data.map((product, index) => ({
      name: product.name || `Product ${index + 1}`,
      quantity: String(product.quantity || 1),
      basePriceMoney: {
        amount: Math.round((product.price || 0) * 100), // Convert to cents
        currency: 'USD'
      }
    }));
    
    const requestBody = {
      idempotencyKey,
      order: {
        locationId: config.square.locationId,
        lineItems,
        metadata: {
          orderId,
          userId: String(user._id)
        }
      },
      checkoutOptions: {
        redirectUrl: `${baseUrl}/payment-verification?payment=success&order_id=${orderId}`,
        askForShippingAddress: false,
        merchantSupportEmail: 'support@metabolixmd.com',
        enableCoupon: false,
        enableLoyalty: false
      },
      prePopulatedData: {
        buyerEmail: user.email,
        buyerPhoneNumber: user.phone || undefined
      }
    };
    
    console.log('Creating checkout session with Square SDK...');
    console.log('Request payload:', JSON.stringify(requestBody, null, 2));
    
    const response = await checkoutApi.createPaymentLink(requestBody);
    
    if (!response.result || !response.result.paymentLink) {
      console.error('Invalid response from Square API:', response);
      throw new Error('Failed to create payment link: Invalid response structure');
    }
    
    const paymentLink = response.result.paymentLink;
    
    console.log('Checkout session created successfully:', { 
      paymentLinkId: paymentLink.id,
      orderId,
      userId: user._id 
    });

    return {
      id: paymentLink.id,
      url: paymentLink.url,
      orderId: paymentLink.orderId
    };
    
  } catch (err) {
    console.error('Error creating checkout session:', err);
    
    // Handle Square-specific errors
    if (err.errors) {
      const errorMessages = err.errors.map(error => 
        `${error.category}: ${error.detail}`
      ).join(', ');
      throw new ApiError(httpStatus.BAD_REQUEST, `Square API Error: ${errorMessages}`);
    }
    
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR, 
      `Failed to create checkout session: ${err.message}`
    );
  }
};

const createCustomer = async (user) => {
  try {
    console.log('Creating Square customer for user:', user._id);
    
    // Check if customer already exists by reference ID
    const searchResponse = await customersApi.searchCustomers({
      filter: {
        referenceIdFilter: {
          referenceIds: [String(user._id)]
        }
      }
    });
    
    if (searchResponse.result?.customers?.length > 0) {
      console.log('Customer already exists:', searchResponse.result.customers[0].id);
      return searchResponse.result.customers[0];
    }
    
    const createRequest = {
      emailAddress: user.email,
      givenName: user.name?.split(' ')[0] || user.name,
      familyName: user.name?.split(' ').slice(1).join(' ') || undefined,
      phoneNumber: user.phone || undefined,
      referenceId: String(user._id)
    };
    
    const response = await customersApi.createCustomer(createRequest);
    
    if (!response.result || !response.result.customer) {
      throw new Error('Failed to create customer - no customer in response');
    }
    
    console.log('Square customer created successfully:', response.result.customer.id);
    return response.result.customer;
    
  } catch (err) {
    console.error('Error creating Square customer:', err);
    
    // Handle Square-specific errors
    if (err.errors) {
      const errorMessages = err.errors.map(error => 
        `${error.category}: ${error.detail}`
      ).join(', ');
      throw new ApiError(httpStatus.BAD_REQUEST, `Square Customer Error: ${errorMessages}`);
    }
    
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to create customer: ${err.message}`
    );
  }
};

const handleWebhookEvent = async (event) => {
  try {
    console.log('Processing webhook event:', {
      type: event.type,
      id: event.id,
      createdAt: event.created_at
    });
    
    switch (event.type) {
      case 'payment.updated': {
        const payment = event.data.object.payment;
        
        if (payment.status !== 'COMPLETED') {
          console.log(`Payment status is ${payment.status}, not processing further`);
          return { processed: false, reason: 'Payment not completed' };
        }
        
        return await processCompletedPayment(payment);
      }
      
      case 'order.updated': {
        const order = event.data.object.order;
        
        if (order.state !== 'COMPLETED') {
          console.log(`Order state is ${order.state}, not processing further`);
          return { processed: false, reason: 'Order not completed' };
        }
        
        return await processCompletedOrder(order);
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { processed: false, reason: 'Unhandled event type' };
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

const processCompletedPayment = async (payment) => {
  console.log('Processing completed payment:', {
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: payment.amount_money.amount,
    currency: payment.amount_money.currency,
    status: payment.status
  });
  
  // Get order details to extract metadata
  let orderId, userId;
  
  if (payment.order_id) {
    try {
      const orderResponse = await squareClient.orders.retrieveOrder(payment.order_id);
      const order = orderResponse.result.order;
      
      orderId = order.metadata?.orderId;
      userId = order.metadata?.userId;
    } catch (err) {
      console.error('Failed to retrieve order details:', err);
    }
  }
  
  // Fallback to payment note if metadata not available
  if (!orderId || !userId) {
    const noteMatch = payment.note ? payment.note.match(/Order ID: ([^,]+)/) : null;
    const userIdMatch = payment.note ? payment.note.match(/User ID: ([^,]+)/) : null;
    
    orderId = orderId || (noteMatch ? noteMatch[1] : null);
    userId = userId || (userIdMatch ? userIdMatch[1] : null);
  }
  
  if (!orderId || !userId) {
    throw new Error('Missing required metadata: orderId or userId');
  }
  
  // Check if payment record already exists
  const existingPayment = await Payment.findOne({ 
    checkoutSessionId: payment.id 
  });
  
  if (existingPayment) {
    console.log('Payment record already exists:', existingPayment._id);
    return { processed: true, existing: true, paymentId: existingPayment._id };
  }
  
  const paymentData = {
    user: userId,
    order: orderId,
    checkoutSessionId: payment.id,
    amount: payment.amount_money.amount / 100, // Convert from cents
    currency: payment.amount_money.currency,
    customer: {
      id: payment.customer_id,
      email: payment.buyer_email_address
    },
    paymentStatus: 'paid',
    squarePaymentId: payment.id,
    createdAt: new Date(payment.created_at)
  };

  console.log('Creating payment record with data:', paymentData);
  const paymentRecord = await Payment.create(paymentData);
  
  console.log('Payment record created successfully:', {
    paymentId: paymentRecord._id,
    status: paymentRecord.paymentStatus
  });
  
  return { processed: true, existing: false, paymentId: paymentRecord._id };
};

const processCompletedOrder = async (order) => {
  console.log('Processing completed order:', {
    orderId: order.id,
    state: order.state,
    totalMoney: order.total_money
  });
  
  const orderId = order.metadata?.orderId;
  const userId = order.metadata?.userId;
  
  if (!orderId || !userId) {
    throw new Error('Missing required metadata in order: orderId or userId');
  }
  
  // This would typically trigger order fulfillment logic
  // For now, just log the successful order completion
  console.log('Order completed successfully:', { orderId, userId });
  
  return { processed: true, orderId, userId };
};

module.exports = {
  createCustomer,
  createCheckoutSession,
  verifyWebhookSignature,
  handleWebhookEvent
};