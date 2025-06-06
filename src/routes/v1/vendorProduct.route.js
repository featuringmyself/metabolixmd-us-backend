const express = require('express');
const router = express.Router();

const {vendorProductController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');


router.get('/', firebaseAuth("Vendor"),vendorProductController.getVendorProducts);

router.post('/', firebaseAuth("Vendor"),vendorProductController.createVendorProduct);

router.get('/:id',firebaseAuth("Vendor"), vendorProductController.getVendorProduct);

router.patch('/:id',firebaseAuth("Vendor"), vendorProductController.updateVendorProduct);

router.delete('/:id',firebaseAuth("Vendor"), vendorProductController.deleteVendorProduct);


module.exports = router;
