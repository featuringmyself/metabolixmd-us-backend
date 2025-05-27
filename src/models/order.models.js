const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const statusLogSchema = new mongoose.Schema({
  status: {
    type: String,
    default: 'pending', // Default value for status
    required: true
  },
  at: {
    type: Date,
    default: Date.now, // Default value to the current date and time
    required: true
  },
  description: {
    type: String,
    default: 'No description provided.' // Default value for description
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type:Number,
    },
    totalValue: {
      type:Number,
      required: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      default: function() {
        return this.totalValue - this.discountAmount;
      }
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
    meetLink:{
      type:String
    },
    meetTime:{
      type:String
    },
    status: {
      type: String,
      enum: ["pending","placed","scheduleMeet", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    paymentDate: {
      type: Date
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment"
    },
    statusLog:[statusLogSchema]
  },
  { timestamps: true }
);

orderSchema.plugin(paginate);
const Order = mongoose.model("Order", orderSchema);

module.exports = { Order}
