const { prisma } = require('../config/db');
const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { Parser: Json2csvParser } = require('json2csv');

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/admin/dashboard-stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get live dashboard statistics
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalActiveOrders,
    deliveredToday,
    pendingOrders,
    onlineAgents,
    totalOrders,
    deliveredOrdersWithTime,
    totalAgents,
    totalUsers,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { notIn: ['Delivered', 'Cancelled'] } } }),
    prisma.order.count({ where: { status: 'Delivered', actualDeliveryTime: { gte: startOfToday, lt: endOfToday } } }),
    prisma.order.count({ where: { status: 'Placed' } }),
    prisma.agent.count({ where: { availableStatus: 'Online', isActive: true } }),
    prisma.order.count(),
    prisma.order.findMany({
      where: { status: 'Delivered', actualDeliveryTime: { not: null } },
      select: { createdAt: true, actualDeliveryTime: true },
      take: 500,
    }),
    prisma.agent.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const cancelledOrders = await prisma.order.count({ where: { status: 'Cancelled' } });
  const deliveredOrders = await prisma.order.count({ where: { status: 'Delivered' } });

  let avgDeliveryTimeMinutes = 0;
  if (deliveredOrdersWithTime.length > 0) {
    const totalMs = deliveredOrdersWithTime.reduce((sum, o) => {
      return sum + (o.actualDeliveryTime.getTime() - o.createdAt.getTime());
    }, 0);
    avgDeliveryTimeMinutes = Math.round(totalMs / deliveredOrdersWithTime.length / 60000);
  }

  const deliverySuccessRate = totalOrders > 0
    ? Math.round((deliveredOrders / totalOrders) * 100)
    : 0;

  return res.status(200).json(new ApiResponse(200, {
    activeOrders: totalActiveOrders,
    deliveredToday,
    pendingOrders,
    onlineAgents,
    totalAgents,
    totalUsers,
    avgDeliveryTimeMinutes,
    deliverySuccessRate,
    cancelledOrders,
    totalOrders,
  }, 'Dashboard stats fetched'));
});

// ─── Analytics ───────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Get analytics data
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const { period = '7d', customStart, customEnd } = req.query;
  const now = new Date();

  let startDate;
  let previousStartDate;
  let endDate = now;

  if (period === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (period === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    const diff = endDate.getTime() - startDate.getTime();
    previousStartDate = new Date(startDate.getTime() - diff);
  } else { // default to 7d
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const [
    ordersInPeriod,
    previousOrders,
    topAgents,
    customerStats,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, status: true, createdAt: true, actualDeliveryTime: true, orderNumber: true, amount: true, rating: true, estimatedDeliveryTime: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: previousStartDate, lt: startDate } },
      select: { id: true, status: true, actualDeliveryTime: true, createdAt: true, amount: true },
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, vehicleType: true, rating: true, totalDeliveries: true,
        assignedOrders: {
          where: { status: 'Delivered', updatedAt: { gte: startDate, lte: endDate } },
          select: { id: true },
        },
      },
      orderBy: { totalDeliveries: 'desc' },
      take: 10,
    }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const delivered = ordersInPeriod.filter(o => o.status === 'Delivered');
  let avgDurationMins = 0;
  if (delivered.length > 0) {
    const total = delivered.reduce((s, o) => s + (o.actualDeliveryTime - o.createdAt), 0);
    avgDurationMins = Math.round(total / delivered.length / 60000);
  }

  const agentLeaderboard = topAgents.map(a => ({
    id: a.id,
    name: a.name,
    vehicleType: a.vehicleType,
    rating: a.rating,
    totalDeliveries: a.totalDeliveries,
    deliveriesInPeriod: a.assignedOrders.length,
  })).sort((a, b) => b.deliveriesInPeriod - a.deliveriesInPeriod);

  // Group orders by day and calculate revenue
  const ordersByDay = {};
  const statusDistribution = { Placed: 0, 'Picked-up': 0, 'In-Transit': 0, Delivered: 0, Cancelled: 0 };
  const deliveryTimeHeatmap = Array(24).fill(0);
  const onTimeVsDelayed = {};

  let totalRevenue = 0;

  ordersInPeriod.forEach(o => {
    const day = o.createdAt.toISOString().split('T')[0];
    if (!ordersByDay[day]) ordersByDay[day] = { count: 0, revenue: 0 };
    ordersByDay[day].count += 1;
    ordersByDay[day].revenue += (o.amount || 0);
    totalRevenue += (o.amount || 0);

    statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;

    const hour = o.createdAt.getHours();
    deliveryTimeHeatmap[hour] += 1;

    // Calculate on-time vs delayed (only for delivered)
    if (o.status === 'Delivered' && o.actualDeliveryTime && o.estimatedDeliveryTime) {
      if (!onTimeVsDelayed[day]) onTimeVsDelayed[day] = { onTime: 0, delayed: 0 };
      if (o.actualDeliveryTime <= o.estimatedDeliveryTime) {
        onTimeVsDelayed[day].onTime += 1;
      } else {
        onTimeVsDelayed[day].delayed += 1;
      }
    }
  });

  // Convert objects to arrays for recharts
  const ordersOverTimeChart = Object.keys(ordersByDay).sort().map(date => ({
    date,
    orders: ordersByDay[date].count,
    revenue: ordersByDay[date].revenue
  }));

  const onTimeChart = Object.keys(onTimeVsDelayed).sort().map(date => ({
    date,
    onTime: onTimeVsDelayed[date].onTime,
    delayed: onTimeVsDelayed[date].delayed
  }));

  const heatmapChart = deliveryTimeHeatmap.map((count, hour) => ({ hour: `${hour}:00`, orders: count }));

  const statusChart = Object.keys(statusDistribution).map(status => ({ name: status, value: statusDistribution[status] })).filter(s => s.value > 0);

  // Calculate Previous Period Metrics
  const prevDelivered = previousOrders.filter(o => o.status === 'Delivered');
  let prevAvgDurationMins = 0;
  if (prevDelivered.length > 0) {
    const total = prevDelivered.reduce((s, o) => s + (o.actualDeliveryTime - o.createdAt), 0);
    prevAvgDurationMins = Math.round(total / prevDelivered.length / 60000);
  }
  const prevTotalRevenue = previousOrders.reduce((s, o) => s + (o.amount || 0), 0);
  const prevFailedDeliveries = previousOrders.filter(o => o.status === 'Cancelled').length;
  
  // Calculate Percentage Changes
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const trends = {
    orders: calculateChange(ordersInPeriod.length, previousOrders.length),
    revenue: calculateChange(totalRevenue, prevTotalRevenue),
    avgDelivery: calculateChange(avgDurationMins, prevAvgDurationMins),
    failed: calculateChange(statusDistribution['Cancelled'] || 0, prevFailedDeliveries),
  };

  return res.status(200).json(new ApiResponse(200, {
    period,
    totalOrders: ordersInPeriod.length,
    deliveredOrders: delivered.length,
    failedDeliveries: statusDistribution['Cancelled'] || 0,
    totalRevenue,
    avgDeliveryDurationMins: avgDurationMins,
    customerStats,
    agentLeaderboard,
    trends,
    charts: {
      ordersOverTime: ordersOverTimeChart,
      statusDistribution: statusChart,
      heatmap: heatmapChart,
      onTimeVsDelayed: onTimeChart,
    }
  }, 'Analytics fetched'));
});

// ─── Export Reports ───────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/admin/export/orders:
 *   get:
 *     tags: [Admin]
 *     summary: Export orders as CSV
 */
const exportOrdersCSV = asyncHandler(async (req, res) => {
  const { status, paymentStatus, startDate, endDate } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.gte = new Date(startDate);
    if (endDate) filter.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where: filter,
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      assignedAgent: { select: { name: true, phone: true, vehicleType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const fields = [
    { label: 'Order Number', value: 'orderNumber' },
    { label: 'Customer Name', value: 'customer.name' },
    { label: 'Customer Email', value: 'customer.email' },
    { label: 'Agent Name', value: 'assignedAgent.name' },
    { label: 'Agent Phone', value: 'assignedAgent.phone' },
    { label: 'Pickup Address', value: 'pickupAddress' },
    { label: 'Drop Address', value: 'dropAddress' },
    { label: 'Status', value: 'status' },
    { label: 'Created At', value: 'createdAt' },
    { label: 'Delivered At', value: 'actualDeliveryTime' },
  ];

  const parser = new Json2csvParser({ fields });
  const csv = parser.parse(orders);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=orders_report.csv');
  return res.status(200).send(csv);
});

/**
 * @swagger
 * /api/v1/admin/export/agents:
 *   get:
 *     tags: [Admin]
 *     summary: Export agent performance as CSV
 */
const exportAgentsCSV = asyncHandler(async (req, res) => {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    include: {
      assignedOrders: { select: { id: true, status: true } },
    },
  });

  const agentRows = agents.map(a => ({
    Name: a.name,
    Email: a.email,
    Phone: a.phone,
    VehicleType: a.vehicleType,
    Rating: a.rating,
    TotalDeliveries: a.totalDeliveries,
    Status: a.availableStatus,
    TotalOrders: a.assignedOrders.length,
    DeliveredOrders: a.assignedOrders.filter(o => o.status === 'Delivered').length,
    CancelledOrders: a.assignedOrders.filter(o => o.status === 'Cancelled').length,
    CreatedAt: a.createdAt,
  }));

  const fields = Object.keys(agentRows[0] || {});
  const parser = new Json2csvParser({ fields });
  const csv = parser.parse(agentRows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=agents_report.csv');
  return res.status(200).send(csv);
});

// ─── User Management ──────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users with search and pagination
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = '1', limit = '10', search, role, isActive } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, _id: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: users,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  }, 'Users fetched'));
});

const getAllAgentsAdmin = asyncHandler(async (req, res) => {
  const { page = '1', limit = '10', search, availableStatus, isActive } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (availableStatus) where.availableStatus = availableStatus;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      skip,
      take: parseInt(limit),
      select: {
        id: true, name: true, email: true, phone: true, vehicleType: true,
        rating: true, totalDeliveries: true, isAvailable: true, availableStatus: true,
        currentLat: true, currentLng: true, locationUpdated: true, isActive: true, createdAt: true, _id: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.agent.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: agents,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  }, 'Agents fetched'));
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true, _id: true },
  });

  return res.status(200).json(new ApiResponse(200, user, `User ${isActive ? 'activated' : 'deactivated'}`));
});

const toggleAgentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const agent = await prisma.agent.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true, _id: true },
  });

  return res.status(200).json(new ApiResponse(200, agent, `Agent ${isActive ? 'activated' : 'deactivated'}`));
});

const adminResetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword, userType = 'user' } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(newPassword, 10);

  if (userType === 'agent') {
    await prisma.agent.update({ where: { id }, data: { password: hashed } });
  } else {
    await prisma.user.update({ where: { id }, data: { password: hashed } });
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Password reset successfully'));
});

// ─── Order Search (admin) ─────────────────────────────────────────────────────
const searchOrders = asyncHandler(async (req, res) => {
  const { page = '1', limit = '10', search, status, paymentStatus, startDate, endDate, agentId, customerId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { assignedAgent: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (agentId) where.assignedAgentId = agentId;
  if (customerId) where.customerId = customerId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orderBy = {};
  const validSortFields = ['createdAt', 'updatedAt', 'status', 'orderNumber'];
  orderBy[validSortFields.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 'asc' : 'desc';

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignedAgent: { select: { id: true, name: true, phone: true, vehicleType: true } },
      },
      orderBy,
    }),
    prisma.order.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: orders,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  }, 'Orders fetched'));
});

// Keep backward compat with existing route
const getAllAgents = asyncHandler(async (req, res) => {
  const agents = await prisma.agent.findMany({
    select: {
      id: true, name: true, email: true, phone: true, vehicleType: true,
      rating: true, totalDeliveries: true, isAvailable: true, availableStatus: true,
      currentLat: true, currentLng: true, locationUpdated: true, isActive: true, createdAt: true, _id: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json(new ApiResponse(200, agents, 'Agents fetched'));
});

const assignOrderToAgent = asyncHandler(async (req, res) => {
  const { orderId, agentId } = req.body;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, 'Order not found');

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new ApiError(404, 'Agent not found');

  // If order was already assigned, free the previous agent
  if (order.assignedAgentId && order.assignedAgentId !== agentId) {
    await prisma.agent.update({
      where: { id: order.assignedAgentId },
      data: { isAvailable: true, availableStatus: 'Online' }
    });
  }

  // Mark the new agent as Busy
  await prisma.agent.update({
    where: { id: agentId },
    data: { isAvailable: false, availableStatus: 'Busy' }
  });

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { assignedAgentId: agentId, status: 'Assigned' },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true, vehicleType: true } },
    },
  });

  await prisma.statusLog.create({
    data: {
      orderId,
      status: 'Assigned',
      updatedBy: req.user.id,
      onModel: 'Admin',
      notes: `Manually assigned to agent ${agent.name}`,
    },
  });

  const io = req.app.get('io');
  io.to(`order:${orderId}`).emit('order:statusChanged', { orderId, status: 'Assigned' });

  return res.status(200).json(new ApiResponse(200, updatedOrder, 'Order assigned successfully'));
});

const AssignmentService = require('../services/assignmentService');

const smartAssignOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, 'Order not found');
  
  if (order.status !== 'Placed' && order.status !== 'Assigned') {
    throw new ApiError(400, 'Order cannot be assigned at this stage');
  }

  const bestAgent = await AssignmentService.findBestAgent(orderId);
  if (!bestAgent) {
    throw new ApiError(400, 'No available agents for smart assignment');
  }

  // If order was already assigned, free the previous agent
  if (order.assignedAgentId && order.assignedAgentId !== bestAgent.id) {
    await prisma.agent.update({
      where: { id: order.assignedAgentId },
      data: { isAvailable: true, availableStatus: 'Online' }
    });
  }

  // Mark the new agent as Busy
  await prisma.agent.update({
    where: { id: bestAgent.id },
    data: { isAvailable: false, availableStatus: 'Busy' }
  });

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { assignedAgentId: bestAgent.id, status: 'Assigned' },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true, vehicleType: true } },
    },
  });

  await prisma.statusLog.create({
    data: {
      orderId,
      status: 'Assigned',
      updatedBy: req.user.id,
      onModel: 'Admin',
      notes: `Smart assigned to agent ${bestAgent.name} using scoring algorithm`,
    },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`order:${orderId}`).emit('order:statusChanged', { orderId, status: 'Assigned' });
  }

  return res.status(200).json(new ApiResponse(200, updatedOrder, `Smart assigned to ${bestAgent.name}`));
});

module.exports = {
  getDashboardStats,
  getAnalytics,
  exportOrdersCSV,
  exportAgentsCSV,
  getAllUsers,
  getAllAgents,
  getAllAgentsAdmin,
  toggleUserStatus,
  toggleAgentStatus,
  adminResetPassword,
  searchOrders,
  assignOrderToAgent,
  smartAssignOrder,
};
