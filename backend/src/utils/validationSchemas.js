const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    role: z.enum(['customer', 'agent', 'admin']),
    vehicleType: z.string().optional(),
  }).refine((data) => {
    if (data.role === 'agent' && !data.vehicleType) return false;
    return true;
  }, { message: 'vehicleType is required for agents', path: ['vehicleType'] }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    role: z.enum(['customer', 'agent', 'admin']),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const createOrderSchema = z.object({
  body: z.object({
    pickupLocation: z.object({
      address: z.string().min(1, 'Pickup address is required'),
      lat: z.number({ required_error: 'Pickup latitude is required' }),
      lng: z.number({ required_error: 'Pickup longitude is required' }),
    }),
    dropLocation: z.object({
      address: z.string().min(1, 'Drop address is required'),
      lat: z.number({ required_error: 'Drop latitude is required' }),
      lng: z.number({ required_error: 'Drop longitude is required' }),
    }),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Placed', 'Assigned', 'Picked-up', 'In-Transit', 'Delivered', 'Cancelled']),
    lat: z.number().optional(),
    lng: z.number().optional(),
    notes: z.string().optional(),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string() }).optional(),
});

const paginationSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    date: z.string().optional(),
    agentId: z.string().optional(),
    customerId: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  paginationSchema,
};
