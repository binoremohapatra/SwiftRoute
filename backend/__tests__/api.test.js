const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const routes = require('../src/routes');
const errorHandler = require('../src/middleware/errorHandler');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use('/api/v1', routes);
app.use(errorHandler);

let customerToken;
let customerId;

beforeAll(async () => {
  // Clear any existing test data if needed, or rely on a clean test db
  const testEmail = 'testcustomer@example.com';
  await prisma.user.deleteMany({ where: { email: testEmail } });

  // Register a test customer
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Test Customer',
      email: testEmail,
      phone: '1234567890',
      password: 'password123',
      role: 'customer'
    });
  
  customerId = res.body.data.id;

  // Login
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: testEmail,
      password: 'password123',
      role: 'customer'
    });
    
  customerToken = loginRes.body.data.accessToken;
});

afterAll(async () => {
  const testEmail = 'testcustomer@example.com';
  await prisma.order.deleteMany({ where: { customerId } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe('Auth API', () => {
  it('should return 401 for unauthorized access', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.statusCode).toEqual(401);
  });

  it('should return profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.email).toEqual('testcustomer@example.com');
  });
});

describe('Order API', () => {
  let createdOrderId;

  it('should create a new order', async () => {
    // Mock io on app
    app.set('io', { to: () => ({ emit: jest.fn() }) });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        pickupLocation: { address: 'Test Pickup', lat: 10.0, lng: 10.0 },
        dropLocation: { address: 'Test Drop', lat: 10.1, lng: 10.1 }
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.data.orderNumber).toBeDefined();
    createdOrderId = res.body.data.id;
  });

  it('should retrieve orders for the customer', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });

  it('should get tracking data for the order', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${createdOrderId}/tracking`)
      .set('Authorization', `Bearer ${customerToken}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.status).toEqual('Placed');
  });
});
