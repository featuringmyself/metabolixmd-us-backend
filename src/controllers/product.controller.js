const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {productService} = require('../services');
const csv = require('csv-parser');
const fs = require('fs');
const stream = require('stream');

const { getPaginateConfig } = require('../utils/queryPHandler');

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.create(req.body);
  res.status(200).send({data: product, message: 'Product is created'});
});

const uploadCsv = catchAsync(async (req, res) => {

    console.log(req.file);
    const fileBuffer = req.file.buffer;
    const results = [];
    const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

    bufferStream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
        // console.log(results);

        const proData = results.map(pro => {
            return {
                name:pro.NAME,
                description:pro['PRODUCT DESCRIPTION'],
                brand:pro.BRAND,
                unit:pro.UNIT,
                image:{
                    url:pro.IMAGE ? `https://metabolixmd-us.s3.eu-west-1.amazonaws.com/public/thumbnail/${pro.IMAGE}.jpg` : "https://metabolixmd-us.s3.eu-west-1.amazonaws.com/public/thumbnail/pina-messina-kfJkpeI6Lgc-unsplash.jpg"
                },
                sellingPrice:pro['SELLING PRICE'],
                purchasePrice:pro["PURCHASE PRICE (Including tax)"],
                saltComposition:pro['SALT COMPOSITION'],
            }
        })
        console.log(proData);
        const product = await productService.create(proData);
        res.status(200).send('File uploaded and data inserted into MongoDB');
    });
    // const product = await productService.create(req.body);
    // res.status(200).send({data:"", message: 'Product is created'});
});
  

const updateProduct = catchAsync(async (req, res) => {
    const product = await productService.updateProductById(req.body._id,req.body);
    res.status(200).send({data: product, message: 'Product is update'});
});

const getProducts = catchAsync(async (req, res) => {
    const {filters,options} = getPaginateConfig(req.query);

    if(filters.search){
        filters.$or = [
            {name:{$regex:filters.search,$options:"i"}},
            {description:{$regex:filters.search,$options:"i"}},
            {brand:{$regex:filters.search,$options:"i"}},
        ];
        delete filters.search;
    }

    const products = await productService.getProducts(filters,options);
    res.status(200).send({data: products, message: 'Products'});
});

const getProduct = catchAsync(async (req, res) => {
    const products = await productService.getProductById(req.params.id);
    res.status(200).send({data: products, message: 'Products'});
});


module.exports = {
 createProduct,
 updateProduct,
 getProducts,
 getProduct,
 uploadCsv
};
