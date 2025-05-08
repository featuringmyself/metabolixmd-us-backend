const express = require('express');
const router = express.Router();

const validate = require('../../middlewares/validate');
const {firebaseAuth, generateToken} = require('../../middlewares/firebaseAuth');
const authValidation = require('../../validations/auth.validation');

const {authController, loginlogController} = require('../../controllers');

router.post('/login', firebaseAuth, authController.loginUser);

// Add GET /me endpoint for getting authenticated user information
router.get('/me', firebaseAuth('All'), authController.loginUser);

router.post(
  '/onBoarding',
  firebaseAuth("all"),
  // validate(authValidation.register),
  authController.onBoarding
);

router.post(
  '/vendor/onBoarding',
  firebaseAuth("Vendor"),
  // validate(authValidation.register),
  authController.vendorOnBoarding
);

router.post(
  '/admin/onBoarding',
  firebaseAuth("Admin"),
  // validate(authValidation.register),
  authController.adminOnBoarding
);


router.get(
  '/generateToken/:uid',
  generateToken
);

// router.get(
//   '/log',
//   firebaseAuth,
//   loginlogController.createLog
// );
module.exports = router;
