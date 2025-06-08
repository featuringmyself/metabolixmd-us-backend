const { SquareClient } = require('square');
const config = require('./config');

const squareClient = new SquareClient({
  accessToken: config.square.accessToken,
  environment: config.env === 'production' ? 'production' : 'sandbox',
  baseUrl: config.env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  squareVersion: '2025-05-21',
  additionalHeaders: {
    'Square-Version': '2025-05-21'
  }
});

module.exports = squareClient;