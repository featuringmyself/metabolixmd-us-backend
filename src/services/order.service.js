const { Order } = require("../models/order.models.js");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const mongoose = require('mongoose');

async function createOrder(data) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log('Creating new order:', data);
    const count = await Order.count();
    const order = await Order.create([{
      ...data,
      orderNo: count + 1,
      paymentStatus: "pending"
    }], { session });

    await session.commitTransaction();
    console.log('Order created successfully:', {
      orderId: order[0]._id,
      orderNo: order[0].orderNo
    });
    
    return order[0];
  } catch (error) {
    await session.abortTransaction();
    console.error('Order creation error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create order');
  } finally {
    session.endSession();
  }
}

async function getOrderById(id) {
  console.log('Fetching order by ID:', id);
  const order = await Order.findById(id)
    .populate({
      path: "user",
      select: "name email phone detail"
    })
    .populate("orderItems.product")
    .populate({
      path: "payment",
      select: "paymentStatus paymentDate amount checkoutSessionId"
    });
  
  if (!order) {
    console.log('Order not found:', id);
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
}

async function getOrderByUserId(user) {
  console.log('Fetching orders for user:', user);
  const orders = await Order.find({ user })
    .populate({
      path: "user",
      select: "name email phone detail"
    })
    .populate("orderItems.product")
    .populate({
      path: "payment",
      select: "paymentStatus paymentDate amount checkoutSessionId"
    })
    .sort({ createdAt: -1 });

  console.log(`Found ${orders.length} orders for user:`, user);
  return orders;
}

async function getOrders(filters, options) {
  console.log('Fetching orders with filters:', filters);
  
  // Add population configuration to options
  const populateOptions = [
    {
      path: "user",
      select: "name email phone detail"
    },
    {
      path: "orderItems.product",
      select: "name price image"
    },
    {
      path: "payment",
      select: "paymentStatus paymentDate amount checkoutSessionId"
    }
  ];

  // Set default options if not provided
  options = options || {};
  options.populate = populateOptions;
  options.sort = { createdAt: -1 }; // Most recent first

  // First get paginated results
  const result = await Order.paginate(filters, options);
  
  // Then explicitly populate the results
  if (result.results?.length > 0) {
    const populatedOrders = await Order.populate(result.results, populateOptions);
    result.results = populatedOrders;
  }
  
  console.log(`Found ${result.results?.length} orders`);
  return result;
}

async function updateOrderById(id, data) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    console.log('Updating order:', { orderId: id, updates: data });

    const order = await Order.findByIdAndUpdate(
      id,
      { 
        ...data,
        updatedAt: new Date() 
      },
      { new: true, session }
    )
    .populate({
      path: "user",
      select: "name email phone detail"
    })
    .populate("orderItems.product")
    .populate({
      path: "payment",
      select: "paymentStatus paymentDate amount checkoutSessionId"
    });

    if (!order) {
      console.log('Order not found for update:', id);
      throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    }

    await session.commitTransaction();
    console.log('Order updated successfully:', {
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus
    });

    return order;
  } catch (error) {
    await session.abortTransaction();
    console.error('Order update error:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

async function deleteOrderById(id) {
  console.log('Deleting order:', id);
  const order = await Order.findByIdAndDelete(id);
  if (!order) {
    console.log('Order not found for deletion:', id);
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  console.log('Order deleted successfully:', id);
  return order;
}

module.exports = {
  createOrder,
  getOrderById,
  getOrderByUserId,
  getOrders,
  updateOrderById,
  deleteOrderById,
};
