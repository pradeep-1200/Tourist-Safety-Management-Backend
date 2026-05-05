const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: false, trim: true },
  phone: { type: String, required: true, trim: true }
});

const touristSchema = new mongoose.Schema({
  // Personal Details
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  passport_no: { type: String, required: true, unique: true, trim: true, uppercase: true },
  nationality: { type: String, required: true, trim: true },
  
  // Login Credentials
  password: { type: String, required: true },
  
  // Trip Details
  trip_details: {
    destination: { type: String, trim: true },
    start_date: { type: Date },
    end_date: { type: Date },
    itinerary: [{ type: String, trim: true }]
  },
  
  // Emergency Contacts
  emergency_contacts: [emergencyContactSchema],
  
  // Blockchain Integration
  blockchainId: { type: String, trim: true },
  transactionHash: { type: String, trim: true },
  
  // Live Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    updatedAt: { type: Date, default: Date.now }
  },
  
  // Safety & Status
  safety_score: { type: Number, min: 0, max: 100, default: 100 },
  status: { type: String, enum: ['SAFE', 'AT_RISK', 'DANGER', 'INACTIVE'], default: 'SAFE' },
  
  // Registration metadata
  valid_from: { type: Date, default: Date.now },
  valid_to: { type: Date },
  last_seen: { type: Date, default: Date.now },

  // Firebase Cloud Messaging token
  fcm_token: { type: String, default: null }

}, {
  timestamps: true,
  collection: 'tourists'
});

// Indexes for optimization
touristSchema.index({ status: 1 });
touristSchema.index({ email: 1 });
touristSchema.index({ location: '2dsphere' }); // For geospatial queries

// Password hashing middleware
touristSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
touristSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last seen and location
touristSchema.methods.updateLocation = function(longitude, latitude) {
  this.location = {
    type: 'Point',
    coordinates: [longitude, latitude],
    updatedAt: new Date()
  };
  this.last_seen = new Date();
  return this.save();
};

module.exports = mongoose.model('Tourist', touristSchema);
