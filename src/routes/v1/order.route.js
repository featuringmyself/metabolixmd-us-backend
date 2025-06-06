const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order.controller");
const {firebaseAuth} = require("../../middlewares/firebaseAuth.js");

router.post("/", firebaseAuth(), orderController.createOrder);


router.get("/user", firebaseAuth(), orderController.getOrderByUserId);

router.get("/:id", orderController.getOrderById);

router.get("/", orderController.getOrders);

router.put("/updateorder", firebaseAuth(), orderController.updateOrderById);

router.delete("/deleteorder", firebaseAuth(), orderController.deleteOrder);

router.post("/schedule", firebaseAuth('Admin'), orderController.schduleMeet);
router.post("/upateItems", firebaseAuth('Admin'), orderController.updateItemsInOrder);

router.post("/checkout/:id", firebaseAuth(), orderController.checkoutOrder);



module.exports = router;
