const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {userService} = require('../services');
const { getPaginateConfig } = require('../utils/queryPHandler');

const getUserDetails = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  res.status(200).send({
    data: {
      ...user.toObject(),
      __t: user.__t // Explicitly include the user type
    }, 
    message: 'Your details'
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const { filters, options } = getPaginateConfig(req.query);
  const user = await userService.getUsers(filters,options);
  res.status(200).send({data: user, message: 'Your details'});
});

const updateUser = catchAsync(async (req, res) => {
  const updatedUser = await userService.updateUserById(req.user._id, req.body, req.file);
  res.status(200).send({data: updatedUser, message: 'Your details are updated'});
});

const updatePreferences = catchAsync(async (req, res) => {
  const updatedUser = await userService.updatePreferencesById(req.user._id, req.body);
  res.status(200).send({data: updatedUser, message: 'Your preferences are updated'});
});

const softDeleteUser = catchAsync(async (req, res) => {
  const {userId} = req.params;
  if (req.user.__t !== 'Admin' && userId !== req.user._id.toString()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Sorry, you are not authorized to do this');
  }
  await userService.markUserAsDeletedById(req.params.userId);
  res.status(200).send({
    message: 'User has been removed successfully.',
  });
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(200).send({message: 'The user deletion process has been completed successfully.'});
});

module.exports = {
  deleteUser,
  updateUser,
  softDeleteUser,
  updatePreferences,
  getUserDetails,
  getAllUsers
};
