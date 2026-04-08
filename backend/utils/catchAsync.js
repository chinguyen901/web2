const { JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");

function catchAsync(fn) {
  return async function wrapped(req, res) {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: "Not authorized. Invalid or expired token."
        });
      }
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error"
      });
    }
  };
}

module.exports = catchAsync;
