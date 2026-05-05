const express = require('express');
const router = express.Router();
const {
  getAllZones,
  createZone,
  updateZone,
  deleteZone
} = require('../controllers/dangerZoneController');

// GET /api/danger-zones
router.get('/', getAllZones);

// POST /api/danger-zones
router.post('/', createZone);

// PUT /api/danger-zones/:id
router.put('/:id', updateZone);

// DELETE /api/danger-zones/:id  (soft delete)
router.delete('/:id', deleteZone);

module.exports = router;
