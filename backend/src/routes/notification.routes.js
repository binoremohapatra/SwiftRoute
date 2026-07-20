const express = require('express');
const { getUserNotifications, markAsRead } = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getUserNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
