const {Banner} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { fileUploadService } = require('../microservices');


async function create(details,img) {

  let data = {...details}
  console.log(img)
  if (img) {
    const [image] = await fileUploadService.s3Upload([img], 'image').catch(err => {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
    })
    console.log(image)
    data = { ...data, image };
  };
  const banner = await Banner.create(data);
  return banner;
}

async function getBannerById(id) {
  const banner = await Banner.findById(id);
  return banner;
}

async function getBanners(filters, options) {
  return await Banner.paginate(filters, options);
}

async function updateBannerById(id, newDetails,img) {
  const banner = await Banner.findById(id);
  let updates = {...newDetails};
  if (img) {
    const [image] = await fileUploadService.s3Upload([img], 'thumbnail').catch(err => {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
    });
    if (banner.image) {
        const oldPicKey = banner.image.key;
        await fileUploadService
            .s3Delete(oldPicKey)
            .catch(err => console.log('Failed to delete thumbnail', oldPicKey));
    }
    updates = { ...updates, image };
  }
  return await Banner.findByIdAndUpdate(id, updates, {new: true});
}

async function deleteBannerById(id) {
  try {
    await Banner.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the banner');
  }
}


module.exports = {
  getBanners,
  getBannerById,
  updateBannerById,
  deleteBannerById,
  create
};
