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
    // Non-PHI demographic data
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
    },
    // PHI data with encryption
    phi: {
      // Encrypted medical conditions
      heart_condition: {
        type: String,
        get: function(data) {
          try {
            return data ? JSON.parse(require('../utils/encryption').decrypt(data)) : [];
          } catch (e) {
            return [];
          }
        },
        set: function(data) {
          return data && data.length ? require('../utils/encryption').encrypt(JSON.stringify(data)) : null;
        }
      },
      hormone_kidney_liver_condition: {
        type: String,
        get: function(data) {
          try {
            return data ? JSON.parse(require('../utils/encryption').decrypt(data)) : [];
          } catch (e) {
            return [];
          }
        },
        set: function(data) {
          return data && data.length ? require('../utils/encryption').encrypt(JSON.stringify(data)) : null;
        }
      },
      type_2_diabetes: {
        type: String,
        get: function(data) {
          return data ? require('../utils/encryption').decrypt(data) : null;
        },
        set: function(data) {
          return data ? require('../utils/encryption').encrypt(data) : null;
        }
      },
      diabetic: {
        type: String,
        get: function(data) {
          return data ? require('../utils/encryption').decrypt(data) : null;
        },
        set: function(data) {
          return data ? require('../utils/encryption').encrypt(data) : null;
        }
      },
      additional_condition: {
        type: String,
        get: function(data) {
          try {
            return data ? JSON.parse(require('../utils/encryption').decrypt(data)) : [];
          } catch (e) {
            return [];
          }
        },
        set: function(data) {
          return data && data.length ? require('../utils/encryption').encrypt(JSON.stringify(data)) : null;
        }
      },
      allergies: {
        type: String,
        get: function(data) {
          try {
            return data ? JSON.parse(require('../utils/encryption').decrypt(data)) : [];
          } catch (e) {
            return [];
          }
        },
        set: function(data) {
          return data && data.length ? require('../utils/encryption').encrypt(JSON.stringify(data)) : null;
        }
      },
      allergy_GLP_1: {
        type: String,
        get: function(data) {
          return data ? require('../utils/encryption').decrypt(data) === 'true' : false;
        },
        set: function(data) {
          return data !== undefined ? require('../utils/encryption').encrypt(String(data)) : null;
        }
      },
      medications: {
        type: String,
        get: function(data) {
          try {
            return data ? JSON.parse(require('../utils/encryption').decrypt(data)) : [];
          } catch (e) {
            return [];
          }
        },
        set: function(data) {
          return data && data.length ? require('../utils/encryption').encrypt(JSON.stringify(data)) : null;
        }
      },
      describe_yourself: {
        type: String,
        get: function(data) {
          try {
            return data ? JSON.parse(require('../utils/encryption').decrypt(data)) : [];
          } catch (e) {
            return [];
          }
        },
        set: function(data) {
          return data && data.length ? require('../utils/encryption').encrypt(JSON.stringify(data)) : null;
        }
      }
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
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
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
    // HIPAA compliance fields for providers
    npiNumber: {
      type: String
    },
    medicalLicense: {
      number: String,
      state: String,
      expirationDate: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
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
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
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