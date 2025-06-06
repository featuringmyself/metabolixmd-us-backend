const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    brand: {
      type: String,
      trim: true,
      required: true,
      default:null
    },
    image: {
      type: {
        key: String,
        url: String,
      },
      default: null,
    },
    unit: {
      type: String,
      default: null,
    },
    quantity:{
      type: Number,
      default:0
    },
    sellingPrice: {
      type: Number,
      default:0
    },
    purchasePrice: {
      type: Number,
      default:0
    },
    mrp:{
      type:Number,
      default:0
    },
    saltComposition:{
      type:String,
      default:null
    },
    isDeleted:{
      type:Boolean,
      default:false
    },
    isPrescribed:{
      type:Boolean,
      default:false
    }
  },
  {timestamps: true}
);

productSchema.plugin(paginate);

const Product = mongoose.model('Product', productSchema);

module.exports = {
  Product
};
