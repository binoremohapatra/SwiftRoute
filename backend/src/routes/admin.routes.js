const router = require('express').Router();
const {
  getDashboardStats,
  getAnalytics,
  exportOrdersCSV,
  exportAgentsCSV,
  getAllUsers,
  getAllAgents,
  getAllAgentsAdmin,
  toggleUserStatus,
  toggleAgentStatus,
  adminResetPassword,
  searchOrders,
  assignOrderToAgent,
  smartAssignOrder,
} = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate, authorize('admin'));

// Dashboard & Analytics
router.get('/dashboard-stats', getDashboardStats);
router.get('/analytics', getAnalytics);

// Reports / Export
router.get('/export/orders', exportOrdersCSV);
router.get('/export/agents', exportAgentsCSV);

// Orders
router.get('/orders', searchOrders);
router.post('/assign-order', assignOrderToAgent);
router.post('/smart-assign/:orderId', smartAssignOrder);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.post('/users/:id/reset-password', adminResetPassword);

// Agents
router.get('/agents', getAllAgentsAdmin);
router.patch('/agents/:id/status', toggleAgentStatus);
router.post('/agents/:id/reset-password', (req, res, next) => {
  req.body.userType = 'agent';
  next();
}, adminResetPassword);

module.exports = router;
