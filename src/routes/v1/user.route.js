const express = require('express');
const router = express.Router();

const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const userValidation = require('../../validations/user.validation');

const {userController} = require('../../controllers');
const {fileUploadService} = require('../../microservices');
router.get(
  '/',
  firebaseAuth('Admin'),
  userController.getAllUsers
);
// for updating userDetails
router.patch(
  '/updateDetails',
  fileUploadService.multerUpload.single('profilePic'),
  firebaseAuth('All'),
  // validate(userValidation.updateDetails),
  userController.updateUser
);

// for updating specific user preferences
router.patch(
  '/updatePreferences',
  validate(userValidation.updateUserPreferences),
  firebaseAuth('All'),
  userController.updatePreferences
);

router.get(
  '/me',
  firebaseAuth('All'),
  userController.getUserDetails
);

// for deleting a user
router.delete('/:userId', validate(userValidation.deleteUser), firebaseAuth('Admin'), userController.deleteUser);

// to soft delete a user
router.post('/delete/:userId', validate(userValidation.deleteUser), firebaseAuth('All'), userController.softDeleteUser);

module.exports = router;
