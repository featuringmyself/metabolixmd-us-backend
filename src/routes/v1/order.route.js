const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order.controller");
const {firebaseAuth} = require("../../middlewares/firebaseAuth.js");

console.log("Order route loaded");

router.post("/", firebaseAuth(), (req, res, next) => {
  console.log("POST /v1/order hit");
  orderController.createOrder(req, res, next);
});

router.get("/user", firebaseAuth(), orderController.getOrderByUserId);

router.get("/:id", orderController.getOrderById);

router.get("/", orderController.getOrders);

router.put("/updateorder", firebaseAuth(), orderController.updateOrderById);

router.delete("/deleteorder", firebaseAuth(), orderController.deleteOrder);

router.post("/schedule", firebaseAuth('Admin'), orderController.schduleMeet);
router.post("/upateItems", firebaseAuth('Admin'), orderController.updateItemsInOrder);

router.post("/checkout/:id", firebaseAuth(), orderController.checkoutOrder);

// Add route to handle payment confirmation from Square
router.post("/payment-confirmation/:id", orderController.confirmPayment);

module.exports = router;
