const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const PrescribedOrderRequestSchema = new mongoose.Schema(
  {
    totalValue: {
      type:Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [{
        product:{
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName:{
          type:String,
          require:true
        },
        price:{
          type:String,
          require:true
        },
        productImage:{
          type:String,
          require:true
        },
        quantity: {
          type: Number,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true
        },
    }],
    deliveryAddress: {
      country:{
        type:String,
        required:true
      },
      state:{
          type:String,
          required:true
      },
      city:{
          type:String,
          required:true
      },
      street:{
          type:String,
      },
      postalCode:{
          type:String,
          required:true
      },
      position:{
          type:{
              type:String,
              default:'Point'
          },
          coordinates:[Number]
      },
      address:{
          type:String,
      },
    },
    prescribtionImage: {
        type: {
          key: String,
          url: String,
        },
        default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);
PrescribedOrderRequestSchema.plugin(paginate);
const PrescribedOrderRequest = mongoose.model("PrescribedOrderRequest", PrescribedOrderRequestSchema);

module.exports = { PrescribedOrderRequest }
