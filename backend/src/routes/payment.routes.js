const express = require('express');
const { createRazorpayOrder, verifyPayment, collectCash, webhook } = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Webhook from Razorpay doesn't use standard auth middleware
router.post('/webhook', webhook);

// All other payment routes are protected
router.use(authenticate);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.post('/collect-cash', collectCash);

module.exports = router;
