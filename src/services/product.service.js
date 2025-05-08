const {Product} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');



async function create(data) {

  

  const product = await Product.create(data);
  return product;
}

async function getProductById(id) {
  const product = await Product.findById(id);
  return product;
}

async function getProducts(filters, options) {
  return await Product.paginate(filters, options);
}

async function updateProductById(id, newDetails) {
  const product = await Product.findById(id);
  productValidator(product);
  let updates = {...newDetails};
  if (profileImage) {
    const [profilePic] = await fileUploadService.s3Upload([profileImage], 'profilePics').catch(err => {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload profile picture');
    });
    if (product.profilePic) {
      const oldPicKey = product.profilePic.key;
      await fileUploadService
        .s3Delete(oldPicKey)
        .catch(err => console.log('Failed to delete profile picture', oldPicKey));
    }
    updates = {...updates, profilePic};
  }

    return await Product.findByIdAndUpdate(id, updates, {new: true});
}

async function deleteProductById(id) {
  try {
    await Product.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the product');
  }
}


module.exports = {
  getProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  create
};
