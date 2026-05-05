const DangerZone = require('../models/DangerZone');
const logger = require('../utils/logger');

// GET /api/danger-zones — list all active zones
const getAllZones = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';

    const zones = await DangerZone.find(filter).sort({ severity: -1, createdAt: -1 });

    res.json({
      success: true,
      zones,
      count: zones.length
    });
  } catch (error) {
    logger.error('Get danger zones error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/danger-zones — create a new zone
const createZone = async (req, res) => {
  try {
    const {
      name, description, type, severity, shape,
      // circle
      center_lng, center_lat, radius,
      // polygon
      polygon_coords
    } = req.body;

    if (!name || !severity || !shape) {
      return res.status(400).json({
        success: false,
        message: 'name, severity, and shape are required'
      });
    }

    const zoneData = {
      name,
      description,
      type: type || 'custom',
      severity,
      shape,
      created_by: req.user ? req.user.username || req.user._id : 'dashboard'
    };

    if (shape === 'circle') {
      if (!center_lng || !center_lat || !radius) {
        return res.status(400).json({
          success: false,
          message: 'center_lng, center_lat, and radius are required for circle zones'
        });
      }
      zoneData.center = {
        type: 'Point',
        coordinates: [parseFloat(center_lng), parseFloat(center_lat)]
      };
      zoneData.radius = parseFloat(radius);

    } else if (shape === 'polygon') {
      if (!polygon_coords || !Array.isArray(polygon_coords) || polygon_coords.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'polygon_coords must be an array of at least 3 [lng, lat] pairs'
        });
      }
      // Close the ring if not already closed
      const ring = [...polygon_coords];
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push(ring[0]);
      }
      zoneData.polygon = {
        type: 'Polygon',
        coordinates: [ring]
      };

    } else {
      return res.status(400).json({ success: false, message: 'shape must be circle or polygon' });
    }

    const zone = new DangerZone(zoneData);
    await zone.save();

    logger.info('Danger zone created', { zoneId: zone.zone_id, name: zone.name, severity: zone.severity });

    // Broadcast to connected dashboard clients
    const io = req.app.get('io');
    if (io) {
      io.emit('danger_zone_updated', { action: 'created', zone });
    }

    res.status(201).json({ success: true, zone });
  } catch (error) {
    logger.error('Create danger zone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/danger-zones/:id — update a zone
const updateZone = async (req, res) => {
  try {
    const zone = await DangerZone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });

    const allowed = ['name', 'description', 'type', 'severity', 'radius', 'active'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) zone[field] = req.body[field];
    });

    await zone.save();

    const io = req.app.get('io');
    if (io) io.emit('danger_zone_updated', { action: 'updated', zone });

    res.json({ success: true, zone });
  } catch (error) {
    logger.error('Update danger zone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/danger-zones/:id — soft delete (deactivate)
const deleteZone = async (req, res) => {
  try {
    const zone = await DangerZone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });

    zone.active = false;
    await zone.save();

    const io = req.app.get('io');
    if (io) io.emit('danger_zone_updated', { action: 'deleted', zoneId: zone._id });

    logger.info('Danger zone deactivated', { zoneId: zone.zone_id });
    res.json({ success: true, message: 'Zone deactivated successfully' });
  } catch (error) {
    logger.error('Delete danger zone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllZones, createZone, updateZone, deleteZone };
