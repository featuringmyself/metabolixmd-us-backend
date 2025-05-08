const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { cartService } = require("../services");
const { getPaginateConfig } = require("../utils/queryPHandler");

const createCart = catchAsync(async (req, res) => {
  const user = req.user;
  const body = { ...req.body, user: user._id };
  const cart = await cartService.create(body);
  res.status(200).send({ data: cart, message: "Cart is created" });
});

const updateCart = catchAsync(async (req, res) => {
  const cart = await cartService.updateCartById(req.body._id, req.body);
  res.status(200).send({ data: cart, message: "Cart is update" });
});

const addProductToCart = catchAsync(async (req, res) => {
  const cart = await cartService.updateCartById(req.body._id, req.body);
  res.status(200).send({ data: cart, message: "Cart is update" });
});

const getCarts = catchAsync(async (req, res) => {
  const { filters, options } = getPaginateConfig(req.query);
  const carts = await cartService.getCarts(filters, options);
  res.status(200).send({ data: carts, message: "Carts" });
});

const getCart = catchAsync(async (req, res) => {
  const carts = await cartService.getCartById(req.params.id);
  res.status(200).send({ data: carts, message: "Carts" });
});

const getUserCart = catchAsync(async (req, res) => {
  const carts = await cartService.getOrCreateCartByUserId(req.user._id);
  res.status(200).send({ data: carts, message: "Carts" });
});

module.exports = {
  createCart,
  updateCart,
  getCarts,
  getCart,
  getUserCart,
};
