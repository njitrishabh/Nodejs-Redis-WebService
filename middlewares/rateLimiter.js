const rateLimit = require("express-rate-limit");

module.exports = {
    apiLimiter: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute in milliseconds window.
        max: 10, // start blocking after 10 requests.
        message: 'You have exceeded the 10 requests in 1 minute limit!',
        headers: true,
    })
};