const session = require('express-session');
const config = require('../config/env');

// 단일 인스턴스를 내보내 Express와 Socket.IO가 동일한 세션 스토어를 공유하도록 한다.
// 각각 session()을 따로 호출하면 서로 다른 MemoryStore를 갖게 되어,
// HTTP로 로그인한 세션을 소켓 연결에서 찾지 못하는 문제가 생긴다.
module.exports = session({
  secret: config.sessionSecret,
  resave: false,
  // CSRF 토큰이 세션 id에 묶이므로, 세션 쿠키가 로그인 전에도 발급되어야 함
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
  },
});
