const mongoose = require('mongoose');
const { createDrChronoPatient } = require('../microservices/drchrono.service');
const config = require('../config/config');
const {User} = require('../models/user.model');

// Replace with a real user email or _id from your database
const TEST_USER_EMAIL = 'rudralocking@gmail.com';

const mockAddress = {
  street: '123 Test St',
  city: 'Testville',
  state: 'CA',
  postalCode: '90001',
  country: 'USA',
};

async function testCreateOrderAndPushToDrChrono() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url);
    console.log('Connected to MongoDB');

    // Fetch user from DB
    const user = await User.findOne({ email: TEST_USER_EMAIL });
    if (!user) {
      throw new Error(`User with email ${TEST_USER_EMAIL} not found in DB`);
    }
    console.log('Fetched user:', user.email);

    // Call DrChrono integration
    const drchronoResponse = await createDrChronoPatient(user, mockAddress);
    console.log('DrChrono patient creation response:', drchronoResponse);
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCreateOrderAndPushToDrChrono();
} 