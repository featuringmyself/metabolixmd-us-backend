const Sentry = require('../instrument');
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

// Attach Sentry request handler before all other middleware/routes
app.use(Sentry.Handlers.requestHandler());

// Create server with proper raw body handling
const server = app.listen(config.port, () => {
  console.log(`Pharma app listening on port ${config.port}!`);
});

// Increase payload size limit for webhook
server.setTimeout(30000); // 30 second timeout
server.maxHeadersCount = 100;

// Mount routes

// Attach Sentry error handler before custom error handlers
app.use(Sentry.Handlers.errorHandler());

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
