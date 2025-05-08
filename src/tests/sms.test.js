const mongoose = require('mongoose');
const { sendOrderStatusUpdate } = require('../microservices/sms.service');
const { Order } = require('../models/order.models.js');
const { User } = require('../models/user.model.js');
const { Product } = require('../models/product.model.js');
require('dotenv').config();

async function testSMSNotifications() {
    try {
        // Connect to your database
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to database');

        // Check if test user already exists
        let testUser = await User.findOne({ email: 'rudralocked@gmail.com' });
        
        if (!testUser) {
            // Create a test user with all required fields
            testUser = await User.create({
                name: 'Test User',
                email: 'rudralocked@gmail.com',
                phone: process.env.TEST_PHONE_NUMBER,
                firebaseUId: 'test-firebase-id',
                firebaseSignInProvider: 'email',
                firebaseUid: 'test-firebase-id',
                detail: {
                    firstName: 'Test',
                    lastName: 'User',
                    address: 'Test Address',
                    city: 'Test City',
                    state: 'Test State',
                    postalCode: '12345',
                    country: 'Test Country'
                }
            });
            console.log('Created test user');
        } else {
            console.log('Using existing test user');
        }

        // Get an existing product
        const existingProduct = await Product.findOne();
        if (!existingProduct) {
            throw new Error('No products found in database. Please add a product first.');
        }
        console.log('Using existing product:', existingProduct.name);

        // Create a test order with all required fields
        const testOrder = await Order.create({
            orderNo: 999,
            totalValue: 100,
            user: testUser._id,
            status: 'pending',
            paymentStatus: 'pending',
            deliveryAddress: {
                country: 'Test Country',
                state: 'Test State',
                city: 'Test City',
                postalCode: '12345',
                street: 'Test Street',
                address: 'Test Address'
            },
            orderItems: [{
                product: existingProduct._id,
                productName: existingProduct.name,
                price: existingProduct.sellingPrice.toString(),
                quantity: 1,
                totalPrice: existingProduct.sellingPrice,
                productImage: existingProduct.image?.url || 'https://example.com/test.jpg'
            }]
        });

        console.log('Created test order:', testOrder.orderNo);

        // Test different status updates
        const statuses = [
            { status: 'placed', type: 'orderPlaced' },
            { status: 'processing', type: 'orderProcessing' },
            { status: 'shipped', type: 'orderShipped' },
            { status: 'delivered', type: 'orderDelivered' }
        ];

        for (const status of statuses) {
            console.log(`\nTesting status: ${status.status}`);
            await sendOrderStatusUpdate(testOrder, testUser, status.type);
            console.log(`SMS sent for ${status.status}`);
            // Wait 2 seconds between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Test payment status updates
        console.log('\nTesting payment status updates');
        await sendOrderStatusUpdate(testOrder, testUser, 'paymentPending');
        console.log('SMS sent for payment pending');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await sendOrderStatusUpdate(testOrder, testUser, 'paymentReceived');
        console.log('SMS sent for payment received');

        console.log('\nAll tests completed!');
        
    } catch (error) {
        console.error('Error in test:', error);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }
}

// Run the test
testSMSNotifications(); 