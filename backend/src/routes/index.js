const express = require('express');
const authRoutes = require('./auth.routes');
const orderRoutes = require('./order.routes');
const agentRoutes = require('./agent.routes');
const adminRoutes = require('./admin.routes');
const notificationRoutes = require('./notification.routes');
const fcmRoutes = require('./fcm.routes');
const paymentRoutes = require('./payment.routes');
const profileRoutes = require('./profile.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/agents', agentRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/fcm', fcmRoutes);
router.use('/payments', paymentRoutes);
router.use('/users', require('./user.routes'));
router.use('/profile', profileRoutes);

module.exports = router;
