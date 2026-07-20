const router = require('express').Router();
const {
  updateAvailabilityStatus,
  updateLocation,
  getAgentProfile,
  getAgentDeliveries,
  getAgentPerformance,
  getOptimizedRoute,
} = require('../controllers/agent.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { locationPingLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

// Profile
router.get('/profile', authorize('agent', 'admin'), getAgentProfile);

// Availability
router.patch('/status', authorize('agent'), updateAvailabilityStatus);

// GPS Location
router.post('/location', authorize('agent'), locationPingLimiter, updateLocation);

// Deliveries
router.get('/deliveries', authorize('agent', 'admin'), getAgentDeliveries);
router.get('/performance', authorize('agent', 'admin'), getAgentPerformance);
router.get('/optimized-route', authorize('agent', 'admin'), getOptimizedRoute);

module.exports = router;
