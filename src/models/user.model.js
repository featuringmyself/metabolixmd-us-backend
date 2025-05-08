const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default:null
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
    },
    profilePic: {
      type: {
        key: String,
        url: String,
      },
      default: null,
    },
    detail:{
      accomplish_with_body_program:[String],
      height:{
        feet:Number,
        inch:Number
      },
      weight:Number,
      gender:{
        type:String,
        enum:["male","female"]
      },
      dob: {
        type: Date,
        default: null,
      },
      zipCode:String,
      seen_primary_care_provider:Boolean,
      heart_condition:[String],
      hormone_kidney_liver_condition:[String],
      type_2_diabetes:String,
      diabetic:String,
      additional_condition:[String],
      allergies:[String],
      allergy_GLP_1:Boolean,
      medications:[String],
      describe_yourself:[String]
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    firebaseSignInProvider: {
      type: String,
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      // To soft delete a user
      type: Boolean,
      default: false,
    }
  },
  {timestamps: true}
);

const vendorSchema = new mongoose.Schema(
  {
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      // To soft delete a user
      type: Boolean,
      default: false,
    },
    
  },
  { timestamps: true }
);


const adminSchema = new mongoose.Schema(
  {
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      // To soft delete a user
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);


userSchema.plugin(paginate);

const User = mongoose.model('User', userSchema);
const Vendor = User.discriminator('Vendor', vendorSchema);
const Admin = User.discriminator('Admin', adminSchema);

module.exports = {
  User,
  Vendor,
  Admin
};
