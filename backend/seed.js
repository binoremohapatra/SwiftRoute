const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();
const prisma = new PrismaClient();

const seed = async () => {
  try {
    await prisma.$connect();
    console.log('DB Connected for seeding');

    // Delete in reverse order of relationships to avoid foreign key constraints
    await prisma.locationPing.deleteMany({});
    await prisma.statusLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.order.deleteMany({});
    
    await prisma.user.deleteMany({});
    await prisma.admin.deleteMany({});
    await prisma.agent.deleteMany({});
    
    console.log('Tables cleared');

    const passwordHash = await bcrypt.hash('password123', 10);

    await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@swiftroute.com',
        password: passwordHash,
        permissions: ['manage_users', 'manage_orders', 'manage_agents', 'view_reports'],
      }
    });

    await prisma.user.create({
      data: {
        name: 'Arjun Mehta',
        email: 'arjun@example.com',
        phone: '9876543210',
        password: passwordHash,
      }
    });

    await prisma.agent.create({
      data: {
        name: 'Rajan K',
        email: 'rajan@swiftroute.com',
        phone: '9123456780',
        password: passwordHash,
        vehicleType: 'bike',
        currentLat: 12.9716, // Bangalore coords
        currentLng: 77.5946,
      }
    });

    console.log('Seed data inserted successfully');
    await prisma.$disconnect();
    process.exit();
  } catch (error) {
    console.error('Seeding failed', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seed();
