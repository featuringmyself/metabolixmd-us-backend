const {VendorProduct} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

async function create(data) {
  const vendorProduct = await VendorProduct.create(data);
  return vendorProduct;
}

async function getVendorProductById(id) {
  const vendorProduct = await VendorProduct.findById(id);
  return vendorProduct;
}

async function getVendorProducts(filters, options) {
  return await VendorProduct.paginate(filters, options);
}

async function updateVendorProductById(id, newDetails) { 
  return await VendorProduct.findByIdAndUpdate(id, newDetails, {new: true});
}

async function deleteVendorProductById(id) {
  try {
    await VendorProduct.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the vendorProduct');
  }
}


module.exports = {
  getVendorProducts,
  getVendorProductById,
  updateVendorProductById,
  deleteVendorProductById,
  create
};
