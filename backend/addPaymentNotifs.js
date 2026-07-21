const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function addPaymentNotifs() { 
  const user = await prisma.user.findFirst({where: {email: 'mohapatrabinore9@gmail.com'}}); 
  if (user) { 
    await prisma.notification.createMany({ 
      data: [
        {
          userId: user.id,
          type: 'payment',
          message: 'Payment of ₹450 received for Order ORD-12345.',
          isRead: false
        },
        {
          userId: user.id,
          type: 'payment',
          message: 'Payment of ₹200 for your recent delivery has been successful.',
          isRead: true
        }
      ]
    });
    console.log('Added dummy payment notifications'); 
  } 
  await prisma.$disconnect(); 
} 
addPaymentNotifs();
