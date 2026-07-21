require('dotenv').config();
const ShiprocketService = require('./src/services/shiprocket.service');

(async () => {
  try {
    const token = await ShiprocketService.authenticate();
    console.log('Success! Token:', token ? 'Got Token' : 'No Token');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
