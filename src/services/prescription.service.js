const {Prescription} = require('../models');
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
  const prescription = await Prescription.create(data);
  return prescription;
}

async function getPrescriptionById(id) {
  const prescription = await Prescription.findById(id);
  return prescription;
}

async function getPrescriptions(filters, options) {
  options.populate = ["user::*"];
  return await Prescription.paginate(filters, options);
}

async function updatePrescriptionById(id, newDetails,img) {
  let updates = {...newDetails};
  return await Prescription.findByIdAndUpdate(id, updates, {new: true});
}

async function deletePrescriptionById(id) {
  try {
    await Prescription.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the prescription');
  }
}


module.exports = {
  getPrescriptions,
  getPrescriptionById,
  updatePrescriptionById,
  deletePrescriptionById,
  create
};
