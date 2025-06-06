const express = require('express');
const router = express.Router();

const {questionController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');


router.get('/',questionController.getQuestions);

router.post('/', firebaseAuth(),questionController.createQuestion);

router.get('/:id', questionController.getQuestion);

router.patch('/:id',firebaseAuth(), questionController.updateQuestion);

router.delete('/:id',firebaseAuth(), questionController.deleteQuestion);


module.exports = router;
