const Joi = require('joi');
const path = require('path');
const dotnev = require('dotenv');

dotnev.config({path: path.join(__dirname, '../../.env')});

// schema of env files for validation
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('test', 'development', 'production')
      .required(),
    PORT: Joi.number().default(8082),
    MONGODB_URL: Joi.string().required()
  })
  .unknown();

// validating the process.env object that contains all the env variables
const {value: envVars, error} = envVarsSchema.prefs({errors: {label: 'key'}}).validate(process.env);

// throw error if the validation fails or results into false
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  twilio: {
    sid: envVars.TWILIO_SID,
    phone: envVars.TWILIO_PHONE,
    authToken: envVars.TWILIO_AUTH_TOKEN,
  },
  clientPhone: envVars.CLIENT_PHONE,
  clientPhone2: envVars.CLIENT_PHONE2,

  aws: {
    s3: {
      name: envVars.AWS_S3_BUCKET,
      region: envVars.AWS_S3_REGION,
      accessKeyId: envVars.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_S3_SECRET_ACCESS_KEY,
    },
  },
  firebase:{
    api_key:envVars.FIREBASE_API_KEY,
    type:envVars.type,
    project_id:envVars.project_id,
    private_key_id:envVars.private_key_id,
    private_key:envVars.private_key,
    client_email:envVars.client_email,
    client_id:envVars.client_id,
    auth_uri:envVars.auth_uri,
    token_uri:envVars.token_uri,
    auth_provider_x509_cert_url:envVars.auth_provider_x509_cert_url,
    client_x509_cert_url:envVars.client_x509_cert_url,
    universe_domain:envVars.universe_domain
  },
  mongoose: {
    // exception added for TDD purpose
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : '')
  },
  stripe: {
    secretKey: envVars.STRIPE_SECRET,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
  },
  sendGrid:{
    password: envVars.SENDGRID_PASSWORD
  },
  adminMail: envVars.ADMIN_MAIL,
  fromEmail: envVars.FROM_EMAIL,
};
