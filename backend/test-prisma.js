const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

prisma.order.findMany({ 
  where: { 
    status: 'Delivered', 
    actualDeliveryTime: { not: null }, 
    createdAt: { not: null } 
  } 
}).then(console.log).catch(console.error).finally(() => prisma.$disconnect());
