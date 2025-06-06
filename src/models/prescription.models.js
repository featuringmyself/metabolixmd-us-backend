const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const prescriptionSchema = new mongoose.Schema(
  {
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    image: {
        type: {
          key: String,
          url: String,
        },
        default: null,
      },
      productList:
      [{
        product:{
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        quantity:{
          type:Number,
          default:1
        }
      }],
      note:{
        type:String,
        default:null
      },
      status:{
        type:String,
        enum:["pending","approved","rejected"],
        default:"pending"
      }
  },
  { timestamps: true }
);
prescriptionSchema.plugin(paginate);
const Prescription = mongoose.model("Prescription", prescriptionSchema);

module.exports = {Prescription}
