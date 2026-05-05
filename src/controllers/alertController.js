const Alert = require('../models/Alert');
const Tourist = require('../models/Tourist');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { generateAlertId } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

const createPanicAlert = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const tourist_id = req.user ? req.user._id : req.body.tourist_id;

    if (!tourist_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Tourist ID and location are required'
      });
    }

    const tourist = await Tourist.findById(tourist_id);
    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist not found'
      });
    }

    // Create panic alert
    const alert = new Alert({
      _id: generateAlertId(),
      tourist_id,
      type: 'panic_button',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      description: 'Emergency panic button pressed by tourist',
      severity: 'critical',
      sent_to: ['nearest_police_unit', 'emergency_contacts']
    });

    await alert.save();

    // Update tourist status to DANGER
    tourist.status = 'DANGER';
    await tourist.save();

    // Emit real-time event via Socket.IO
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
        address: alert.address
      });
    }

    // Send FCM notification
    if (tourist.fcm_token) {
      try {
        await notificationService.sendNotification(
          tourist.fcm_token,
          "🚨 Emergency Alert",
          "SOS triggered! Authorities notified."
        );
      } catch (err) {
        logger.error('Failed to send FCM for SOS:', err);
      }
    }

    // Create audit log
    await AuditLog.create({
      _id: `LOG${Date.now()}`,
      event: 'panic_alert_triggered',
      tourist_id,
      user_role: 'tourist',
      details: 'Panic button pressed via mobile app',
      ip_address: req.ip,
      alert_id: alert._id
    });

    logger.error('PANIC ALERT TRIGGERED', {
      touristId: tourist_id,
      touristName: tourist.name,
      coordinates: [longitude, latitude],
      alertId: alert._id
    });

    res.status(201).json({
      success: true,
      message: 'Panic alert sent successfully',
      alert: {
        id: alert._id,
        timestamp: alert.timestamp,
        status: alert.status
      }
    });

  } catch (error) {
    logger.error('Panic alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during panic alert'
    });
  }
};

// Get Tourist Alerts
const getTouristAlerts = async (req, res) => {
  try {
    const { tourist_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const alerts = await Alert.find({ tourist_id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const alertData = alerts.map(alert => ({
      id: alert._id,
      type: alert.type,
      timestamp: alert.timestamp,
      location: alert.location,
      address: alert.address,
      description: alert.description,
      severity: alert.severity,
      status: alert.status,
      response_time: alert.response_time
    }));

    res.json({
      success: true,
      alerts: alertData,
      count: alertData.length
    });

  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get All Active Alerts (For Police Dashboard)
const getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('tourist_id', 'name phone passport_no')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    logger.error('Get all alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createPanicAlert,
  getTouristAlerts,
  getAllAlerts
};
