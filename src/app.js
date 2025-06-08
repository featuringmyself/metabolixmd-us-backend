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

const app = express();

//Morgan will handle logging HTTP requests,
// while winston logger will take care of your application-specific logs
if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// Configure CORS before other middleware
const corsOptions = {
  origin: true, // This will reflect the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'timezone'
  ],
  exposedHeaders: [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,timezone');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(200).json({});
  }
  next();
});

// set security HTTP headers with HIPAA-compliant settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google-analytics.com", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com"],
      imgSrc: ["'self'", "data:", "https://www.google-analytics.com", "https://*.squarecdn.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://connect.squareupsandbox.com", "https://connect.squareup.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// Increase body size limits before other middleware
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('webhook')) req.rawBody = buf.toString();
  },
}));

// Configure file upload limits
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 100000 
}));

// Configure body parser with increased limits
app.use(express.raw({
  limit: '50mb',
  type: ['image/*']
}));

// gzip compression
app.use(compression());

// Apply HIPAA audit logging middleware
app.use(hipaaLogger());

// Reroute all API requests
app.use('/v1', routes);
app.use('/', routes);
app.use('/test', testRoutes);

const path = require('path');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;