const stripe = require('../config/stripe.config');
const { GUIDE_MERCHANT_CATEGORY_CODE, revenueTypes } = require('../constants');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const { Payment } = require('../models/payment.models');
const httpStatus = require('http-status');

const constructEvent = (requestBody, signatureHeader, isConnectWebhook = true) => {
  try {
    console.log('Verifying Stripe webhook signature...');
    if (!signatureHeader) {
      throw new Error('No signature header found');
    }
    
    if (!config.stripe.webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    const event = stripe.webhooks.constructEvent(
      requestBody,
      signatureHeader,
      config.stripe.webhookSecret
    );
    
    console.log('Webhook signature verified successfully');
    return event;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }
};

const createCheckoutSession = async (amount, user, orderId, product_data) => {
  try {
    console.log('Creating checkout session for order:', { orderId, userId: user._id });
    
    if (!product_data || !product_data.length) {
      throw new Error('No products provided for checkout');
    }

    const items = product_data.map(pro => {
      const originalAmount = pro.price * 100;
      const finalAmount = (amount / product_data.reduce((sum, p) => sum + p.price * p.quantity, 0)) * originalAmount;
      
      return {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(finalAmount / pro.quantity), // Round to nearest cent
          product_data: {
            name: pro.productName,
          },
        },
        quantity: pro.quantity,
      };
    });

    const baseUrl = config.env === 'production' 
      ? 'https://metabolixmd.com'
      : 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: items,
      metadata: {
        userId: String(user._id),
        orderId: String(orderId),
      },
      success_url: `${baseUrl}/profile-details?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/profile-details?payment=cancelled`,
    });

    console.log('Checkout session created successfully:', { 
      sessionId: session.id,
      orderId,
      userId: user._id 
    });

    return session;
  } catch (err) {
    console.error('Error creating checkout session:', err);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create checkout session: ' + err.message
    );
  }
};

const createCustomer = async (user) => {
  try {
    console.log('Creating Stripe customer for user:', user._id);
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      phone: user.phone,
      metadata: {
        userId: String(user._id)
      }
    });
    
    console.log('Stripe customer created successfully:', customer.id);
    return customer;
  } catch (err) {
    console.error('Error creating Stripe customer:', err);
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
      created: event.created,
      data: event.data
    });
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Processing completed checkout session:', {
          sessionId: session.id,
          metadata: session.metadata,
          amount: session.amount_total,
          currency: session.currency,
          customer: session.customer,
          paymentIntent: session.payment_intent,
          paymentStatus: session.payment_status
        });
        
        // Validate required metadata
        if (!session.metadata?.userId || !session.metadata?.orderId) {
          console.error('Missing required metadata in session:', session.metadata);
          throw new Error('Missing required metadata: userId or orderId');
        }

        // Create payment record
        const paymentData = {
          user: session.metadata.userId,
          order: session.metadata.orderId,
          checkoutSessionId: session.id,
          amount: session.amount_total / 100, // Convert from cents to dollars
          currency: session.currency,
          customer: {
            id: session.customer,
            email: session.customer_email
          },
          paymentIntent: session.payment_intent,
          paymentStatus: session.payment_status
        };

        console.log('Creating payment record with data:', paymentData);
        const payment = await Payment.create(paymentData);
        console.log('Payment record created successfully:', {
          paymentId: payment._id,
          status: payment.paymentStatus
        });
        return payment;
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
  constructEvent,
  handleWebhookEvent
};
