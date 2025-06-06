const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const bannerSchema = new mongoose.Schema(
  {
    title:String,
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
bannerSchema.plugin(paginate);
const Banner = mongoose.model("Banner", bannerSchema);

module.exports = {Banner}
