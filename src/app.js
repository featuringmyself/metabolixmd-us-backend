const cors = require("cors");
const express = require("express");
const compression = require("compression");

const helmet = require("helmet");

const httpStatus = require("http-status");
const routes = require("./routes/v1");
const testRoutes = require("./routes/test.routes");
const morgan = require("./config/morgan");
const config = require("./config/config");
const ApiError = require("./utils/ApiError");
const { errorConverter, errorHandler } = require("./middlewares/error");
const ejs = require('ejs');

const app = express();

//Morgan will handle logging HTTP requests,
// while winston logger will take care of your application-specific logs
if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('webhook')) req.rawBody = buf.toString();
  },
}));

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options("*", cors());

const path = require('path');

// Set content type for API routes
app.use('/v1', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Reroute all API request starting with "/v1" route
app.use('/v1', routes);
// Also make routes available without the v1 prefix for backward compatibility
app.use('/', routes);
// Add test routes
app.use('/test', testRoutes);

// Serve static files and views only for specific routes
app.use('/confirmation', express.static(path.join(__dirname, 'public')));
app.use('/preview-email', express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route to render the EJS template
app.get('/confirmation', (req, res) => {
  res.render('ordermail', {
    patientName: 'John Doe',
    orderCompletionLink: 'https://www.metabolixmd.com/order/complete'
  });
});

// Add this route before error handlers
app.get('/preview-email', (req, res) => {
  res.render('completePaymentMail', { 
    link: 'https://example.com/approve-order',
    name: 'John Doe'
  });
});

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
