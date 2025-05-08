const {Disease} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { fileUploadService } = require('../microservices');


async function create(details,img) {
  let data = {...details}
  if (img) {
    const [image] = await fileUploadService.s3Upload([img], 'thumbnail').catch(err => {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
    })
    data = { ...data, image };
  };
  const disease = await Disease.create(data);
  return disease;
}

async function getDiseaseById(id) {
  const disease = await Disease.findById(id);
  return disease;
}

async function getDiseases(filters, options) {
  return await Disease.paginate(filters, options);
}

async function updateDiseaseById(id, newDetails,img) {
    const disease = await Disease.findById(id);
    let updates = {...newDetails};
    if (img) {
        const [image] = await fileUploadService.s3Upload([img], 'thumbnail').catch(err => {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload thumbnail');
        });
        if (disease.image) {
            const oldPicKey = disease.image.key;
            await fileUploadService
                .s3Delete(oldPicKey)
                .catch(err => console.log('Failed to delete thumbnail', oldPicKey));
        }
        updates = { ...updates, image };
    }
    return await Disease.findByIdAndUpdate(id, updates, {new: true});
}

async function deleteDiseaseById(id) {
  try {
    await Disease.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the disease');
  }
}


module.exports = {
  getDiseases,
  getDiseaseById,
  updateDiseaseById,
  deleteDiseaseById,
  create
};
