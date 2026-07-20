const { prisma } = require('../config/db');
const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');

/**
 * @swagger
 * /api/v1/agent/status:
 *   patch:
 *     tags: [Agent]
 *     summary: Update agent availability status
 */
const updateAvailabilityStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Online', 'Offline', 'Busy', 'Break'];

  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
  }

  const isAvailable = status === 'Online';

  const agent = await prisma.agent.update({
    where: { id: req.user.id },
    data: { availableStatus: status, isAvailable },
    select: { id: true, name: true, availableStatus: true, isAvailable: true, _id: true },
  });

  // Notify admins about agent status change
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('agent:statusChanged', {
      agentId: agent.id,
      name: agent.name,
      status: agent.availableStatus,
      isAvailable: agent.isAvailable,
      timestamp: new Date(),
    });
  }

  return res.status(200).json(new ApiResponse(200, agent, `Status updated to ${status}`));
});

/**
 * @swagger
 * /api/v1/agent/location:
 *   post:
 *     tags: [Agent]
 *     summary: Update agent's GPS location
 */
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng, orderId } = req.body;

  if (!lat || !lng) throw new ApiError(400, 'lat and lng are required');

  // Update agent location
  await prisma.agent.update({
    where: { id: req.user.id },
    data: { currentLat: lat, currentLng: lng, locationUpdated: new Date() },
  });

  // Persist ping if there's an active order
  if (orderId) {
    await prisma.locationPing.create({
      data: { agentId: req.user.id, orderId, lat, lng },
    });

    const io = req.app.get('io');
    if (io) {
      // Broadcast to order room watchers (customer + admin)
      io.to(`order:${orderId}`).emit('agent:locationUpdate', {
        agentId: req.user.id,
        orderId,
        lat,
        lng,
        timestamp: new Date(),
      });
      // Broadcast to admin dashboard for Fleet Tracking
      io.to('admin').emit('agent:locationBroadcast', {
        agentId: req.user.id,
        orderId,
        lat,
        lng,
        timestamp: new Date(),
      });
    }
  } else {
    // Even if no active order, broadcast to admin for idle fleet tracking
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('agent:locationBroadcast', {
        agentId: req.user.id,
        lat,
        lng,
        timestamp: new Date(),
      });
    }
  }

  return res.status(200).json(new ApiResponse(200, { lat, lng }, 'Location updated'));
});

/**
 * @swagger
 * /api/v1/agent/profile:
 *   get:
 *     tags: [Agent]
 *     summary: Get agent profile
 */
const getAgentProfile = asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, phone: true, vehicleType: true,
      rating: true, totalDeliveries: true, isAvailable: true, availableStatus: true,
      currentLat: true, currentLng: true, locationUpdated: true, createdAt: true, _id: true,
    },
  });

  if (!agent) throw new ApiError(404, 'Agent not found');
  return res.status(200).json(new ApiResponse(200, agent, 'Agent profile fetched'));
});

/**
 * @swagger
 * /api/v1/agent/deliveries:
 *   get:
 *     tags: [Agent]
 *     summary: Get agent's delivery history with pagination
 */
const getAgentDeliveries = asyncHandler(async (req, res) => {
  const { page = '1', limit = '10', status, sortOrder = 'desc' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { assignedAgentId: req.user.id };
  if (status) where.status = status;

  const [deliveries, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: deliveries,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  }, 'Deliveries fetched'));
});

/**
 * @swagger
 * /api/v1/agent/performance:
 *   get:
 *     tags: [Agent]
 *     summary: Get agent performance statistics
 */
const getAgentPerformance = asyncHandler(async (req, res) => {
  const agentId = req.user.id;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [deliveredOrders, allOrders, agentStats, ratingGroups] = await Promise.all([
    prisma.order.findMany({
      where: { assignedAgentId: agentId, status: 'Delivered', actualDeliveryTime: { not: null } },
      select: { createdAt: true, actualDeliveryTime: true },
    }),
    prisma.order.findMany({
      where: { assignedAgentId: agentId },
      select: { status: true },
    }),
    prisma.agent.findUnique({
      where: { id: agentId },
      select: { rating: true, totalDeliveries: true },
    }),
    prisma.order.groupBy({
      by: ['rating'],
      where: { assignedAgentId: agentId, rating: { not: null } },
      _count: { rating: true }
    })
  ]);

  let avgDeliveryTime = 0;
  let deliveriesToday = 0;
  if (deliveredOrders.length > 0) {
    let totalMs = 0;
    deliveredOrders.forEach(o => {
      totalMs += (o.actualDeliveryTime - o.createdAt);
      if (o.actualDeliveryTime >= startOfDay) deliveriesToday++;
    });
    avgDeliveryTime = Math.round(totalMs / deliveredOrders.length / 60000);
  }

  const statusCounts = allOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingGroups.forEach(g => {
    ratingBreakdown[g.rating] = g._count.rating;
  });

  const successRate = allOrders.length > 0
    ? Math.round((deliveredOrders.length / allOrders.length) * 100) : 0;

  return res.status(200).json(new ApiResponse(200, {
    totalDeliveries: agentStats.totalDeliveries || deliveredOrders.length,
    deliveriesToday,
    avgRating: agentStats.rating || 0,
    totalOrders: allOrders.length,
    avgDeliveryTimeMinutes: avgDeliveryTime,
    successRate,
    statusBreakdown: statusCounts,
    ratingBreakdown,
  }, 'Performance fetched'));
});

const RouteOptimizer = require('../services/routeOptimizer');

const getOptimizedRoute = asyncHandler(async (req, res) => {
  const agentId = req.user.id;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      assignedOrders: {
        where: { status: { in: ['Assigned', 'Picked-up', 'In-Transit'] } }
      }
    }
  });

  if (!agent) throw new ApiError(404, 'Agent not found');
  if (!agent.currentLat || !agent.currentLng) {
    throw new ApiError(400, 'Agent location not available');
  }

  let stops = [];
  agent.assignedOrders.forEach(o => {
    // If not picked up, we need to visit pickup first
    if (o.status === 'Assigned') {
      stops.push({ orderId: o.id, orderNumber: o.orderNumber, lat: o.pickupLat, lng: o.pickupLng, address: o.pickupAddress, type: 'pickup' });
      stops.push({ orderId: o.id, orderNumber: o.orderNumber, lat: o.dropLat, lng: o.dropLng, address: o.dropAddress, type: 'drop' });
    } else if (o.status === 'Picked-up' || o.status === 'In-Transit') {
      // Already picked up, only need to visit drop
      stops.push({ orderId: o.id, orderNumber: o.orderNumber, lat: o.dropLat, lng: o.dropLng, address: o.dropAddress, type: 'drop' });
    }
  });

  const optimized = RouteOptimizer.optimizeMultiStopRoute(agent.currentLat, agent.currentLng, stops);
  return res.status(200).json(new ApiResponse(200, optimized, 'Route optimized'));
});

module.exports = {
  updateAvailabilityStatus,
  updateLocation,
  getAgentProfile,
  getAgentDeliveries,
  getAgentPerformance,
  getOptimizedRoute,
};
