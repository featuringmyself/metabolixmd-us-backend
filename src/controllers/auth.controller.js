const { User } = require('../models');
const { Vendor } = require('../models/user.model');
const {authService, favouriteService, userService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const createNewUserObject = newUser => ({
  email: newUser.email,
  firebaseUid: newUser.uid,
  name: newUser.name,
  isEmailVerified: newUser.isEmailVerified,
  firebaseSignInProvider: newUser.firebase.sign_in_provider,
});

const loginUser = catchAsync(async (req, res) => {
  if (!req.user) {
    res.status(401).send({ message: 'User not found' });
    return;
  }

  try {
    // Get the complete user data
    const user = await userService.getUserById(req.user._id);
    
    if (!user) {
      res.status(401).send({ message: 'User not found' });
      return;
    }

    // Convert to plain object and ensure __t is included
    const userData = user.toObject();
    
    // Default to 'User' if no user type is found
    const userType = userData.__t || user.__t || req.user.__t || 'User';

    const response = {
      ...userData,
      __t: userType
    };

    res.status(200).send({
      data: response,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ 
      message: 'An error occurred during login',
      error: error.message 
    });
  }
});

const onBoarding = catchAsync(async (req, res) => {
  if (req.user) {
    // res.status(401).send({message: 'User already exist'});
    // } else if (!req.newUser.email_verified) {
    //   res.status(401).send({ message: "Email not verified" });

    return res.status(200).send({data: req.user});
  } else {
    const userObj = {
      ...createNewUserObject(req.newUser),
      ...req.body,
    };
    let user = await User.create(userObj);
   
    res.status(201).send({data: user});
  }
});

const vendorOnBoarding = catchAsync(async (req, res) => {
  if (req.user) {
    // res.status(401).send({message: 'User already exist'});
    // } else if (!req.newUser.email_verified) {
    //   res.status(401).send({ message: "Email not verified" });

    return res.status(200).send({data: req.user});
  } else {
    const userObj = {
      ...createNewUserObject(req.newUser),
      ...req.body,
    };
    let user = await Vendor.create(userObj);
   
    res.status(201).send({data: user});
  }
});

const adminOnBoarding = catchAsync(async (req, res) => {
  if (req.user) {
    return res.status(200).send({data: req.user});
  } 
});


module.exports = {
  loginUser,
  onBoarding,
  vendorOnBoarding,
  adminOnBoarding
};