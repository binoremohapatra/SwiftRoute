const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function updateAmounts() { 
  const orders = await prisma.order.findMany(); 
  for (let o of orders) { 
    if (o.amount === 0) { 
      await prisma.order.update({ 
        where: { id: o.id }, 
        data: { amount: Math.floor(Math.random() * 800) + 200 } 
      }); 
    } 
  } 
  console.log('Amounts updated'); 
  await prisma.$disconnect(); 
} 

updateAmounts();
