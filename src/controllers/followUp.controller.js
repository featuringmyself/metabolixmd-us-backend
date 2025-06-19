const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { followUpService } = require("../services");
const ApiError = require("../utils/ApiError");

const createFollowUp = catchAsync(async (req, res) => {
  const user = req.user;
  const data = { ...req.body, user: user._id };
  
  // Check if user has any active orders
  const hasActiveOrders = await followUpService.hasActiveOrders(user._id);
  if (!hasActiveOrders) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No active orders found for refill");
  }

  const followUp = await followUpService.createFollowUp(data);

  // If it's a refill request, process it immediately
  if (data.type === 'refill') {
    const result = await followUpService.processRefillFollowUp(followUp);
    return res.status(httpStatus.CREATED).send({
      status: true,
      data: result,
      message: "Follow-up request created and processed successfully"
    });
  }

  res.status(httpStatus.CREATED).send({
    status: true,
    data: followUp,
    message: "Follow-up request created successfully"
  });
});

const getFollowUpById = catchAsync(async (req, res) => {
  const followUp = await followUpService.getFollowUpById(req.params.id);
  res.status(httpStatus.OK).send({
    status: true,
    data: followUp,
    message: "Follow-up details retrieved successfully"
  });
});

const getFollowUpsByUserId = catchAsync(async (req, res) => {
  const followUps = await followUpService.getFollowUpsByUserId(req.user._id);
  res.status(httpStatus.OK).send({
    status: true,
    data: followUps,
    message: "User follow-ups retrieved successfully"
  });
});

const checkEligibility = catchAsync(async (req, res) => {
  const hasActiveOrders = await followUpService.hasActiveOrders(req.user._id);
  console.log(hasActiveOrders)
  res.status(httpStatus.OK).send({
    status: true,
    data: { isEligible: hasActiveOrders },
    message: hasActiveOrders ? "User is eligible for follow-up" : "No active orders found"
  });
});

module.exports = {
  createFollowUp,
  getFollowUpById,
  getFollowUpsByUserId,
  checkEligibility
}; 