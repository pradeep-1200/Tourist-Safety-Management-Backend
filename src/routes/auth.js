const express = require('express');
const router = express.Router();
const { loginTourist, registerTourist, getTouristProfile, saveToken, testNotification } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', loginTourist);

// POST /api/auth/register
router.post('/register', registerTourist);

// GET /api/auth/profile
router.get('/profile', protect, getTouristProfile);

// POST /api/auth/save-token
router.post('/save-token', saveToken);

// GET /api/auth/test-notification/:id
router.get('/test-notification/:id', testNotification);

module.exports = router;
