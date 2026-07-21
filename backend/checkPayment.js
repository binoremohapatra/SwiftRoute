const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function check() { 
  const user = await prisma.user.findFirst({where: {email: 'mohapatrabinore9@gmail.com'}}); 
  if (user) { 
    const notifs = await prisma.notification.findMany({where: {userId: user.id}}); 
    console.log('Total notifs:', notifs.length); 
    const paymentNotifs = notifs.filter(n => n.type.toLowerCase() === 'payment');
    console.log('Payment notifs:', paymentNotifs.length); 
  } 
  await prisma.$disconnect(); 
} 
check();
