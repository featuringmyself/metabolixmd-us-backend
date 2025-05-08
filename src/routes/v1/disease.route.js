const express = require('express');
const router = express.Router();

const {diseaseController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');

router.get('/', diseaseController.getDiseases);

router.post('/',fileUploadService.multerUpload.single('image'),diseaseController.createDisease);

router.get('/:id', diseaseController.getDisease);

router.patch('/:id', fileUploadService.multerUpload.single('image'), diseaseController.updateDisease);

router.delete('/:id', diseaseController.deleteDisease);

module.exports = router;