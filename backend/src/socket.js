const { prisma } = require('./config/db');
const logger = require('./utils/logger');

const socketHandler = (io) => {
  io.use((socket, next) => {
    const { verifyToken } = require('./utils/token'); // relative to src/
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) return next(new Error('Authentication error'));

    try {
      const decoded = verifyToken(token.replace('Bearer ', ''));
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);

    // Personal notification room
    socket.join(socket.user.id);

    // Admin global room
    if (socket.user.role === 'admin') {
      socket.join('admin');
    }

    // Join a specific order room for tracking
    socket.on('joinOrderRoom', (orderId) => {
      socket.join(`order:${orderId}`);
      logger.info(`User ${socket.user.id} joined order room: ${orderId}`);
    });

    socket.on('leaveOrderRoom', (orderId) => {
      socket.leave(`order:${orderId}`);
    });

    // Agent sends GPS location update via socket (alternative to REST)
    socket.on('agent:locationUpdate', async ({ orderId, lat, lng }) => {
      if (socket.user.role !== 'agent') return;

      try {
        await prisma.agent.update({
          where: { id: socket.user.id },
          data: { currentLat: lat, currentLng: lng, locationUpdated: new Date(), lastActive: new Date() },
        });

        if (orderId) {
          await prisma.locationPing.create({
            data: { agentId: socket.user.id, orderId, lat, lng },
          });

          // Broadcast to order room
          io.to(`order:${orderId}`).emit('agent:locationUpdate', {
            agentId: socket.user.id,
            orderId,
            lat,
            lng,
            timestamp: new Date(),
          });
        }

        // Update admin dashboard in real-time
        io.to('admin').emit('agent:locationBroadcast', {
          agentId: socket.user.id,
          lat,
          lng,
          orderId,
          timestamp: new Date(),
        });
      } catch (err) {
        logger.error('Error processing location update:', err);
      }
    });

    // Agent updates availability
    socket.on('agent:statusUpdate', async ({ status }) => {
      if (socket.user.role !== 'agent') return;
      const validStatuses = ['Online', 'Offline', 'Busy', 'Break'];
      if (!validStatuses.includes(status)) return;

      try {
        const isAvailable = status === 'Online';
        await prisma.agent.update({
          where: { id: socket.user.id },
          data: { availableStatus: status, isAvailable },
        });

        io.to('admin').emit('agent:statusChanged', {
          agentId: socket.user.id,
          status,
          isAvailable,
          timestamp: new Date(),
        });
      } catch (err) {
        logger.error('Error updating agent status via socket:', err);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
      // If agent disconnects, mark as Offline after a delay (graceful disconnect)
      if (socket.user.role === 'agent') {
        setTimeout(async () => {
          // Only mark offline if still disconnected (no reconnect)
          const connectedSockets = await io.in(socket.user.id).fetchSockets();
          if (connectedSockets.length === 0) {
            try {
              await prisma.agent.update({
                where: { id: socket.user.id },
                data: { availableStatus: 'Offline', isAvailable: false },
              }).catch(() => {});
              io.to('admin').emit('agent:statusChanged', {
                agentId: socket.user.id,
                status: 'Offline',
                isAvailable: false,
                timestamp: new Date(),
              });
            } catch (_) {}
          }
        }, 10000); // 10 second grace period for reconnect
      }
    });
  });
};

module.exports = socketHandler;
