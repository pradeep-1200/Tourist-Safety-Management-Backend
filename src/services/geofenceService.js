const DangerZone = require('../models/DangerZone');
const logger = require('../utils/logger');
const { calculateDistance } = require('../utils/helpers');

class GeofenceService {

  /**
   * Check if a point [longitude, latitude] is inside any active danger zones.
   * Returns the highest-severity violation, or { violation: false } if safe.
   */
  async checkGeofence(longitude, latitude) {
    try {
      const zones = await DangerZone.find({ active: true })
        .sort({ severity: -1 }); // critical > high > medium > low

      const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

      let topViolation = null;

      for (const zone of zones) {
        let inside = false;
        let distance = null;

        if (zone.shape === 'circle' && zone.center && zone.center.coordinates && zone.center.coordinates.length === 2) {
          const [zoneLng, zoneLat] = zone.center.coordinates;
          distance = calculateDistance(latitude, longitude, zoneLat, zoneLng);
          inside = distance <= zone.radius;

        } else if (zone.shape === 'polygon' && zone.polygon && zone.polygon.coordinates && zone.polygon.coordinates.length > 0) {
          inside = pointInPolygon([longitude, latitude], zone.polygon.coordinates[0]);
        }

        if (inside) {
          const sev = SEVERITY_ORDER[zone.severity] || 0;
          const topSev = topViolation ? (SEVERITY_ORDER[topViolation.severity] || 0) : -1;

          if (sev > topSev) {
            topViolation = {
              violation: true,
              zoneId: zone.zone_id || zone._id.toString(),
              zoneName: zone.name,
              zoneType: zone.type,
              severity: zone.severity,
              description: zone.description || `Entered ${zone.type} zone`,
              distance: distance !== null ? Math.round(distance) : null,
              shape: zone.shape,
              action: zone.severity === 'critical' || zone.severity === 'high'
                ? 'immediate_alert'
                : 'warning_alert'
            };
          }
        }
      }

      if (topViolation) {
        logger.warn('Geofence violation detected', {
          zoneId: topViolation.zoneId,
          zoneName: topViolation.zoneName,
          severity: topViolation.severity,
          coordinates: [longitude, latitude]
        });
        return topViolation;
      }

      return {
        violation: false,
        status: 'safe',
        message: 'Location is within safe zones'
      };

    } catch (error) {
      logger.error('Geofence check error:', error);
      return {
        violation: false,
        error: true,
        message: 'Unable to check geofence - assuming safe'
      };
    }
  }

  // Get all active zones (for map display in dashboard)
  async getAllZones() {
    try {
      return await DangerZone.find({ active: true }).sort({ severity: -1 });
    } catch (error) {
      logger.error('Failed to fetch danger zones:', error);
      return [];
    }
  }
}

/**
 * Ray-casting algorithm: checks if a point is inside a GeoJSON polygon ring.
 * @param {[number, number]} point - [lng, lat]
 * @param {Array<[number,number]>} ring - array of [lng, lat] coordinates
 */
function pointInPolygon(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = new GeofenceService();
