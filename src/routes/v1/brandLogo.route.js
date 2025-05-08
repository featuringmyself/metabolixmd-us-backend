const express = require('express');
const router = express.Router();

const {brandLogoController} = require('../../controllers');
const { fileUploadService } = require('../../microservices');

router.get('/', brandLogoController.getBrandLogos);

router.post('/', fileUploadService.multerUpload.single('image'), brandLogoController.createBrandLogo);

router.get('/:id', brandLogoController.getBrandLogo);

router.patch('/:id', fileUploadService.multerUpload.single('image'), brandLogoController.updateBrandLogo);

router.delete('/:id', brandLogoController.deleteBrandLogo);

module.exports = router;