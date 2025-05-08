const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/cart.controller.js");
const {firebaseAuth} = require("../../middlewares/firebaseAuth.js");
//const catchAsync = require("../utils/catchAsync");

// creating a new cart
router.post("/createCart", firebaseAuth, cartController.createCart);

// update cart
router.put("/:id", firebaseAuth, cartController.updateCart);

// Get all carts with pagination and filtering options
router.get("/", firebaseAuth, cartController.getCarts);

// Get a cart by its ID
router.get("/:id", firebaseAuth, cartController.getCart);

// Get the logged-in user's cart
router.get("/user", firebaseAuth, cartController.getUserCart);

module.exports = router;
