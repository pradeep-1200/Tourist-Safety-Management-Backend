const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin with Service Account
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error.message);
  }
} else {
  // Resolve path to the service account JSON file for local development
  try {
    const serviceAccountPath = path.resolve(__dirname, "../../../learnflow-notifications-firebase-adminsdk-fbsvc-5b43ad1804.json");
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.warn("⚠️ Firebase service account file not found. Push notifications will not work locally.");
  }
}

module.exports = admin;
