const mongoose = require('mongoose');

const dangerZoneSchema = new mongoose.Schema({
  zone_id: {
    type: String,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['military', 'natural_hazard', 'border', 'wildlife', 'crime', 'custom'],
    default: 'custom'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high',
    index: true
  },
  shape: {
    type: String,
    enum: ['circle', 'polygon'],
    default: 'circle'
  },

  // --- Circle-based zone ---
  center: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  radius: {
    type: Number, // meters
    min: 100,
    default: 1000
  },

  // --- Polygon-based zone (coordinates only, no 2dsphere index) ---
  polygon: {
    type: {
      type: String,
      enum: ['Polygon']
    },
    coordinates: {
      type: [[[Number]]] // GeoJSON Polygon: array of rings
    }
  },

  active: {
    type: Boolean,
    default: true,
    index: true
  },
  created_by: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true,
  collection: 'danger_zones'
});

// Geospatial index for circle-based zones only
dangerZoneSchema.index({ center: '2dsphere' }, { sparse: true });
dangerZoneSchema.index({ active: 1, severity: 1 });

// Auto-generate zone_id before save
dangerZoneSchema.pre('save', function (next) {
  if (!this.zone_id) {
    this.zone_id = `ZONE_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('DangerZone', dangerZoneSchema);
