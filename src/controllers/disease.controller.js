const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {diseaseService} = require('../services');
const { getPaginateConfig } = require('../utils/queryPHandler');

const createDisease = catchAsync(async (req, res) => {
  const disease = await diseaseService.create(req.body,req.file);
  res.status(200).send({data: disease, message: 'Disease is created'});
});

const updateDisease = catchAsync(async (req, res) => {
    const disease = await diseaseService.updateDiseaseById(req.body._id,req.body,req.file);
    res.status(200).send({data: disease, message: 'Disease is update'});
});

const getDiseases = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
    const diseases = await diseaseService.getDiseases(filters,options);
    res.status(200).send({data: diseases, message: 'Diseases'});
});

const getDisease = catchAsync(async (req, res) => {
    const diseases = await diseaseService.getDiseaseById(req.params.id);
    res.status(200).send({data: diseases, message: 'Diseases'});
});

const deleteDisease = catchAsync(async (req, res) => {
    const diseases = await diseaseService.deleteDiseaseById(req.params.id);
    res.status(200).send({data: diseases, message: 'Diseases'});
});

module.exports = {
 createDisease,
 updateDisease,
 getDiseases,
 getDisease,
 deleteDisease
};
