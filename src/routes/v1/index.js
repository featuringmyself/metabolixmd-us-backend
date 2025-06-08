const express = require("express");
const router = express.Router();

const userRoute = require("./user.route");
const authRoute = require("./auth.route");
const productRoute = require("./product.route");
const vendorProductRoute = require("./vendorProduct.route");
const cartRoute = require("./cart.route"); //
const orderRoute = require("./order.route"); 
const bannerRoute = require("./banner.route"); 
const brandLogoRoute = require("./brandLogo.route"); 
const diseaseRoute = require("./disease.route"); 
const prescriptionRoute = require("./prescription.route");
const questionRoute = require("./question.route");
const squareRoute = require("./square.route");
const meetingRoute = require("./meeting.route");

router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/product", productRoute);
router.use("/vendorProduct", vendorProductRoute);
router.use("/cart", cartRoute); 
router.use("/order", orderRoute);
router.use("/banner", bannerRoute);
router.use("/brandLogo", brandLogoRoute);
router.use("/disease", diseaseRoute);
router.use("/prescription", prescriptionRoute);
router.use("/question", questionRoute);
router.use("/square", squareRoute);
router.use("/meeting", meetingRoute);

module.exports = router;
