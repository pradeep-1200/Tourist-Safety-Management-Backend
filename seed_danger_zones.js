/**
 * Seed script: Creates sample DangerZones in MongoDB for testing.
 * 
 * Usage:  node seed_danger_zones.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const DangerZone = require('./src/models/DangerZone');

const SAMPLE_ZONES = [
  {
    name: 'Restricted Military Area - Tezpur',
    description: 'Military restricted area - no civilian access',
    type: 'military',
    severity: 'critical',
    shape: 'circle',
    center: { type: 'Point', coordinates: [92.7933, 26.6337] },
    radius: 2000,
    active: true,
    created_by: 'seed_script'
  },
  {
    name: 'Landslide Prone Area - Cherrapunji',
    description: 'High landslide risk area - avoid during monsoon',
    type: 'natural_hazard',
    severity: 'high',
    shape: 'circle',
    center: { type: 'Point', coordinates: [91.7362, 25.2624] },
    radius: 1500,
    active: true,
    created_by: 'seed_script'
  },
  {
    name: 'Indo-Myanmar Border Zone',
    description: 'International border area - requires special permits',
    type: 'border',
    severity: 'high',
    shape: 'circle',
    center: { type: 'Point', coordinates: [94.5980, 25.2677] },
    radius: 5000,
    active: true,
    created_by: 'seed_script'
  },
  {
    name: 'Dense Forest - Kaziranga',
    description: 'Dense forest with wildlife - guided tours recommended',
    type: 'wildlife',
    severity: 'medium',
    shape: 'circle',
    center: { type: 'Point', coordinates: [93.3562, 26.5775] },
    radius: 3000,
    active: true,
    created_by: 'seed_script'
  },
  {
    name: 'Crime-Prone District - Shillong Market',
    description: 'Pickpocket and petty crime hotspot at night',
    type: 'crime',
    severity: 'medium',
    shape: 'circle',
    center: { type: 'Point', coordinates: [91.8933, 25.5788] },
    radius: 500,
    active: true,
    created_by: 'seed_script'
  },
  {
    name: 'Flood Zone - Brahmaputra Banks',
    description: 'Seasonal flooding zone - dangerous during monsoon season',
    type: 'natural_hazard',
    severity: 'high',
    shape: 'polygon',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [91.70, 26.15],
        [91.80, 26.15],
        [91.80, 26.20],
        [91.70, 26.20],
        [91.70, 26.15]
      ]]
    },
    active: true,
    created_by: 'seed_script'
  }
];

async function seed() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing seed data
    const deleted = await DangerZone.deleteMany({ created_by: 'seed_script' });
    console.log(`🗑  Cleared ${deleted.deletedCount} old seed zones`);

    // Insert zones one by one so pre('save') hook generates zone_id
    const results = [];
    for (const zoneData of SAMPLE_ZONES) {
      const zone = new DangerZone(zoneData);
      await zone.save();
      results.push(zone);
    }

    console.log(`\n🚨 Seeded ${results.length} danger zones:\n`);

    results.forEach(z => {
      console.log(`   ${z.severity.toUpperCase().padEnd(9)} ${z.shape.padEnd(8)} ${z.zone_id.padEnd(22)} ${z.name}`);
    });

    console.log('\n✅ Seeding complete! Danger zones are now queryable.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

seed();
