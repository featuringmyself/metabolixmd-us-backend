const express = require('express');
const router = express.Router();

const {productController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');

router.get('/', productController.getProducts);

router.post('/', productController.createProduct);

router.post('/uploadCsv', fileUploadService.multerUpload.single('sheet') ,productController.uploadCsv);

router.get('/:id', productController.getProduct);

router.put('/:id', productController.updateProduct);

router.delete('/:id', productController.deleteProduct);

module.exports = router;
