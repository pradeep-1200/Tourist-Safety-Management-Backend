const express = require('express');
const router = express.Router();
const { updateLocation, getLocationHistory, getLatestLocation, getNearbyTourists } = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/locations/update
router.post('/update', protect, updateLocation);

// GET /api/locations/history/:tourist_id
router.get('/history/:tourist_id', getLocationHistory);

// GET /api/locations/latest/:tourist_id
router.get('/latest/:tourist_id', getLatestLocation);

// GET /api/locations/nearby
router.get('/nearby', getNearbyTourists);

module.exports = router;
