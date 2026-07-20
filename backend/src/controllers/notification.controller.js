const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { prisma } = require('../config/db');

const getUserNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.status(200).json(new ApiResponse(200, notifications, 'Notifications fetched'));
});

const markAsRead = asyncHandler(async (req, res) => {
  let notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  if (notification.userId !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true }
  });

  return res.status(200).json(new ApiResponse(200, notification, 'Marked as read'));
});

module.exports = { getUserNotifications, markAsRead };
