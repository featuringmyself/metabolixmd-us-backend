const express = require('express');
const router = express.Router();

const {bannerController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');

router.get('/', bannerController.getBanners);

router.post('/', fileUploadService.multerUpload.single('image') , bannerController.createBanner);

router.get('/:id', bannerController.getBanner);

router.patch('/:id', fileUploadService.multerUpload.single('image') , bannerController.updateBanner);

router.delete('/:id', bannerController.deleteBanner);

module.exports = router;