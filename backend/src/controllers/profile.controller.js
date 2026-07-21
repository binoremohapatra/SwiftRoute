const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { prisma } = require('../config/db');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { encrypt } = require('../utils/encryption');
const bcrypt = require('bcryptjs');

const getModelForRole = (role) => {
  if (role === 'admin') return prisma.admin;
  if (role === 'agent') return prisma.agent;
  return prisma.user;
};

const getProfile = asyncHandler(async (req, res) => {
  const model = getModelForRole(req.user.role);
  const profile = await model.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      bio: true,
      alternatePhone: true,
      dateOfBirth: true,
      createdAt: true,
      updatedAt: true,
      // User specific
      ...(req.user.role === 'customer' && { address: true }),
      // Agent specific
      ...(req.user.role === 'agent' && { 
        vehicleNumber: true, 
        vehicleType: true, 
        documentsVerified: true, 
        joinedAt: true,
        rating: true,
        totalDeliveries: true,
      }),
    }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  return res.status(200).json(new ApiResponse(200, profile, 'Profile fetched successfully'));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, alternatePhone, bio, dateOfBirth, address, vehicleNumber, vehicleType } = req.body;
  
  if (!name || name.trim().length < 2) {
    throw new ApiError(400, 'Name must be at least 2 characters long');
  }

  const model = getModelForRole(req.user.role);
  
  const updateData = {
    name,
    phone,
    alternatePhone,
    bio,
    ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
  };

  if (req.user.role === 'customer' && address) {
    updateData.address = address;
  }

  if (req.user.role === 'agent') {
    if (vehicleNumber) updateData.vehicleNumber = vehicleNumber;
    if (vehicleType) updateData.vehicleType = vehicleType;
  }

  const profile = await model.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      bio: true,
      alternatePhone: true,
      dateOfBirth: true,
      ...(req.user.role === 'customer' && { address: true }),
      ...(req.user.role === 'agent' && { 
        vehicleNumber: true, 
        vehicleType: true, 
        documentsVerified: true,
        joinedAt: true,
      }),
    }
  });

  return res.status(200).json(new ApiResponse(200, profile, 'Profile updated successfully'));
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image provided');
  }

  const model = getModelForRole(req.user.role);
  
  // Get current to see if we need to delete old avatar from Cloudinary
  const currentProfile = await model.findUnique({
    where: { id: req.user.id },
    select: { avatarUrl: true }
  });

  // Upload to Cloudinary
  const result = await uploadToCloudinary(req.file.buffer, `avatars/${req.user.role}`);

  // Delete old avatar if it exists and is from cloudinary
  if (currentProfile.avatarUrl && currentProfile.avatarUrl.includes('cloudinary.com')) {
    const publicId = currentProfile.avatarUrl.split('/').pop().split('.')[0];
    await deleteFromCloudinary(`avatars/${req.user.role}/${publicId}`);
  }

  // Update DB
  const updatedProfile = await model.update({
    where: { id: req.user.id },
    data: { avatarUrl: result.secure_url },
    select: { avatarUrl: true }
  });

  return res.status(200).json(new ApiResponse(200, { avatarUrl: updatedProfile.avatarUrl }, 'Avatar updated successfully'));
});

const deleteAvatar = asyncHandler(async (req, res) => {
  const model = getModelForRole(req.user.role);
  
  const currentProfile = await model.findUnique({
    where: { id: req.user.id },
    select: { avatarUrl: true }
  });

  if (currentProfile.avatarUrl && currentProfile.avatarUrl.includes('cloudinary.com')) {
    const publicId = currentProfile.avatarUrl.split('/').pop().split('.')[0];
    await deleteFromCloudinary(`avatars/${req.user.role}/${publicId}`);
  }

  await model.update({
    where: { id: req.user.id },
    data: { avatarUrl: null }
  });

  return res.status(200).json(new ApiResponse(200, null, 'Avatar deleted successfully'));
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new passwords are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const model = getModelForRole(req.user.role);
  const user = await model.findUnique({ where: { id: req.user.id } });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, 'Invalid current password');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await model.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  return res.status(200).json(new ApiResponse(200, null, 'Password updated successfully'));
});

const getProfileStats = asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  
  if (role === 'customer') {
    const stats = await prisma.order.aggregate({
      where: { customerId: id },
      _count: { id: true },
      _sum: { amount: true }
    });
    const user = await prisma.user.findUnique({ where: { id }, select: { createdAt: true } });
    
    return res.status(200).json(new ApiResponse(200, {
      totalOrders: stats._count.id,
      totalSpent: stats._sum.amount || 0,
      memberSince: user.createdAt
    }, 'Stats fetched'));
  }

  if (role === 'agent') {
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { totalDeliveries: true, rating: true, joinedAt: true, documentsVerified: true }
    });
    
    return res.status(200).json(new ApiResponse(200, agent, 'Stats fetched'));
  }

  // Admin
  return res.status(200).json(new ApiResponse(200, {}, 'No stats for admin'));
});

// Bank Details (Agents Only)
const getBankDetails = asyncHandler(async (req, res) => {
  if (req.user.role !== 'agent') throw new ApiError(403, 'Only agents have bank details');

  const bankDetails = await prisma.bankDetails.findUnique({
    where: { agentId: req.user.id },
    select: {
      accountHolderName: true,
      accountNumberLast4: true,
      ifscCode: true,
      bankName: true,
      upiId: true,
      isVerified: true,
    }
  });

  return res.status(200).json(new ApiResponse(200, bankDetails, 'Bank details fetched'));
});

const updateBankDetails = asyncHandler(async (req, res) => {
  if (req.user.role !== 'agent') throw new ApiError(403, 'Only agents can update bank details');

  const { accountHolderName, accountNumber, ifscCode, upiId, currentPassword, bankName } = req.body;

  if (!currentPassword) throw new ApiError(400, 'Current password is required to update bank details');
  
  // Verify password
  const agent = await prisma.agent.findUnique({ where: { id: req.user.id } });
  const isMatch = await bcrypt.compare(currentPassword, agent.password);
  if (!isMatch) throw new ApiError(400, 'Invalid current password');

  // Validate IFSC
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (ifscCode && !ifscRegex.test(ifscCode)) {
    throw new ApiError(400, 'Invalid IFSC code format');
  }

  const existingBank = await prisma.bankDetails.findUnique({ where: { agentId: req.user.id } });
  
  let accountNumberEncrypted = existingBank?.accountNumberEncrypted;
  let accountNumberLast4 = existingBank?.accountNumberLast4;
  let isVerified = existingBank?.isVerified || false;

  if (accountNumber) {
    if (accountNumber.length < 8) throw new ApiError(400, 'Invalid account number');
    accountNumberEncrypted = encrypt(accountNumber);
    accountNumberLast4 = accountNumber.slice(-4).padStart(accountNumber.length, '•'); // e.g. ••••••••4521
    isVerified = false; // Reset verification if account number changes
  }

  const data = {
    accountHolderName: accountHolderName || existingBank?.accountHolderName,
    ifscCode: ifscCode || existingBank?.ifscCode,
    bankName: bankName || existingBank?.bankName || 'Unknown Bank',
    upiId: upiId !== undefined ? upiId : existingBank?.upiId,
    accountNumberEncrypted,
    accountNumberLast4,
    isVerified,
    verifiedAt: null
  };

  const updatedBankDetails = await prisma.bankDetails.upsert({
    where: { agentId: req.user.id },
    create: {
      agentId: req.user.id,
      ...data
    },
    update: data,
    select: {
      accountHolderName: true,
      accountNumberLast4: true,
      ifscCode: true,
      bankName: true,
      upiId: true,
      isVerified: true,
    }
  });

  return res.status(200).json(new ApiResponse(200, updatedBankDetails, 'Bank details updated successfully'));
});

const deleteBankDetails = asyncHandler(async (req, res) => {
  if (req.user.role !== 'agent') throw new ApiError(403, 'Only agents can delete bank details');

  const { currentPassword } = req.body;
  if (!currentPassword) throw new ApiError(400, 'Current password is required');

  const agent = await prisma.agent.findUnique({ where: { id: req.user.id } });
  const isMatch = await bcrypt.compare(currentPassword, agent.password);
  if (!isMatch) throw new ApiError(400, 'Invalid current password');

  await prisma.bankDetails.delete({ where: { agentId: req.user.id } }).catch(() => {});

  return res.status(200).json(new ApiResponse(200, null, 'Bank details deleted'));
});

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  updatePassword,
  getProfileStats,
  getBankDetails,
  updateBankDetails,
  deleteBankDetails
};
