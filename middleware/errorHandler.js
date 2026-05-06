/**
 * Custom error class for API errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to avoid try/catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found middleware
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for '${field}'. Please use another value.`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // API request
  if (req.originalUrl.startsWith('/api')) {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Page request — render error page
  res.status(statusCode).render('error', {
    title: 'Error',
    statusCode,
    message,
  });
};

module.exports = { AppError, asyncHandler, notFound, errorHandler };
