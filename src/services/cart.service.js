const {Cart} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');


async function create(data) {
  const cart = await Cart.create(data);
  return cart;
}

async function getCartById(id) {
  const cart = await Cart.findById(id);
  return cart;
}

async function getCartByUserId(user) {
  const cart = await Cart.findOne({user});
  return cart;
}

async function getOrCreateCartByUserId(user) {
  let cart = await Cart.findOne({user});
  if(!card){
    cart = await Cart.create({user});
  }
  return cart;
}


async function getCarts(filters, options) {
  return await Cart.paginate(filters, options);
}

async function updateCartById(id, newDetails) {
  return await Cart.findByIdAndUpdate(id, updates, {new: true});
}

async function deleteCartById(id) {
  try {
    await Cart.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the cart');
  }
}


module.exports = {
  getCarts,
  getCartById,
  updateCartById,
  deleteCartById,
	getCartByUserId,
  create,
  getOrCreateCartByUserId
};
