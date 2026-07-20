const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Delhivery - Real-Time Delivery Tracking API',
      version: '1.0.0',
      description: 'Complete API documentation for the Real-Time Delivery Tracking & Order Management System',
      contact: { name: 'API Support', email: 'support@delhivery.dev' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            statusCode: { type: 'number' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string', enum: ['Placed', 'Assigned', 'Picked-up', 'In-Transit', 'Delivered', 'Cancelled'] },
            pickupAddress: { type: 'string' },
            dropAddress: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'agent', 'admin'] },
          },
        },
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            vehicleType: { type: 'string' },
            rating: { type: 'number' },
            availableStatus: { type: 'string', enum: ['Online', 'Offline', 'Busy', 'Break'] },
            currentLat: { type: 'number' },
            currentLng: { type: 'number' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Agent', description: 'Agent management' },
      { name: 'Admin', description: 'Admin dashboard and management' },
      { name: 'Notifications', description: 'Notification endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
