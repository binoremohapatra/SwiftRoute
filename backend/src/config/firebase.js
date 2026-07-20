const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const logger = require('../utils/logger');

const serviceAccount = require(path.resolve(__dirname, '../../firebase-service-account.json'));

let app;
try {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
  logger.info('Firebase Admin initialized successfully');
} catch (error) {
  logger.error('Firebase Admin initialization error:', error);
}

module.exports = {
  messaging: () => getMessaging(app)
};
