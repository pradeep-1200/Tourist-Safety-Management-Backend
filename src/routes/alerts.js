const express = require('express');
const router = express.Router();
const { createPanicAlert, getTouristAlerts, getAllAlerts } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/alerts (All alerts for dashboard)
router.get('/', getAllAlerts);

// POST /api/alerts/panic
router.post('/panic', protect, createPanicAlert);

// GET /api/alerts/user/:tourist_id
router.get('/user/:tourist_id', protect, getTouristAlerts);

module.exports = router;
