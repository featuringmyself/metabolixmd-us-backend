const {BrandLogo} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { fileUploadService } = require('../microservices');


async function create(details,img) {

  let data = {...details};
  console.log(img)

  if (img) {
    console.log(img)
    const [image] = await fileUploadService.s3Upload([img], 'image').catch(err => {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
    })
    console.log(image)
    data = { ...data, image };
  };

  const brandLogo = await BrandLogo.create(data);
  return brandLogo;
}

async function getBrandLogoById(id) {
  const brandLogo = await BrandLogo.findById(id);
  return brandLogo;
}

async function getBrandLogos(filters, options) {
  return await BrandLogo.paginate(filters, options);
}

async function updateBrandLogoById(id, newDetails,img) {
  const brandLogo = await BrandLogo.findById(id);
  let updates = {...newDetails};
  if (img) {
    const [image] = await fileUploadService.s3Upload([img], 'thumbnail').catch(err => {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
    });
    if (brandLogo.image) {
        const oldPicKey = brandLogo.image.key;
        await fileUploadService
            .s3Delete(oldPicKey)
            .catch(err => console.log('Failed to delete thumbnail', oldPicKey));
    }
    updates = { ...updates, image };
  }
  return await BrandLogo.findByIdAndUpdate(id, updates, {new: true});
}

async function deleteBrandLogoById(id) {
  try {
    await BrandLogo.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the brandLogo');
  }
}


module.exports = {
  getBrandLogos,
  getBrandLogoById,
  updateBrandLogoById,
  deleteBrandLogoById,
  create
};
