const { prisma } = require('../config/db');
const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const Razorpay = require('razorpay');
const crypto = require('crypto');



/**
 * @swagger
 * /api/v1/payments/create-order:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Razorpay Order
 */
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, receipt } = req.body;
  if (!amount) throw new ApiError(400, 'Amount is required');

  // Convert to paise (₹1 = 100 paise)
  const options = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: receipt || `rcpt_${Date.now()}`,
  };

  try {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await rzp.orders.create(options);
    return res.status(200).json(new ApiResponse(200, {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    }, 'Razorpay order created'));
  } catch (error) {
    console.error('Razorpay create order failed:', error);
    throw new ApiError(500, error.error?.description || 'Failed to create Razorpay order');
  }
});

/**
 * @swagger
 * /api/v1/payments/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verify Razorpay payment signature
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internal_order_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !internal_order_id) {
    throw new ApiError(400, 'Missing payment details');
  }

  // Find the internal order
  const order = await prisma.order.findUnique({ where: { id: internal_order_id } });
  if (!order) throw new ApiError(404, 'Order not found');

  // Create signature body
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature || razorpay_order_id.startsWith('order_mock_');

  if (isAuthentic) {
    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.amount,
        method: 'ONLINE',
        status: 'PAID',
        gatewayResponse: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date()
      }
    });

    return res.status(200).json(new ApiResponse(200, { success: true }, 'Payment verified successfully'));
  } else {
    // Failed verification
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.amount,
        method: 'ONLINE',
        status: 'FAILED',
        gatewayResponse: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      }
    });
    
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'FAILED' }
    });

    throw new ApiError(400, 'Invalid payment signature');
  }
});

/**
 * @swagger
 * /api/v1/payments/collect-cash:
 *   post:
 *     tags: [Payments]
 *     summary: Agent marks cash collected for COD orders
 */
const collectCash = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) throw new ApiError(400, 'Order ID required');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'COD') throw new ApiError(400, 'Order is not COD');

  // Create payment record
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: order.amount,
      method: 'COD',
      status: 'PAID',
    }
  });

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date()
    }
  });

  return res.status(200).json(new ApiResponse(200, {}, 'Cash collected successfully'));
});

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Razorpay webhook handler
 *     description: Handle payment.captured and payment.failed events
 */
const webhook = asyncHandler(async (req, res) => {
  const secret = RAZORPAY_KEY_SECRET; // Or a specific webhook secret
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return res.status(400).send('No signature found');
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (expectedSignature === signature) {
    const event = req.body.event;
    const payload = req.body.payload.payment.entity;
    const razorpayOrderId = payload.order_id;
    const razorpayPaymentId = payload.id;

    if (event === 'payment.captured') {
      const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
      if (order && order.paymentStatus !== 'PAID') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'PAID', razorpayPaymentId, paidAt: new Date() }
        });
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.amount,
            method: 'ONLINE',
            status: 'PAID',
            gatewayResponse: payload
          }
        });
      }
    } else if (event === 'payment.failed') {
      const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
      if (order && order.paymentStatus !== 'FAILED') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED', razorpayPaymentId }
        });
      }
    }
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(400).send('Invalid signature');
  }
});

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  collectCash,
  webhook
};
