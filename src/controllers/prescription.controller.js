const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {prescriptionService} = require('../services');
const { getPaginateConfig } = require('../utils/queryPHandler');

const createPrescription = catchAsync(async (req, res) => {

  const prescription = await prescriptionService.create({user:req.user._id},req.file);
  res.status(200).send({data: prescription, message: 'Prescription is created'});
});

const updatePrescription = catchAsync(async (req, res) => {
    const prescription = await prescriptionService.updatePrescriptionById(req.params.id,req.body,req.file);
    res.status(200).send({data: prescription, message: 'Prescription is update'});
});

const getPrescriptions = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
    
    const prescriptions = await prescriptionService.getPrescriptions(filters,options);
    res.status(200).send({data: prescriptions, message: 'Prescriptions'});
});

const getUserPrescriptions = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
    const user = req.user;
    filters.user = user._id;
    const prescriptions = await prescriptionService.getPrescriptions(filters,options);
    res.status(200).send({data: prescriptions, message: 'Prescriptions'});
});
const getPrescription = catchAsync(async (req, res) => {
    const prescriptions = await prescriptionService.getPrescriptionById(req.params.id);
    res.status(200).send({data: prescriptions, message: 'Prescriptions'});
});

const deletePrescription = catchAsync(async (req, res) => {
    const prescription = await prescriptionService.deletePrescriptionById(req.params.id);
    res.status(200).send({data: prescription, message: 'Prescription is deleted'});
});

module.exports = {
 createPrescription,
 updatePrescription,
 getPrescriptions,
 getPrescription,
 deletePrescription,
 getUserPrescriptions
};
