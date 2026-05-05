const Tourist = require('../models/Tourist');
const logger = require('../utils/logger');

// Fetch all tourists (for Police Dashboard)
const getAllTourists = async (req, res) => {
  try {
    const tourists = await Tourist.find().sort({ createdAt: -1 });
    res.status(200).json(tourists);
  } catch (error) {
    logger.error("Fetch tourists error:", error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { getAllTourists };
