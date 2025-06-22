const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const mongoose = require('mongoose');

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(() => {
    console.log('Connected to mongodb');
  })
  .catch(err => {
    console.log(err);
  });

// Create server with proper raw body handling
const server = app.listen(config.port, () => {
  console.log(`Pharma app listening on port ${config.port}!`);
});

// Increase payload size limit for webhook
server.setTimeout(30000); // 30 second timeout
server.maxHeadersCount = 100;

// Mount routes


// ------------- Don't Modify  -------------
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = error => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
// ------------- Don't Modify  -------------
