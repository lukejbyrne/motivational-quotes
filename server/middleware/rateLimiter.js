const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again after 15 minutes.'
);

const searchLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  20, // limit each IP to 20 search requests per minute
  'Too many search requests, please try again after 1 minute.'
);

const adminLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 admin requests per windowMs
  'Too many admin requests, please try again after 15 minutes.'
);

module.exports = {
  generalLimiter,
  searchLimiter,
  adminLimiter
};