const { asyncHandler, ApiResponse, ApiError } = require('../utils/apiResponse');
const { generateToken } = require('../utils/token');
const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, vehicleType } = req.body;

  let existingUser;
  if (role === 'customer') {
    existingUser = await prisma.user.findUnique({ where: { email } });
  } else if (role === 'agent') {
    existingUser = await prisma.agent.findUnique({ where: { email } });
  } else if (role === 'admin') {
    existingUser = await prisma.admin.findUnique({ where: { email } });
  } else {
    throw new ApiError(400, 'Invalid role specified');
  }

  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userData = { name, email, phone, password: hashedPassword, role };

  let createdUser;
  if (role === 'customer') {
    createdUser = await prisma.user.create({ data: userData, select: { id: true, name: true, email: true, phone: true, role: true, addresses: true, createdAt: true, updatedAt: true, _id: true } });
  } else if (role === 'agent') {
    if (!vehicleType) throw new ApiError(400, 'vehicleType is required for agents');
    userData.vehicleType = vehicleType;
    createdUser = await prisma.agent.create({ data: userData, select: { id: true, name: true, email: true, phone: true, vehicleType: true, currentLat: true, currentLng: true, locationUpdated: true, isAvailable: true, rating: true, role: true, createdAt: true, updatedAt: true, _id: true } });
  } else if (role === 'admin') {
    userData.permissions = ['manage_users', 'manage_orders', 'manage_agents', 'view_reports']; // Default permissions
    createdUser = await prisma.admin.create({ data: { name, email, password: hashedPassword, role, permissions: userData.permissions }, select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true, updatedAt: true, _id: true } });
  }

  return res.status(201).json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    throw new ApiError(400, 'Email, password, and role are required');
  }

  let user;
  if (role === 'customer') {
    user = await prisma.user.findUnique({ where: { email } });
  } else if (role === 'agent') {
    user = await prisma.agent.findUnique({ where: { email } });
  } else if (role === 'admin') {
    user = await prisma.admin.findUnique({ where: { email } });
  } else {
    throw new ApiError(400, 'Invalid role specified');
  }

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const accessToken = generateToken(user.id, user.role);

  // Remove password before sending
  delete user.password;

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(
      new ApiResponse(
        200,
        { user, accessToken },
        'User logged in successfully'
      )
    );
});

const logout = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const getMe = asyncHandler(async (req, res) => {
  const user = { ...req.user };
  delete user.password;
  return res.status(200).json(new ApiResponse(200, user, 'User profile fetched'));
});

module.exports = { register, login, logout, getMe };
