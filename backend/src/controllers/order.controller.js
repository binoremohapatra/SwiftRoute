const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { prisma } = require('../config/db');
const AutoAssignService = require('../services/autoAssign.service');
const NotificationService = require('../services/notification.service');
const { v4: uuidv4 } = require('uuid');

const createOrder = asyncHandler(async (req, res) => {
  const { pickupLocation, dropLocation, paymentMethod, amount } = req.body;
  const customerId = req.user.id;

  const orderNumber = `ORD-${uuidv4().split('-')[0].toUpperCase()}`;

  const EtaService = require('../services/etaService');
  const etaMinutes = EtaService.calculateETA(
    pickupLocation.lat,
    pickupLocation.lng,
    dropLocation.lat,
    dropLocation.lng
  );
  
  const estimatedDeliveryTime = new Date();
  estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + etaMinutes);

  let order = await prisma.order.create({
    data: {
      orderNumber,
      customerId,
      pickupAddress: pickupLocation.address,
      pickupLat: pickupLocation.lat,
      pickupLng: pickupLocation.lng,
      dropAddress: dropLocation.address,
      dropLat: dropLocation.lat,
      dropLng: dropLocation.lng,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: 'PENDING',
      amount: parseFloat(amount) || 0,
      status: 'Placed',
      estimatedDeliveryTime,
    },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
    },
  });

  // Create initial status log
  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      status: 'Placed',
      updatedBy: customerId,
      onModel: 'User',
      notes: 'Order placed by customer',
    },
  });

  const io = req.app.get('io');
  
  // Start assignment process
  await AutoAssignService.assignNearestAgent(order, io);

  io.to('admin').emit('order:new', { orderId: order.id, orderNumber, status: 'Placed' });

  return res.status(201).json(new ApiResponse(201, order, 'Order created successfully, searching for agents...'));
});

const acceptOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentId = req.user.id;

  const updateResult = await prisma.order.updateMany({
    where: { id, status: 'Placed', assignedAgentId: null },
    data: { 
      assignedAgentId: agentId, 
      status: 'Assigned'
    }
  });

  if (updateResult.count === 0) {
    throw new ApiError(400, 'Order is no longer available or already handled');
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      assignedAgent: { select: { name: true, phone: true, vehicleType: true } },
    },
  });

  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      status: 'Assigned',
      updatedBy: agentId,
      onModel: 'Agent',
      notes: `Order accepted by agent`,
    },
  });

  const io = req.app.get('io');

  const agent = order.assignedAgent;
  await prisma.agent.update({
    where: { id: agentId },
    data: { isAvailable: false, availableStatus: 'Busy' }
  });

  await NotificationService.createNotification({
    userId: order.customerId,
    onModel: 'User',
    orderId: order.id,
    message: `Your order ${order.orderNumber} has been accepted by agent ${agent.name}.`,
    type: 'assignment',
  }, io);

  await NotificationService.notifyAgent(agentId, {
    title: 'Order Accepted',
    message: `You accepted order #${order.orderNumber}`,
    type: 'ACCOUNT_ALERT',
    orderId: order.id
  }, io);

  io.to(`order:${order.id}`).emit('order:statusChanged', { orderId: order.id, status: 'Assigned', timestamp: new Date() });
  io.to('admin').emit('order:statusChanged', { orderId: order.id, orderNumber: order.orderNumber, status: 'Assigned' });

  return res.status(200).json(new ApiResponse(200, order, 'Order accepted successfully'));
});

const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentId = req.user.id;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.status !== 'Placed' || order.assignedAgentId) {
    return res.status(200).json(new ApiResponse(200, {}, 'Order already handled'));
  }

  // Log rejection
  await prisma.statusLog.create({
    data: {
      orderId: id,
      status: 'Rejected',
      updatedBy: agentId,
      onModel: 'Agent',
      notes: 'Order rejected by agent',
    },
  });

  const io = req.app.get('io');
  
  await NotificationService.notifyAgent(agentId, {
    title: 'Order Missed/Declined',
    message: `Order #${order.orderNumber} was reassigned to another agent`,
    type: 'ACCOUNT_ALERT',
    orderId: order.id
  }, io);

  // Find next nearest agent
  await AutoAssignService.assignNearestAgent(order, io);

  return res.status(200).json(new ApiResponse(200, {}, 'Order rejected successfully'));
});

const getOrders = asyncHandler(async (req, res) => {
  const { page = '1', limit = '10', status, sortOrder = 'desc', search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (req.user.role === 'customer') where.customerId = req.user.id;
  else if (req.user.role === 'agent') where.assignedAgentId = req.user.id;

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { pickupAddress: { contains: search, mode: 'insensitive' } },
      { dropAddress: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignedAgent: { select: { id: true, name: true, phone: true, vehicleType: true, rating: true, currentLat: true, currentLng: true } },
      },
      orderBy: { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: orders,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  }, 'Orders fetched successfully'));
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      assignedAgent: { select: { id: true, name: true, phone: true, vehicleType: true, rating: true, currentLat: true, currentLng: true, locationUpdated: true } },
      statusLogs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) throw new ApiError(404, 'Order not found');

  if (req.user.role === 'customer' && order.customerId !== req.user.id) {
    throw new ApiError(403, 'Not authorized to view this order');
  }
  if (req.user.role === 'agent' && order.assignedAgentId !== req.user.id) {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  return res.status(200).json(new ApiResponse(200, order, 'Order fetched successfully'));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, lat, lng, notes } = req.body;
  let order = await prisma.order.findUnique({ where: { id: req.params.id } });

  if (!order) throw new ApiError(404, 'Order not found');

  if (req.user.role === 'agent' && order.assignedAgentId !== req.user.id) {
    throw new ApiError(403, 'Not authorized to update this order');
  }

  const validTransitions = {
    'Placed': ['Assigned', 'Cancelled'],
    'Assigned': ['Picked-up', 'Cancelled'],
    'Picked-up': ['In-Transit', 'Cancelled'],
    'In-Transit': ['Delivered', 'Cancelled'],
    'Delivered': [],
    'Cancelled': [],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    throw new ApiError(400, `Invalid status transition from ${order.status} to ${status}`);
  }

  const dataToUpdate = { status };
  if (status === 'Delivered') {
    dataToUpdate.actualDeliveryTime = new Date();
    // Increment agent delivery count
    if (order.assignedAgentId) {
      await prisma.agent.update({
        where: { id: order.assignedAgentId },
        data: { totalDeliveries: { increment: 1 }, isAvailable: true, availableStatus: 'Online' },
      });
    }
  }
  if (status === 'Cancelled' && order.assignedAgentId) {
    await prisma.agent.update({
      where: { id: order.assignedAgentId },
      data: { isAvailable: true, availableStatus: 'Online' },
    });
  }

  order = await prisma.order.update({
    where: { id: order.id },
    data: dataToUpdate,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true } },
    },
  });

  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      status,
      updatedBy: req.user.id,
      onModel: req.user.role === 'admin' ? 'Admin' : 'Agent',
      lat: lat || null,
      lng: lng || null,
      notes: notes || '',
    },
  });

  const io = req.app.get('io');
  io.to(`order:${order.id}`).emit('order:statusChanged', { orderId: order.id, status, timestamp: new Date() });
  io.to('admin').emit('order:statusChanged', { orderId: order.id, orderNumber: order.orderNumber, status });

  // Notifications per status
  const notifMessages = {
    'Assigned': `Your order ${order.orderNumber} has been assigned to a delivery agent.`,
    'Picked-up': `Your order ${order.orderNumber} has been picked up by the agent.`,
    'In-Transit': `Your order ${order.orderNumber} is now in transit.`,
    'Delivered': `Your order ${order.orderNumber} has been delivered successfully!`,
    'Cancelled': `Your order ${order.orderNumber} has been cancelled.`,
  };

  if (notifMessages[status]) {
    await NotificationService.createNotification({
      userId: order.customerId,
      onModel: 'User',
      orderId: order.id,
      message: notifMessages[status],
      type: status === 'Delivered' ? 'delivery' : status === 'Cancelled' ? 'cancellation' : 'status_update',
    }, io);
  }

  return res.status(200).json(new ApiResponse(200, order, 'Order status updated successfully'));
});

const cancelOrder = asyncHandler(async (req, res) => {
  let order = await prisma.order.findUnique({ where: { id: req.params.id } });

  if (!order) throw new ApiError(404, 'Order not found');
  if (['Delivered', 'Cancelled'].includes(order.status)) {
    throw new ApiError(400, 'Order cannot be cancelled');
  }
  if (req.user.role === 'customer' && order.customerId !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  order = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'Cancelled' },
  });

  if (order.assignedAgentId) {
    await prisma.agent.update({
      where: { id: order.assignedAgentId },
      data: { isAvailable: true, availableStatus: 'Online' },
    });
    
    const io = req.app.get('io');
    await NotificationService.notifyAgent(order.assignedAgentId, {
      title: 'Order Cancelled',
      message: `Order #${order.orderNumber} was cancelled by admin`,
      type: 'ORDER_CANCELLED_BY_ADMIN',
      orderId: order.id
    }, io);
  }

  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      status: 'Cancelled',
      updatedBy: req.user.id,
      onModel: req.user.role === 'admin' ? 'Admin' : req.user.role === 'customer' ? 'User' : 'Agent',
      notes: 'Order cancelled',
    },
  });

  const io = req.app.get('io');
  io.to(`order:${order.id}`).emit('order:statusChanged', { orderId: order.id, status: 'Cancelled' });

  return res.status(200).json(new ApiResponse(200, order, 'Order cancelled successfully'));
});

const getOrderTracking = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      assignedAgent: { select: { name: true, vehicleType: true, phone: true, currentLat: true, currentLng: true, locationUpdated: true } },
      statusLogs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) throw new ApiError(404, 'Order not found');

  const routeHistory = await prisma.locationPing.findMany({
    where: { orderId: order.id },
    orderBy: { timestamp: 'asc' },
    take: 100,
  });

  const agentLocation = order.assignedAgent ? {
    lat: order.assignedAgent.currentLat,
    lng: order.assignedAgent.currentLng,
    updatedAt: order.assignedAgent.locationUpdated,
  } : null;

  return res.status(200).json(new ApiResponse(200, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    thirdPartyCourier: order.thirdPartyCourier,
    thirdPartyTrackingId: order.thirdPartyTrackingId,
    pickup: { address: order.pickupAddress, lat: order.pickupLat, lng: order.pickupLng },
    drop: { address: order.dropAddress, lat: order.dropLat, lng: order.dropLng },
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    rating: order.rating,
    agent: order.assignedAgent,
    agentLocation,
    routeHistory,
    timeline: order.statusLogs,
  }, 'Tracking data fetched'));
});

const rateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { assignedAgent: true }
  });

  if (!order) throw new ApiError(404, 'Order not found');
  if (order.customerId !== req.user.id) throw new ApiError(403, 'Unauthorized');
  if (order.status !== 'Delivered') throw new ApiError(400, 'Only delivered orders can be rated');
  if (order.rating) throw new ApiError(400, 'Order already rated');

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { rating, review },
  });

  if (order.assignedAgentId) {
    const agentId = order.assignedAgentId;
    const stats = await prisma.order.aggregate({
      where: { assignedAgentId: agentId, rating: { not: null } },
      _avg: { rating: true },
    });
    
    await prisma.agent.update({
      where: { id: agentId },
      data: { rating: stats._avg.rating || rating },
    });
  }

  return res.status(200).json(new ApiResponse(200, updatedOrder, 'Order rated successfully'));
});

const ShiprocketService = require('../services/shiprocket.service');

const assignTo3PL = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true } });
  
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'Placed' && order.status !== 'Assigned') {
    throw new ApiError(400, 'Order cannot be assigned to 3PL at this stage');
  }

  // If already assigned to an in-house agent, free them
  if (order.assignedAgentId) {
    await prisma.agent.update({
      where: { id: order.assignedAgentId },
      data: { isAvailable: true, availableStatus: 'Online' }
    });
  }

  const shiprocketResponse = await ShiprocketService.createOrder(order);

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      fulfillmentType: '3PL',
      thirdPartyCourier: shiprocketResponse.courier,
      thirdPartyTrackingId: shiprocketResponse.trackingId,
      status: 'Assigned', // Or 'In-Transit' depending on 3PL flow
      assignedAgentId: null,
    }
  });

  await prisma.statusLog.create({
    data: {
      orderId: id,
      status: 'Assigned',
      updatedBy: req.user.id,
      onModel: 'Admin',
      notes: `Order handed over to 3PL: ${shiprocketResponse.courier} (AWB: ${shiprocketResponse.trackingId})`,
    }
  });

  return res.status(200).json(new ApiResponse(200, updatedOrder, 'Assigned to 3PL successfully'));
});

const track3PLOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) throw new ApiError(404, 'Order not found');
  if (order.fulfillmentType !== '3PL' || !order.thirdPartyTrackingId) {
    throw new ApiError(400, 'Not a 3PL order');
  }

  const trackingInfo = await ShiprocketService.trackOrder(order.thirdPartyTrackingId);

  return res.status(200).json(new ApiResponse(200, trackingInfo, 'Tracking info fetched'));
});

module.exports = { 
  createOrder, 
  getOrders, 
  getOrderById, 
  updateOrderStatus, 
  cancelOrder, 
  getOrderTracking, 
  acceptOrder, 
  rejectOrder, 
  rateOrder,
  assignTo3PL,
  track3PLOrder
};
