const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {vendorProductService} = require('../services');


const { getPaginateConfig } = require('../utils/queryPHandler');

const createVendorProduct = catchAsync(async (req, res) => {
    const user = req.user;
    const data = req.body.data.map(ele => {
        return { ...ele , vendor:req.user._id}
    })
    const vendorProduct = await vendorProductService.create(data);
    res.status(200).send({data: vendorProduct, message: 'Product is created'});
});

const updateVendorProduct = catchAsync(async (req, res) => {
    const vendorProduct = await vendorProductService.updateVendorProductById(req.params.id,req.body);
    res.status(200).send({data: vendorProduct, message: 'Product is update'});
});

const getVendorProducts = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);
    options.populate = [
        "product::*"
    ]; 
    filters.vendor = req.user._id;
    const vendorProducts = await vendorProductService.getVendorProducts(filters,options);
    res.status(200).send({data: vendorProducts, message: 'Products'});
});

const getVendorProduct = catchAsync(async (req, res) => {
    const vendorProducts = await vendorProductService.getVendorProductById(req.params.id);
    res.status(200).send({data: vendorProducts, message: 'Products'});
});

const deleteVendorProduct = catchAsync(async (req, res) => {
    const vendorProducts = await vendorProductService.deleteVendorProductById(req.params.id);
    res.status(200).send({data: vendorProducts, message: 'Products'});
});


module.exports = {
 createVendorProduct,
 updateVendorProduct,
 getVendorProducts,
 getVendorProduct,
 deleteVendorProduct
};
