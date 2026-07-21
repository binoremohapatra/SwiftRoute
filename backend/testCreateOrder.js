require('dotenv').config();
const ShiprocketService = require('./src/services/shiprocket.service');

(async () => {
  try {
    const dummyOrder = {
      orderNumber: 'TEST-123',
      createdAt: new Date(),
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '9811122233'
      },
      pickupAddress: 'Sector 62, Noida, UP, 201309',
      dropAddress: 'Sector 15, Noida, UP, 201301',
      amount: 500,
      paymentMethod: 'COD'
    };
    
    const result = await ShiprocketService.createOrder(dummyOrder);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
