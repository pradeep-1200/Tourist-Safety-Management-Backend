const jwt = require('jsonwebtoken');
const Tourist = require('../models/Tourist');
const logger = require('../utils/logger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Register Tourist
const registerTourist = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      passport_no,
      nationality,
      password,
      trip_details,
      emergency_contacts,
      blockchainId,
      transactionHash
    } = req.body;

    // Check if tourist already exists
    const touristExists = await Tourist.findOne({ 
      $or: [{ email: email.toLowerCase() }, { passport_no: passport_no.toUpperCase() }] 
    });

    if (touristExists) {
      return res.status(400).json({
        success: false,
        message: 'Tourist with this email or passport already exists'
      });
    }

    // Create new tourist
    const tourist = await Tourist.create({
      name,
      email,
      phone,
      passport_no,
      nationality,
      password,
      trip_details,
      emergency_contacts,
      blockchainId,
      transactionHash
    });

    if (tourist) {
      res.status(201).json({
        success: true,
        message: 'Tourist registered successfully',
        tourist_id: tourist._id,
        token: generateToken(tourist._id)
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid tourist data' });
    }
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// Tourist Login
const loginTourist = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔑 Login attempt received:', { email, body: req.body });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const tourist = await Tourist.findOne({ email: email.toLowerCase() });

    if (tourist && (await tourist.comparePassword(password))) {
      await tourist.updateLocation(0, 0); // Optional: reset or keep track

      res.json({
        success: true,
        message: 'Login successful',
        tourist: {
          id: tourist._id,
          name: tourist.name,
          email: tourist.email,
          phone: tourist.phone,
          status: tourist.status,
          safety_score: tourist.safety_score
        },
        token: generateToken(tourist._id)
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get Tourist Profile
const getTouristProfile = async (req, res) => {
  try {
    const tourist = await Tourist.findById(req.user._id).select('-password');
    
    if (tourist) {
      res.json({
        success: true,
        tourist
      });
    } else {
      res.status(404).json({ success: false, message: 'Tourist not found' });
    }
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Save FCM Token
const saveToken = async (req, res) => {
  try {
    const { tourist_id, fcm_token } = req.body;

    if (!tourist_id || !fcm_token) {
      return res.status(400).json({ success: false, message: 'Tourist ID and FCM token required' });
    }

    const updated = await Tourist.findByIdAndUpdate(
      tourist_id,
      { fcm_token },
      { new: true }
    );

    if (updated) {
      res.json({ success: true, message: 'FCM token saved successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Tourist not found' });
    }
  } catch (error) {
    logger.error('Save token error:', error);
    res.status(500).json({ success: false, message: 'Server error saving token' });
  }
};

// Test FCM Notification (Manual Trigger)
const testNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const tourist = await Tourist.findById(id);

    if (!tourist) {
      return res.status(404).json({ success: false, message: 'Tourist not found' });
    }

    if (!tourist.fcm_token) {
      return res.status(400).json({ success: false, message: 'Tourist has no FCM token saved' });
    }

    const notificationService = require('../services/notificationService');
    await notificationService.sendNotification(
      tourist.fcm_token,
      "TEST NOTIFICATION",
      "If you see this, FCM works"
    );

    res.json({ success: true, message: 'Test notification sent successfully' });
  } catch (error) {
    logger.error('Test notification error:', error);
    res.status(500).json({ success: false, message: 'Error sending test notification', error: error.message });
  }
};

module.exports = {
  registerTourist,
  loginTourist,
  getTouristProfile,
  saveToken,
  testNotification
};
