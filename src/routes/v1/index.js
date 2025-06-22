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
const followUpRoute = require("./followUp.route");

console.log("Mounting /auth route");
router.use("/auth", authRoute);
console.log("Mounting /users route");
router.use("/users", userRoute);
console.log("Mounting /product route");
router.use("/product", productRoute);
console.log("Mounting /vendorProduct route");
router.use("/vendorProduct", vendorProductRoute);
console.log("Mounting /cart route");
router.use("/cart", cartRoute); 
console.log("Mounting /order route");
router.use("/order", orderRoute);
console.log("Mounting /banner route");
router.use("/banner", bannerRoute);
console.log("Mounting /brandLogo route");
router.use("/brandLogo", brandLogoRoute);
console.log("Mounting /disease route");
router.use("/disease", diseaseRoute);
console.log("Mounting /prescription route");
router.use("/prescription", prescriptionRoute);
console.log("Mounting /question route");
router.use("/question", questionRoute);
console.log("Mounting /square route");
router.use("/square", squareRoute);
console.log("Mounting /meeting route");
router.use("/meeting", meetingRoute);
console.log("Mounting /follow-up route");
router.use("/follow-up", followUpRoute);

module.exports = router;
