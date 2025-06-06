const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {questionService} = require('../services');


const { getPaginateConfig } = require('../utils/queryPHandler');
const { Question } = require('../models');

const createQuestion = catchAsync(async (req, res) => {
    const user = req.user;
    const body = req.body;
    body.order = await questionService.getLastOrder() + 1;
    const question = await questionService.create(body);
    res.status(200).send({data: question, message: 'Question is created'});
});

const updateQuestion = catchAsync(async (req, res) => {
    const { order } = req.body;  // Extract the new order from request body
  
    // Check if the order field is being updated
    if (order !== undefined) {
      // Find all questions with an order greater than or equal to the new order
      await Question.updateMany(
        { order: { $gte: order } },  // Find questions with an order >= the new order
        { $inc: { order: 1 } }       // Increment their order by 1
      );
    }
    // Now update the current question with the new data
    const question = await questionService.updateQuestionById(req.params.id, req.body);
  
    res.status(200).send({ data: question, message: 'Question is updated' });
});
  
const getQuestions = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
 
    const questions = await questionService.getQuestions(filters,options);
    res.status(200).send({data: questions, message: 'Products'});
});

const getQuestion = catchAsync(async (req, res) => {
    const questions = await questionService.getQuestionById(req.params.id);
    res.status(200).send({data: questions, message: 'Products'});
});

const deleteQuestion = catchAsync(async (req, res) => {
    const questions = await questionService.deleteQuestionById(req.params.id);
    res.status(200).send({data: questions, message: 'Products'});
});


module.exports = {
 createQuestion,
 updateQuestion,
 getQuestions,
 getQuestion,
 deleteQuestion
};
