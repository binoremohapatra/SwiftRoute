const router = require('express').Router();
const { 
  createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder, 
  getOrderTracking, acceptOrder, rejectOrder, rateOrder,
  assignTo3PL, track3PLOrder 
} = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../utils/validationSchemas');

router.use(authenticate);

router.get('/', getOrders);
router.post('/', authorize('customer'), validate(createOrderSchema), createOrder);
router.get('/:id', getOrderById);
router.get('/:id/tracking', getOrderTracking);
router.patch('/:id/status', authorize('agent', 'admin'), validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/cancel', authorize('customer', 'admin'), cancelOrder);
router.post('/:id/accept', authorize('agent'), acceptOrder);
router.post('/:id/reject', authorize('agent'), rejectOrder);
router.post('/:id/rate', authorize('customer'), rateOrder);

// 3PL Routes
router.post('/:id/assign-3pl', authorize('admin'), assignTo3PL);
router.get('/:id/3pl-tracking', track3PLOrder);

module.exports = router;
