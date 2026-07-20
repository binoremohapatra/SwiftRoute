const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const AutoAssignService = require('./autoAssign.service'); // for haversine

class AssignmentService {
  /**
   * Smart assignment logic
   * - Distance (40%)
   * - Agent active order count (30%)
   * - Agent rating (20%)
   * - Agent on-time rate (10%)
   */
  static async findBestAgent(orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const availableAgents = await prisma.agent.findMany({
      where: { 
        isAvailable: true, 
        availableStatus: 'Online', 
        isActive: true,
      },
      include: {
        assignedOrders: {
          where: { status: { in: ['Assigned', 'Picked-up', 'In-Transit'] } }
        }
      }
    });

    if (!availableAgents.length) {
      logger.info(`No available agents for order ${order.orderNumber}`);
      return null;
    }

    let bestAgent = null;
    let highestScore = -Infinity;

    for (const agent of availableAgents) {
      if (agent.currentLat === null || agent.currentLng === null) continue;

      // 1. Distance Score (0-100) - 40% weight
      // Closer is better. Let's say 0km = 100 points, 20km = 0 points
      const distance = AutoAssignService._haversineKm(order.pickupLat, order.pickupLng, agent.currentLat, agent.currentLng);
      let distanceScore = Math.max(0, 100 - (distance * 5)); // subtract 5 points per km

      // 2. Active Orders Score (0-100) - 30% weight
      // Fewer active orders is better. 0 orders = 100 points, 5 orders = 0 points
      const activeCount = agent.assignedOrders.length;
      let loadScore = Math.max(0, 100 - (activeCount * 20));

      // 3. Rating Score (0-100) - 20% weight
      // 5.0 rating = 100 points
      let ratingScore = (agent.rating / 5) * 100;

      // 4. On-time Rate Score (0-100) - 10% weight
      // (This requires complex querying, we can approximate based on rating or historical if needed)
      // Let's query recent delivered orders for this agent
      const recentOrders = await prisma.order.findMany({
        where: { assignedAgentId: agent.id, status: 'Delivered' },
        select: { actualDeliveryTime: true, estimatedDeliveryTime: true },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });

      let onTimeCount = 0;
      let onTimeRate = 100; // default to 100 if no history
      if (recentOrders.length > 0) {
        recentOrders.forEach(o => {
          if (o.actualDeliveryTime && o.estimatedDeliveryTime && o.actualDeliveryTime <= o.estimatedDeliveryTime) {
            onTimeCount++;
          }
        });
        onTimeRate = (onTimeCount / recentOrders.length) * 100;
      }

      // Calculate weighted total
      const compositeScore = 
        (distanceScore * 0.40) + 
        (loadScore * 0.30) + 
        (ratingScore * 0.20) + 
        (onTimeRate * 0.10);

      if (compositeScore > highestScore) {
        highestScore = compositeScore;
        bestAgent = agent;
      }
    }

    if (bestAgent) {
      logger.info(`Smart Assigned order ${order.orderNumber} to agent ${bestAgent.name} with score ${highestScore.toFixed(2)}`);
      return bestAgent;
    }
    
    return null;
  }
}

module.exports = AssignmentService;
