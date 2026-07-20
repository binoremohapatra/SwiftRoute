const { ApiError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        error = new ApiError(409, `Duplicate entry: A record with this ${err.meta?.target?.join(', ')} already exists`);
        break;
      case 'P2025': // Record not found
        error = new ApiError(404, err.meta?.cause || 'Record not found');
        break;
      case 'P2003': // Foreign key constraint
        error = new ApiError(400, 'Invalid reference: Related record does not exist');
        break;
      case 'P2000': // Value too long
        error = new ApiError(400, 'Input value is too long for the field');
        break;
      case 'P1001': // DB unreachable
        error = new ApiError(503, 'Database is currently unreachable. Please try again later.');
        break;
      default:
        error = new ApiError(500, `Database error: ${err.code}`);
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token has expired');
  }

  // Zod errors (from validate middleware — should be caught there, this is fallback)
  if (err.name === 'ZodError') {
    error = new ApiError(400, 'Validation Error', err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })));
  }

  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error instanceof ApiError ? error.message : 'Internal Server Error';
  const errors = error instanceof ApiError ? error.errors : [];

  logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${message}`);

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: errors?.length ? errors : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
