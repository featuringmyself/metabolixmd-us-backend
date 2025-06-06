const {Question} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

async function create(data) {
  const question = await Question.create(data);
  return question;
}

async function getQuestionById(id) {
  const question = await Question.findById(id);
  return question;
}
async function getLastOrder() {
    const question = await Question.findOne({}).sort({order:-1});
    return question ? question.order :0;
}
async function getQuestions(filters, options) {
  return await Question.paginate(filters, options);
}

async function updateQuestionById(id, newDetails) { 
  return await Question.findByIdAndUpdate(id, newDetails, {new: true});
}

async function deleteQuestionById(id) {
  try {
    await Question.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the question');
  }
}


module.exports = {
  getQuestions,
  getQuestionById,
  updateQuestionById,
  deleteQuestionById,
  create,
  getLastOrder
};
