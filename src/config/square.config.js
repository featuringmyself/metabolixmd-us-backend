const { SquareClient } = require('square');
const config = require('./config');

const squareClient = new SquareClient({
  accessToken: config.square.accessToken,
  environment: 'sandbox', // Always use sandbox environment for testing
  baseUrl: 'https://connect.squareupsandbox.com',
  squareVersion: '2025-05-21',
  additionalHeaders: {
    'Square-Version': '2025-05-21'
  }
});

module.exports = squareClient;