const {Product} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

async function create(data) {
  try {
    console.log('Received data in create:', data);
    
    // Ensure required fields are present
    if (!data.name || !data.sellingPrice) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Name and selling price are required');
    }

    // Set default values for optional fields
    const productData = {
      name: data.name,
      description: data.description || '',
      brand: data.brand || 'MetabolixMD', // Set default brand if not provided
      unit: data.unit || '',
      sellingPrice: Number(data.sellingPrice),
      purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : 0,
      saltComposition: data.saltComposition || '',
      image: data.image || { url: '' },
      quantity: 0,
      mrp: 0,
      isDeleted: false,
      isPrescribed: false
    };

    console.log('Formatted product data:', productData);

    const product = await Product.create(productData);
    console.log('Created product:', product);
    return product;
  } catch (error) {
    console.error('Error in create product:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create product: ' + error.message);
  }
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
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return await Product.findByIdAndUpdate(id, newDetails, {new: true});
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
