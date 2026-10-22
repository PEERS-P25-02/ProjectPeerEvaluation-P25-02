// Global error handler middleware for standardized error responses
module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error',
      details: err.details || {},
      timestamp: new Date().toISOString(),
    },
  });
};
