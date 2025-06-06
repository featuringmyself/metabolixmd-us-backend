const mongoose = require('mongoose');
const encryption = require('../../utils/encryption');

/**
 * PHI Schema - Mongoose schema for Protected Health Information
 * Implements field-level encryption for sensitive health data
 */
const phiSchema = new mongoose.Schema({
  // Medical conditions with encryption
  medicalConditions: {
    type: String,
    get: function(data) {
      return data ? encryption.decrypt(data) : null;
    },
    set: function(data) {
      return data ? encryption.encrypt(data) : null;
    }
  },
  
  // Medications with encryption
  medications: {
    type: String,
    get: function(data) {
      return data ? encryption.decrypt(data) : null;
    },
    set: function(data) {
      return data ? encryption.encrypt(data) : null;
    }
  },
  
  // Lab results with encryption
  labResults: {
    type: String,
    get: function(data) {
      return data ? encryption.decrypt(data) : null;
    },
    set: function(data) {
      return data ? encryption.encrypt(data) : null;
    }
  },
  
  // Treatment plans with encryption
  treatmentPlans: {
    type: String,
    get: function(data) {
      return data ? encryption.decrypt(data) : null;
    },
    set: function(data) {
      return data ? encryption.encrypt(data) : null;
    }
  },
  
  // Diagnosis with encryption
  diagnosis: {
    type: String,
    get: function(data) {
      return data ? encryption.decrypt(data) : null;
    },
    set: function(data) {
      return data ? encryption.encrypt(data) : null;
    }
  }
}, { 
  _id: false,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = phiSchema;