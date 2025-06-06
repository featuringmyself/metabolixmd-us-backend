const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {brandLogoService} = require('../services');
const { getPaginateConfig } = require('../utils/queryPHandler');

const createBrandLogo = catchAsync(async (req, res) => {
  const brandLogo = await brandLogoService.create(req.body,req.file);
  res.status(200).send({data: brandLogo, message: 'BrandLogo is created'});
});

const updateBrandLogo = catchAsync(async (req, res) => {
    const brandLogo = await brandLogoService.updateBrandLogoById(req.body._id,req.body,req.file);
    res.status(200).send({data: brandLogo, message: 'BrandLogo is update'});
});

const getBrandLogos = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
    const brandLogos = await brandLogoService.getBrandLogos(filters,options);
    res.status(200).send({data: brandLogos, message: 'BrandLogos'});
});

const getBrandLogo = catchAsync(async (req, res) => {
    const brandLogos = await brandLogoService.getBrandLogoById(req.params.id);
    res.status(200).send({data: brandLogos, message: 'BrandLogos'});
});

const deleteBrandLogo = catchAsync(async (req, res) => {
    const brandLogo = await brandLogoService.deleteBrandLogoById(req.params.id);
    res.status(200).send({data: brandLogo, message: 'brandLogo is deleted'});
});

module.exports = {
 createBrandLogo,
 updateBrandLogo,
 getBrandLogos,
 getBrandLogo,
 deleteBrandLogo
};
