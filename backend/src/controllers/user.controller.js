const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { prisma } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      addresses: true, isActive: true, createdAt: true
    }
  });

  if (!user) throw new ApiError(404, 'User not found');

  // Ensure addresses is always an array
  user.addresses = user.addresses || [];

  return res.status(200).json(new ApiResponse(200, user, 'User profile fetched'));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name, phone },
    select: {
      id: true, name: true, email: true, phone: true, role: true, addresses: true
    }
  });

  return res.status(200).json(new ApiResponse(200, user, 'Profile updated successfully'));
});

const getAddresses = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { addresses: true }
  });

  const addresses = user?.addresses || [];
  return res.status(200).json(new ApiResponse(200, addresses, 'Addresses fetched'));
});

const addAddress = asyncHandler(async (req, res) => {
  const { type, name, phone, flat, address, landmark, pincode, lat, lng } = req.body;

  if (!address || !lat || !lng) {
    throw new ApiError(400, 'Address, lat, and lng are required');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const addresses = Array.isArray(user.addresses) ? [...user.addresses] : [];

  const newAddress = {
    id: uuidv4(),
    type: type || 'Home',
    name: name || user.name,
    phone: phone || user.phone,
    flat,
    address,
    landmark,
    pincode,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    isDefault: addresses.length === 0
  };

  addresses.push(newAddress);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { addresses }
  });

  return res.status(201).json(new ApiResponse(201, newAddress, 'Address added successfully'));
});

const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const addresses = Array.isArray(user.addresses) ? [...user.addresses] : [];

  const addressIndex = addresses.findIndex(a => a.id === id);
  if (addressIndex === -1) {
    throw new ApiError(404, 'Address not found');
  }

  // Handle setting default
  if (updates.isDefault) {
    addresses.forEach(a => a.isDefault = false);
  }

  addresses[addressIndex] = { ...addresses[addressIndex], ...updates };

  await prisma.user.update({
    where: { id: req.user.id },
    data: { addresses }
  });

  return res.status(200).json(new ApiResponse(200, addresses[addressIndex], 'Address updated successfully'));
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const addresses = Array.isArray(user.addresses) ? [...user.addresses] : [];

  const initialLength = addresses.length;
  const filteredAddresses = addresses.filter(a => a.id !== id);

  if (filteredAddresses.length === initialLength) {
    throw new ApiError(404, 'Address not found');
  }

  // If deleted address was default, make the first one default
  if (addresses.find(a => a.id === id)?.isDefault && filteredAddresses.length > 0) {
    filteredAddresses[0].isDefault = true;
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { addresses: filteredAddresses }
  });

  return res.status(200).json(new ApiResponse(200, {}, 'Address deleted successfully'));
});

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress
};
