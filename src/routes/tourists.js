const express = require('express');
const router = express.Router();
const { getAllTourists } = require('../controllers/touristController');

// GET /api/tourists
router.get('/', getAllTourists);

module.exports = router;
