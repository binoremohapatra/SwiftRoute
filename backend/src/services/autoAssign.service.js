const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const NotificationService = require('./notification.service');

class AutoAssignService {
  static async assignNearestAgent(order, io) {
    try {
      const rejectedLogs = await prisma.statusLog.findMany({
        where: { orderId: order.id, status: 'Rejected' },
        select: { updatedBy: true }
      });
      const rejectedAgentIds = rejectedLogs.map(log => log.updatedBy);

      const availableAgents = await prisma.agent.findMany({
        where: { 
          isAvailable: true, 
          availableStatus: 'Online', 
          isActive: true,
          id: { notIn: rejectedAgentIds }
        },
      });

      if (!availableAgents.length) {
        logger.info(`No available agents for order ${order.orderNumber}`);
        return null;
      }

      // 1. Calculate haversine distance for all agents
      const agentsWithHaversine = availableAgents.map(agent => {
        if (agent.currentLat === null || agent.currentLng === null) return null;
        const dist = AutoAssignService._haversineKm(order.pickupLat, order.pickupLng, agent.currentLat, agent.currentLng);
        return { ...agent, haversineDist: dist };
      }).filter(Boolean);

      // 2. Sort and take top 5 nearest agents
      agentsWithHaversine.sort((a, b) => a.haversineDist - b.haversineDist);
      const topCandidates = agentsWithHaversine.slice(0, 5);

      if (!topCandidates.length) {
        logger.info(`No agent with valid GPS found for order ${order.orderNumber}`);
        return null;
      }

      // 3. Find best agent using OSRM real driving ETA
      let bestAgent = null;
      let minDuration = Infinity;
      let minDistance = Infinity; // actual driving distance

      for (const agent of topCandidates) {
        try {
          // OSRM coordinates format: longitude,latitude
          const url = `http://router.project-osrm.org/route/v1/driving/${agent.currentLng},${agent.currentLat};${order.pickupLng},${order.pickupLat}?overview=false`;
          
          const response = await fetch(url);
          const data = await response.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const durationMins = route.duration / 60;
            const distanceKm = route.distance / 1000;

            if (durationMins < minDuration) {
              minDuration = durationMins;
              minDistance = distanceKm;
              bestAgent = { ...agent, etaMins: durationMins, drivingDist: distanceKm };
            }
          }
        } catch (err) {
          logger.warn(`OSRM failed for agent ${agent.id}, falling back to haversine.`);
          // Fallback to haversine if OSRM fails
          if (agent.haversineDist < minDistance) {
            minDistance = agent.haversineDist;
            bestAgent = { ...agent, etaMins: agent.haversineDist * 2, drivingDist: agent.haversineDist }; // rough estimate: 2 mins per km
          }
        }
      }

      if (bestAgent) {
        logger.info(`Dispatching order ${order.orderNumber} to agent ${bestAgent.id} (ETA: ${bestAgent.etaMins.toFixed(1)} mins)`);

        if (io) {
          io.emit('order:dispatchRequest', {
            agentId: bestAgent.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            pickupAddress: order.pickupAddress,
            dropAddress: order.dropAddress,
            pickupLat: order.pickupLat,
            pickupLng: order.pickupLng,
            distance: bestAgent.drivingDist.toFixed(2),
            etaMins: Math.ceil(bestAgent.etaMins)
          });
          
          NotificationService.notifyAgent(bestAgent.id, {
            title: 'New Delivery Request',
            message: `Order #${order.orderNumber} — pickup at ${order.pickupAddress}`,
            type: 'NEW_DISPATCH',
            orderId: order.id
          }, io);
        }

        return bestAgent;
      }

      return null;
    } catch (error) {
      logger.error('Error in AutoAssignService:', error);
      throw error;
    }
  }

  static _haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = AutoAssignService._toRad(lat2 - lat1);
    const dLon = AutoAssignService._toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(AutoAssignService._toRad(lat1)) * Math.cos(AutoAssignService._toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static _toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = AutoAssignService;
