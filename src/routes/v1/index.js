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

if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /auth route");
}
router.use("/auth", authRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /users route");
}
router.use("/users", userRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /product route");
}
router.use("/product", productRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /vendorProduct route");
}
router.use("/vendorProduct", vendorProductRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /cart route");
}
router.use("/cart", cartRoute); 
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /order route");
}
router.use("/order", orderRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /banner route");
}
router.use("/banner", bannerRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /brandLogo route");
}
router.use("/brandLogo", brandLogoRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /disease route");
}
router.use("/disease", diseaseRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /prescription route");
}
router.use("/prescription", prescriptionRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /question route");
}
router.use("/question", questionRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /square route");
}
router.use("/square", squareRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /meeting route");
}
router.use("/meeting", meetingRoute);
if (process.env.NODE_ENV === 'development') {
  console.log("Mounting /follow-up route");
}
router.use("/follow-up", followUpRoute);

module.exports = router;
