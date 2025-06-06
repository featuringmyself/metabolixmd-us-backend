const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const questionSchema = new mongoose.Schema(
  {
    question:{
        type: String,
        required: true,
    },
    options:[{
        type: String,
    }],
    order:{
        type:Number,
        default:1
    }
  },
  {timestamps: true}
);

questionSchema.plugin(paginate);

const Question = mongoose.model('Question', questionSchema);

module.exports = {
    Question
};
