const Location = require('../models/Location');
const Tourist = require('../models/Tourist');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { checkGeofence } = require('../services/geofenceService');
const { generateLocationId, generateAlertId } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

// Update Tourist Location
const updateLocation = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      address,
      accuracy,
      altitude,
      speed,
      heading
    } = req.body;

    const tourist_id = req.user ? req.user._id : req.body.tourist_id;

    // Validate input
    if (!tourist_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Tourist ID, latitude, and longitude are required'
      });
    }

    // Verify tourist exists
    const tourist = await Tourist.findById(tourist_id);
    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist not found'
      });
    }

    // Check if coordinates are valid
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Create location record
    const location = new Location({
      _id: generateLocationId(),
      tourist_id,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      accuracy,
      altitude,
      speed,
      heading
    });

    await location.save();

    // Update tourist's last seen and live location
    await tourist.updateLocation(longitude, latitude);

    // Check for geofence violations
    const geofenceResult = await checkGeofence(longitude, latitude);

    if (geofenceResult.violation) {
      // Create geofence alert
      const alert = new Alert({
        _id: generateAlertId(),
        tourist_id,
        type: 'geofence_breach',
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        address,
        description: `Tourist entered ${geofenceResult.zoneType} zone: ${geofenceResult.zoneName}`,
        severity: geofenceResult.severity,
        sent_to: ['tourist_app', 'local_police']
      });

      await alert.save();

      // Update tourist status on high/critical severity
      if (geofenceResult.severity === 'critical' || geofenceResult.severity === 'high') {
        tourist.status = 'DANGER';
        await tourist.save();
      }

      // Emit real-time geofence alert via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('new_alert', {
          id: alert._id,
          type: alert.type,
          severity: alert.severity,
          timestamp: alert.timestamp,
          tourist: {
            id: tourist._id,
            name: tourist.name,
            phone: tourist.phone
          },
          location: alert.location,
          address: alert.address,
          zone: geofenceResult.zoneName
        });
      }

      logger.warn('Geofence violation detected', {
        touristId: tourist_id,
        zone: geofenceResult.zoneName,
        severity: geofenceResult.severity,
        coordinates: [longitude, latitude]
      });

      // Send FCM notification
      if (tourist.fcm_token) {
        try {
          await notificationService.sendNotification(
            tourist.fcm_token,
            "⚠️ Danger Zone",
            "You entered a restricted area!"
          );
        } catch (err) {
          logger.error('Failed to send FCM for geofence:', err);
        }
      }
    }

    logger.info('Location updated', {
      touristId: tourist_id,
      coordinates: [longitude, latitude],
      address
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        id: location._id,
        coordinates: [longitude, latitude],
        timestamp: location.timestamp,
        geofence_alert: geofenceResult.violation,
        // Include zone details for the mobile app warning banner
        ...(geofenceResult.violation ? {
          zone_name: geofenceResult.zoneName,
          zone_type: geofenceResult.zoneType,
          severity: geofenceResult.severity,
          description: geofenceResult.description,
          distance: geofenceResult.distance
        } : {})
      }
    });

  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during location update'
    });
  }
};

// Get Tourist Location History
const getLocationHistory = async (req, res) => {
  try {
    const { tourist_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify tourist exists
    const tourist = await Tourist.findById(tourist_id);
    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist not found'
      });
    }

    const locations = await Location.find({ tourist_id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const locationData = locations.map(loc => ({
      id: loc._id,
      coordinates: loc.location.coordinates,
      address: loc.address,
      timestamp: loc.timestamp,
      status: loc.status,
      accuracy: loc.accuracy
    }));

    res.json({
      success: true,
      locations: locationData,
      count: locationData.length
    });

  } catch (error) {
    logger.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get Latest Location
const getLatestLocation = async (req, res) => {
  try {
    const { tourist_id } = req.params;

    const location = await Location.getLatestForTourist(tourist_id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this tourist'
      });
    }

    res.json({
      success: true,
      location: {
        id: location._id,
        coordinates: location.location.coordinates,
        address: location.address,
        timestamp: location.timestamp,
        status: location.status,
        accuracy: location.accuracy
      }
    });

  } catch (error) {
    logger.error('Get latest location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get Nearby Tourists
const getNearbyTourists = async (req, res) => {
  try {
    const { longitude, latitude, radius = 1000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const nearbyLocations = await Location.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(radius)
    ).populate('tourist_id', 'name nationality status');

    const nearbyTourists = nearbyLocations.map(loc => ({
      tourist: {
        id: loc.tourist_id._id,
        name: loc.tourist_id.name,
        nationality: loc.tourist_id.nationality,
        status: loc.tourist_id.status
      },
      location: {
        coordinates: loc.location.coordinates,
        address: loc.address,
        timestamp: loc.timestamp,
        distance: loc.distance
      }
    }));

    res.json({
      success: true,
      nearby_tourists: nearbyTourists,
      count: nearbyTourists.length
    });

  } catch (error) {
    logger.error('Get nearby tourists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  updateLocation,
  getLocationHistory,
  getLatestLocation,
  getNearbyTourists
};
