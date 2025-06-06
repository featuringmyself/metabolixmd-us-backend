const express = require('express');
const router = express.Router();

const {prescriptionController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');

router.get('/', prescriptionController.getPrescriptions);

router.get('/user',firebaseAuth(), prescriptionController.getUserPrescriptions);

router.post('/', firebaseAuth(), fileUploadService.multerUpload.single('image') , prescriptionController.createPrescription);

router.get('/:id', prescriptionController.getPrescription);

router.patch('/:id' ,firebaseAuth("Admin"), prescriptionController.updatePrescription);

router.delete('/:id', prescriptionController.deletePrescription);

module.exports = router;