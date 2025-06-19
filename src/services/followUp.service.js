const { FollowUp } = require("../models/followUp.models.js");
const { Order } = require("../models/order.models.js");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const { orderService } = require("../services");

async function createFollowUp(data) {
  const followUp = await FollowUp.create(data);
  return followUp;
}

async function getFollowUpById(id) {
  const followUp = await FollowUp.findById(id)
    .populate('user')
    .populate('previousOrder')
    .populate('newOrder');
  
  if (!followUp) {
    throw new ApiError(httpStatus.NOT_FOUND, "Follow-up record not found");
  }
  return followUp;
}

async function getFollowUpsByUserId(userId) {
  const followUps = await FollowUp.find({ user: userId })
    .populate('previousOrder')
    .populate('newOrder')
    .sort({ createdAt: -1 });
  return followUps;
}

async function hasActiveOrders(userId) {
  const orders = await Order.find({ 
    user: userId,
    status: { $in: ['placed', 'processing', 'delivered'] }
  });
  return orders.length > 0;
}

async function processRefillFollowUp(followUpData) {
  let newOrder;
  if (followUpData.previousOrder) {
    // Get the previous order to copy relevant details
    const previousOrder = await orderService.getOrderById(followUpData.previousOrder);
    // Create a new order with the same items as the previous order
    const newOrderData = {
      user: followUpData.user,
      orderItems: previousOrder.orderItems,
      totalValue: previousOrder.totalValue,
      deliveryAddress: previousOrder.deliveryAddress,
      status: 'pending'
    };
    newOrder = await orderService.createOrder(newOrderData);
  } else {
    // Always fetch the most recent order for the user
    const userOrders = await orderService.getOrderByUserId(followUpData.user);
    if (userOrders && userOrders.length > 0 && userOrders[0].deliveryAddress) {
      newOrder = await orderService.createOrder({
        user: followUpData.user,
        orderItems: [],
        totalValue: 0,
        status: 'pending',
        deliveryAddress: userOrders[0].deliveryAddress
      });
    } else {
      // This should never happen, but handle gracefully
      throw new ApiError(httpStatus.BAD_REQUEST, 'No previous order with delivery address found for user.');
    }
  }

  // Update the follow-up record with the new order
  const updatedFollowUp = await FollowUp.findByIdAndUpdate(
    followUpData._id,
    { 
      newOrder: newOrder._id,
      status: 'completed'
    },
    { new: true }
  );

  return {
    followUp: updatedFollowUp,
    order: newOrder
  };
}

module.exports = {
  createFollowUp,
  getFollowUpById,
  getFollowUpsByUserId,
  hasActiveOrders,
  processRefillFollowUp
}; 