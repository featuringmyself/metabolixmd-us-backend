const cors = require("cors");
const express = require("express");
const compression = require("compression");

const helmet = require("helmet");

const httpStatus = require("http-status");
const routes = require("./routes/v1");
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
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl.includes('webhook')) req.rawBody = buf.toString();
    },
  })
);
// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options("*", cors());

const path = require('path');

// Reroute all API request starting with "/v1" route
app.use('/v1', routes);
// Also make routes available without the v1 prefix for backward compatibility
app.use('/', routes);
app.use(express.static(path.join(__dirname, 'public')));

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
