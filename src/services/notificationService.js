const admin = require('../config/firebase');
const logger = require('../utils/logger');

async function sendNotification(token, title, body) {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      token: token,
    };

    const response = await admin.messaging().send(message);
    logger.info(`Successfully sent FCM notification: ${response}`);
    return response;
  } catch (error) {
    logger.error('Error sending FCM notification:', error);
    throw error;
  }
}

module.exports = {
  sendNotification
};
