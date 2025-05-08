const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {bannerService} = require('../services');
const { getPaginateConfig } = require('../utils/queryPHandler');

const createBanner = catchAsync(async (req, res) => {
  const banner = await bannerService.create(req.body,req.file);
  res.status(200).send({data: banner, message: 'Banner is created'});
});

const updateBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.updateBannerById(req.body._id,req.body,req.file);
    res.status(200).send({data: banner, message: 'Banner is update'});
});

const getBanners = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
    const banners = await bannerService.getBanners(filters,options);
    res.status(200).send({data: banners, message: 'Banners'});
});

const getBanner = catchAsync(async (req, res) => {
    const banners = await bannerService.getBannerById(req.params.id);
    res.status(200).send({data: banners, message: 'Banners'});
});

const deleteBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.deleteBannerById(req.params.id);
    res.status(200).send({data: banner, message: 'Banner is deleted'});
});

module.exports = {
 createBanner,
 updateBanner,
 getBanners,
 getBanner,
 deleteBanner
};
