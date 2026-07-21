const express = require('express');
const router = express.Router();
const { 
  getProfile, 
  updateProfile, 
  uploadAvatar, 
  deleteAvatar, 
  updatePassword,
  getProfileStats,
  getBankDetails,
  updateBankDetails,
  deleteBankDetails 
} = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.get('/', getProfile);
router.patch('/', updateProfile);

// Avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Password
router.patch('/password', updatePassword);

// Stats
router.get('/stats', getProfileStats);

// Bank Details (Agents Only)
// Apply extra rate limiting to the bank details update endpoint for security
router.get('/bank-details', getBankDetails);
router.put('/bank-details', authLimiter, updateBankDetails);
router.delete('/bank-details', deleteBankDetails);

module.exports = router;
