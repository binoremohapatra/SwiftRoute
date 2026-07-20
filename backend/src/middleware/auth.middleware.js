const { verifyToken } = require('../utils/token');
const { ApiError } = require('../utils/apiResponse');
const { prisma } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const token =
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null) ||
      req.cookies?.accessToken;

    if (!token) {
      throw new ApiError(401, 'Unauthorized request');
    }

    const decodedToken = verifyToken(token);
    
    let user;
    if (decodedToken.role === 'customer') {
      user = await prisma.user.findUnique({ where: { id: decodedToken.id } });
    } else if (decodedToken.role === 'agent') {
      user = await prisma.agent.findUnique({ where: { id: decodedToken.id } });
    } else if (decodedToken.role === 'admin') {
      user = await prisma.admin.findUnique({ where: { id: decodedToken.id } });
    }

    if (!user) {
      throw new ApiError(401, 'Invalid Access Token');
    }

    req.user = user;
    req.user.role = decodedToken.role;
    next();
  } catch (error) {
    next(new ApiError(401, error?.message || 'Invalid access token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You don't have permission to perform this action"));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
