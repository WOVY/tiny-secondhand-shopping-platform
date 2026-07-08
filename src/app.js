const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const { doubleCsrfProtection, generateToken } = require('./middleware/csrf');
const sessionMiddleware = require('./middleware/session');
const userModel = require('./models/user');

const app = express();

// TRUST_PROXY=true일 때만 X-Forwarded-For를 신뢰한다 (config/env.js 주석 참고).
app.set('trust proxy', config.trustProxy ? 1 : false);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // 인라인 스타일/스크립트를 전혀 사용하지 않으므로 unsafe-inline을 명시적으로 제거한다.
        'style-src': ["'self'"],
      },
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(cookieParser());
app.use(sessionMiddleware);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(doubleCsrfProtection);
app.use((req, res, next) => {
  // 로그인/로그아웃 시 세션이 재발급되면 기존 csrf-token 쿠키는 더 이상 유효하지 않으므로
  // 검증 실패시 새 세션 기준으로 토큰을 다시 발급한다.
  try {
    res.locals.csrfToken = generateToken(req, res);
  } catch (err) {
    res.locals.csrfToken = generateToken(req, res, true);
  }
  next();
});

app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? userModel.findById(req.session.userId) || null
    : null;
  next();
});

app.use(require('./routes/auth'));
app.use(require('./routes/profile'));
app.use(require('./routes/products'));
app.use(require('./routes/report'));
app.use(require('./routes/chat'));
app.use(require('./routes/transfer'));
app.use(require('./routes/admin'));

app.get('/', (req, res) => {
  res.render('index');
});

app.use((req, res) => {
  res.status(404).render('404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('403');
  }
  console.error(err);
  res.status(500).render('500');
});

module.exports = app;
