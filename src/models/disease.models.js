const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');


const diseaseSchema = new mongoose.Schema(
  {
    name:String,
    image: {
        type: {
          key: String,
          url: String,
        },
        default: null,
      },
    description:String
  },
  { timestamps: true }
);
diseaseSchema.plugin(paginate);

const Disease = mongoose.model("Disease", diseaseSchema);

module.exports = {Disease}
