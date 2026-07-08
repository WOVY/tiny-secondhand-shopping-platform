const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { doubleCsrfProtection, generateToken } = require('./middleware/csrf');
const sessionMiddleware = require('./middleware/session');
const userModel = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(cookieParser());
app.use(sessionMiddleware);

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
