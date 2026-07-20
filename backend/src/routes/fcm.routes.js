const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const fcmController = require('../controllers/fcm.controller');

const router = express.Router();

router.post('/register', authenticate, fcmController.registerToken);
router.post('/remove', authenticate, fcmController.removeToken);
router.post('/test', authenticate, fcmController.testPush);
router.post('/send', authenticate, authorize('admin'), fcmController.sendManualPush);

module.exports = router;
