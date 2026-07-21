const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { prisma } = require('../config/db');

const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = '1', limit = '20', filter = 'all' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { userId: req.user.id };
  
  if (filter === 'unread') {
    where.isRead = false;
  } else if (filter === 'ORDER_UPDATE') {
    where.type = { in: ['status_update', 'delivery', 'cancellation', 'assignment'] };
  } else if (filter === 'PAYMENT') {
    where.type = { in: ['payment', 'PAYMENT'] };
  } else if (filter !== 'all') {
    where.type = filter;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where })
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: notifications,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  }, 'Notifications fetched'));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let notification = await prisma.notification.findUnique({ where: { id } });
  
  if (!notification) throw new ApiError(404, 'Notification not found');
  if (notification.userId !== req.user.id) throw new ApiError(403, 'Not authorized');

  notification = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  return res.status(200).json(new ApiResponse(200, notification, 'Marked as read'));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });

  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  
  if (!notification) throw new ApiError(404, 'Notification not found');
  if (notification.userId !== req.user.id) throw new ApiError(403, 'Not authorized');

  await prisma.notification.delete({ where: { id } });

  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted'));
});

const getPreferences = asyncHandler(async (req, res) => {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: req.user.id }
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId: req.user.id }
    });
  }

  return res.status(200).json(new ApiResponse(200, prefs, 'Preferences fetched'));
});

const updatePreferences = asyncHandler(async (req, res) => {
  const { orderUpdates, paymentAlerts, promotions, pushEnabled, emailEnabled } = req.body;
  
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: req.user.id },
    create: {
      userId: req.user.id,
      orderUpdates: orderUpdates ?? true,
      paymentAlerts: paymentAlerts ?? true,
      promotions: promotions ?? false,
      pushEnabled: pushEnabled ?? true,
      emailEnabled: emailEnabled ?? false
    },
    update: {
      ...(orderUpdates !== undefined && { orderUpdates }),
      ...(paymentAlerts !== undefined && { paymentAlerts }),
      ...(promotions !== undefined && { promotions }),
      ...(pushEnabled !== undefined && { pushEnabled }),
      ...(emailEnabled !== undefined && { emailEnabled }),
    }
  });

  return res.status(200).json(new ApiResponse(200, prefs, 'Preferences updated'));
});

module.exports = { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  getPreferences,
  updatePreferences
};
