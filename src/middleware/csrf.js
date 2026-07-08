const { doubleCsrf } = require('csrf-csrf');
const config = require('../config/env');

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => config.sessionSecret,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: 'csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: config.isProduction,
    httpOnly: true,
  },
  getTokenFromRequest: (req) => req.body._csrf,
});

module.exports = { doubleCsrfProtection, generateToken };
