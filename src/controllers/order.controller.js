const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { getPaginateConfig } = require("../utils/queryPHandler");
const ApiError = require("../utils/ApiError");
const { createUser } = require("../services/auth.service.js");
const { productService, orderService, userService } = require("../services");
const { createCheckoutSession } = require("../microservices/square.service");
const ejs = require('ejs');
const path = require('path');
const { sendEmail } = require("../microservices/mail.service");
const { sendSMSToContacts } = require("../microservices/sms.service");
const config = require("../config/config");

// create order
const createOrder = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    console.log("createOrder controller hit", { user: req.user, body: req.body });
  }
  const user = req.user;
  const body = req.body;
  let items = [];
  let totalValue = 0;

  // Update user's phone number if provided
  if (body.phone) {
    await userService.updateUserById(user._id, { phone: body.phone });
  }

  // Allow creating order without items initially
  if (body.orderItems && body.orderItems.length > 0) {
    await Promise.all(body.orderItems.map(async item => {
      const product = await productService.getProductById(item.product);
      items.push({
        ...item,
        productName: product.name,
        price: product.sellingPrice,
        productImage: product.image.url,
        totalPrice: item.quantity * product.sellingPrice
      });
      totalValue += (item.quantity * product.sellingPrice);
    }));
  }

  const data = { 
    orderItems: items,
    status: "pending",
    totalValue, 
    user: user._id,
    deliveryAddress: body.deliveryAddress 
  };

  const order = await orderService.createOrder(data);

  // Only send notifications and create checkout if there are items
  if (items.length > 0) {
    await sendSMSToContacts(
      [{phone: config.clientPhone}, {phone: config.clientPhone2}],
      `You have received an order from ${user.name ?? " "}. Please check admin panel.`
    );

      const updatedOrder = await orderService.getOrderById(order._id);
      const html = await ejs.renderFile(path.join(__dirname, '../views/ordermail.ejs'), {order: updatedOrder});
      await sendEmail({
        to: user.email,
        subject: "Welcome to MetabolixMD – Let's Get Started!",
        html: html,
        phone: user.phone,
        smsContent: "Your order has been received! Please complete payment to proceed with your treatment."
      });
    const checkout = await createCheckoutSession(totalValue, user, order._id, order.orderItems);
    return res.status(200).send({status: true, data: checkout, message: "Order is created"});
  }

  res.status(200).send({ status: true, data: order, message: "Order is created without items" });
});

// get order by id
const getOrderById = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  res
    .status(httpStatus.OK)
    .send({ data: order, message: "Order retrieved successfully" });
});

// get orders by user id
const getOrderByUserId = catchAsync(async (req, res) => {
  console.log("Fetching orders for user:", req.user._id);
  const orders = await orderService.getOrderByUserId(req.user._id);
  
  // Don't throw error if no orders, just return empty array
  const response = {
    data: orders || [],
    message: orders?.length ? "Orders retrieved successfully" : "No orders found"
  };
  
  console.log("Returning orders:", response);
  res.status(200).send(response);
});

// Get All Orders with Filters and Pagination
const getOrders = catchAsync(async (req, res) => {
  const { filters, options } = getPaginateConfig(req.query);
  
  // Ensure options object exists
  if (!options) {
    options = {};
  }
  
  const orders = await orderService.getOrders(filters, options);
  
  res.status(httpStatus.OK)
     .send({ data: orders, message: "Orders retrieved successfully" });
});

// update order by id
const updateOrderById = catchAsync(async (req, res) => {
  const { _id, ...updateData } = req.body;
  
  // Handle discount calculation if discount percentage is provided
  if (updateData.discountPercentage !== undefined) {
    const order = await orderService.getOrderById(_id);
    if (!order) {
      throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    }
    
    // Calculate discount amount based on percentage
    const discountPercentage = parseFloat(updateData.discountPercentage);
    const discountAmount = (order.totalValue * discountPercentage) / 100;
    const finalAmount = order.totalValue - discountAmount;
    
    // Add calculated values to update data
    updateData.discountAmount = discountAmount;
    updateData.finalAmount = finalAmount;
  }
  
  const order = await orderService.updateOrderById(_id, updateData);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  res.status(200).send({ data: order, message: "Order updated successfully" });
});

const schduleMeet = catchAsync(async (req, res) => {
  const {meetLink,time,_id} = req.body;
  // const user = req.user;
  const order = await orderService.updateOrderById(_id, {meetLink:meetLink,meetTime:time,status:"scheduleMeet"});
  const user = await userService.getUserById(order.user);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  const html = await ejs.renderFile(path.join(__dirname, '../views/scheduleMeetMail.ejs'), {name:user.name,meetLink,meetTime:time});
  await sendEmail({
    to: user.email,
    subject: "Appointment Confirmation and Meeting Details",
    html: html,
    phone: user.phone,
    smsContent: `Your appointment with MetabolixMD has been scheduled. Meeting link: ${meetLink}. Time: ${new Date(time).toLocaleString()}`
  });
  res.status(200).send({ data: order, message: "Order updated successfully" });
});


const updateItemsInOrder = catchAsync(async (req, res) => {
  const {orderItems, _id, discountPercentage} = req.body;
  let items = [];
  let totalValue = 0;

  await Promise.all(orderItems.map(async item => {
    const product = await productService.getProductById(item.product);
    items.push({
      ...item,
      productName: product.name,
      price: product.sellingPrice,
      productImage: product.image.url,
      totalPrice: item.quantity * product.sellingPrice
    });
    totalValue = totalValue + (item.quantity * product.sellingPrice);
  }));

  const data = { 
    orderItems: items, 
    status: "pending", 
    totalValue 
  };

  // Add discount details if a discount percentage is provided
  if (discountPercentage) {
    data.discountPercentage = parseFloat(discountPercentage);
    data.discountAmount = (totalValue * data.discountPercentage) / 100;
    data.finalAmount = totalValue - data.discountAmount;
  }

  const order = await orderService.updateOrderById(_id, data);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  const user = await userService.getUserById(order.user);
  const url = `https://metabolixmd.com/profile-details`;
  const html = await ejs.renderFile(path.join(__dirname, '../views/completePaymentMail.ejs'), {
    name: user.name,
    link: url,
    order: order  // Pass order to template so it can show discount info if present
  });
  
  await sendEmail({
    to: user.email,
    subject: "Your Prescription is Ready – Approve to Ship",
    html: html,
    phone: user.phone,
    smsContent: `Your medication has been assigned${discountPercentage ? ` with a ${discountPercentage}% discount` : ''}. Please complete your payment to receive your treatment.`
  });
  
  res.status(200).send({ data: order, message: "Order updated successfully" });
});

// create order
const checkoutOrder = catchAsync(async (req, res) => {
  const user = req.user;
  const {id} = req.params;

  const order = await orderService.getOrderById(id);
  if(!order){
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
 
  // Use finalAmount if discount has been applied, otherwise use totalValue
  const amountToCharge = order.finalAmount || order.totalValue;
  
  const checkout = await createCheckoutSession(amountToCharge, user, order._id, order.orderItems);
  
  res.status(200).send({status:true, data: checkout, message: "Order is created" });
});

// Handle payment confirmation from Square
const confirmPayment = catchAsync(async (req, res) => {
  const { id } = req.params; // Order ID
  
  console.log(`[PAYMENT CONFIRMATION] Processing payment confirmation for order: ${id}`);
  console.log(`[PAYMENT CONFIRMATION] Request body:`, req.body);
  console.log(`[PAYMENT CONFIRMATION] Request headers:`, req.headers);
  
  const order = await orderService.getOrderById(id);
  if (!order) {
    console.error(`[PAYMENT CONFIRMATION] Order not found: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  
  console.log(`[PAYMENT CONFIRMATION] Found order:`, {
    id: order._id,
    user: order.user,
    status: order.status,
    paymentStatus: order.paymentStatus,
    amount: order.finalAmount || order.totalValue
  });
  
  // Update order payment status
  const updatedOrder = await orderService.updateOrderById(id, {
    paymentStatus: 'paid',
    paymentDate: new Date()
  });
  
  console.log(`[PAYMENT CONFIRMATION] Payment confirmed for order ${id}. Updated status:`, updatedOrder.paymentStatus);
  
  // Send email notification
  try {
    const user = await userService.getUserById(order.user);
    console.log(`[PAYMENT CONFIRMATION] Found user:`, {
      id: user._id,
      name: user.name,
      email: user.email
    });
    
    const html = await ejs.renderFile(path.join(__dirname, '../views/paymentConfirmationMail.ejs'), {
      name: user.name,
      orderId: id,
      amount: order.finalAmount || order.totalValue,
      date: new Date().toLocaleDateString()
    });
    
    console.log(`[PAYMENT CONFIRMATION] Sending confirmation email to: ${user.email}`);
    
    await sendEmail({
      to: user.email,
      subject: "Payment Confirmation - MetabolixMD",
      html: html,
      phone: user.phone,
      smsContent: `Your payment for order #${id.substring(0, 8)} has been confirmed. Thank you for your purchase!`
    });
    
    console.log(`[PAYMENT CONFIRMATION] Email sent successfully`);
  } catch (emailError) {
    console.error(`[PAYMENT CONFIRMATION] Failed to send payment confirmation email:`, emailError);
  }
  
  console.log(`[PAYMENT CONFIRMATION] Sending success response for order: ${id}`);
  
  res.status(200).send({ 
    status: true, 
    data: updatedOrder, 
    message: "Payment confirmed successfully" 
  });
});
// delete order by id
const deleteOrder = catchAsync(async (req, res) => {
  const order = await orderService.deleteOrder(req.params.id);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  res.status(200).send({ data: order, message: "Order deleted sucessfully" });
});

module.exports = {
  createOrder,
  getOrderById,
  getOrderByUserId,
  getOrders,
  updateOrderById,
  deleteOrder,
  schduleMeet,
  updateItemsInOrder,
  checkoutOrder,
  confirmPayment
};