const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');


const brandLogoSchema = new mongoose.Schema(
  {
    name:String,
    image: {
        type: {
          key: String,
          url: String,
        },
        default: null,
    },
  },
  { timestamps: true }
);
brandLogoSchema.plugin(paginate);

const BrandLogo = mongoose.model("BrandLogo", brandLogoSchema);

module.exports = {BrandLogo}
