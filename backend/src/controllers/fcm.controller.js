const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const admin = require('../config/firebase');

exports.registerToken = async (req, res, next) => {
  try {
    const { fcmToken, deviceType } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'agent') {
      await prisma.agent.update({
        where: { id: userId },
        data: { fcmToken, deviceType, lastActive: new Date() }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken, deviceType, lastActive: new Date() }
      });
    }

    res.status(200).json({ success: true, message: 'FCM Token registered successfully' });
  } catch (error) {
    logger.error('Error registering FCM token:', error);
    next(error);
  }
};

exports.removeToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'agent') {
      await prisma.agent.update({
        where: { id: userId },
        data: { fcmToken: null }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: null }
      });
    }

    res.status(200).json({ success: true, message: 'FCM Token removed successfully' });
  } catch (error) {
    logger.error('Error removing FCM token:', error);
    next(error);
  }
};

exports.testPush = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let target = null;

    if (role === 'agent') {
      target = await prisma.agent.findUnique({ where: { id: userId } });
    } else {
      target = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!target || !target.fcmToken) {
      return res.status(404).json({ success: false, message: 'No registered FCM token found for user' });
    }

    const message = {
      token: target.fcmToken,
      notification: {
        title: 'Test Notification',
        body: 'FCM is successfully configured on your device!'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, message: 'Test notification sent', response });
  } catch (error) {
    logger.error('Error sending test push:', error);
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token is invalid, remove it
      const userId = req.user.id;
      const role = req.user.role;
      if (role === 'agent') {
        await prisma.agent.update({ where: { id: userId }, data: { fcmToken: null } });
      } else {
        await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
      }
      return res.status(400).json({ success: false, message: 'Token was invalid and has been removed.' });
    }
    next(error);
  }
};

exports.sendManualPush = async (req, res, next) => {
  try {
    const { title, body, targetUserId, targetRole, broadcast } = req.body;
    let tokens = [];

    if (broadcast) {
      const users = await prisma.user.findMany({ where: { fcmToken: { not: null } }, select: { fcmToken: true } });
      const agents = await prisma.agent.findMany({ where: { fcmToken: { not: null } }, select: { fcmToken: true } });
      tokens = [...users, ...agents].map(u => u.fcmToken);
    } else if (targetUserId && targetRole === 'agent') {
      const agent = await prisma.agent.findUnique({ where: { id: targetUserId }, select: { fcmToken: true } });
      if (agent?.fcmToken) tokens.push(agent.fcmToken);
    } else if (targetUserId) {
      const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { fcmToken: true } });
      if (user?.fcmToken) tokens.push(user.fcmToken);
    }

    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid targets found' });
    }

    const message = {
      notification: { title, body },
      data: { type: 'manual_push', timestamp: new Date().toISOString() },
      tokens: [...new Set(tokens)] // Remove duplicates
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Clean up failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && (resp.error.code === 'messaging/invalid-registration-token' || resp.error.code === 'messaging/registration-token-not-registered')) {
          failedTokens.push(tokens[idx]);
        }
      });
      if (failedTokens.length > 0) {
        await prisma.user.updateMany({ where: { fcmToken: { in: failedTokens } }, data: { fcmToken: null } });
        await prisma.agent.updateMany({ where: { fcmToken: { in: failedTokens } }, data: { fcmToken: null } });
      }
    }

    res.status(200).json({ success: true, message: `Notification sent to ${response.successCount} devices`, details: response });
  } catch (error) {
    logger.error('Error sending manual push:', error);
    next(error);
  }
};
