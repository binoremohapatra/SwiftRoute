const { prisma } = require('../config/db');
const logger = require('../utils/logger');

const admin = require('../config/firebase');

// Notification type to message template map
const notifTypeLabels = {
  assignment: 'New Assignment',
  status_update: 'Status Update',
  delivery: 'Delivered',
  cancellation: 'Cancelled',
  near_destination: 'Near Destination',
};

class NotificationService {
  static async sendPushNotification(userId, title, body, data = {}) {
    try {
      let target = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      if (!target) {
        target = await prisma.agent.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      }

      if (target && target.fcmToken) {
        const message = {
          token: target.fcmToken,
          notification: { title, body },
          data: { ...data, timestamp: new Date().toISOString() }
        };
        const response = await admin.messaging().send(message);
        logger.info(`FCM push sent to ${userId}: ${response}`);
      }
    } catch (error) {
      logger.error(`Error sending FCM push to ${userId}:`, error);
      if (error.code === 'messaging/registration-token-not-registered') {
        // Clean up invalid token
        await prisma.user.updateMany({ where: { id: userId }, data: { fcmToken: null } });
        await prisma.agent.updateMany({ where: { id: userId }, data: { fcmToken: null } });
      }
    }
  }

  static async createNotification({ userId, onModel, orderId, message, type }, io = null) {
    try {
      const notification = await prisma.notification.create({
        data: { userId, onModel, orderId: orderId || null, message, type },
      });

      const label = notifTypeLabels[type] || type;

      if (io) {
        io.to(userId.toString()).emit('notification:new', {
          ...notification,
          label,
        });
      }

      // Fire and forget FCM Push Notification
      this.sendPushNotification(userId, label, message, {
        orderId: orderId || '',
        type,
        notificationId: notification.id
      }).catch(err => logger.error('Unhandled push notification error:', err));

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      // Non-fatal
    }
  }
}

module.exports = NotificationService;
