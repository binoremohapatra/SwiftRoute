const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const env = require('./env');

const prisma = new PrismaClient().$extends({
  result: {
    user: { _id: { needs: { id: true }, compute(user) { return user.id; } } },
    admin: { _id: { needs: { id: true }, compute(admin) { return admin.id; } } },
    agent: { _id: { needs: { id: true }, compute(agent) { return agent.id; } } },
    order: { _id: { needs: { id: true }, compute(order) { return order.id; } } },
    notification: { _id: { needs: { id: true }, compute(notif) { return notif.id; } } },
    statusLog: { _id: { needs: { id: true }, compute(log) { return log.id; } } },
    locationPing: { _id: { needs: { id: true }, compute(ping) { return ping.id; } } },
  },
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info(`\nPostgreSQL connected via Prisma !!`);
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    process.exit(1);
  }
};

module.exports = { connectDB, prisma };
