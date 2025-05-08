const {User} = require('./user.model');
const {Product} = require('./product.model');
const {Cart} = require('./cart.models');
const {Banner} = require('./banner.models');
const {BrandLogo} = require('./brandLogo.models');
const {Disease} = require('./disease.models');
const {Prescription} = require('./prescription.models');
const {VendorProduct} = require('./vendorProduct.model');
const {Question} = require('./question.model');
const {Payment} = require('./payment.models');





module.exports = {
  User,
  Product,
  Cart,
  Banner,
  BrandLogo,
  Disease,
  Prescription,
  VendorProduct,
  Question,
  Payment
};
