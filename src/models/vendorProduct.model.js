const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const vendorProductSchema = new mongoose.Schema(
  {
    product:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    vendor:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stocks:{
        type:Number,
        default:0
    }
  },
  {timestamps: true}
);

vendorProductSchema.plugin(paginate);

const VendorProduct = mongoose.model('VendorProduct', vendorProductSchema);

module.exports = {
    VendorProduct
};
