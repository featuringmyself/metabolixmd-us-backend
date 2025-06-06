const { PrescribedOrderRequest } = require("../models/PrescribedOrderRequest.models.js");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");

// create Order
async function createOrder(data,img) {
    if (img) {
        const [prescribtionImage] = await fileUploadService.s3Upload([img], 'image').catch(err => {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
        })
        console.log(prescribtionImage)
        data = { ...data, prescribtionImage };
    };
    const order = await PrescribedOrderRequest.create(data);
    return order;
}

// Get Order By Id
async function getOrderById(id) {
  const order = PrescribedOrderRequest.findById(id);
  return order;
}

// Get Orders by User ID
async function getOrderByUserId(user) {
  const order = await PrescribedOrderRequest.find({user:user});
  return order;
}

// Get All Orders with Filters and Pagination
async function getOrders(filters, options) {
  const order = await PrescribedOrderRequest.paginate(filters, options);
  return order;
}

// Update Order by ID
async function updateOrderById(id) {
  const order = await PrescribedOrderRequest.findByIdAndUpdate(id, { new: true });
  return order;
}

// Delete Order by ID
async function deleteOrderById(id) {
  const order = await PrescribedOrderRequest.findByIdAndDelete(id);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
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
