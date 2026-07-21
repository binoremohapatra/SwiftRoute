const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function check() { 
  const user = await prisma.user.findFirst({where: {email: 'mohapatrabinore9@gmail.com'}}); 
  if (user) { 
    const orders = await prisma.order.findMany({where: {customerId: user.id}}); 
    console.log('Orders count:', orders.length); 
    console.log('Amounts:', orders.map(o => o.amount)); 
    const sum = orders.reduce((acc, o) => acc + (o.amount || 0), 0);
    console.log('Total sum:', sum);
  } else { 
    console.log('User not found'); 
  } 
  await prisma.$disconnect(); 
} 
check();
