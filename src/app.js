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
const hipaaLogger = require('./middlewares/hipaaLogger');
const sessionTimeout = require('./middlewares/sessionTimeout');

const app = express();

//Morgan will handle logging HTTP requests,
// while winston logger will take care of your application-specific logs
if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers with HIPAA-compliant settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google-analytics.com", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://www.google-analytics.com", "https://*.stripe.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://api.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
  xssFilter: true,
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

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

// enable cors with HIPAA-compliant settings
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = ["https://www.metabolixmd.com", "https://metabolixmd.com", "http://localhost:3000"];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins temporarily to debug CORS issues
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  maxAge: 86400, // 24 hours in seconds
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'timezone'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// For development/production flexibility
if (config.env === 'development') {
  corsOptions.origin = function(origin, callback) {
    callback(null, true); // Allow any origin in development
  };
}

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const path = require('path');

// Set content type for API routes
app.use('/v1', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Apply HIPAA session timeout middleware (15 minutes default)
app.use(sessionTimeout(process.env.SESSION_TIMEOUT || 900000));

// Apply HIPAA audit logging middleware
app.use(hipaaLogger());

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
    link: 'https://www.metabolixmd.com/profile-details',
    // name: 'John Doe'
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